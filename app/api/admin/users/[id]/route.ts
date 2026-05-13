// app/api/admin/users/[id]/route.ts
// GET/PATCH/DELETE /api/admin/users/:id — 查看/编辑/删除单个用户

import { getAdminUserId } from '@/lib/admin/guard';
import { db, schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from 'better-auth/crypto';

// GET: 查看用户详情（含 daily_limit、订阅、消息数）
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

  // 查询 daily_limit（来自 profiles 表）
  const [profile] = await db
    .select({ dailyLimit: schema.profiles.dailyLimit })
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, id));

  return NextResponse.json({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    createdAt: u.createdAt,
    subscription: sub[0] ?? null,
    messageCount,
    dailyLimit: profile?.dailyLimit ?? null,
  });
}

// PATCH: 编辑用户（姓名/邮箱/密码/会员身份/到期时间/日限额）
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const { name, email, password, variantName, currentPeriodEnd, dailyLimit } = body;

  try {
    // 1. 更新基本字段（姓名/邮箱）
    if (name !== undefined || email !== undefined) {
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      await db.update(schema.user).set(updateData).where(eq(schema.user.id, id));
    }

    // 2. 更新密码（通过 Better Auth 内置 hashPassword 加密）
    if (password) {
      const hashed = await hashPassword(password);
      const [account] = await db
        .select()
        .from(schema.account)
        .where(and(eq(schema.account.userId, id), eq(schema.account.providerId, 'credential')));
      if (account) {
        await db
          .update(schema.account)
          .set({ password: hashed })
          .where(eq(schema.account.id, account.id));
      }
    }

    // 3. 更新会员身份（variantName）
    if (variantName !== undefined) {
      const [existingSub] = await db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.userId, id));

      if (variantName === 'free') {
        // 改为 free：取消现有活跃订阅
        if (existingSub && existingSub.status === 'active') {
          await db
            .update(schema.subscriptions)
            .set({ status: 'cancelled', updatedAt: new Date() })
            .where(eq(schema.subscriptions.id, existingSub.id));
        }
      } else {
        // 改为付费/admin 身份
        if (existingSub && existingSub.status === 'active') {
          // 更新现有订阅
          await db
            .update(schema.subscriptions)
            .set({
              variantName,
              status: 'active',
              currentPeriodEnd: currentPeriodEnd !== undefined
                ? (currentPeriodEnd ? new Date(currentPeriodEnd) : null)
                : existingSub.currentPeriodEnd,
              updatedAt: new Date(),
            })
            .where(eq(schema.subscriptions.id, existingSub.id));
        } else {
          // 创建新的手动订阅（管理员手动分配）
          const adminId = typeof auth === 'string' ? auth : 'admin';
          await db.insert(schema.subscriptions).values({
            userId: id,
            paypalSubscriptionId: `manual_${adminId}_${Date.now()}`,
            paypalPlanId: `manual_${variantName}`,
            variantName,
            status: 'active',
            currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : undefined,
          });
        }
      }
    } else if (currentPeriodEnd !== undefined) {
      // 仅更新到期时间（不改变身份）
      const [existingSub] = await db
        .select()
        .from(schema.subscriptions)
        .where(and(eq(schema.subscriptions.userId, id), eq(schema.subscriptions.status, 'active')));
      if (existingSub) {
        await db
          .update(schema.subscriptions)
          .set({
            currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.id, existingSub.id));
      }
    }

    // 4. 更新日限额（profiles 表，upsert 模式）
    if (dailyLimit !== undefined) {
      await db
        .insert(schema.profiles)
        .values({ userId: id, dailyLimit })
        .onConflictDoUpdate({ target: schema.profiles.userId, set: { dailyLimit } });
    }

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
