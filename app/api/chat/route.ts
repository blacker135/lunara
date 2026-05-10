// POST /api/chat — SSE 流式对话 API

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';
import { createDeepSeekClient } from '@/lib/deepseek/client';
import { getExpertPrompt } from '@/lib/prompts/experts';
import type { ExpertId, Language } from '@/lib/prompts/experts';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!checkRateLimit(session.user.id)) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let body: { conversation_id?: string; expert?: string; message?: string; language?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { conversation_id, expert, message, language } = body;

  const validExperts: ExpertId[] = ['evan', 'liam', 'noah', 'adrian'];
  if (!expert || !validExperts.includes(expert as ExpertId)) {
    return Response.json({ error: 'Invalid expert' }, { status: 400 });
  }

  const validLanguages: Language[] = ['en', 'zh'];
  if (!language || !validLanguages.includes(language as Language)) {
    return Response.json({ error: 'Invalid language' }, { status: 400 });
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return Response.json({ error: 'Message is required' }, { status: 400 });
  }

  let conversationId = conversation_id;

  if (!conversationId) {
    const autoTitle = message.length > 50 ? message.slice(0, 50) + '...' : message;
    const [newConv] = await db
      .insert(schema.conversations)
      .values({
        userId: session.user.id,
        expert: expert as ExpertId,
        language: language as Language,
        title: autoTitle,
      })
      .returning({ id: schema.conversations.id });

    if (!newConv) {
      return Response.json({ error: 'Failed to create conversation' }, { status: 500 });
    }
    conversationId = newConv.id;
  } else {
    const [existingConv] = await db
      .select({ id: schema.conversations.id, userId: schema.conversations.userId })
      .from(schema.conversations)
      .where(eq(schema.conversations.id, conversationId));

    if (!existingConv) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }
    if (existingConv.userId !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  await db.insert(schema.messages).values({
    conversationId,
    role: 'user',
    content: message,
  });

  const history = await db
    .select({ role: schema.messages.role, content: schema.messages.content })
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, conversationId))
    .orderBy(asc(schema.messages.createdAt))
    .limit(20);

  const systemPrompt = getExpertPrompt(expert as ExpertId, language as Language);
  const chatMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  const deepseek = createDeepSeekClient();
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let fullContent = '';
      try {
        const stream = await deepseek.chat.completions.create({
          model: 'deepseek-chat',
          messages: chatMessages,
          max_tokens: 1024,
          temperature: 0.8,
          stream: true,
        });

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || '';
          if (delta) {
            fullContent += delta;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
          }
        }

        if (fullContent) {
          await db.insert(schema.messages).values({
            conversationId,
            role: 'assistant',
            content: fullContent,
          });
        }

        await db
          .update(schema.conversations)
          .set({ updatedAt: new Date() })
          .where(eq(schema.conversations.id, conversationId));

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        console.error('Stream error:', err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'AI stream generation failed' })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
