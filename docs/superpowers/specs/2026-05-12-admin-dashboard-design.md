# 管理后台系统设计

> 创建日期：2026-05-12 | 版本：0.1.0 | 分支：feature/admin-dashboard

---

## 目的

基于 `feature/payment-gate-fixes` 创建 `feature/admin-dashboard` 分支，构建管理后台系统。
管理员账号：`blacker_admin / quan123blacker`，仅管理员可见和进入。

---

## 管理员判定

- 在 `subscriptions` 表中插入一条记录，`variant_name = 'admin'`，`status = 'active'`
- 与 starter/pro/ultra 并列，作为会员等级之一
- admin 等级手动指定，不走 PayPal 订阅流程

## 前端路由流

```
用户登录 → 查询 subscriptions 表
  ├─ variant_name = 'admin' → 自动跳转 /admin
  ├─ 普通用户 → 跳转首页
  └─ 首页导航栏：admin 用户在头像下拉菜单中显示「管理后台」入口
```

---

## 整体架构

```
┌─────────────────────────────────────────────┐
│              管理后台 /admin                  │
│  仪表盘 │ 用户管理 │ 会员管理 │ 订阅管理        │
│  项目统计 │ 流量统计                           │
└──────────────────┬──────────────────────────┘
                   │ API Routes (admin guard)
┌──────────────────┴──────────────────────────┐
│            数据统计引擎 (lib/stats/)           │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ 数据采集  │ │ 数据处理  │ │  数据查询     │ │
│  │ Collector│ │Processor │ │  Query API   │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
│  ┌──────────────────────────────────────┐    │
│  │          持久化存储 (PostgreSQL)       │    │
│  │   原始事件表 │ 聚合统计表 │ 快照表       │    │
│  └──────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

---

## 数据统计引擎 (`lib/stats/`)

```
lib/stats/
  collector.ts    — 数据采集器（埋点 SDK）
  processor.ts    — 数据处理器（聚合计算）
  query.ts        — 查询接口（为管理后台 API 提供数据）
  schema.ts       — 统计相关数据库表定义
  index.ts        — 统一导出
```

### 第一层：数据采集

| 事件类型 | 触发时机 | 记录字段 |
|---------|---------|---------|
| `page_view` | 每次页面访问 | 路径, 用户ID, IP, UA, 来源 |
| `message_sent` | 用户发消息 | 用户ID, 对话ID, 专家, 语言 |
| `auth_login` | 用户登录 | 用户ID |
| `auth_register` | 用户注册 | 用户ID |
| `subscription_change` | 订阅创建/取消/过期/续费 | 用户ID, 订阅ID, 等级, 状态 |
| `payment_completed` | 支付成功 | 用户ID, 订阅ID, 金额 |

设计原则：异步写入，不阻塞主业务流程。

### 第二层：数据处理

| 处理器 | 输出指标 | 刷新方式 |
|--------|---------|---------|
| 日活处理 | DAU | 定时(每小时) + 实时补算 |
| 留存处理 | D1/D7/D30 留存率 | 定时(每日) |
| 付费处理 | 日付费率, 日付费总额 | 定时(每小时) |
| 流量处理 | PV/UV/API调用量/响应时间 | 定时(每小时) |
| 消息处理 | 消息数/对话数/专家分布 | 定时(每小时) |
| 首页曝光 | 首页访问次数 | 定时(每小时) |

### 第三层：持久化存储

```sql
-- 原始事件流水（按 created_at 建立索引）
analytics_events (id, event_type, user_id, payload JSONB, created_at)

-- 日级聚合统计
analytics_daily_stats (id, date, metric_key, metric_value, created_at)

-- 月级聚合统计
analytics_monthly_stats (id, year_month, metric_key, metric_value, created_at)

-- 留存率快照
analytics_retention (id, cohort_date, day_n, retention_rate, created_at)
```

### 指标定义

| 指标 | 定义 |
|------|------|
| DAU（日活） | 当天至少发送过 1 条消息的唯一用户数 |
| D1 留存 | Day0 首次活跃的用户中，Day1 仍活跃的比例 |
| D7 留存 | Day0 首次活跃的用户中，Day7 仍活跃的比例 |
| D30 留存 | Day0 首次活跃的用户中，Day30 仍活跃的比例 |
| 日付费率 | 当日首次付费用户数 / 当日活跃用户数 |
| 日付费总额 | 当日所有支付金额之和 |
| PV | 页面访问次数 |
| UV | 独立访客数（按 IP/用户ID 去重） |
| 曝光量 | 首页被访问次数 |

---

## API 路由

所有管理后台 API 统一在 `/api/admin/` 下，每个路由入口调用权限守卫。

```
/api/admin/
  dashboard/route.ts              — 仪表盘概览（卡片数据）
  users/route.ts                  — 用户列表（搜索/筛选/分页）
  users/[id]/route.ts             — 用户详情 / 编辑 / 删除
  members/route.ts                — 会员列表（按等级筛选）
  members/[id]/route.ts           — 会员详情 / 升降级 / 导出
  subscriptions/route.ts          — 订阅列表（按状态筛选）
  subscriptions/[id]/route.ts     — 订阅详情 / 取消 / 标记到期
  subscriptions/[id]/history/route.ts — 订阅变更日志
  stats/project/route.ts          — 项目统计（DAU/留存/付费/消息）
  stats/traffic/route.ts          — 流量统计（PV/UV/API/曝光）
