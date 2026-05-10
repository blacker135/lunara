// ============================================================
// POST /api/chat — SSE 流式对话 API
// ============================================================
// 功能：
//   1. 验证 Supabase JWT（通过 createServerSupabase + getUser）
//   2. 内存限流：每用户 10 条/分钟
//   3. 接收 { conversation_id?, expert, message, language }
//   4. 如无 conversation_id 则创建新对话
//   5. 存储用户消息 → 获取历史 20 条 → 调用 DeepSeek 流式 API
//   6. SSE 流式返回 AI 回复 → 流结束后存储 AI 消息 → 更新对话
// ============================================================

import { createServerSupabase } from '@/lib/supabase/server';
import { createDeepSeekClient } from '@/lib/deepseek/client';
import { getExpertPrompt } from '@/lib/prompts/experts';
import type { ExpertId, Language } from '@/lib/prompts/experts';

// ------------------------------------------------------------
// 内存限流器 — 每用户每分钟最多 10 条消息
// ------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

// ------------------------------------------------------------
// POST /api/chat — 主处理函数
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

  // === 第二步：限流检查 ===
  if (!checkRateLimit(user.id)) {
    return Response.json(
      { error: 'Rate limit exceeded. Max 10 messages per minute.' },
      { status: 429 },
    );
  }

  // === 第三步：解析并校验请求体 ===
  let body: {
    conversation_id?: string;
    expert?: string;
    message?: string;
    language?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { conversation_id, expert, message, language } = body;

  // 校验 expert 字段
  const validExperts: ExpertId[] = ['evan', 'liam', 'noah', 'adrian'];
  if (!expert || !validExperts.includes(expert as ExpertId)) {
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

  // 校验 message 字段
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return Response.json({ error: 'Message is required and must be a non-empty string' }, { status: 400 });
  }

  // === 第四步：获取或创建对话 ===
  let conversationId = conversation_id;

  if (!conversationId) {
    // 新建对话：使用用户消息前 50 个字符作为自动标题
    const autoTitle =
      message.length > 50 ? message.slice(0, 50) + '...' : message;

    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        expert: expert as string,
        language: language as string,
        title: autoTitle,
      })
      .select('id')
      .single();

    if (convError || !newConv) {
      console.error('Failed to create conversation:', convError);
      return Response.json(
        { error: 'Failed to create conversation' },
        { status: 500 },
      );
    }
    conversationId = newConv.id;
  } else {
    // 验证对话是否存在且属于当前用户
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .single();

    if (!existingConv) {
      return Response.json(
        { error: 'Conversation not found' },
        { status: 404 },
      );
    }
    // RLS 已经保证了用户只能访问自己的对话，这里再做一次显式检查
    if (existingConv.user_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // === 第五步：存储用户消息 ===
  const { error: msgError } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: message,
  });

  if (msgError) {
    console.error('Failed to store user message:', msgError);
    return Response.json(
      { error: 'Failed to store message' },
      { status: 500 },
    );
  }

  // === 第六步：获取对话历史（最近 20 条） ===
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(20);

  // === 第七步：构建消息数组（system prompt + 历史消息） ===
  const systemPrompt = getExpertPrompt(expert as ExpertId, language as Language);
  const chatMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...(history || []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  // === 第八步：创建 SSE 流式响应 ===
  const deepseek = createDeepSeekClient();
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let fullContent = '';
      try {
        // 调用 DeepSeek 流式 API
        const stream = await deepseek.chat.completions.create({
          model: 'deepseek-chat',
          messages: chatMessages,
          max_tokens: 1024,
          temperature: 0.8,
          stream: true,
        });

        // 逐块推送给客户端
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || '';
          if (delta) {
            fullContent += delta;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ content: delta })}\n\n`,
              ),
            );
          }
        }

        // 流结束后：存储 AI 回复到数据库
        if (fullContent) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: fullContent,
          });
        }

        // 更新对话的 updated_at 时间戳
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);

        // 发送流结束信号
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        console.error('Stream error:', err);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: 'AI stream generation failed' })}\n\n`,
          ),
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } finally {
        controller.close();
      }
    },
  });

  // 返回 SSE 响应
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
