# 会员 & 支付系统完善 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复门控并发漏洞、统一重复代码、完善 webhook、增加 tokens 字段和 Ultra 上限、新增设置页面

**Architecture:** 提取共享 `checkSubscriptionGate()` 函数供 chat/switch 复用；webhook 用 upsert 替代裸 UPDATE；设置页面用服务端 page + 客户端 Modal 模式

**Tech Stack:** Next.js 16 App Router, Better Auth, Drizzle ORM + PostgreSQL, next-intl, Tailwind CSS

---

### Task 1: Schema 变更 — subscriptionStatusEnum + messages.tokens

**Files:**
- Modify: `lib/db/schema.ts:74-93`

- [ ] **Step 1: 修改 schema.ts — 添加 suspended 到 enum，添加 tokens 到 messages 表**

```ts
// lib/db/schema.ts 第 74-78 行，替换 subscriptionStatusEnum
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'cancelled',
  'expired',
  'suspended',
]);
```

```ts
// lib/db/schema.ts 第 126-137 行，在 messages 表定义中，role 字段后面加 tokens
// 在 content: text('content').notNull(), 之后添加：
  tokens: integer('tokens'),
```

完整改动后 messages 表定义：
```ts
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull(),
  content: text('content').notNull(),
  tokens: integer('tokens'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  conversationIdx: index('idx_messages_conversation').on(table.conversationId),
  conversationCreatedIdx: index('idx_messages_conv_created').on(table.conversationId, table.createdAt),
}));
```

- [ ] **Step 2: 运行数据库迁移**

执行以下 SQL：
```sql
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'suspended';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS tokens integer;
```

- [ ] **Step 3: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: add suspended status to subscription enum, add tokens column to messages"
```

---

### Task 2: 重写订阅门控模块 `lib/subscription/gate.ts`

**Files:**
- Rewrite: `lib/subscription/gate.ts`

- [ ] **Step 1: 重写 gate.ts 完整内容**

```ts
// lib/subscription/gate.ts
// 订阅门控：统一检查 trial + 订阅状态 + 专家锁定
// 供 chat 和 switch 路由复用

import { db, schema } from '@/lib/db';
import { eq, and, gte, count } from 'drizzle-orm';
import type { ExpertId } from '@/lib/prompts/experts';

/** 试用消息上限 */
const TRIAL_LIMIT = 3;

/** 日限额配置 */
const DAILY_LIMITS: Record<string, number> = {
  starter: 30,
  pro: 100,
};

/** Starter 可访问的专家 */
const STARTER_EXPERTS: ExpertId[] = ['evan', 'liam'];

/** 允许通过的结果 */
interface GateAllowed {
  allowed: true;
  isSubscribed: boolean;
  variant: string | null;
  trialUsed: number;
}

/** 拒绝的结果 */
interface GateDenied {
  allowed: false;
  code: 'TRIAL_EXHAUSTED' | 'DAILY_LIMIT' | 'EXPERT_LOCKED';
  status: 402 | 429 | 403;
  message: string;
}

export type GateResult = GateAllowed | GateDenied;

export interface TrialResult {
  allowed: boolean;
  trialUsed: number;
  trialLimit: number;
}

/**
 * 试用消息原子检查与递增
 * 通过 PostgreSQL 事务 + SELECT FOR UPDATE 保证并发安全
 */
export async function checkTrialAccess(userId: string): Promise<TrialResult> {
  const result = await db.transaction(async (tx) => {
    await tx
      .insert(schema.profiles)
      .values({ userId, trialUsed: 0 })
      .onConflictDoNothing({ target: schema.profiles.userId });

    const [profile] = await tx
      .select({ trialUsed: schema.profiles.trialUsed })
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, userId))
      .for('update');

    const current = profile!.trialUsed ?? 0;
    if (current >= TRIAL_LIMIT) {
      return { allowed: false, trialUsed: current, trialLimit: TRIAL_LIMIT };
    }

    const next = current + 1;
    await tx
      .update(schema.profiles)
      .set({ trialUsed: next })
      .where(eq(schema.profiles.userId, userId));

    return { allowed: true, trialUsed: next, trialLimit: TRIAL_LIMIT };
  });

  return result;
}