```

### 权限守卫 (`lib/admin/guard.ts`)

```typescript
// 每个 API Route 入口调用
// 1. 从 session 取 userId
// 2. 查 subscriptions 表，是否存在 variant_name = 'admin' 且 status = 'active'
// 3. 是 → 放行；否 → 403
```

---

## 前端页面结构

```
/admin
  layout.tsx                      — AdminLayout：Sidebar + 权限守卫 (SC)
  page.tsx                        — 默认重定向到 /admin/dashboard

  /dashboard/page.tsx             — 仪表盘
  /users/page.tsx                 — 用户列表
  /users/[id]/page.tsx            — 用户详情
  /members/page.tsx               — 会员列表
  /members/[id]/page.tsx          — 会员详情
  /subscriptions/page.tsx         — 订阅列表
  /subscriptions/[id]/page.tsx    — 订阅详情
  /stats/project/page.tsx         — 项目数据统计
  /stats/traffic/page.tsx         — 流量数据统计
```

## 组件树

```
components/admin/
  AdminLayout.tsx            — 整体布局：侧边栏 + 内容区
  AdminSidebar.tsx           — 侧边栏导航（分组可折叠）
  AdminGuard.tsx             — 客户端权限哨兵（辅助）
  │
  dashboard/
    StatCard.tsx              — 数据卡片（用户数/消息/收入等）
    TrendChart.tsx            — 折线图（消息趋势/DAU趋势）
    DistributionChart.tsx    — 饼图（会员分布/专家分布）
  │
  shared/
    DataTable.tsx             — 通用数据表格（搜索/筛选/分页）
    DateRangePicker.tsx       — 日期范围选择器（日/月/年/自定义）
    StatFilter.tsx            — 统计筛选栏
    ExportButton.tsx          — 导出按钮
    ConfirmDialog.tsx         — 确认对话框（删除/禁用等操作）
  │
  users/
    UserTable.tsx             — 用户表格
    UserDetail.tsx            — 用户详情面板
  │
  members/
    MemberTable.tsx           — 会员表格（按等级筛选）
    MemberDetail.tsx          — 会员详情 + 升降级操作
  │
  subscriptions/
    SubTable.tsx              — 订阅表格（按状态筛选）
    SubDetail.tsx             — 订阅详情 + 操作
    SubHistory.tsx            — 变更日志
  │
  stats/
    RetentionChart.tsx        — 留存率图
    PaymentChart.tsx          — 付费趋势图
    TrafficChart.tsx          — 流量图
```

---

## 导航结构

侧边栏分组可折叠：

- **数据概览**：仪表盘
- **用户体系**：用户管理、会员管理、订阅管理
- **数据分析**：项目统计、流量统计

管理后台全中文，无国际化。

---

## 技术选型

| 项 | 选择 | 原因 |
|----|------|------|
| 架构 | 混合架构（SC + CC） | 兼顾性能与交互 |
| 图表 | `recharts` | React 原生，轻量，支持折线/饼/柱 |
| 表格 | 自研 `DataTable` | 不引入重量级表格库 |
| 样式 | Tailwind CSS 4 | 与项目现有技术栈一致 |
| 日期处理 | `date-fns`（已有） | 轻量 |

---

## 各模块功能

### 仪表盘
- 数据卡片：用户总数、活跃订阅数、今日消息量、收入总额
- 消息趋势折线图、会员分布饼图

### 用户管理
- 用户列表（搜索/筛选/分页）
- 查看用户详情（基本信息、订阅状态、消息统计）
- 编辑/禁用用户、删除用户及关联数据

### 会员管理
- 按等级筛选（starter/pro/ultra/admin）
- 各等级会员列表，查看单个会员详情
- 手动升降级
- 批量操作（批量升级/降级、导出会员列表）

### 订阅管理
- 订阅列表（按 active/cancelled/expired 状态筛选）
- 查看订阅详情（PayPal 订阅 ID、计划、到期时间）
- 手动取消订阅、标记到期
- 查看订阅历史变更日志

### 项目数据统计
- DAU、留存率(D1/D7/D30)、日付费率、日付费总额
- 总对话数、总消息数、专家使用分布
- 所有图表支持日/月/年/自定义日期范围切换
- 可视化呈现

### 流量数据统计
- 页面流量（PV/UV/来源渠道）
- API 调用量、响应时间
- 首页曝光量
- 支持日/月/年/自定义日期范围切换
- 可视化呈现

---

## 数据库变更

### 新增表

```sql
-- 原始事件流水
CREATE TABLE analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_events_type_created ON analytics_events(event_type, created_at);

-- 日级聚合统计
CREATE TABLE analytics_daily_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, metric_key)
);

-- 月级聚合统计
CREATE TABLE analytics_monthly_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year_month TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(year_month, metric_key)
);

-- 留存率快照
CREATE TABLE analytics_retention (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cohort_date DATE NOT NULL,
  day_n SMALLINT NOT NULL,
  retention_rate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cohort_date, day_n)
);
```
