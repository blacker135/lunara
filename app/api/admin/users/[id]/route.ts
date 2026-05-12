// app/api/admin/users/[id]/route.ts
// GET/PATCH/DELETE /api/admin/users/:id — 查看/编辑/删除单个用户

import { getAdminUserId } from '@/lib/admin/guard';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// GET: 查看用户详情
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const [u] = await db.select().from(schema.user).where(eq(schema.user.id, id)).limit(1);
  if (!u) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

  const sub = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, id))
    .limit(1);

  // 通过 conversations 表关联统计用户消息数（messages 表无 user_id 字段）
  const convCountResult = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int as count
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE c.user_id = ${id}`,
  );
  const messageCount = convCountResult.rows[0]?.count ?? 0;

  return NextResponse.json({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    createdAt: u.createdAt,
    subscription: sub[0] ?? null,
    messageCount,
  });
}

// PATCH: 编辑用户
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const { name, email } = body;

  // 输入验证：姓名和邮箱不能为空
  if (!name || !email) {
    return NextResponse.json({ error: '姓名和邮箱不能为空' }, { status: 400 });
  }

  try {
    await db.update(schema.user).set({ name, email }).where(eq(schema.user.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AdminUsers] 编辑用户失败:', error);
    return NextResponse.json({ error: '编辑用户失败' }, { status: 500 });
  }
}

// DELETE: 删除用户及其关联数据（ON DELETE CASCADE 自动处理级联）
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await db.delete(schema.user).where(eq(schema.user.id, id));
  return NextResponse.json({ success: true });
}