/**
 * 订阅门控统一检查
 * 按顺序检查：trial → 专家锁定 → 日限额
 *
 * @param userId - 用户 ID
 * @param expert - 当前请求的专家 ID
 * @param trial - 试用模式：'consume' 吞并计数 | 'peek' 只读检查
 */
export async function checkSubscriptionGate(
  userId: string,
  expert: ExpertId,
  trial: 'consume' | 'peek',
): Promise<GateResult> {
  // 1. 查询订阅状态
  const [subscription] = await db
    .select({ variant: schema.subscriptions.variantName, status: schema.subscriptions.status })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, userId));

  const isSubscribed = !!subscription && subscription.status === 'active';
  const variant = subscription?.variant || null;

  // 2. 未订阅 → trial 检查
  if (!isSubscribed) {
    if (trial === 'consume') {
      const tr = await checkTrialAccess(userId);
      if (!tr.allowed) {
        return {
          allowed: false,
          code: 'TRIAL_EXHAUSTED',
          status: 402,
          message: `Trial exhausted: ${tr.trialUsed}/${tr.trialLimit}`,
        };
      }
      return { allowed: true, isSubscribed: false, variant: null, trialUsed: tr.trialUsed };
    }

    // peek 模式：只读 trial 检查
    const [profile] = await db
      .select({ trialUsed: schema.profiles.trialUsed })
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, userId));

    const trialUsed = profile?.trialUsed || 0;
    if (trialUsed >= TRIAL_LIMIT) {
      return {
        allowed: false,
        code: 'TRIAL_EXHAUSTED',
        status: 402,
        message: `Trial exhausted: ${trialUsed}/${TRIAL_LIMIT}`,
      };
    }
    return { allowed: true, isSubscribed: false, variant: null, trialUsed };
  }

  // 3. 已订阅 → 专家锁定检查
  if (variant === 'starter' && !STARTER_EXPERTS.includes(expert)) {
    return {
      allowed: false,
      code: 'EXPERT_LOCKED',
      status: 403,
      message: 'Upgrade to Pro or Ultra to unlock this expert.',
    };
  }

  // 4. 已订阅 → 日限额检查（Ultra 无限制）
  if (variant === 'starter' || variant === 'pro') {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [result] = await db
      .select({ count: count() })
      .from(schema.messages)
      .innerJoin(schema.conversations, eq(schema.messages.conversationId, schema.conversations.id))
      .where(
        and(
          eq(schema.conversations.userId, userId),
          eq(schema.messages.role, 'user'),
          gte(schema.messages.createdAt, todayStart),
        ),
      );

    const limit = DAILY_LIMITS[variant];
    if ((result?.count || 0) >= limit) {
      return {
        allowed: false,
        code: 'DAILY_LIMIT',
        status: 429,
        message: `Daily limit reached: ${limit} messages per day.`,
      };
    }
  }

  return { allowed: true, isSubscribed: true, variant, trialUsed: 0 };
}
```

- [ ] **Step 2: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add lib/subscription/gate.ts
git commit -m "refactor: extract shared subscription gate function for chat and switch routes"
```

---

### Task 3: 更新 chat 路由使用新 gate

**Files:**
- Modify: `app/api/chat/route.ts`

- [ ] **Step 1: 修改 chat/route.ts 的门控部分**

将第 10 行 import 改为引入新 gate：
```ts
// 删除: import { checkTrialAccess } from '@/lib/subscription/gate';
// 改为:
import { checkSubscriptionGate } from '@/lib/subscription/gate';
```

将第 41-96 行的门控逻辑替换为：

```ts
  // ---------- 订阅门控 ----------
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

  // 统一门控检查（consume 模式：原子递增 trial 计数）
  const gateResult = await checkSubscriptionGate(session.user.id, expert as ExpertId, 'consume');
  if (!gateResult.allowed) {
    return Response.json({ error: gateResult.message, code: gateResult.code }, { status: gateResult.status });
  }
  const { isSubscribed, variant } = gateResult;
  // ---------- 门控结束 ----------
```

- [ ] **Step 2: 删除 chat/route.ts 中不再需要的 import**

删除第 5 行的 import 中的 `and, gte, count`（如果不再使用 — 实际上 gte 移到了 gate 中，但 chat 中不再需要日限额查询），删除 `eq` 引用中的不再需要的部分。

保留的 imports：
```ts
import { db, schema } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';
```

