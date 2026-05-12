// app/api/subscription/webhook/route.ts
// POST /api/subscription/webhook — 接收 PayPal 订阅事件回调

import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { verifyWebhookSignature, getVariantName } from '@/lib/paypal';

interface PayPalWebhookEvent {
  event_type: string;
  resource: {
    id: string;
    plan_id?: string;
    status?: string;
    billing_info?: {
      next_billing_time?: string;
    };
    create_time?: string;
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  const signatureHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    signatureHeaders[key.toLowerCase()] = value;
  });

  const verified = await verifyWebhookSignature(signatureHeaders, rawBody);
  if (!verified) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: PayPalWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = event.event_type;
  const subId = event.resource.id;
  const planId = event.resource.plan_id || '';
  const eventStatus = event.resource.status;
  const nextBilling = event.resource.billing_info?.next_billing_time;

  try {
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        // activate API 已插入记录，webhook 只做状态确认更新
        await db
          .update(schema.subscriptions)
          .set({
            status: 'active',
            currentPeriodEnd: nextBilling ? new Date(nextBilling) : undefined,
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.paypalSubscriptionId, subId));
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
      case 'BILLING.SUBSCRIPTION.PAYMENT_FAILED': {
        const newStatus =
          eventType === 'BILLING.SUBSCRIPTION.EXPIRED' ? 'expired' : 'cancelled';

        await db
          .update(schema.subscriptions)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(schema.subscriptions.paypalSubscriptionId, subId));

        if (eventType === 'BILLING.SUBSCRIPTION.PAYMENT_FAILED') {
          console.error('[PayPal Webhook] Payment failed:', { subId, planId });
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.UPDATED': {
        const updates: Record<string, unknown> = {};
        if (eventStatus) {
          const statusMap: Record<string, string> = {
            ACTIVE: 'active',
            SUSPENDED: 'cancelled',
            CANCELLED: 'cancelled',
            EXPIRED: 'expired',
          };
          updates.status = statusMap[eventStatus] || 'cancelled';
        }
        if (nextBilling) updates.currentPeriodEnd = new Date(nextBilling);
        updates.updatedAt = new Date();

        await db
          .update(schema.subscriptions)
          .set(updates)
          .where(eq(schema.subscriptions.paypalSubscriptionId, subId));
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('PayPal webhook processing failed:', err);
    return Response.json({ error: 'Processing failed' }, { status: 400 });
  }

  return Response.json({ received: true });
}
