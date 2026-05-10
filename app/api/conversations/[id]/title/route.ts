// PATCH /api/conversations/[id]/title

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: { title?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    return Response.json({ error: 'Title is required' }, { status: 400 });
  }

  const [conversation] = await db
    .select({ id: schema.conversations.id, userId: schema.conversations.userId })
    .from(schema.conversations)
    .where(eq(schema.conversations.id, id));

  if (!conversation) {
    return Response.json({ error: 'Conversation not found' }, { status: 404 });
  }
  if (conversation.userId !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [updated] = await db
    .update(schema.conversations)
    .set({ title: body.title.trim(), updatedAt: new Date() })
    .where(eq(schema.conversations.id, id))
    .returning();

  return Response.json({ conversation: updated });
}
