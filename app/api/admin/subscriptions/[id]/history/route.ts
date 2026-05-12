// app/api/admin/subscriptions/[id]/history/route.ts
// GET /api/admin/subscriptions/:id/history — 查看订阅变更日志

import { getAdminUserId } from '@/lib/admin/guard';
import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    // 查询所有 subscription_change 事件，按时间倒序
    const events = await db
      .select()
      .from(schema.analyticsEvents)
      .where(eq(schema.analyticsEvents.eventType, 'subscription_change'))
      .orderBy(desc(schema.analyticsEvents.createdAt))
      .limit(100);

    // 过滤出匹配当前订阅 ID 的事件
    const history = events.filter((e) => {
      const payload = e.payload as Record<string, unknown>;
      return payload.subscriptionId === id;
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('[AdminSubscriptions] 获取变更日志失败:', error);
    return NextResponse.json({ error: '获取变更日志失败' }, { status: 500 });
  }
}
