// app/api/subscription/activate/route.ts
// POST /api/subscription/activate — PayPal 订阅审批后验证并存储

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getSubscription, getVariantName } from '@/lib/paypal';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { subscription_id?: string; plan_id?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.subscription_id || !body.plan_id) {
    return Response.json({ error: 'subscription_id and plan_id are required' }, { status: 400 });
  }

  try {
    // 调 PayPal API 验证订阅真实性
    const sub = await getSubscription(body.subscription_id);

    if (sub.status !== 'ACTIVE' && sub.status !== 'APPROVED') {
      return Response.json({ error: `Subscription not active: ${sub.status}` }, { status: 400 });
    }

    const variantName = getVariantName(body.plan_id);
    if (!variantName) {
      return Response.json({ error: 'Unknown plan' }, { status: 400 });
    }

    // upsert：使用 onConflictDoUpdate 保证并发安全的原子操作
    await db
      .insert(schema.subscriptions)
      .values({
        userId: session.user.id,
        paypalSubscriptionId: body.subscription_id,
        paypalPlanId: body.plan_id,
        variantName,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: sub.billing_info?.next_billing_time
          ? new Date(sub.billing_info.next_billing_time)
          : undefined,
      })
      .onConflictDoUpdate({
        target: schema.subscriptions.paypalSubscriptionId,
        set: {
          paypalPlanId: body.plan_id,
          variantName,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: sub.billing_info?.next_billing_time
            ? new Date(sub.billing_info.next_billing_time)
            : undefined,
          updatedAt: new Date(),
        },
      });

    return Response.json({ success: true, variant: variantName });
  } catch (err) {
    console.error('Subscription activation failed:', err);
    return Response.json({ error: 'Activation failed' }, { status: 500 });
  }
}
