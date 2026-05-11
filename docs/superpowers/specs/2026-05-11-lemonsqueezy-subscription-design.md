# LemonSqueezy 订阅支付集成设计

## 概述

为 Lunara 集成 LemonSqueezy 订阅支付系统，实现三档会员方案（Starter/Pro/Ultra）的购买、管理和消息门控。

---

## 会员方案

| 维度 | Starter ($9/月) | Pro ($29/月) | Ultra ($49/月) |
|------|-----------------|---------------|-----------------|
| 日消息量 | 30 条 | 100 条 | 无限制 |
| 可用专家 | 2 位（Evan + Liam） | 全部 4 位 | 全部 4 位 |
| 对话历史保留 | 7 天 | 30 天 | 永久 |
| 专家工作效果 | 轻量 | 标准 | 专注 |

- 年费 = 月费 × 11：Starter $99/年、Pro $319/年、Ultra $539/年
- 不支持导出对话

---

## 新用户体验流程

1. 注册后获得 3 条免费试用消息
2. 试用消息用完 → 消息入口被门控拦截 → 引导到定价页
3. 用户选择方案 → 重定向到 LemonSqueezy 托管结账页完成付款
4. 付款成功 → LemonSqueezy 发送 webhook → 后端更新订阅状态 → 返回聊天页

---

## 集成方式

采用 LemonSqueezy 托管结账 + Webhook 模式：

- 前端点击订阅 → POST `/api/subscription/checkout` 获取 LS 结账 URL → 重定向
- 付款完成 → LS 发送 webhook → 后端验证 HMAC-SHA256 签名 → 更新订阅状态
- 用户无需离开站点处理支付表单，安全性由 LS 保证

---

## 数据库变更

### 新增 `subscriptions` 表

```
subscriptions
├── id: uuid (PK, defaultRandom)
├── user_id: text → user.id (FK, cascade delete)
├── lemon_squeezy_subscription_id: text (unique)
├── lemon_squeezy_variant_id: text
├── variant_name: text ('starter' | 'pro' | 'ultra')
├── status: text (active | cancelled | expired)
├── current_period_start: timestamp
├── current_period_end: timestamp
├── cancel_at_period_end: boolean (default false)
├── created_at: timestamp (defaultNow)
├── updated_at: timestamp (defaultNow)
```

- `variant_name` 冗余存储，避免查询时反查方案类型
- `status` 由 LS webhook 全量同步，不本地修改
- 试用阶段用户无 subscription 记录
- 一个用户仅保留一条 active subscription，换方案时 update

### 修改 `profiles` 表

新增字段：
```
trial_used: integer, default 0
```

---

## API 设计

### POST /api/subscription/checkout

生成 LemonSqueezy 结账 URL。

- 请求：`{ variant_id: string }`
- 处理：调用 LS API 创建 checkout，返回 `data.attributes.url`
- 响应：`{ url: string }`
- 错误：401（未登录）、400（无效 variant_id）、500（LS API 异常）

### POST /api/subscription/webhook

接收 LemonSqueezy 事件回调。

- 处理流程：
  1. 使用 `X-Signature` header 验证 HMAC-SHA256 签名
  2. 解析事件类型，映射数据库操作：
     - `subscription_created` → insert subscriptions
     - `subscription_updated` → update status / period / cancel flag
     - `subscription_cancelled` → status = 'cancelled'
     - 其他事件忽略
  3. 失败返回 400（LS 会重试）

- 响应：200 OK（未知事件也返回 200，避免无意义重试）

### GET /api/subscription/status

获取当前用户订阅状态。

- 请求：无（从 session 取 user_id）
- 响应：
```json
{
  "subscribed": true,
  "variant": "pro",
  "status": "active",
  "period_end": "2026-06-11T00:00:00Z",
  "trial_used": 2,
  "trial_limit": 3
}
```

### 新增环境变量

