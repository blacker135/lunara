# 会员 & 支付系统完善 — 设计规范

**日期**: 2026-05-12
**状态**: 已确认
**关联**: Lunara MVP — 订阅门控、支付 Webhook、用户设置

---

## 1. 概述

### 目标

1. 修复订阅门控的并发安全漏洞（P0）
2. 统一 chat/switch 路由的重复门控代码（P1）
3. 完善 PayPal Webhook 的状态同步（P1）
4. messages 表增加 tokens 字段（#14）
5. Ultra 等级限制 1000 条对话上限
6. 新增用户设置页面（名称、邮箱、密码修改 + 订阅信息展示）

---

## 2. 门控模块重构 `lib/subscription/gate.ts`

### 当前问题

- chat/route 和 switch/route 有 ~80 行重复的门控代码
- 日限额检查和消息插入之间没有事务保护（TOCTOU 竞态）
- switch 路线的 trial 检查是只读的，没有行锁

### 重构方案

提取 `checkSubscriptionGate()` 函数，返回统一结构：

```ts
type GateResult =
  | { allowed: true; isSubscribed: boolean; variant: string | null }
  | { allowed: false; code: 'TRIAL_EXHAUSTED' | 'DAILY_LIMIT' | 'EXPERT_LOCKED';
      status: 402 | 429 | 403; message: string; extra?: Record<string, unknown> };

// trial: true → 原子递增试用计数（chat用）
// trial: false → 只读检查试用状态（switch用）
async function checkSubscriptionGate(
  userId: string,
  expert: ExpertId,
  trial: boolean,
): Promise<GateResult>
```

### 日限额原子化

日限额检查移至 chat/route 内部，与消息插入放在同一事务中，避免 TOCTOU。gate 函数只做订阅+trial+专家检查。

---

## 3. Webhook 修复 `app/api/subscription/webhook/route.ts`

### ACTIVATED / RENEWED → upsert

当前的裸 `UPDATE` 改为 `INSERT ... ON CONFLICT (paypal_subscription_id) DO UPDATE`，确保 webhook 先于 activate API 到达时也能正确创建记录。

### SUSPENDED 状态

Webhook 事件增加 `BILLING.SUBSCRIPTION.SUSPENDED` 处理。Schema enum 新增 `suspended`。

### PayPal 状态映射

| PayPal Status | DB Status |
|---------------|-----------|
| ACTIVE | active |
| SUSPENDED | suspended |
| CANCELLED | cancelled |
| EXPIRED | expired |
| PAYMENT_FAILED | cancelled |

---

## 4. Schema 变更

### `subscriptionStatusEnum` 新增值

```sql
ALTER TYPE subscription_status ADD VALUE 'suspended';
```

### `messages` 表新增 `tokens` 字段

```sql
ALTER TABLE messages ADD COLUMN tokens integer;
```

---

## 5. Ultra 对话上限

`POST /api/conversations` 中检查：Ultra 用户已有 ≥ 1000 个对话时返回 403。

```ts
if (variant === 'ultra') {
  const [cnt] = await db.select({ count: count() })
    .from(schema.conversations)
    .where(eq(schema.conversations.userId, userId));
  if (cnt.count >= 1000) {
    return Response.json({ error: 'Conversation limit reached' }, { status: 403 });
  }
}
```

---

## 6. 设置页面

### 路由

`/[lang]/settings` — 需登录（auth guard 在 layout 或 page 内）

### 组件结构

```
app/[lang]/settings/page.tsx         — 服务端：获取 session
  └─ components/settings/SettingsPage.tsx — 客户端：展示+Modal
       ├─ SettingsField    — 单行展示组件（label + value + action按钮）
       ├─ NameModal        — 编辑名称弹窗
       ├─ EmailModal       — 编辑邮箱弹窗
       └─ PasswordModal    — 修改密码弹窗
```

### 页面布局

```
┌──────────────────────────────────┐
│  ⚙️ Settings                     │
│                                  │
│  ┌─ Account ───────────────────┐ │
│  │  Name     John Doe    [Edit] │ │
│  │  Email    j@mail.com  [Edit] │ │
│  └─────────────────────────────┘ │
│                                  │
│  ┌─ Security ──────────────────┐ │
│  │  Password  ********    [Change] │
│  └─────────────────────────────┘ │
│                                  │
│  ┌─ Subscription ──────────────┐ │
│  │  Plan      Starter           │ │
│  │  Status    Active            │ │
│  │  Expires   2026-06-12        │ │
│  │  Messages  15 / 30 per day   │ │
│  │           [Manage →]          │ │
│  └─────────────────────────────┘ │
│                                  │
│  🚪 Logout                       │
└──────────────────────────────────┘
```

### Modal 设计

**Name Modal：**
- 预填当前名称的输入框
- [Cancel] [Save]

**Email Modal：**
- 显示当前邮箱
- 新邮箱输入框
- 提示：A verification email will be sent
- [Cancel] [Send Verification]

**Password Modal：**
- 当前密码输入框
- 新密码输入框
- 确认新密码输入框
- [Cancel] [Change Password]

### API 路由

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/settings/name` | 更新用户名称 |
| POST | `/api/settings/email` | 发起邮箱变更（发送验证邮件） |
| POST | `/api/settings/password` | 修改密码 |

所有 API 需验证 session。

### 导航栏入口

在 `NavbarClient` 头像下拉菜单中添加「Settings」选项，链接 `/[lang]/settings`。

### 订阅管理链接

PayPal 订阅管理 URL：
`https://www.paypal.com/myaccount/autopay/`

点击「Manage Subscription」跳转到 PayPal 管理页面。

---

## 7. i18n 新增键

### settings 命名空间

```json
{
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

---

## 8. 文件改动清单

| # | 文件 | 操作 | 内容 |
|---|------|------|------|
| 1 | `lib/subscription/gate.ts` | 重写 | 统一 `checkSubscriptionGate()` |
| 2 | `lib/db/schema.ts` | 修改 | enum +suspended, messages +tokens |
| 3 | `app/api/chat/route.ts` | 修改 | 使用新 gate, 日限事务化 |
| 4 | `app/api/chat/switch/route.ts` | 修改 | 使用新 gate |
| 5 | `app/api/subscription/webhook/route.ts` | 修改 | upsert + SUSPENDED |
| 6 | `app/api/conversations/route.ts` | 修改 | Ultra 1000 上限 |
| 7 | `components/common/NavbarClient.tsx` | 修改 | 添加 Settings 入口 |
| 8 | `app/[lang]/settings/page.tsx` | 新建 | 设置页服务端 |
| 9 | `components/settings/SettingsPage.tsx` | 新建 | 设置页客户端 + Modal |
| 10 | `app/api/settings/name/route.ts` | 新建 | 更新名称 API |
| 11 | `app/api/settings/email/route.ts` | 新建 | 变更邮箱 API |
| 12 | `app/api/settings/password/route.ts` | 新建 | 修改密码 API |
| 13 | `messages/zh.json` | 修改 | 新增 settings 命名空间 |
| 14 | `messages/en.json` | 修改 | 新增 settings 命名空间 |

---

## 9. 不变更的文件

- `lib/auth/index.ts` — Better Auth 配置不变
- `middleware.ts` — 国际化中间件不变
- `lib/paypal/` — PayPal 客户端不变
- `components/pricing/` — 定价组件不变
- `lib/deepseek/` — AI 客户端不变
