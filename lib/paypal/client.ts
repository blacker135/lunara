// lib/paypal/client.ts
// PayPal REST API 客户端
// 封装 OAuth 令牌获取 + 订阅查询
// 注意：token 缓存仅在 serverless 实例生命周期内有效，冷启动后重置

import 'server-only';

const PAYPAL_API_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

interface PayPalToken {
  access_token: string;
  expires_at: number;
}

let cachedToken: PayPalToken | null = null;

/**
 * 获取 PayPal OAuth 访问令牌
 * 生产环境使用 live，开发/测试使用 sandbox
 */
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;

  if (!clientId || !secret) {
    throw new Error('PAYPAL_CLIENT_ID and PAYPAL_SECRET must be set');
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error('PayPal OAuth error:', res.status, errBody);
    throw new Error(`PayPal OAuth error: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.access_token;
}

interface PayPalSubscription {
  id: string;
  plan_id: string;
  status: 'APPROVAL_PENDING' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
  subscriber?: {
    email_address?: string;
  };
  billing_info?: {
    next_billing_time?: string;
    last_payment?: {
      amount?: { value: string; currency_code: string };
    };
  };
  create_time: string;
}

/**
 * 查询 PayPal 订阅详情
 * @param subscriptionId - 订阅 ID
 * @returns 订阅详情对象
 */
export async function getSubscription(subscriptionId: string): Promise<PayPalSubscription> {
  if (!subscriptionId || typeof subscriptionId !== 'string') {
    throw new Error('subscriptionId is required and must be a string');
  }

  const token = await getAccessToken();

  const res = await fetch(
    `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!res.ok) {
    const errBody = await res.text();
    console.error('PayPal getSubscription error:', res.status, errBody);
    throw new Error(`PayPal getSubscription error: ${res.status}`);
  }

  return res.json();
}

/**
 * 验证 PayPal Webhook 签名
 * 通过 PayPal verify-webhook-signature 接口做 postback 验证
 */
export async function verifyWebhookSignature(
  headers: Record<string, string>,
  rawBody: string,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error('PAYPAL_WEBHOOK_ID not configured');
    return false;
  }

  let webhookEvent: unknown;
  try {
    webhookEvent = JSON.parse(rawBody);
  } catch {
    console.error('PayPal webhook: invalid JSON body');
    return false;
  }

  const token = await getAccessToken();

  const verificationPayload = {
    auth_algo: headers['paypal-auth-algo'] || '',
    cert_url: headers['paypal-cert-url'] || '',
    transmission_id: headers['paypal-transmission-id'] || '',
    transmission_sig: headers['paypal-transmission-sig'] || '',
    transmission_time: headers['paypal-transmission-time'] || '',
    webhook_id: webhookId,
    webhook_event: webhookEvent,
  };

  const res = await fetch(
    `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verificationPayload),
    },
  );

  if (!res.ok) {
    console.error('PayPal webhook verification API error:', res.status);
    return false;
  }

  const result = await res.json();
  return result.verification_status === 'SUCCESS';
}
