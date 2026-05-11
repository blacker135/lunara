// app/api/subscription/checkout/route.ts
// POST /api/subscription/checkout — 生成 LemonSqueezy 结账 URL

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createCheckout } from '@/lib/lemonsqueezy';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { variant_id?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.variant_id || typeof body.variant_id !== 'string') {
    return Response.json({ error: 'variant_id is required' }, { status: 400 });
  }

  try {
    const url = await createCheckout(body.variant_id, session.user.id);
    return Response.json({ url });
  } catch (err) {
    console.error('Checkout creation failed:', err);
    return Response.json({ error: 'Failed to create checkout' }, { status: 500 });
  }
}
