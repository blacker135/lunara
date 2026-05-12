# PayPal 集成实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Lunara 支付系统从 LemonSqueezy 完全替换为 PayPal Subscriptions，更新定价，移除国内/国外区分逻辑。

**Architecture:** 前端使用 @paypal/react-paypal-js 渲染 PayPal Smart Button，onApprove 时 POST 到后端 activate API 验证并存储订阅；Webhook 处理订阅生命周期事件。Plan ID 通过环境变量管理。

**Tech Stack:** Next.js 16, React 19, TypeScript 6, Drizzle ORM, PostgreSQL, @paypal/react-paypal-js, PayPal REST API v1

---

### Task 1: 安装依赖 + 配置环境变量

**Files:**
- Modify: `package.json`
- Modify: `.env.local.example`

- [ ] **Step 1: 安装 @paypal/react-paypal-js**

```bash
cd /home/ml/project/ai/mvp/star1-relation && npm install @paypal/react-paypal-js
```

- [ ] **Step 2: 更新 .env.local.example — 替换 LS 变量为 PayPal 变量**

将 `.env.local.example` 中所有 LemonSqueezy 区域替换为：

```env
# PayPal — 订阅支付
PAYPAL_CLIENT_ID=
PAYPAL_SECRET=
PAYPAL_WEBHOOK_ID=

# PayPal Plan IDs（在 PayPal Developer Dashboard 创建 Plan 后填入）
PAYPAL_PLAN_STARTER_MONTHLY=
PAYPAL_PLAN_STARTER_YEARLY=
PAYPAL_PLAN_PRO_MONTHLY=
PAYPAL_PLAN_PRO_YEARLY=
PAYPAL_PLAN_ULTRA_MONTHLY=
PAYPAL_PLAN_ULTRA_YEARLY=
PAYPAL_PLAN_TEST=

# 显隐控制
NEXT_PUBLIC_SHOW_TEST_PLAN=false
```

需要删除的行（LS 相关全部移除）：
```
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_SIGNING_SECRET=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_VARIANT_STARTER_MONTHLY=
LEMONSQUEEZY_VARIANT_STARTER_YEARLY=
LEMONSQUEEZY_VARIANT_PRO_MONTHLY=
LEMONSQUEEZY_VARIANT_PRO_YEARLY=
LEMONSQUEEZY_VARIANT_ULTRA_MONTHLY=
LEMONSQUEEZY_VARIANT_ULTRA_YEARLY=
LEMONSQUEEZY_VARIANT_STARTER_MONTHLY_DOMESTIC=
LEMONSQUEEZY_VARIANT_STARTER_YEARLY_DOMESTIC=
LEMONSQUEEZY_VARIANT_PRO_MONTHLY_DOMESTIC=
LEMONSQUEEZY_VARIANT_PRO_YEARLY_DOMESTIC=
LEMONSQUEEZY_VARIANT_ULTRA_MONTHLY_DOMESTIC=
LEMONSQUEEZY_VARIANT_ULTRA_YEARLY_DOMESTIC=
LEMONSQUEEZY_VARIANT_TEST=
```

- [ ] **Step 3: 同步更新 .env.local**

参照 `.env.local.example` 的变更，更新 `.env.local` 中的实际值。填入已有的 PayPal Plan ID：

```env
PAYPAL_CLIENT_ID=Af7dIAzjmDsrSwT0gFOvaG_HLYw_ozH6x3BmmI5IxafWuFExz70pa7iC8Aw6R3yXS0JCXns-gPpHsAhI
PAYPAL_SECRET=<从 PayPal Dashboard 获取>
PAYPAL_WEBHOOK_ID=<从 PayPal Dashboard 获取>
PAYPAL_PLAN_STARTER_MONTHLY=P-57499267RJ602121BNIBM7UY
PAYPAL_PLAN_STARTER_YEARLY=P-41D49701HY154584JNIBNDAA
PAYPAL_PLAN_PRO_MONTHLY=P-0WJ53208UJ902331WNIBNCEA
PAYPAL_PLAN_PRO_YEARLY=P-2UF61636X03907144NIBNDIQ
PAYPAL_PLAN_ULTRA_MONTHLY=P-6EJ125672Y0404718NIBNCNI
PAYPAL_PLAN_ULTRA_YEARLY=P-9SS370093R860710MNIBNDQA
PAYPAL_PLAN_TEST=P-28N15688DW904553KNIBNCXQ
```

