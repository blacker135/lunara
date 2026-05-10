// ============================================================
// /api/conversations/[id] — 单个对话操作
// ============================================================
// GET    — 获取单个对话详情（含消息列表）
// DELETE — 删除对话（级联删除消息，由 DB ON DELETE CASCADE 处理）
// ============================================================

import { createServerSupabase } from '@/lib/supabase/server';

// ------------------------------------------------------------
// GET /api/conversations/[id] — 获取对话详情 + 消息列表
// ------------------------------------------------------------
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // === 身份验证 ===
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // === 查询对话（验证归属） ===
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single();

  if (convError || !conversation) {
    return Response.json(
      { error: 'Conversation not found' },
      { status: 404 },
    );
  }

  // 显式校验所有权
  if (conversation.user_id !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // === 查询对话消息 ===
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  if (msgError) {
    console.error('Failed to fetch messages:', msgError);
    return Response.json(
      { error: 'Failed to fetch messages' },
      { status: 500 },
    );
  }

  return Response.json({
    conversation,
    messages: messages || [],
  });
}

// ------------------------------------------------------------
// DELETE /api/conversations/[id] — 删除对话
// ------------------------------------------------------------
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // === 身份验证 ===
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // === 先验证对话存在且属于当前用户 ===
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

  // === 删除对话（消息由 ON DELETE CASCADE 自动删除） ===
  const { error: deleteError } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Failed to delete conversation:', deleteError);
    return Response.json(
      { error: 'Failed to delete conversation' },
      { status: 500 },
    );
  }

  return Response.json({ success: true });
}
