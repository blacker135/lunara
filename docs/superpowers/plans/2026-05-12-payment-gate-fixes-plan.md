# 支付系统门控修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修补 chat/switch 路由的订阅门控漏洞，补全 PayPal webhook 事件处理，清理死代码。

**Architecture:** 提取 trial 门控为 `lib/subscription/gate.ts` 共享函数，chat 和 switch 路由共用；switch route 新增完整订阅门控；webhook 新增 RENEWED 并增强 UPDATED 的 plan/variant 同步。

**Tech Stack:** Next.js App Router, Drizzle ORM, PostgreSQL, PayPal REST API

---

### Task 1: 创建共享 trial 门控函数

**Files:**
- Create: `lib/subscription/gate.ts`

- [ ] **Step 1: 创建目录并编写门控函数**

```bash
mkdir -p lib/subscription
```

```ts
// lib/subscription/gate.ts
// 订阅门控：trial 原子检查 + 订阅状态查询
// 通过 PostgreSQL 事务 + SELECT FOR UPDATE 保证并发安全

import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

export interface TrialResult {
  allowed: boolean;
  trialUsed: number;
  trialLimit: number;
}

/**
 * 试用消息原子检查与递增
 * 未订阅用户每次发消息时调用，通过行锁防止并发绕过试用限制
 */
export async function checkTrialAccess(userId: string): Promise<TrialResult> {
  const result = await db.transaction(async (tx) => {
    const [profile] = await tx
      .select({ trialUsed: schema.profiles.trialUsed })
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, userId))
      .for('update');

    const current = profile?.trialUsed || 0;

    if (current >= 3) {
      return { allowed: false, trialUsed: current, trialLimit: 3 };
    }

    if (!profile) {
      await tx
        .insert(schema.profiles)
        .values({ userId, trialUsed: 1 })
        .onConflictDoNothing();

      // 并发场景下另一事务可能先插入，需重新读取
      const [reProfile] = await tx
        .select({ trialUsed: schema.profiles.trialUsed })
        .from(schema.profiles)
        .where(eq(schema.profiles.userId, userId))
        .for('update');

      return { allowed: true, trialUsed: reProfile?.trialUsed ?? 1, trialLimit: 3 };
    }

    await tx
      .update(schema.profiles)
      .set({ trialUsed: current + 1 })
      .where(eq(schema.profiles.userId, userId));

    return { allowed: true, trialUsed: current + 1, trialLimit: 3 };
  });

  return result;
}
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add lib/subscription/gate.ts
git commit -m "feat: add shared trial gate function with atomic row locking"
```

---

### Task 2: chat route 使用共享门控函数

**Files:**
- Modify: `app/api/chat/route.ts:49-97`

- [ ] **Step 1: 替换内联 trial 事务为共享函数调用**

在 `app/api/chat/route.ts` 顶部添加导入：

```ts
import { checkTrialAccess } from '@/lib/subscription/gate';
```

将第 49-98 行（`let trialUsed = 0;` 到 `}` 闭合）替换为：

```ts
  let trialUsed = 0;
  if (!isSubscribed) {
    const trialResult = await checkTrialAccess(session.user.id);

    trialUsed = trialResult.trialUsed;

    if (!trialResult.allowed) {
      return Response.json({
        error: 'Trial exhausted',
        code: 'TRIAL_EXHAUSTED',
        trial_used: trialUsed,
        trial_limit: trialResult.trialLimit,
      }, { status: 402 });
    }
  }
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add app/api/chat/route.ts
git commit -m "refactor: use shared trial gate in chat route"
```

---

### Task 3: switch route 插入完整订阅门控

**Files:**
- Modify: `app/api/chat/switch/route.ts:11-34`

- [ ] **Step 1: 添加导入**

在 `app/api/chat/switch/route.ts` 顶部 `import { eq, asc, count } from 'drizzle-orm';` 后添加：

```ts
import { checkTrialAccess } from '@/lib/subscription/gate';
```

- [ ] **Step 2: 将 body 解析移到 session 校验之后**

当前 body 解析在 session 校验和 conversation 鉴权之间。需要将其移到 session 校验之后（紧接其后），以便门控能访问 `new_expert`。

将第 11-34 行（session 校验 + body 解析 + 验证）重新组织为：