- [ ] **Step 3: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: 运行测试**

Run: `npm test`
Expected: 现有测试通过

- [ ] **Step 5: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "refactor: use unified subscription gate in chat route"
```

---

### Task 4: 更新 switch 路由使用新 gate

**Files:**
- Modify: `app/api/chat/switch/route.ts`

- [ ] **Step 1: 修改 switch/route.ts 的门控部分**

替换 import 和第 40-106 行门控逻辑为：

```ts
// 第 3 行添加:
import { checkSubscriptionGate } from '@/lib/subscription/gate';

// 删除现有 import 中的 and, gte, count（不再需要）

// 第 40-106 行替换为:
  // ---- 订阅门控 ----
  const gateResult = await checkSubscriptionGate(session.user.id, new_expert as ExpertId, 'peek');
  if (!gateResult.allowed) {
    return Response.json({ error: gateResult.message, code: gateResult.code }, { status: gateResult.status });
  }
  const { isSubscribed, variant } = gateResult;
  // ---- 门控结束 ----
```

- [ ] **Step 2: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/switch/route.ts
git commit -m "refactor: use unified subscription gate in switch route"
```

---

### Task 5: 修复 PayPal Webhook

**Files:**
- Modify: `app/api/subscription/webhook/route.ts`

- [ ] **Step 1: 重写 webhook/route.ts**

```ts
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

/** PayPal 状态 → DB status */
function mapStatus(paypalStatus: string): string {
  const statusMap: Record<string, string> = {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
  };
  return statusMap[paypalStatus] || 'cancelled';
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
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.RENEWED': {
        // upsert：webhook 可能在 activate API 之前到达
        const variantName = planId ? (getVariantName(planId) || 'starter') : 'starter';

        await db
          .insert(schema.subscriptions)
          .values({
            paypalSubscriptionId: subId,
            paypalPlanId: planId,
            variantName,
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: nextBilling ? new Date(nextBilling) : undefined,
            userId: '', // 占位；webhook 无 userId，后续可通过 activate API 更新
          })
          .onConflictDoUpdate({
            target: schema.subscriptions.paypalSubscriptionId,
            set: {
              status: 'active',
              ...(planId ? { paypalPlanId: planId, variantName } : {}),
              ...(nextBilling ? { currentPeriodEnd: new Date(nextBilling) } : {}),
              updatedAt: new Date(),
            },
          });
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
      case 'BILLING.SUBSCRIPTION.PAYMENT_FAILED': {
        const newStatus = mapStatus(
          eventType === 'BILLING.SUBSCRIPTION.SUSPENDED' ? 'SUSPENDED'
            : eventType === 'BILLING.SUBSCRIPTION.EXPIRED' ? 'EXPIRED'
            : eventStatus || 'CANCELLED'
        );

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

        if (planId) {
          updates.paypalPlanId = planId;
          const newVariant = getVariantName(planId);
          if (newVariant) updates.variantName = newVariant;
        }

        if (eventStatus) {
          updates.status = mapStatus(eventStatus);
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
```

注意：webhook upsert 中 `userId` 需要占位值（设为空字符串），因为 webhook 事件不包含 userId。实际上，如果 webhook 先于 activate 到达，activate API 的 onConflictDoUpdate 会回填正确的 userId。

为了支持这个流程，schema 中 subscriptions.userId 需要去掉 `notNull()`，或者保持 notNull 但用空字符串占位（activate 时会覆盖）。

检查当前 schema: `userId: text('user_id').notNull()` — 必须 not null。那么更实际的做法是：webhook upsert 时使用空字符串占位，activate API 会用正确的 userId 覆盖。

