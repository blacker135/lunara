// app/api/subscription/trial/route.ts
// PATCH /api/subscription/trial — 递增试用消息计数

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function PATCH() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [existing] = await db
    .select({ id: schema.profiles.id, trialUsed: schema.profiles.trialUsed })
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, session.user.id));

  const current = existing?.trialUsed || 0;
  const next = current + 1;

  if (!existing) {
    await db.insert(schema.profiles).values({
      userId: session.user.id,
      trialUsed: next,
    });
  } else {
    await db
      .update(schema.profiles)
      .set({ trialUsed: next })
      .where(eq(schema.profiles.id, existing.id));
  }

  return Response.json({ trial_used: next, trial_limit: 3 });
}