```
LEMONSQUEEZY_API_KEY=          # Store API Key
LEMONSQUEEZY_SIGNING_SECRET=   # Webhook 签名密钥
LEMONSQUEEZY_STORE_ID=         # Store ID
```

---

## 前端设计

### 新增文件

```
components/pricing/
├── PricingCard.tsx          # 单方案卡片
├── PricingSection.tsx       # 三方案对比区
app/[lang]/pricing/
├── page.tsx                 # 定价页路由
```

### 修改文件

```
components/chat/ChatInput.tsx    # 消息入口门控
components/chat/MessageList.tsx  # 剩余消息提示横幅
components/common/NavbarClient.tsx  # 添加"定价"链接
```

### 定价页 `/[lang]/pricing`

- 三列卡片布局（桌面端）/ 单列堆叠（移动端）
- 月付/年付切换开关，全局影响三张卡片价格
- 每张卡片：方案名 → 价格 → 权益列表 → CTA 按钮
- CTA 根据登录状态：
  - 未登录："开始试用" → 跳转 `/auth/login?redirect=/pricing`
  - 已登录："立即订阅" → POST checkout → 重定向 LS

### 消息门控

在 `handleSend` 中，发送前检查：

1. 已订阅 → 放行，不计数
2. 未订阅且 trial_used < 3 → 放行，递增 trial_used
3. 未订阅且 trial_used >= 3 → 阻止，弹出提示引导去定价页

### 剩余消息横幅

ChatInput 上方或 MessageList 底部：

> "免费试用：已使用 2/3 条消息。[订阅解锁无限对话 →](/pricing)"

- 仅在未订阅且 trial_used < 3 时显示
- 订阅后消失

### 定价入口

- 导航栏添加"定价"链接（未登录/未订阅时可见）
- 落地页 TipsSection 后添加 Pricing CTA 区域

---

## LemonSqueezy 后台配置

需在 LemonSqueezy 后台创建：

1. 3 个产品：Starter、Pro、Ultra
2. 每个产品 2 个变体：月付 + 年付（共 6 个 variant）
3. Webhook 端点：`https://<domain>/api/subscription/webhook`，订阅 `subscription_created`、`subscription_updated`、`subscription_cancelled` 事件
4. 获取 Store ID、API Key、Signing Secret

---

## 消息限制回收

须实现 cron job（Vercel Cron Jobs 每分钟执行）清理过期消息：

1. 根据方案查询已订阅用户的 conversations
2. Starter：删除 7 天前的消息；Pro：删除 30 天前的消息
3. Ultra 跳过

清理策略：将过期消息的 `content` 置为空或软删除标记，保留 conversation 结构。

---

## 专家工作效果映射

内部实现映射（不向用户展示技术参数）：

| 效果 | max_tokens | 说明 |
|------|------------|------|
| 轻量（Starter） | 512 | 简洁快速回复 |
| 标准（Pro） | 1024 | 深度分析回复 |
| 专注（Ultra） | 2048 | 完整咨询体验 |

---

## 方案与 LS Variant 映射

LS 后台创建变体后，后端通过环境变量维护映射（便于变更不用改代码）：

```
LEMONSQUEEZY_VARIANT_STARTER_MONTHLY=   # LS variant_id
LEMONSQUEEZY_VARIANT_STARTER_YEARLY=
LEMONSQUEEZY_VARIANT_PRO_MONTHLY=
LEMONSQUEEZY_VARIANT_PRO_YEARLY=
LEMONSQUEEZY_VARIANT_ULTRA_MONTHLY=
LEMONSQUEEZY_VARIANT_ULTRA_YEARLY=
```

Webhook 中通过 variant_id 反查 variant_name（starter/pro/ultra）写入 DB。

---

## 消息日限额与专家

Starter 仅开放 Evan 和 Liam，Pro/Ultra 开放全部四位：

- 专家选择面板中，Starter 用户只能看到 Evan 和 Liam，其他两位灰色锁定
- 点击锁定专家 → 提示升级方案
- API 层也需校验：chat/route 中检查订阅方案 + 请求 expert 的合法性