同时移除 `.env.local` 中所有 `LEMONSQUEEZY_*` 环境变量。

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.local.example .env.local
git commit -m "chore: install @paypal/react-paypal-js, replace LS env vars with PayPal"
```

---

### Task 2: 创建 lib/paypal/client.ts — PayPal REST API 客户端

**Files:**
- Create: `lib/paypal/client.ts`

- [ ] **Step 1: 创建 PayPal API 客户端文件**

```typescript
// lib/paypal/client.ts
// PayPal REST API 客户端
// 封装 OAuth 令牌获取 + 订阅查询

const PAYPAL_API_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

interface PayPalToken {
  access_token: string;
  expires_at: number;
}

let cachedToken: PayPalToken | null = null;

/**
 * 获取 PayPal OAuth 访问令牌
 * 生产环境使用 live，开发/测试使用 sandbox
 */
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;

  if (!clientId || !secret) {
    throw new Error('PAYPAL_CLIENT_ID and PAYPAL_SECRET must be set');
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error('PayPal OAuth error:', res.status, errBody);
    throw new Error(`PayPal OAuth error: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.access_token;
}

interface PayPalSubscription {
  id: string;
  plan_id: string;
  status: 'APPROVAL_PENDING' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
  subscriber?: {
    email_address?: string;
  };
  billing_info?: {
    next_billing_time?: string;
    last_payment?: {
      amount?: { value: string; currency_code: string };
    };
  };
  create_time: string;
}

/**
 * 查询 PayPal 订阅详情
 * @param subscriptionId - 订阅 ID
 * @returns 订阅详情对象
 */
export async function getSubscription(subscriptionId: string): Promise<PayPalSubscription> {
  const token = await getAccessToken();

  const res = await fetch(
    `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!res.ok) {
    const errBody = await res.text();
    console.error('PayPal getSubscription error:', res.status, errBody);
    throw new Error(`PayPal getSubscription error: ${res.status}`);
  }

  return res.json();
}

/**
 * 验证 PayPal Webhook 签名
 * 通过 PayPal verify-webhook-signature 接口做 postback 验证
 */
