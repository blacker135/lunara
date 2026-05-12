# PayPal 集成设计文档

## 目标

将 Lunara 支付系统从 LemonSqueezy 完全替换为 PayPal Subscriptions，更新定价，简化国内/国外区分逻辑。

## 价格变更

| 方案 | 月付 (新) | 月付 (旧) | 年付 (新) | 年付 (旧) |
|---|---|---|---|---|
| Starter | $9.90 | $9.00 | $108.90 | $99.00 |
| Pro | $29.90 | $29.00 | $328.90 | $319.00 |
| Ultra | $49.90 | $49.00 | $548.90 | $539.00 |
| Test | $0.10 | $0.50 | — | — |

## PayPal Plan ID 映射

全部通过环境变量管理，无硬编码：

```env
PAYPAL_CLIENT_ID=Af7dIAzjmDsrSwT0gFOvaG_HLYw_ozH6x3BmmI5IxafWuFExz70pa7iC8Aw6R3yXS0JCXns-gPpHsAhI
PAYPAL_SECRET=<PayPal App Secret>
PAYPAL_WEBHOOK_ID=<Webhook ID>
PAYPAL_PLAN_STARTER_MONTHLY=P-57499267RJ602121BNIBM7UY
PAYPAL_PLAN_STARTER_YEARLY=P-41D49701HY154584JNIBNDAA
PAYPAL_PLAN_PRO_MONTHLY=P-0WJ53208UJ902331WNIBNCEA
PAYPAL_PLAN_PRO_YEARLY=P-2UF61636X03907144NIBNDIQ
PAYPAL_PLAN_ULTRA_MONTHLY=P-6EJ125672Y0404718NIBNCNI
PAYPAL_PLAN_ULTRA_YEARLY=P-9SS370093R860710MNIBNDQA
PAYPAL_PLAN_TEST=P-28N15688DW904553KNIBNCXQ
```

## 架构

### 支付流程

```
用户点击 CTA → PayPal JS SDK 弹窗（前端直渲染）
  → createSubscription: 返回 plan_id
  → onApprove: 拿到 subscriptionID
  → POST /api/subscription/activate（后端验证 + 存库 + 更新 profile）
  → 跳转成功页

并行：
  PayPal Webhook → POST /api/subscription/webhook
    → 处理 ACTIVATED / CANCELLED / EXPIRED / PAYMENT_FAILED
```

### 模块变更

| 操作 | 文件 |
|---|---|
| **新增** | `lib/paypal/client.ts` — PayPal REST API 客户端（OAuth token + 订阅查询） |
| **新增** | `lib/paypal/index.ts` — Plan 映射 + Webhook 签名验证 |
| **新增** | `components/pricing/PayPalButton.tsx` — 封装的 PayPal Smart Button 组件 |
| **删除** | `lib/lemonsqueezy/client.ts` |
| **删除** | `lib/lemonsqueezy/index.ts` |
| **修改** | `app/api/subscription/checkout/route.ts` → 重命名为 `activate/route.ts`，改为验证订阅 |
| **修改** | `app/api/subscription/webhook/route.ts` — 改为处理 PayPal 事件 |
| **修改** | `lib/db/schema.ts` — subscriptions 表字段重命名 |
| **新增** | `lib/db/migrations/0004_*.sql` — 迁移脚本 |
| **修改** | `components/pricing/PricingCard.tsx` — 替换 CTA 为 PayPalButton |
| **修改** | `components/pricing/PricingSection.tsx` — 移除 domestic 逻辑，更新价格 |
| **修改** | `app/[lang]/pricing/page.tsx` — 移除 domestic 判断和 LS variantIds |
| **修改** | `.env.local.example` — 替换 LS 变量为 PayPal 变量 |
| **修改** | i18n 文件 — 移除国内相关 key |

## 数据流细节

### 前端 PayPalButton 组件

```tsx
// components/pricing/PayPalButton.tsx
// 封装 PayPal Smart Button，统一处理创建、审批、错误

interface PayPalButtonProps {
  planId: string;
  planName: string;
  isLoggedIn: boolean;
  lang: string;
}

// 使用 @paypal/react-paypal-js 的 PayPalButtons 组件
// - createSubscription: 返回 { plan_id }
// - onApprove: 拿 subscriptionID → POST /api/subscription/activate
// - onError: 显示错误提示
// - onCancel: 提示用户已取消
// 样式: shape=rect, color=blue, 匹配现有按钮风格
```

### 后端 activate API

```
POST /api/subscription/activate
Headers: Authorization (session cookie)
Body: { subscription_id: string, plan_id: string }
→ 调 PayPal GET /v1/billing/subscriptions/{id} 验证
→ 检查 status === 'ACTIVE'
→ 写入 subscriptions 表
→ 更新 profiles 表 (如有试用关联)
→ 返回 { success: true }
```

### 后端 Webhook API

```
POST /api/subscription/webhook
Headers: PayPal-Auth-Algo, PayPal-Cert-Url, PayPal-Transmission-Id, PayPal-Transmission-Sig, PayPal-Transmission-Time
Body: { event_type, resource: { id, status, ... } }
→ 验证签名 (POST /v1/notifications/verify-webhook-signature)
→ switch event_type:
  - BILLING.SUBSCRIPTION.ACTIVATED → insert/update subscription
  - BILLING.SUBSCRIPTION.CANCELLED → status = 'cancelled'
  - BILLING.SUBSCRIPTION.EXPIRED → status = 'expired'
  - BILLING.SUBSCRIPTION.PAYMENT.FAILED → status = 'cancelled'
```

### Schema 变更

```sql
-- subscriptions 表字段重命名
ALTER TABLE subscriptions RENAME COLUMN lemon_squeezy_subscription_id TO paypal_subscription_id;
ALTER TABLE subscriptions RENAME COLUMN lemon_squeezy_variant_id TO paypal_plan_id;
ALTER TABLE subscriptions DROP COLUMN lemon_squeezy_customer_id;
ALTER TABLE subscriptions DROP COLUMN lemon_squeezy_order_id;
-- 索引也需对应更新
```

## 简化项

- **移除国内/国外定价区分**：PayPal 全球统一费率，不需要国内专用 variant
- **移除 `isDomestic` 判断逻辑**：PricingSection 和 pricing page 中移除
- **移除 `variantIds` 13 个 prop**：改为 7 个 plan ID（3 月 + 3 年 + 1 test）
- **移除 LS 特有字段**：customerId、orderId、cancelAtPeriodEnd 等

## 注意事项

- PayPal Sandbox webhook 不会自动模拟续费扣款，需在生产环境验证
- 需要数据库迁移，开发环境可直接重建，生产需慎重
- @paypal/react-paypal-js 是官方 React 封装，避免自己写 script loader
- 前端 PayPalButton 只在客户端渲染（dynamic import + ssr: false）