- [ ] **Step 2: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add app/api/subscription/webhook/route.ts
git commit -m "fix: use upsert for webhook ACTIVATED/RENEWED, add SUSPENDED status handling"
```

---

### Task 6: 更新 activate API 补充 userId 占位修复

**Files:**
- Modify: `app/api/subscription/activate/route.ts`

当前 activate 用 upsert，已能处理 webhook 先到达的情况（用户发 activate 时 webhook 可能已插入占位行）。只需确认 upsert 逻辑完整覆盖 userId。

- [ ] **Step 1: 确认 activate route 的 upsert 包含 userId**

查看当前代码第 41-66 行已经用了 `onConflictDoUpdate`，但 `userId` 在 set 中没有包含。如果 webhook 先插入了占位行（userId=''），activate 应该覆盖 userId。

修改 upsert 的 set 部分，添加 userId：
```ts
.onConflictDoUpdate({
  target: schema.subscriptions.paypalSubscriptionId,
  set: {
    userId: session.user.id,
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
```

- [ ] **Step 2: 验证编译**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add app/api/subscription/activate/route.ts
git commit -m "fix: include userId in activate upsert to fix webhook-first race condition"
```

---

### Task 7: Ultra 对话上限检查

**Files:**
- Modify: `app/api/conversations/route.ts`

- [ ] **Step 1: 在 POST 函数中添加 Ultra 上限检查**

在 `POST /api/conversations` 中，auth 验证之后、插入之前添加：

```ts
// 在 session 验证之后（约第 36 行），body 解析之后添加：

  // Ultra 用户对话上限检查
  const [subscription] = await db
    .select({ variant: schema.subscriptions.variantName, status: schema.subscriptions.status })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, session.user.id));

  if (subscription && subscription.status === 'active' && subscription.variant === 'ultra') {
    const [cnt] = await db
      .select({ count: count() })
      .from(schema.conversations)
      .where(eq(schema.conversations.userId, session.user.id));

    if ((cnt?.count || 0) >= 1000) {
      return Response.json(
        { error: 'Conversation limit reached', code: 'CONVERSATION_LIMIT' },
        { status: 403 },
      );
    }
  }
```

需要在文件顶部 import 中添加 `count`：
```ts
import { eq, desc, count } from 'drizzle-orm';
```

- [ ] **Step 2: 验证编译**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add app/api/conversations/route.ts
git commit -m "feat: add 1000 conversation limit for Ultra users"
```

---

### Task 8: 创建设置页 API 路由

**Files:**
- Create: `app/api/settings/name/route.ts`
- Create: `app/api/settings/email/route.ts`
- Create: `app/api/settings/password/route.ts`

- [ ] **Step 1: 创建 name API**

```ts
// app/api/settings/name/route.ts
// POST /api/settings/name — 更新用户名称

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return Response.json({ error: 'Name is required' }, { status: 400 });
  }

  try {
    await auth.api.updateUser({
      headers: await headers(),
      body: { name: body.name.trim() },
    });
    return Response.json({ success: true });
  } catch (err) {
    console.error('Update name failed:', err);
    return Response.json({ error: 'Failed to update name' }, { status: 500 });
  }
}
```

- [ ] **Step 2: 创建 email API**

```ts
// app/api/settings/email/route.ts
// POST /api/settings/email — 发起邮箱变更（发送验证邮件）

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { newEmail?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.newEmail || typeof body.newEmail !== 'string' || !body.newEmail.includes('@')) {
    return Response.json({ error: 'Valid email is required' }, { status: 400 });
  }

  try {
    await auth.api.changeEmail({
      headers: await headers(),
      body: {
        newEmail: body.newEmail.trim(),
      },
    });
    return Response.json({ success: true });
  } catch (err) {
    console.error('Change email failed:', err);
    return Response.json({ error: 'Failed to send verification email' }, { status: 500 });
  }
}
```

- [ ] **Step 3: 创建 password API**

```ts
// app/api/settings/password/route.ts
// POST /api/settings/password — 修改密码

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.currentPassword || !body.newPassword) {
    return Response.json({ error: 'Current and new password are required' }, { status: 400 });
  }

  if (body.newPassword.length < 8) {
    return Response.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
  }

  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        revokeOtherSessions: false,
      },
    });
    return Response.json({ success: true });
  } catch (err) {
    console.error('Change password failed:', err);
    return Response.json({ error: 'Failed to change password. Check your current password.' }, { status: 400 });
  }
}
```

- [ ] **Step 4: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add app/api/settings/
git commit -m "feat: add settings API routes for name, email, and password"
```

---

### Task 9: 创建设置页面组件

**Files:**
- Create: `components/settings/SettingsPage.tsx`
- Create: `app/[lang]/settings/page.tsx`

- [ ] **Step 1: 创建设置页面服务端组件**