export async function verifyWebhookSignature(
  headers: Record<string, string>,
  rawBody: string,
): Promise<boolean> {
  const token = await getAccessToken();

  const verificationPayload = {
    auth_algo: headers['paypal-auth-algo'] || '',
    cert_url: headers['paypal-cert-url'] || '',
    transmission_id: headers['paypal-transmission-id'] || '',
    transmission_sig: headers['paypal-transmission-sig'] || '',
    transmission_time: headers['paypal-transmission-time'] || '',
    webhook_id: process.env.PAYPAL_WEBHOOK_ID || '',
    webhook_event: JSON.parse(rawBody),
  };

  const res = await fetch(
    `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verificationPayload),
    },
  );

  if (!res.ok) {
    console.error('PayPal webhook verification failed:', res.status);
    return false;
  }

  const result = await res.json();
  return result.verification_status === 'SUCCESS';
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/paypal/client.ts
git commit -m "feat: add PayPal REST API client (OAuth + subscription + webhook verify)"
```

---

### Task 3: 创建 lib/paypal/index.ts — Plan 映射表

**Files:**
- Create: `lib/paypal/index.ts`

- [ ] **Step 1: 创建 Plan 映射表文件**

```typescript
// lib/paypal/index.ts
// PayPal 模块公共导出 + Plan ID → 等级名称映射

/**
 * 面向业务的订阅等级名称
 */
export type VariantName = 'starter' | 'pro' | 'ultra';

/**
 * PayPal Plan ID → 等级名称 的映射表
 * 在首次调用 getVariantName 时延迟初始化，确保环境变量已加载
 */
const PLAN_MAP: Record<string, VariantName> = {};

/**
 * 从环境变量构建 Plan 映射
 */
function initPlanMap() {
  const pairs: [string | undefined, VariantName][] = [
    [process.env.PAYPAL_PLAN_STARTER_MONTHLY, 'starter'],
    [process.env.PAYPAL_PLAN_STARTER_YEARLY, 'starter'],
    [process.env.PAYPAL_PLAN_PRO_MONTHLY, 'pro'],
    [process.env.PAYPAL_PLAN_PRO_YEARLY, 'pro'],
    [process.env.PAYPAL_PLAN_ULTRA_MONTHLY, 'ultra'],
    [process.env.PAYPAL_PLAN_ULTRA_YEARLY, 'ultra'],
    [process.env.PAYPAL_PLAN_TEST, 'starter'],
  ];
  for (const [id, name] of pairs) {
    if (id) PLAN_MAP[id] = name;
  }
}

/**
 * 根据 PayPal Plan ID 查询对应的订阅等级
 * @param planId - PayPal Plan ID
 * @returns 等级名称，若未匹配则返回 null
 */
export function getVariantName(planId: string): VariantName | null {
  if (Object.keys(PLAN_MAP).length === 0) initPlanMap();
  return PLAN_MAP[planId] || null;
}

export { getSubscription, verifyWebhookSignature } from './client';
```

- [ ] **Step 2: Commit**

```bash
git add lib/paypal/index.ts
git commit -m "feat: add PayPal plan ID mapping"
```

---

### Task 4: Schema 变更 — subscriptions 表字段重命名

**Files:**
- Modify: `lib/db/schema.ts`
- Create: `lib/db/migrations/0004_paypal_rename.sql`

- [ ] **Step 1: 更新 Drizzle Schema 定义**

修改 `lib/db/schema.ts` 中 `subscriptions` 表定义，将：

```typescript
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  lemonSqueezySubscriptionId: text('lemon_squeezy_subscription_id').notNull().unique(),
  lemonSqueezyVariantId: text('lemon_squeezy_variant_id').notNull(),
  variantName: text('variant_name').notNull(), // 'starter' | 'pro' | 'ultra'
  status: subscriptionStatusEnum('status').notNull().default('active'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  lemonSqueezyCustomerId: text('lemon_squeezy_customer_id'),   // LS 客户 ID
  lemonSqueezyOrderId: text('lemon_squeezy_order_id'),         // LS 订单 ID
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

改为：

```typescript
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  paypalSubscriptionId: text('paypal_subscription_id').notNull().unique(),
  paypalPlanId: text('paypal_plan_id').notNull(),
  variantName: text('variant_name').notNull(), // 'starter' | 'pro' | 'ultra'
  status: subscriptionStatusEnum('status').notNull().default('active'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

注意：删除 `lemonSqueezyCustomerId`、`lemonSqueezyOrderId`、`cancelAtPeriodEnd` 三个字段。

- [ ] **Step 2: 创建数据库迁移 SQL**

```sql
-- lib/db/migrations/0004_paypal_rename.sql
-- 将 LemonSqueezy 相关字段重命名为 PayPal 字段，删除 LS 专用字段

ALTER TABLE subscriptions RENAME COLUMN lemon_squeezy_subscription_id TO paypal_subscription_id;
ALTER TABLE subscriptions RENAME COLUMN lemon_squeezy_variant_id TO paypal_plan_id;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS lemon_squeezy_customer_id;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS lemon_squeezy_order_id;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS cancel_at_period_end;

-- 重命名唯一约束（PostgreSQL 会自动重命名关联的索引）
ALTER INDEX IF EXISTS subscriptions_lemon_squeezy_subscription_id_unique RENAME TO subscriptions_paypal_subscription_id_unique;
```

- [ ] **Step 3: 本地数据库执行迁移**

```bash
psql $DATABASE_URL -f lib/db/migrations/0004_paypal_rename.sql
```

如果本地数据库尚无实际数据，可直接 drop + recreate：

```bash
cd /home/ml/project/ai/mvp/star1-relation
# 查看 scripts 目录是否有重建脚本
ls scripts/
```

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts lib/db/migrations/0004_paypal_rename.sql
git commit -m "feat: rename LS subscription columns to PayPal in schema and migration"
```

---

### Task 5: 创建 PayPalButton 组件

**Files:**
- Create: `components/pricing/PayPalButton.tsx`

- [ ] **Step 1: 创建 PayPalButton 组件**

```typescript
// components/pricing/PayPalButton.tsx
// PayPal Smart Button 封装组件
// 处理创建订阅、审批回调、错误和取消

'use client';

import { PayPalButtons } from '@paypal/react-paypal-js';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface PayPalButtonProps {
  planId: string;
  planName: string;
  isLoggedIn: boolean;
  lang: string;
}

export function PayPalButton({ planId, planName, isLoggedIn, lang }: PayPalButtonProps) {
  const router = useRouter();
  const tp = useTranslations('pricing');

  if (!isLoggedIn) {
    return (
      <button
        type="button"
        onClick={() => router.push(`/${lang}/auth/login?redirect=/pricing`)}
        className="mt-6 w-full rounded-[16px] py-2.5 text-sm font-medium bg-[#FF7A59] text-white hover:bg-[#FF7A59]/90 transition-colors"
      >
        {tp('startTrial')}
      </button>
    );
  }

  return (
    <div className="mt-6">
      <PayPalButtons
        style={{
          shape: 'pill',
          color: 'gold',
          layout: 'vertical',
          label: 'subscribe',
        }}
        createSubscription={(_data, actions) => {
          return actions.subscription.create({
            plan_id: planId,
          });
        }}
        onApprove={async (data) => {
          const res = await fetch('/api/subscription/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscription_id: data.subscriptionID,
              plan_id: planId,
            }),
          });

          if (res.ok) {
            router.push(`/${lang}/chat`);
          } else {
            const err = await res.json();
            console.error('Subscription activation failed:', err);
            alert(err.error || 'Activation failed');
          }
        }}
        onError={(err) => {
          console.error('PayPal button error:', err);
        }}
        onCancel={() => {
          // 用户取消支付，无需处理
        }}
      />
      <p className="mt-1 text-center text-xs text-text-secondary">
        {tp('subscribe')} — {planName}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/pricing/PayPalButton.tsx
git commit -m "feat: add PayPalButton component with subscription flow"
```

---

### Task 6: 更新 PricingCard — 替换 CTA 为 PayPalButton

**Files:**
- Modify: `components/pricing/PricingCard.tsx`

- [ ] **Step 1: 重写 PricingCard 组件**

```typescript
// components/pricing/PricingCard.tsx
// 单个方案卡片：展示方案名、价格、权益列表、PayPal 订阅按钮

'use client';

import { useTranslations } from 'next-intl';
import { PayPalButton } from './PayPalButton';

interface PlanData {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  planId: string;
  features: string[];
  highlighted?: boolean;
}

interface PricingCardProps {
  plan: PlanData;
  isYearly: boolean;
  isTestPlan: boolean;
  isLoggedIn: boolean;
  lang: string;
}

export function PricingCard({ plan, isYearly, isTestPlan, isLoggedIn, lang }: PricingCardProps) {
  const tp = useTranslations('pricing');

  // 折算月费（年费 ÷ 12）
  const monthlyEquivalent = (plan.yearlyPrice / 12).toFixed(2);
  // 年付比月付节省的百分比
  const savePercent = Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100);

  const displayPrice = isYearly
    ? monthlyEquivalent
    : plan.monthlyPrice;

  const periodLabel = `/${tp('month')}`;

  return (
    <div
      className={`flex flex-col rounded-[24px] border-2 p-6 ${
        isTestPlan
          ? 'border-dashed border-gray-300 bg-white/60'
          : plan.highlighted
            ? 'border-[#FF7A59] bg-[#FF7A59]/5'
            : 'border-gray-100 bg-white'
      }`}
    >
      {/* 方案名称 */}
      <h3 className="text-lg font-semibold text-text-primary">{plan.name}</h3>

      {/* 价格展示 */}
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-text-primary">${displayPrice}</span>
        {periodLabel && (
          <span className="text-sm text-text-secondary">{periodLabel}</span>
        )}
      </div>

      {/* 年付省钱展示 */}
      {isYearly && (
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-xs text-text-secondary line-through">
            ${plan.monthlyPrice}/{tp('month')}
          </span>
          <span className="text-xs text-[#FF7A59] font-medium">
            {tp('savePerYear', { percent: savePercent })}
          </span>
        </div>
      )}

      {/* 功能列表 */}
      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#FF7A59]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA — PayPal 订阅按钮或测试方案按钮 */}
      {isTestPlan ? (
        <PayPalButton
          planId={plan.planId}
          planName={tp('testPlanName')}
          isLoggedIn={isLoggedIn}
          lang={lang}
        />
      ) : (
        <PayPalButton
          planId={plan.planId}
          planName={plan.name}
          isLoggedIn={isLoggedIn}
          lang={lang}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/pricing/PricingCard.tsx
git commit -m "feat: replace LS CTA button with PayPalButton in PricingCard"
```

---

### Task 7: 更新 PricingSection — 移除 domestic 逻辑，更新价格

**Files:**
- Modify: `components/pricing/PricingSection.tsx`

- [ ] **Step 1: 重写 PricingSection 组件**

```typescript
// components/pricing/PricingSection.tsx
// 三方案对比区：月付/年付切换 + 三列 PricingCard

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { PricingCard } from './PricingCard';

interface PlanIds {
  starterMonthly: string;
  starterYearly: string;
  proMonthly: string;
  proYearly: string;
  ultraMonthly: string;
  ultraYearly: string;
  test: string;
}

interface PricingSectionProps {
  lang: string;
  isLoggedIn: boolean;
  showTestPlan: boolean;
  planIds: PlanIds;
}

/** PayPal Client ID，前端直用 */
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';

export function PricingSection({ lang, isLoggedIn, showTestPlan, planIds }: PricingSectionProps) {
  const [isYearly, setIsYearly] = useState(false);
  const tp = useTranslations('pricing');

  /** 三个定价方案的定义 */
  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 9.9,
      yearlyPrice: 108.9,
      planId: isYearly ? planIds.starterYearly : planIds.starterMonthly,
      features: [
        tp('features.dailyMessages', { count: 30 }),
        tp('features.expertsStarter'),
        tp('features.historyDays', { count: 7 }),
        tp('features.effectLight'),
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      monthlyPrice: 29.9,
      yearlyPrice: 328.9,
      highlighted: true,
      planId: isYearly ? planIds.proYearly : planIds.proMonthly,
      features: [
        tp('features.dailyMessages', { count: 100 }),
        tp('features.expertsAll'),
        tp('features.historyDays', { count: 30 }),
        tp('features.effectStandard'),
      ],
    },
    {
      id: 'ultra',
      name: 'Ultra',
      monthlyPrice: 49.9,
      yearlyPrice: 548.9,
      planId: isYearly ? planIds.ultraYearly : planIds.ultraMonthly,
      features: [
        tp('features.unlimitedMessages'),
        tp('features.expertsAll'),
        tp('features.historyForever'),
        tp('features.effectDeep'),
      ],
    },
  ];

  // 计算年付折扣百分比
  const maxSavePercent = Math.round(
    (1 - plans[2].yearlyPrice / (plans[2].monthlyPrice * 12)) * 100
  );

  return (
    <PayPalScriptProvider
      options={{
        clientId: PAYPAL_CLIENT_ID,
        vault: true,
        intent: 'subscription',
      }}
    >
      <section className="mx-auto max-w-5xl px-4 py-16">
        {/* 页头 */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-primary">{tp('title')}</h2>
          <p className="mt-2 text-text-secondary">{tp('subtitle')}</p>
        </div>

        {/* 月付/年付按钮切换 */}
        <div className="mt-8 flex items-center justify-center">
          <div className="inline-flex items-center rounded-full bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setIsYearly(false)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                !isYearly ? 'bg-[#FF7A59] text-white' : 'text-text-secondary'
              }`}
            >
              {tp('monthly')}
            </button>
            <button
              type="button"
              onClick={() => setIsYearly(true)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isYearly ? 'bg-[#FF7A59] text-white' : 'text-text-secondary'
              }`}
            >
              {tp('yearly')}
            </button>
            <span className="ml-1 rounded-full bg-[#FF7A59]/10 px-2 py-0.5 text-xs font-medium text-[#FF7A59]">
              {tp('savePercent', { percent: maxSavePercent })}
            </span>
          </div>
        </div>

        {/* 方案卡片网格 */}
        <div className={`mt-10 grid gap-6 ${showTestPlan ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isYearly={isYearly}
              isTestPlan={false}
              isLoggedIn={isLoggedIn}
              lang={lang}
            />
          ))}

          {/* 测试方案 */}
          {showTestPlan && (
            <PricingCard
              plan={{
                id: 'test',
                name: tp('testPlanName'),
                monthlyPrice: 0.1,
                yearlyPrice: 0.1,
                planId: planIds.test,
                features: [
                  tp('features.dailyMessages', { count: 30 }),
                  tp('features.expertsStarter'),
                  tp('features.historyDays', { count: 7 }),
                  tp('features.effectLight'),
                ],
              }}
              isYearly={false}
              isTestPlan={true}
              isLoggedIn={isLoggedIn}
              lang={lang}
            />
          )}
        </div>
      </section>
    </PayPalScriptProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/pricing/PricingSection.tsx
git commit -m "feat: remove domestic logic, update pricing, add PayPalScriptProvider"
```

---

### Task 8: 更新定价页 — 移除 domestic 判断，简化 planIds

**Files:**
- Modify: `app/[lang]/pricing/page.tsx`

- [ ] **Step 1: 重写定价页**

```typescript
// app/[lang]/pricing/page.tsx
// /[lang]/pricing — 定价页（服务端组件）

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { PricingSection } from '@/components/pricing/PricingSection';

export default async function PricingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const showTestPlan = process.env.NEXT_PUBLIC_SHOW_TEST_PLAN === 'true';

  const planIds = {
    starterMonthly: process.env.PAYPAL_PLAN_STARTER_MONTHLY || '',
    starterYearly: process.env.PAYPAL_PLAN_STARTER_YEARLY || '',
    proMonthly: process.env.PAYPAL_PLAN_PRO_MONTHLY || '',
    proYearly: process.env.PAYPAL_PLAN_PRO_YEARLY || '',
    ultraMonthly: process.env.PAYPAL_PLAN_ULTRA_MONTHLY || '',
    ultraYearly: process.env.PAYPAL_PLAN_ULTRA_YEARLY || '',
    test: process.env.PAYPAL_PLAN_TEST || '',
  };

  return (
    <main>
      <PricingSection
        lang={lang}
        isLoggedIn={!!session?.user}
        showTestPlan={showTestPlan}
        planIds={planIds}
      />
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/[lang]/pricing/page.tsx
git commit -m "feat: simplify pricing page, remove domestic logic"
```

---

### Task 9: 创建 activate API — 后端验证订阅

**Files:**
- Create: `app/api/subscription/activate/route.ts`

- [ ] **Step 1: 创建 POST /api/subscription/activate**

```typescript
// app/api/subscription/activate/route.ts
// POST /api/subscription/activate — PayPal 订阅审批后验证并存储

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getSubscription, getVariantName } from '@/lib/paypal';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { subscription_id?: string; plan_id?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.subscription_id || !body.plan_id) {
    return Response.json({ error: 'subscription_id and plan_id are required' }, { status: 400 });
  }

  try {
    // 调 PayPal API 验证订阅真实性
    const sub = await getSubscription(body.subscription_id);

    if (sub.status !== 'ACTIVE' && sub.status !== 'APPROVED') {
      return Response.json({ error: `Subscription not active: ${sub.status}` }, { status: 400 });
    }

    const variantName = getVariantName(body.plan_id);
    if (!variantName) {
      return Response.json({ error: 'Unknown plan' }, { status: 400 });
    }

    // upsert：先删再插，处理并发激活
    await db
      .delete(schema.subscriptions)
      .where(eq(schema.subscriptions.paypalSubscriptionId, body.subscription_id));

    await db.insert(schema.subscriptions).values({
      userId: session.user.id,
      paypalSubscriptionId: body.subscription_id,
      paypalPlanId: body.plan_id,
      variantName,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: sub.billing_info?.next_billing_time
        ? new Date(sub.billing_info.next_billing_time)
        : undefined,
    });

    return Response.json({ success: true, variant: variantName });
  } catch (err) {
    console.error('Subscription activation failed:', err);
    return Response.json({ error: 'Activation failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/subscription/activate/route.ts
git commit -m "feat: add PayPal subscription activation API"
```

---

### Task 10: 重写 Webhook API — 处理 PayPal 事件

**Files:**
- Modify: `app/api/subscription/webhook/route.ts`

- [ ] **Step 1: 重写 Webhook 路由**

```typescript
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
  const status = event.resource.status;
  const nextBilling = event.resource.billing_info?.next_billing_time;

  try {
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        // activate API 已插入记录，webhook 只做状态确认更新
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

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
        const newStatus =
          eventType === 'BILLING.SUBSCRIPTION.EXPIRED' ? 'expired' : 'cancelled';

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
        if (status) {
          updates.status = status === 'ACTIVE' ? 'active' : 'cancelled';
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

- [ ] **Step 2: Commit**

```bash
git add app/api/subscription/webhook/route.ts
git commit -m "feat: rewrite webhook for PayPal subscription events"
```

---

### Task 11: 删除 LemonSqueezy 相关文件 + 旧 checkout API

**Files:**
- Delete: `lib/lemonsqueezy/client.ts`
- Delete: `lib/lemonsqueezy/index.ts`
- Delete: `app/api/subscription/checkout/route.ts`

- [ ] **Step 1: 删除 LS 文件**

```bash
rm lib/lemonsqueezy/client.ts lib/lemonsqueezy/index.ts
rmdir lib/lemonsqueezy 2>/dev/null || true
rm app/api/subscription/checkout/route.ts
rmdir app/api/subscription/checkout 2>/dev/null || true
```

- [ ] **Step 2: Commit**

```bash
git add -A lib/lemonsqueezy/ app/api/subscription/checkout/
git commit -m "feat: remove LemonSqueezy client and checkout API"
```

---

### Task 12: 更新 i18n — 测试方案价格文案

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/zh.json`

- [ ] **Step 1: 更新英文文案**

`messages/en.json` 中修改：

```json
"testPlanName": "Test Plan",
"testPlanCTA": "Test Pay ($0.10)"
```

- [ ] **Step 2: 更新中文文案**

`messages/zh.json` 中修改：

```json
"testPlanName": "测试方案",
"testPlanCTA": "测试支付 ($0.10)"
```

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/zh.json
git commit -m "fix: update test plan price from $0.50 to $0.10 in i18n"
```

---

### Task 13: 全量类型检查 + 构建验证

- [ ] **Step 1: 运行 TypeScript 类型检查**

```bash
cd /home/ml/project/ai/mvp/star1-relation && npx tsc --noEmit
```

Expected: 无类型错误。如有错误，根据错误信息修复。

- [ ] **Step 2: 运行 Next.js 构建**

```bash
cd /home/ml/project/ai/mvp/star1-relation && npm run build
```

Expected: 构建成功，无错误。

- [ ] **Step 3: Commit（如有修复）**

```bash
git add -A
git commit -m "fix: type and build fixes after PayPal migration"
```

---

### Task 14: 最终验证清单

- [ ] 验证 `.env.local` 中所有 `LEMONSQUEEZY_*` 变量已移除
- [ ] 验证 `NEXT_PUBLIC_PAYPAL_CLIENT_ID` 在 `.env.local` 中已设置
- [ ] 确认所有文件中对 `lemonSqueezy*` 的引用已清除（grep 验证）

```bash
grep -r "lemonsqueezy\|lemon_squeezy\|lemonSqueezy" --include="*.ts" --include="*.tsx" --include="*.sql" .
```

Expected: 无结果。

- [ ] 验证 `npm run build` 成功（Task 13 已完成则跳过）