```ts
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // body 解析提前到门控之前，以便获取 new_expert 进行专家限制检查
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

  // ---- 订阅门控 ----
  const [subscription] = await db
    .select({ variant: schema.subscriptions.variantName, status: schema.subscriptions.status })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, session.user.id));

  const isSubscribed = subscription && subscription.status === 'active';
  const variant = subscription?.variant || null;

  // 未订阅用户：原子 trial 检查
  if (!isSubscribed) {
    const trialResult = await checkTrialAccess(session.user.id);
    if (!trialResult.allowed) {
      return Response.json({
        error: 'Trial exhausted',
        code: 'TRIAL_EXHAUSTED',
        trial_used: trialResult.trialUsed,
        trial_limit: trialResult.trialLimit,
      }, { status: 402 });
    }
  }

  // Starter 用户：仅开放 Evan 和 Liam
  if (isSubscribed && variant === 'starter') {
    const starterExperts: ExpertId[] = ['evan', 'liam'];
    if (!starterExperts.includes(new_expert as ExpertId)) {
      return Response.json({
        error: 'Expert locked',
        code: 'EXPERT_LOCKED',
        message: 'Upgrade to Pro or Ultra to unlock all experts.',
      }, { status: 403 });
    }
  }
  // ---- 门控结束 ----

  // conversation 鉴权（使用已解析的 conversation_id）
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

  const expertId = new_expert as ExpertId;
  const lang = language as Language;

  // ... 后续代码（立即更新对话专家、消息计数、SSE 流等）保持不变
```

- [ ] **Step 3: 删除原有的重复 body 解析代码**

原文件中 body 解析 + 验证 + conversation 鉴权代码（在 session 校验之后）已被 Step 2 的新代码替换。确认 `conversation_id` 的解构只出现一次，`new_expert` 和 `language` 的验证只出现一次。

- [ ] **Step 4: 验证 TypeScript 编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: 提交**

```bash
git add app/api/chat/switch/route.ts
git commit -m "feat: add subscription gate to switch route (trial + starter limit)"
```

---

### Task 4: Webhook 补全 RENEWED 事件 + 增强 UPDATED

**Files:**
- Modify: `app/api/subscription/webhook/route.ts:47-98`

- [ ] **Step 1: 在 switch 块中新增 RENEWED case**

在 `BILLING.SUBSCRIPTION.ACTIVATED` case 之后（第 60 行 `break;` 后）插入：

```ts
      case 'BILLING.SUBSCRIPTION.RENEWED': {
        // PayPal 自动续费成功 → 更新下一周期结束时间
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
```

- [ ] **Step 2: 增强 UPDATED case，加入 plan/variant 同步**

在 UPDATED case 的 `const updates: Record<string, unknown> = {};` 之后，`if (eventStatus)` 之前，插入 plan/variant 同步逻辑：

```ts
        // 方案升级/降级：同步 planId 和 variantName
        if (planId) {
          updates.paypalPlanId = planId;
          const newVariant = getVariantName(planId);
          if (newVariant) updates.variantName = newVariant;
        }
```

完整的 UPDATED case 变为：

```ts
      case 'BILLING.SUBSCRIPTION.UPDATED': {
        const updates: Record<string, unknown> = {};

        // 方案升级/降级：同步 planId 和 variantName
        if (planId) {
          updates.paypalPlanId = planId;
          const newVariant = getVariantName(planId);
          if (newVariant) updates.variantName = newVariant;
        }

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
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 提交**

```bash
git add app/api/subscription/webhook/route.ts
git commit -m "feat: add RENEWED event and plan/variant sync to webhook UPDATED"
```

---

### Task 5: 删除 trial API 死代码

**Files:**
- Delete: `app/api/subscription/trial/route.ts`

- [ ] **Step 1: 确认 trial route 未被引用**

```bash
grep -r "subscription/trial" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.worktrees --exclude-dir=.git
```

预期：仅在 `app/api/subscription/trial/route.ts` 自身中找到匹配，其他地方无引用。

- [ ] **Step 2: 删除文件**

```bash
rm app/api/subscription/trial/route.ts
# 如果目录为空则也删除
rmdir app/api/subscription/trial 2>/dev/null || true
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 提交**

```bash
git rm app/api/subscription/trial/route.ts
git commit -m "chore: remove unused trial API route"
```

---

### Task 6: 端到端验证

- [ ] **Step 1: 启动开发服务器**

```bash
bash scripts/dev.sh
```

- [ ] **Step 2: 验证 chat route 正常响应**

```bash
# 未登录应返回 401
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/chat -X POST
```

预期：`401`

- [ ] **Step 3: 验证 switch route 正常响应**

```bash
# 未登录应返回 401
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/chat/switch -X POST
```

预期：`401`

- [ ] **Step 4: 验证 trial route 已删除（返回 404）**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/subscription/trial -X PATCH
```

预期：`404`

- [ ] **Step 5: 验证 webhook 路由仍可访问**

```bash
# 无签名时应返回 401
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/subscription/webhook -X POST -H "Content-Type: application/json" -d '{}'
```

预期：`401`（签名验证失败）

- [ ] **Step 6: 运行现有测试确保无回归**

```bash
npx vitest run
```