```tsx
// app/[lang]/settings/page.tsx
// /[lang]/settings — 用户设置页面（服务端入口）

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SettingsPage } from '@/components/settings/SettingsPage';

export default async function SettingsRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect(`/${lang}/auth/login?redirect=/settings`);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <SettingsPage
        lang={lang}
        userName={session.user.name || ''}
        userEmail={session.user.email}
      />
    </main>
  );
}
```

- [ ] **Step 2: 创建设置页面客户端组件 — 主结构**

```tsx
// components/settings/SettingsPage.tsx
// 设置页面客户端组件：展示账户/安全/订阅信息 + Modal 编辑

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';

interface SettingsPageProps {
  lang: string;
  userName: string;
  userEmail: string;
}

interface SubscriptionInfo {
  variant: string | null;
  status: string | null;
  periodEnd: string | null;
  trialUsed: number;
  trialLimit: number;
}

export function SettingsPage({ lang, userName, userEmail }: SettingsPageProps) {
  const t = useTranslations('settings');
  const tNav = useTranslations('nav');
  const router = useRouter();

  // 订阅状态
  const [sub, setSub] = useState<SubscriptionInfo>({
    variant: null, status: null, periodEnd: null, trialUsed: 0, trialLimit: 3,
  });
  const [subLoading, setSubLoading] = useState(true);

  // Modal 状态
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // 加载中状态
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/subscription/status')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setSub({
            variant: data.variant,
            status: data.status,
            periodEnd: data.period_end,
            trialUsed: data.trial_used ?? 0,
            trialLimit: data.trial_limit ?? 3,
          });
        }
      })
      .catch(console.error)
      .finally(() => setSubLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      window.location.href = `/${lang}`;
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '--';
    return new Date(iso).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US');
  };

  const statusLabel = sub.status ? t(sub.status) : '--';
  const planLabel = sub.variant ? sub.variant.charAt(0).toUpperCase() + sub.variant.slice(1) : (sub.trialUsed >= sub.trialLimit ? t('expired') : 'Trial');

  return (
    <>
      <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>

      {/* 账户信息 */}
      <section className="mt-8 rounded-[20px] border border-gray-100 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">{t('account')}</h2>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">{t('name')}</p>
              <p className="text-sm text-text-primary">{userName || '--'}</p>
            </div>
            <button
              onClick={() => { setError(''); setSuccess(''); setNameModalOpen(true); }}
              className="rounded-[12px] px-3 py-1.5 text-xs font-medium text-[#FF7A59] hover:bg-[#FF7A59]/10 transition-colors"
            >
              {t('edit')}
            </button>
          </div>

          <div className="border-t border-gray-50" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">{t('email')}</p>
              <p className="text-sm text-text-primary">{userEmail}</p>
            </div>
            <button
              onClick={() => { setError(''); setSuccess(''); setEmailModalOpen(true); }}
              className="rounded-[12px] px-3 py-1.5 text-xs font-medium text-[#FF7A59] hover:bg-[#FF7A59]/10 transition-colors"
            >
              {t('edit')}
            </button>
          </div>
        </div>
      </section>

      {/* 安全 */}
      <section className="mt-4 rounded-[20px] border border-gray-100 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">{t('security')}</h2>
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">{t('password')}</p>
              <p className="text-sm text-text-primary">********</p>
            </div>
            <button
              onClick={() => { setError(''); setSuccess(''); setPasswordModalOpen(true); }}
              className="rounded-[12px] px-3 py-1.5 text-xs font-medium text-[#FF7A59] hover:bg-[#FF7A59]/10 transition-colors"
            >
              {t('change')}
            </button>
          </div>
        </div>
      </section>

      {/* 订阅信息 */}
      <section className="mt-4 rounded-[20px] border border-gray-100 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">{t('subscription')}</h2>
        {subLoading ? (
          <p className="mt-4 text-sm text-text-secondary">Loading...</p>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">{t('plan')}</span>
              <span className="text-sm font-medium text-text-primary">{planLabel}</span>
            </div>
            {sub.status && (
              <div className="flex justify-between">
                <span className="text-sm text-text-secondary">{t('status')}</span>
                <span className={`text-sm font-medium capitalize ${sub.status === 'active' ? 'text-green-600' : 'text-text-secondary'}`}>
                  {statusLabel}
                </span>
              </div>
            )}
            {sub.periodEnd && (
              <div className="flex justify-between">
                <span className="text-sm text-text-secondary">{t('expires')}</span>
                <span className="text-sm text-text-primary">{formatDate(sub.periodEnd)}</span>
              </div>
            )}
            {!sub.variant && (
              <div className="flex justify-between">
                <span className="text-sm text-text-secondary">{t('messages')}</span>
                <span className="text-sm text-text-primary">
                  {sub.trialUsed} / {sub.trialLimit}
                </span>
              </div>
            )}
            {sub.variant && (
              <div className="pt-2">
                <a
                  href="https://www.paypal.com/myaccount/autopay/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-[#FF7A59] hover:underline"
                >
                  {t('manageSubscription')} →
                </a>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 退出登录 */}
      <section className="mt-4 rounded-[20px] border border-gray-100 bg-white p-6">
        <button
          onClick={handleLogout}
          className="w-full text-left text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
        >
          {tNav('logout')}
        </button>
      </section>

      {/* ---- Modals ---- */}

      {/* Name Modal */}
      {nameModalOpen && (
        <NameModal
          currentName={userName}
          onClose={() => setNameModalOpen(false)}
          onSuccess={() => { setNameModalOpen(false); window.location.reload(); }}
          t={t}
          lang={lang}
        />
      )}

      {/* Email Modal */}
      {emailModalOpen && (
        <EmailModal
          currentEmail={userEmail}
          onClose={() => setEmailModalOpen(false)}
          t={t}
        />
      )}

      {/* Password Modal */}
      {passwordModalOpen && (
        <PasswordModal
          onClose={() => setPasswordModalOpen(false)}
          t={t}
        />
      )}
    </>
  );
}

// ---- Modal 子组件 ----

function NameModal({ currentName, onClose, onSuccess, t, lang }: {
  currentName: string;
  onClose: () => void;
  onSuccess: () => void;
  t: any;
  lang: string;
}) {
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/settings/name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || t('error'));
      }
    } catch {
      setError(t('error'));
    } finally {
      setSaving(false);
    }
  };

  return <ModalOverlay onClose={onClose}>
    <div className="w-full max-w-sm rounded-[20px] bg-white p-6">
      <h3 className="text-lg font-semibold text-text-primary">{t('edit')} {t('name')}</h3>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-4 w-full rounded-[12px] border border-gray-200 px-3 py-2 text-sm focus:border-[#FF7A59] focus:outline-none"
      />
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <div className="mt-4 flex justify-end gap-3">
        <button onClick={onClose} className="rounded-[12px] px-4 py-2 text-sm text-text-secondary hover:bg-gray-100">{t('cancel')}</button>
        <button onClick={handleSave} disabled={saving || !name.trim()} className="rounded-[12px] bg-[#FF7A59] px-4 py-2 text-sm font-medium text-white hover:bg-[#FF7A59]/90 disabled:opacity-50">
          {saving ? '...' : t('save')}
        </button>
      </div>
    </div>
  </ModalOverlay>;
}

function EmailModal({ currentEmail, onClose, t }: {
  currentEmail: string;
  onClose: () => void;
  t: any;
}) {
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!email.includes('@')) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: email.trim() }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || t('error'));
      }
    } catch {
      setError(t('error'));
    } finally {
      setSaving(false);
    }
  };

  return <ModalOverlay onClose={onClose}>
    <div className="w-full max-w-sm rounded-[20px] bg-white p-6">
      <h3 className="text-lg font-semibold text-text-primary">{t('edit')} {t('email')}</h3>
      <p className="mt-1 text-xs text-text-secondary">{currentEmail}</p>
      {!success ? (
        <>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('newEmail')}
            className="mt-3 w-full rounded-[12px] border border-gray-200 px-3 py-2 text-sm focus:border-[#FF7A59] focus:outline-none"
          />
          <p className="mt-1 text-xs text-text-secondary">{t('emailHint')}</p>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={onClose} className="rounded-[12px] px-4 py-2 text-sm text-text-secondary hover:bg-gray-100">{t('cancel')}</button>
            <button onClick={handleSave} disabled={saving || !email.includes('@')} className="rounded-[12px] bg-[#FF7A59] px-4 py-2 text-sm font-medium text-white hover:bg-[#FF7A59]/90 disabled:opacity-50">
              {saving ? '...' : 'Send Verification'}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-green-600">{t('emailSent')}</p>
          <button onClick={onClose} className="mt-3 rounded-[12px] px-4 py-2 text-sm text-[#FF7A59] hover:bg-[#FF7A59]/10">{t('cancel')}</button>
        </div>
      )}
    </div>
  </ModalOverlay>;
}

function PasswordModal({ onClose, t }: {
  onClose: () => void;
  t: any;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || t('error'));
      }
    } catch {
      setError(t('error'));
    } finally {
      setSaving(false);
    }
  };

  return <ModalOverlay onClose={onClose}>
    <div className="w-full max-w-sm rounded-[20px] bg-white p-6">
      <h3 className="text-lg font-semibold text-text-primary">{t('changePassword')}</h3>
      {!success ? (
        <>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder={t('currentPassword')} className="mt-4 w-full rounded-[12px] border border-gray-200 px-3 py-2 text-sm focus:border-[#FF7A59] focus:outline-none" />
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('newPassword')} className="mt-3 w-full rounded-[12px] border border-gray-200 px-3 py-2 text-sm focus:border-[#FF7A59] focus:outline-none" />
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('confirmPassword')} className="mt-3 w-full rounded-[12px] border border-gray-200 px-3 py-2 text-sm focus:border-[#FF7A59] focus:outline-none" />
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={onClose} className="rounded-[12px] px-4 py-2 text-sm text-text-secondary hover:bg-gray-100">{t('cancel')}</button>
            <button onClick={handleSave} disabled={saving || !currentPassword || !newPassword || !confirmPassword} className="rounded-[12px] bg-[#FF7A59] px-4 py-2 text-sm font-medium text-white hover:bg-[#FF7A59]/90 disabled:opacity-50">
              {saving ? '...' : t('changePassword')}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-green-600">{t('passwordChanged')}</p>
          <button onClick={onClose} className="mt-3 rounded-[12px] px-4 py-2 text-sm text-[#FF7A59] hover:bg-[#FF7A59]/10">{t('cancel')}</button>
        </div>
      )}
    </div>
  </ModalOverlay>;
}

// Modal 遮罩组件
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add app/\[lang\]/settings/ components/settings/
git commit -m "feat: add settings page with name, email, password modals and subscription info"
```

