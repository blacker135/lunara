// /api/conversations — 对话列表 CRUD

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import type { ExpertId, Language } from '@/lib/prompts/experts';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conversations = await db
    .select({
      id: schema.conversations.id,
      expert: schema.conversations.expert,
      title: schema.conversations.title,
      language: schema.conversations.language,
      updatedAt: schema.conversations.updatedAt,
      createdAt: schema.conversations.createdAt,
    })
    .from(schema.conversations)
    .where(eq(schema.conversations.userId, session.user.id))
    .orderBy(desc(schema.conversations.updatedAt));

  return Response.json({ conversations });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { expert?: string; language?: string } = {};
  try {
    body = await request.json();
  } catch {
    // 使用默认值
  }

  const validExperts: ExpertId[] = ['evan', 'liam', 'noah', 'adrian'];
  const expert = validExperts.includes(body.expert as ExpertId) ? body.expert as ExpertId : 'liam';

  const validLanguages: Language[] = ['en', 'zh'];
  const language = validLanguages.includes(body.language as Language) ? body.language as Language : 'en';

  const [conversation] = await db
    .insert(schema.conversations)
    .values({
      userId: session.user.id,
      expert,
      language,
      title: 'New Conversation',
    })
    .returning({
      id: schema.conversations.id,
      expert: schema.conversations.expert,
      title: schema.conversations.title,
      language: schema.conversations.language,
      updatedAt: schema.conversations.updatedAt,
      createdAt: schema.conversations.createdAt,
    });

  if (!conversation) {
    return Response.json({ error: 'Failed to create conversation' }, { status: 500 });
  }

  return Response.json({ conversation }, { status: 201 });
}
