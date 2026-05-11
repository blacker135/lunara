# 支付系统完善设计文档

> 创建日期：2026-05-11 | 涉及模块：lemonsqueezy、webhook、chat、cron、schema

---

## 一、问题汇总

| # | 严重度 | 问题 | 影响 |
|---|--------|------|------|
| 1 | 🔴 | Webhook VariantMap 缺失 7 个 domestic/test ID | 国内用户订阅无法入库 |
| 2 | 🔴 | 前端试用计数异步调用存在并发绕过 | 可绕过 3 条试用限制 |
| 3 | 🟡 | subscription_updated 不更新 variantName | 升级/降级后等级不变 |
| 4 | 🟡 | Rate limit 使用进程内存 Map | 多实例不共享，限流失效 |
| 5 | 🟡 | 缺少 payment_failed / subscription_expired 事件 | 支付失败无感知 |
| 6 | 🟢 | Checkout redirect_url 硬编码 /chat/liam | 用户体验差 |
| 7 | 🟢 | Cron cleanup N+1 查询 | 性能浪费 |
| 8 | 🟢 | subscription 表缺少追溯字段 | 售后排查困难 |

---

## 二、详细方案

### 2.1 扩展 VariantMap（问题 #1）

**文件**：`lib/lemonsqueezy/index.ts`

在 `initVariantMap()` 中增加 6 个 `_DOMESTIC` 和 1 个 `_TEST` 的注册：

```ts
// 国内（手动续费）
[process.env.LEMONSQUEEZY_VARIANT_STARTER_MONTHLY_DOMESTIC, 'starter'],
[process.env.LEMONSQUEEZY_VARIANT_STARTER_YEARLY_DOMESTIC, 'starter'],
[process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY_DOMESTIC, 'pro'],
[process.env.LEMONSQUEEZY_VARIANT_PRO_YEARLY_DOMESTIC, 'pro'],
[process.env.LEMONSQUEEZY_VARIANT_ULTRA_MONTHLY_DOMESTIC, 'ultra'],
[process.env.LEMONSQUEEZY_VARIANT_ULTRA_YEARLY_DOMESTIC, 'ultra'],
// 测试方案
[process.env.LEMONSQUEEZY_VARIANT_TEST, 'starter'],
```

共 13 个映射。现有国外 6 个不变。

---

### 2.2 原子化试用计数（问题 #2）

**文件**：`app/api/chat/route.ts`、`app/[lang]/chat/[expert]/page.tsx`

**服务端改动**（chat route）：
- 将「先查 profiles.trialUsed → 判断 → 再发消息」改为事务内原子操作
- 通过 `db.transaction` 包装，使用 PostgreSQL 行锁保证并发安全：

```ts
const result = await db.transaction(async (tx) => {
  // SELECT ... FOR UPDATE 锁定行，防止并发
  const [profile] = await tx
    .select({ trialUsed: schema.profiles.trialUsed })
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, session.user.id))
    .for('update');

  const trialUsed = profile?.trialUsed || 0;
  if (trialUsed >= 3) return { allowed: false, trialUsed };

  // 不存在则插入，存在则递增
  if (!profile) {
    await tx.insert(schema.profiles).values({ userId: session.user.id, trialUsed: 1 });
  } else {
    await tx.update(schema.profiles)
      .set({ trialUsed: trialUsed + 1 })
      .where(eq(schema.profiles.userId, session.user.id));
  }
  return { allowed: true, trialUsed: trialUsed + 1 };
});
```

- `allowed=false` → 返回 402 TRIAL_EXHAUSTED
- `allowed=true` → 继续消息处理

**前端改动**（ChatPageClient）：
- 移除 `fetch('/api/subscription/trial', { method: 'PATCH' })` 调用
- 试用计数完全由服务端 chat API 处理
- 前端 `subscriptionStatus.trialUsed` 的更新改为：收到 chat API 成功响应后，乐观 `+1`
- `TRIAL_EXHAUSTED` 错误码返回时更新 trialUsed = trialLimit 并展示提示

**保留**：`PATCH /api/subscription/trial` 路由保留（可能未来有用），但不从前端聊天流程调用。

---

### 2.3 Webhook 补全事件处理（问题 #3、#5）

**文件**：`app/api/subscription/webhook/route.ts`