---

### Task 10: 导航栏添加设置入口

**Files:**
- Modify: `components/common/NavbarClient.tsx`

- [ ] **Step 1: 在下拉菜单中添加 Settings 链接**

在 `NavbarClient` 的下拉菜单中（`dropdownOpen` 块内），在用户名显示之后、分隔线之前添加 Settings 入口：

在 `<div className="my-1 border-t border-gray-100" />` 之前插入：

```tsx
                  <Link
                    href={`/${lang}/settings`}
                    role="menuitem"
                    className="block w-full px-4 py-2 text-left text-sm text-[#777777] hover:bg-gray-50 hover:text-[#FF7A59] transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Settings
                  </Link>
```

完整的下拉菜单（替换原有的 dropdownOpen 块内容）：

```tsx
              {dropdownOpen && (
                <div role="menu" className="absolute right-0 top-full mt-2 w-48 rounded-[16px] bg-white py-2 shadow-soft border border-gray-100">
                  <div className="px-4 py-2 text-sm text-[#777777] truncate">
                    {user.name || user.email}
                  </div>
                  <div className="my-1 border-t border-gray-100" />
                  <Link
                    href={`/${lang}/settings`}
                    role="menuitem"
                    className="block w-full px-4 py-2 text-left text-sm text-[#777777] hover:bg-gray-50 hover:text-[#FF7A59] transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    role="menuitem"
                    className="w-full px-4 py-2 text-left text-sm text-[#777777] hover:bg-gray-50 hover:text-[#FF7A59] transition-colors"
                  >
                    {t('logout')}
                  </button>
                </div>
              )}
```

