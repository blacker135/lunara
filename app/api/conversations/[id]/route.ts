// /api/conversations/[id] — 单个对话操作

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const [conversation] = await db
    .select()
    .from(schema.conversations)
    .where(eq(schema.conversations.id, id));

  if (!conversation) {
    return Response.json({ error: 'Conversation not found' }, { status: 404 });
  }
  if (conversation.userId !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const messages = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, id))
    .orderBy(asc(schema.messages.createdAt));

  return Response.json({ conversation, messages });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

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

  await db.delete(schema.conversations).where(eq(schema.conversations.id, id));

  return Response.json({ success: true });
}
