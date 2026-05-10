// ============================================================
// PATCH /api/conversations/[id]/title — 更新对话标题
// ============================================================
// 功能：
//   1. 验证 JWT
//   2. 验证对话归属
//   3. 更新 title 字段
// ============================================================

import { createServerSupabase } from '@/lib/supabase/server';

// ------------------------------------------------------------
// PATCH /api/conversations/[id]/title — 主处理函数
// ------------------------------------------------------------
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // === 第一步：身份验证 ===
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // === 第二步：解析请求体 ===
  let body: { title?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // 校验 title 字段
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    return Response.json(
      { error: 'Title is required and must be a non-empty string' },
      { status: 400 },
    );
  }

  const newTitle = body.title.trim();

  // === 第三步：验证对话归属 ===
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, user_id')
    .eq('id', id)
    .single();

  if (convError || !conversation) {
    return Response.json(
      { error: 'Conversation not found' },
      { status: 404 },
    );
  }

  if (conversation.user_id !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // === 第四步：更新标题 ===
  const { data: updated, error: updateError } = await supabase
    .from('conversations')
    .update({ title: newTitle, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, expert, title, language, updated_at, created_at')
    .single();

  if (updateError || !updated) {
    console.error('Failed to update title:', updateError);
    return Response.json(
      { error: 'Failed to update title' },
      { status: 500 },
    );
  }

  return Response.json({ conversation: updated });
}
