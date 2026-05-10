// ============================================================
// POST /api/chat/switch — 专家切换 API
// ============================================================
// 功能：
//   1. 验证 JWT
//   2. 校验 { conversation_id, new_expert, language }
//   3. 验证对话属于当前用户
//   4. 无历史消息 → 返回新专家的欢迎语
//   5. 有历史消息 → 构建上下文 → 调用 DeepSeek 生成过渡消息
//   6. 更新对话 expert 字段 → 插入 AI 过渡消息
//   7. 返回 { content, expert }
// ============================================================

import { createServerSupabase } from '@/lib/supabase/server';
import { createDeepSeekClient } from '@/lib/deepseek/client';
import {
  getSwitchPrompt,
  getWelcomeMessage,
  getExpertInfo,
} from '@/lib/prompts/experts';
import type { ExpertId, Language } from '@/lib/prompts/experts';

// ------------------------------------------------------------
// POST /api/chat/switch — 主处理函数
// ------------------------------------------------------------
export async function POST(request: Request) {
  // === 第一步：身份验证 ===
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // === 第二步：解析并校验请求体 ===
  let body: {
    conversation_id?: string;
    new_expert?: string;
    language?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { conversation_id, new_expert, language } = body;

  // 校验 conversation_id
  if (!conversation_id) {
    return Response.json(
      { error: 'conversation_id is required' },
      { status: 400 },
    );
  }

  // 校验 new_expert 字段
  const validExperts: ExpertId[] = ['evan', 'liam', 'noah', 'adrian'];
  if (!new_expert || !validExperts.includes(new_expert as ExpertId)) {
    return Response.json(
      { error: `Invalid expert. Must be one of: ${validExperts.join(', ')}` },
      { status: 400 },
    );
  }

  // 校验 language 字段
  const validLanguages: Language[] = ['en', 'zh'];
  if (!language || !validLanguages.includes(language as Language)) {
    return Response.json(
      { error: `Invalid language. Must be one of: ${validLanguages.join(', ')}` },
      { status: 400 },
    );
  }

  // === 第三步：验证对话归属 ===
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, user_id, expert, language')
    .eq('id', conversation_id)
    .single();

  if (convError || !conversation) {
    return Response.json(
      { error: 'Conversation not found' },
      { status: 404 },
    );
  }

  // 显式校验所有权（RLS 已确保，但双重检查更安全）
  if (conversation.user_id !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // === 第四步：检查是否有历史消息 ===
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversation_id);

  const expertId = new_expert as ExpertId;
  const lang = language as Language;
  let transitionMessage: string;

  if (!count || count === 0) {
    // 情况 A：无历史消息 → 返回新专家的欢迎语
    transitionMessage = getWelcomeMessage(expertId, lang);
  } else {
    // 情况 B：有历史消息 → 构建上下文 → 调用 DeepSeek 生成过渡语

    // 获取最近 10 条消息作为上下文
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true })
      .limit(10);

    // 构建上下文文本
    const context = (recentMessages || [])
      .map((m) => `${m.role === 'user' ? 'User' : 'Previous Guide'}: ${m.content}`)
      .join('\n\n');

    // 获取新专家信息
    const expertInfo = getExpertInfo(expertId, lang);

    // 构建切换提示词
    const switchPrompt = getSwitchPrompt(
      expertInfo.name,
      expertInfo.title,
      context,
      lang,
    );

    // 调用 DeepSeek 生成过渡消息
    try {
      const deepseek = createDeepSeekClient();
      const response = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: switchPrompt }],
        max_tokens: 512,
        temperature: 0.8,
        stream: false,
      });

      transitionMessage =
        response.choices[0]?.message?.content ||
        getWelcomeMessage(expertId, lang);
    } catch (err) {
      console.error('DeepSeek switch prompt failed:', err);
      // 降级：返回欢迎语
      transitionMessage = getWelcomeMessage(expertId, lang);
    }
  }

  // === 第五步：更新对话 expert 字段 ===
  await supabase
    .from('conversations')
    .update({ expert: new_expert, updated_at: new Date().toISOString() })
    .eq('id', conversation_id);

  // === 第六步：插入 AI 过渡消息 ===
  const { error: insertError } = await supabase.from('messages').insert({
    conversation_id,
    role: 'assistant',
    content: transitionMessage,
  });

  if (insertError) {
    console.error('Failed to insert transition message:', insertError);
  }

  // === 第七步：返回结果 ===
  return Response.json({
    content: transitionMessage,
    expert: new_expert,
  });
}
