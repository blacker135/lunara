// ============================================================
// /api/conversations — 对话列表 CRUD
// ============================================================
// GET  — 获取当前用户的对话列表（按 updated_at DESC 排序）
// POST — 创建新对话 { expert?, language? }
// ============================================================

import { createServerSupabase } from '@/lib/supabase/server';
import type { ExpertId, Language } from '@/lib/prompts/experts';

// ------------------------------------------------------------
// GET /api/conversations — 获取用户对话列表
// ------------------------------------------------------------
export async function GET() {
  // === 身份验证 ===
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // === 查询对话列表 ===
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id, expert, title, language, updated_at, created_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch conversations:', error);
    return Response.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 },
    );
  }

  return Response.json({ conversations: conversations || [] });
}

// ------------------------------------------------------------
// POST /api/conversations — 创建新对话
// ------------------------------------------------------------
export async function POST(request: Request) {
  // === 身份验证 ===
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // === 解析请求体 ===
  let body: { expert?: string; language?: string } = {};
  try {
    body = await request.json();
  } catch {
    // body 为空时使用默认值
  }

  // 校验 expert（可选，默认 'liam'）
  const validExperts: ExpertId[] = ['evan', 'liam', 'noah', 'adrian'];
  const expert = validExperts.includes(body.expert as ExpertId)
    ? body.expert
    : 'liam';

  // 校验 language（可选，默认 'en'）
  const validLanguages: Language[] = ['en', 'zh'];
  const language = validLanguages.includes(body.language as Language)
    ? body.language
    : 'en';

  // === 创建对话 ===
  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      expert: expert as string,
      language: language as string,
      title: 'New Conversation',
    })
    .select('id, expert, title, language, updated_at, created_at')
    .single();

  if (error || !conversation) {
    console.error('Failed to create conversation:', error);
    return Response.json(
      { error: 'Failed to create conversation' },
      { status: 500 },
    );
  }

  return Response.json({ conversation }, { status: 201 });
}