- [ ] **Step 2: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add components/common/NavbarClient.tsx
git commit -m "feat: add Settings link to navbar user dropdown"
```

---

### Task 11: i18n 翻译键

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/zh.json`

- [ ] **Step 1: 在 en.json 尾部（最后一个 `}` 之前）添加 settings 命名空间**

```json
  "settings": {
    "title": "Settings",
    "account": "Account",
    "security": "Security",
    "subscription": "Subscription",
    "name": "Name",
    "email": "Email",
    "password": "Password",
    "edit": "Edit",
    "change": "Change",
    "save": "Save",
    "cancel": "Cancel",
    "currentPassword": "Current Password",
    "newPassword": "New Password",
    "confirmPassword": "Confirm Password",
    "changePassword": "Change Password",
    "newName": "New Name",
    "newEmail": "New Email",
    "emailHint": "A verification email will be sent to your new address.",
    "plan": "Plan",
    "status": "Status",
    "expires": "Expires",
    "messages": "Messages",
    "perDay": "per day",
    "unlimited": "Unlimited",
    "manageSubscription": "Manage Subscription",
    "logout": "Logout",
    "active": "Active",
    "suspended": "Suspended",
    "cancelled": "Cancelled",
    "expired": "Expired",
    "passwordChanged": "Password changed successfully",
    "nameUpdated": "Name updated successfully",
    "emailSent": "Verification email sent",
    "error": "Something went wrong"
  }
}
```

