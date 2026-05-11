// app/api/subscription/status/route.ts
// GET /api/subscription/status — 返回当前用户订阅状态和试用信息

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [sub] = await db
    .select({
      variant: schema.subscriptions.variantName,
      status: schema.subscriptions.status,
      periodEnd: schema.subscriptions.currentPeriodEnd,
    })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, session.user.id));

  const [profile] = await db
    .select({ trialUsed: schema.profiles.trialUsed })
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, session.user.id));

  const trialUsed = profile?.trialUsed || 0;

  return Response.json({
    subscribed: !!sub && sub.status === 'active',
    variant: sub?.variant || null,
    status: sub?.status || null,
    period_end: sub?.periodEnd?.toISOString() || null,
    trial_used: trialUsed,
    trial_limit: 3,
  });
}
