# 支付系统门控修复设计文档

> 创建日期：2026-05-12 | 涉及模块：subscription、chat、webhook

---

## 一、问题诊断

| # | 严重度 | 问题 | 影响 |
|---|--------|------|------|
| 1 | 🔴 | `/api/chat/switch` 无任何订阅门控 | 未登录仅需 session，trial 耗尽、已过期用户均可直接调用，完全绕过 chat route 的所有限制 |
| 2 | 🔴 | switch route 无 Starter 专家限制 | Starter 用户可通过 switch 直接切到 Noah/Adrian |
| 3 | 🟡 | Webhook 缺少 `BILLING.SUBSCRIPTION.RENEWED` | 自动续费后 `currentPeriodEnd` 不更新，到期判断失准 |
| 4 | 🟡 | Webhook `UPDATED` 不更新方案等级 | 用户在 PayPal 侧升级/降级后，数据库 `paypalPlanId` 和 `variantName` 不变 |
| 5 | 🟢 | `/api/subscription/trial` 是死代码 | 不被前端调用但保留完整路由，可被外部直接调用来干扰计数 |

---

## 二、方案设计

### 2.1 提取 trial 门控为共享函数

**文件**：`lib/subscription/gate.ts`（新增）

chat route 和 switch route 的 trial 检查逻辑完全一致（~40 行），抽到独立模块消除重复。

```ts
// lib/subscription/gate.ts
// 订阅门控：trial 原子检查 + 订阅状态查询

import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

interface TrialResult {
  allowed: boolean;
  trialUsed: number;
  trialLimit: number;
}

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
      await tx.insert(schema.profiles)
        .values({ userId, trialUsed: 1 })
        .onConflictDoNothing();

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

### 2.2 switch route 插入门控

**文件**：`app/api/chat/switch/route.ts`（修改）

在 session 校验之后、body 解析之前插入：

```ts
// ---- 订阅门控 ----
const [subscription] = await db
  .select({ variant: schema.subscriptions.variantName, status: schema.subscriptions.status })
  .from(schema.subscriptions)
  .where(eq(schema.subscriptions.userId, session.user.id));

const isSubscribed = subscription && subscription.status === 'active';
const variant = subscription?.variant || null;

// 未订阅 → trial 原子检查
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

// Starter 专家限制：仅开放 Evan 和 Liam
if (isSubscribed && variant === 'starter') {
  const starterExperts = ['evan', 'liam'];
  if (!starterExperts.includes(new_expert)) {
    return Response.json({
      error: 'Expert locked',
      code: 'EXPERT_LOCKED',
      message: 'Upgrade to Pro or Ultra to unlock all experts.',
    }, { status: 403 });
  }
}
```

注意：`new_expert` 变量需在门控之前从 body 解析出来，或者调整解析顺序。推荐将 body 解析移到 session 校验之后、门控之前。

### 2.3 chat route 使用共享函数

**文件**：`app/api/chat/route.ts`（修改）

将内联的 trial 事务逻辑替换为调用 `checkTrialAccess`：

```ts
import { checkTrialAccess } from '@/lib/subscription/gate';

// 替换现有的 db.transaction(...) 块
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
  trialUsed = trialResult.trialUsed; // 保留变量供 SSE 流返回
}
```

### 2.4 Webhook 事件补全

**文件**：`app/api/subscription/webhook/route.ts`（修改）

#### 新增 RENEWED：

```ts
case 'BILLING.SUBSCRIPTION.RENEWED': {
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

#### 增强 UPDATED（在现有 case 内增加 plan/variant 同步）：

```ts
case 'BILLING.SUBSCRIPTION.UPDATED': {
  const updates: Record<string, unknown> = {};

  // 新增：方案等级同步
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

### 2.5 删除 trial API

**文件**：`app/api/subscription/trial/route.ts`（删除）

不再被任何代码调用，直接删除。

---

## 三、不影响的部分

- activate API（已有 upsert，无需改）
- status API
- 数据库 schema（不变）
- 所有前端组件
- 现有的 ACTIVATED / CANCELLED / EXPIRED / PAYMENT_FAILED 处理

---

## 四、实施顺序

| 步骤 | 内容 | 依赖 |
|------|------|------|
| 1 | 新增 `lib/subscription/gate.ts` | 无 |
| 2 | 修改 `app/api/chat/route.ts` — 使用共享函数 | 步骤 1 |
| 3 | 修改 `app/api/chat/switch/route.ts` — 插入门控 + 使用共享函数 | 步骤 1 |
| 4 | 修改 `app/api/subscription/webhook/route.ts` — 补全事件 | 无 |
| 5 | 删除 `app/api/subscription/trial/route.ts` | 无 |