- [ ] **Step 2: 在 zh.json 尾部添加 settings 命名空间**

```json
  "settings": {
    "title": "设置",
    "account": "账户",
    "security": "安全",
    "subscription": "订阅",
    "name": "名称",
    "email": "邮箱",
    "password": "密码",
    "edit": "编辑",
    "change": "修改",
    "save": "保存",
    "cancel": "取消",
    "currentPassword": "当前密码",
    "newPassword": "新密码",
    "confirmPassword": "确认密码",
    "changePassword": "修改密码",
    "newName": "新名称",
    "newEmail": "新邮箱",
    "emailHint": "验证邮件将发送至您的新邮箱地址。",
    "plan": "方案",
    "status": "状态",
    "expires": "到期",
    "messages": "消息",
    "perDay": "条/天",
    "unlimited": "无限制",
    "manageSubscription": "管理订阅",
    "logout": "退出登录",
    "active": "活跃",
    "suspended": "已暂停",
    "cancelled": "已取消",
    "expired": "已过期",
    "passwordChanged": "密码修改成功",
    "nameUpdated": "名称更新成功",
    "emailSent": "验证邮件已发送",
    "error": "操作失败，请重试"
  }
}
```

- [ ] **Step 3: 验证 JSON 格式**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/zh.json','utf8')); console.log('OK')"`
Expected: OK

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/zh.json
git commit -m "feat: add settings i18n keys for en and zh"
```

---

### Task 12: 数据库迁移

**Files:**
- Run: SQL 迁移命令

- [ ] **Step 1: 执行数据库 DDL**

```bash
psql postgresql://postgres@localhost:5432/lunara -c "
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'suspended';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS tokens integer;
"
```

Note: `ADD VALUE IF NOT EXISTS` 在 PG 9.6+ 中可能不被 ALTER TYPE 支持。如果失败，使用以下 fallback：

```bash
psql postgresql://postgres@localhost:5432/lunara -c "
DO \$\$ BEGIN
  BEGIN
    ALTER TYPE subscription_status ADD VALUE 'suspended';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'Value suspended already exists';
  END;
END \$\$;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS tokens integer;
"
```

- [ ] **Step 2: 验证迁移**

Run:
```bash
psql postgresql://postgres@localhost:5432/lunara -c "\dT+ subscription_status"
psql postgresql://postgres@localhost:5432/lunara -c "\d messages"
```

Expected: subscription_status 包含 suspended; messages 表包含 tokens 列

- [ ] **Step 3: Commit 迁移脚本**

```bash
# 如果有迁移文件则添加
git add -A
git commit -m "chore: run schema migration for suspended status and tokens column"
```

---

### Task 13: 全量验证

- [ ] **Step 1: TypeScript 编译检查**

Run: `npx tsc --noEmit`
Expected: 零错误

- [ ] **Step 2: 运行测试**

Run: `npm test`
Expected: 所有已有测试通过

- [ ] **Step 3: 启动开发服务器验证**

Run: `npm run dev`
测试路径：
- `/zh/settings` — 设置页正常显示
- `/en/settings` — 设置页英文正常显示
- 导航栏头像下拉 → Settings 链接可点击
- 设置页 Name Modal → 编辑并保存
- 设置页 Password Modal → 修改密码
- 设置页订阅信息正常显示

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: final verification - all tests pass, build succeeds"
```
