// POST /api/chat/switch — 专家切换 API

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { eq, asc, count } from 'drizzle-orm';
import { createDeepSeekClient } from '@/lib/deepseek/client';
import { getSwitchPrompt, getWelcomeMessage, getExpertInfo } from '@/lib/prompts/experts';
import type { ExpertId, Language } from '@/lib/prompts/experts';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { conversation_id?: string; new_expert?: string; language?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { conversation_id, new_expert, language } = body;

  if (!conversation_id) {
    return Response.json({ error: 'conversation_id is required' }, { status: 400 });
  }

  const validExperts: ExpertId[] = ['evan', 'liam', 'noah', 'adrian'];
  if (!new_expert || !validExperts.includes(new_expert as ExpertId)) {
    return Response.json({ error: 'Invalid expert' }, { status: 400 });
  }

  const validLanguages: Language[] = ['en', 'zh'];
  if (!language || !validLanguages.includes(language as Language)) {
    return Response.json({ error: 'Invalid language' }, { status: 400 });
  }

  const [conversation] = await db
    .select()
    .from(schema.conversations)
    .where(eq(schema.conversations.id, conversation_id));

  if (!conversation) {
    return Response.json({ error: 'Conversation not found' }, { status: 404 });
  }
  if (conversation.userId !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [messagesCount] = await db
    .select({ count: count() })
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, conversation_id));

  const expertId = new_expert as ExpertId;
  const lang = language as Language;
  let transitionMessage: string;

  if (!messagesCount?.count || messagesCount.count === 0) {
    transitionMessage = getWelcomeMessage(expertId, lang);
  } else {
    const recentMessages = await db
      .select({ role: schema.messages.role, content: schema.messages.content })
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, conversation_id))
      .orderBy(asc(schema.messages.createdAt))
      .limit(10);

    const context = recentMessages
      .map((m) => `${m.role === 'user' ? 'User' : 'Previous Guide'}: ${m.content}`)
      .join('\n\n');

    const expertInfo = getExpertInfo(expertId, lang);
    const switchPrompt = getSwitchPrompt(expertInfo.name, expertInfo.title, context, lang);

    try {
      const deepseek = createDeepSeekClient();
      const response = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: switchPrompt }],
        max_tokens: 512,
        temperature: 0.8,
        stream: false,
      });
      transitionMessage = response.choices[0]?.message?.content || getWelcomeMessage(expertId, lang);
    } catch (err) {
      console.error('DeepSeek switch prompt failed:', err);
      transitionMessage = getWelcomeMessage(expertId, lang);
    }
  }

  await db
    .update(schema.conversations)
    .set({ expert: expertId, updatedAt: new Date() })
    .where(eq(schema.conversations.id, conversation_id));

  await db.insert(schema.messages).values({
    conversationId: conversation_id,
    role: 'assistant',
    content: transitionMessage,
  });

  return Response.json({ content: transitionMessage, expert: new_expert });
}
