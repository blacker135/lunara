// app/api/admin/members/[id]/route.ts
// GET/PATCH /api/admin/members/:id — 查看/升降级会员

import { getAdminUserId } from '@/lib/admin/guard';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/** 有效等级列表 */
const VALID_VARIANTS = ['starter', 'pro', 'ultra', 'admin'];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const [u] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.id, id))
    .limit(1);
  if (!u) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

  const sub = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, id))
    .limit(1);

  return NextResponse.json({ user: u, subscription: sub[0] ?? null });
}

// PATCH: 升降级会员等级
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { variantName } = await req.json();

  if (!VALID_VARIANTS.includes(variantName)) {
    return NextResponse.json({ error: '无效等级' }, { status: 400 });
  }

  await db
    .update(schema.subscriptions)
    .set({ variantName, updatedAt: new Date() })
    .where(eq(schema.subscriptions.userId, id));

  return NextResponse.json({ success: true });
}