**subscription_updated 增强**：
```ts
case 'subscription_updated': {
  const updates: Record<string, any> = { updatedAt: new Date() };
  
  // 新增：更新 variantId 和 variantName（升级/降级场景）
  if (variantId) {
    updates.lemonSqueezyVariantId = variantId;
    if (variantName) updates.variantName = variantName;
  }
  if (status) {
    updates.status = status === 'active' ? 'active' 
      : status === 'cancelled' ? 'cancelled' 
      : 'expired';
  }
  if (renewsAt) updates.currentPeriodEnd = new Date(renewsAt);
  if (cancelled !== undefined) updates.cancelAtPeriodEnd = cancelled;
  // ... update
}
```

**新增 subscription_payment_failed**：
```ts
case 'subscription_payment_failed': {
  await db.update(schema.subscriptions)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(schema.subscriptions.lemonSqueezySubscriptionId, subId));
  console.error('Payment failed for subscription:', subId, 'user:', userId);
  break;
}
```

**新增 subscription_expired**：
```ts
case 'subscription_expired': {
  await db.update(schema.subscriptions)
    .set({ status: 'expired', updatedAt: new Date() })
    .where(eq(schema.subscriptions.lemonSqueezySubscriptionId, subId));
  break;
}
```

---

### 2.4 Rate Limit 轻量改进（问题 #4）

**文件**：`app/api/chat/route.ts`

当前用内存 Map，Vercel serverless 多实例不共享。短期内做以下优化：
- 将限流逻辑提取为独立函数，添加注释说明这是「单实例限流」
- 降低阈值给多实例场景留出余量：当前 10 次/分钟不变（已较低）
- 长期方案（本次不做）：接入 Upstash Redis 做分布式限流

本次改动：提取 `checkRateLimit` 为命名导出，增加 JSDoc 说明限制范围（per-instance），不改变行为。

---

### 2.5 Checkout redirect_url 参数化（问题 #6）

**文件**：`lib/lemonsqueezy/client.ts`

```ts
export async function createCheckout(
  variantId: string, 
  userId: string,
  redirectUrl?: string
): Promise<string> {
  // ...
  product_options: {
    redirect_url: redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
  },
}
```

`app/api/subscription/checkout/route.ts` 中从请求体接收可选的 `redirect_url` 参数并传给 `createCheckout`。

---

### 2.6 Cron Cleanup 批量删除（问题 #7）

**文件**：`app/api/cron/cleanup/route.ts`

将每个 conversation 逐条 DELETE 改为一次批量操作：

```ts
// 旧：for (const conv of convs) { await db.delete(...).where(...) }
// 新：
const convIds = convs.map(c => c.id);
if (convIds.length > 0) {
  const result = await db.delete(schema.messages)
    .where(and(
      inArray(schema.messages.conversationId, convIds),
      lte(schema.messages.createdAt, cutoff),
    ));
  // result.rowCount
}
```

三段（Starter/Pro/Unsub）均改为批量删除。

---

### 2.7 Schema 增加追溯字段（问题 #8）

**文件**：`lib/db/schema.ts`

subscriptions 表新增字段：

```ts
lemonSqueezyCustomerId: text('lemon_squeezy_customer_id'), // LS 客户 ID
lemonSqueezyOrderId: text('lemon_squeezy_order_id'),       // LS 订单 ID
```

**Webhook subscription_created** 中写入：
```ts
if (event.data.attributes.customer_id) {
  values.lemonSqueezyCustomerId = String(event.data.attributes.customer_id);
}
// order_id 从 order_created 事件获取（如果有的话）
```

**数据库迁移**：通过 Drizzle Kit 生成迁移 SQL。

---

### 2.8 subscription_created 增加 customer 信息

`app/api/subscription/webhook/route.ts` 中 `subscription_created` case 补充 `lemonSqueezyCustomerId`（来自事件 `customer_id`）和 `lemonSqueezyOrderId`（来自事件 `order_id`）写入，有则写，无则跳过。

---

## 三、不影响的部分

- 定价页面逻辑不变
- Navbar 会员标识查询逻辑不变
- 聊天门控（Starter 专家限制、日限额）逻辑不变
- i18n 不变

---

## 四、实施顺序

| 步骤 | 模块 | 依赖 |
|------|------|------|
| 1 | lib/lemonsqueezy/ — VariantMap 扩展 + redirect_url | 无 |
| 2 | db/schema — 字段新增 + 迁移 | 无 |
| 3 | webhook — 事件补全 | 步骤 1 |
| 4 | chat route — 原子化 trial | 步骤 1、2 |
| 5 | cron cleanup — 批量删除 | 步骤 2 |
| 6 | rate limit — 注释优化 | 无 |
| 7 | 前端 ChatPageClient — 移除 trial PATCH | 步骤 4 |
| 8 | Vercel env — 补充 domestic 变量 | 步骤 1 |
