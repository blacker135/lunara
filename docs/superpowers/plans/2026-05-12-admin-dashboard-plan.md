# 管理后台系统实施计划

> **对于 agentic workers:** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 来逐步实施此计划。步骤使用 checkbox (`- [ ]`) 语法进行追踪。

**目标：** 构建包含数据统计引擎、管理后台 API 和前端页面的完整管理后台系统

**架构：** 混合架构（Server Components + Client Components），数据统计引擎负责采集/处理/查询，通过 API Routes 向管理后台前端提供数据。管理员通过 `subscriptions.variant_name = 'admin'` 判定。

**技术栈：** Next.js 16, React 19, Drizzle ORM, PostgreSQL, Recharts, Tailwind CSS 4, TypeScript

---

## 文件结构总览

```
新增文件：
lib/stats/schema.ts          — 统计表 Drizzle Schema
lib/stats/collector.ts       — 事件采集器
lib/stats/processor.ts       — 聚合处理器
lib/stats/query.ts           — 查询接口
lib/stats/index.ts           — 统一导出
lib/admin/guard.ts           — Admin 权限守卫

app/api/admin/dashboard/route.ts
app/api/admin/users/route.ts
app/api/admin/users/[id]/route.ts
app/api/admin/members/route.ts
app/api/admin/members/[id]/route.ts
app/api/admin/subscriptions/route.ts
app/api/admin/subscriptions/[id]/route.ts
app/api/admin/subscriptions/[id]/history/route.ts
app/api/admin/stats/project/route.ts
app/api/admin/stats/traffic/route.ts

app/admin/layout.tsx
app/admin/page.tsx
app/admin/dashboard/page.tsx
app/admin/users/page.tsx
app/admin/users/[id]/page.tsx
app/admin/members/page.tsx
app/admin/members/[id]/page.tsx
app/admin/subscriptions/page.tsx
app/admin/subscriptions/[id]/page.tsx
app/admin/stats/project/page.tsx
app/admin/stats/traffic/page.tsx

components/admin/AdminLayout.tsx
components/admin/AdminSidebar.tsx
components/admin/AdminGuard.tsx
components/admin/dashboard/StatCard.tsx
components/admin/dashboard/TrendChart.tsx
components/admin/dashboard/DistributionChart.tsx
components/admin/shared/DataTable.tsx
components/admin/shared/DateRangePicker.tsx
components/admin/shared/StatFilter.tsx
components/admin/shared/ExportButton.tsx
components/admin/shared/ConfirmDialog.tsx
components/admin/users/UserTable.tsx
components/admin/users/UserDetail.tsx
components/admin/members/MemberTable.tsx
components/admin/members/MemberDetail.tsx
components/admin/subscriptions/SubTable.tsx
components/admin/subscriptions/SubDetail.tsx
components/admin/subscriptions/SubHistory.tsx
components/admin/stats/RetentionChart.tsx
components/admin/stats/PaymentChart.tsx
components/admin/stats/TrafficChart.tsx

修改文件：
lib/db/schema.ts             — 新增 4 张统计表
components/common/NavbarClient.tsx — admin 用户头像下拉菜单增加管理后台入口
app/[lang]/layout.tsx        — 登录后 admin 自动跳转 /admin

scripts/create-admin.ts       — 创建管理员账号脚本
```

---

## Phase 1：数据库迁移 + 数据统计引擎

### Task 1.1：安装 recharts 依赖

- [ ] **Step 1：安装 recharts**

```bash
npm install recharts
```

- [ ] **Step 2：提交**

```bash
git add package.json package-lock.json
git commit -m "chore: add recharts dependency"
```

### Task 1.2：新增统计表 Schema

**文件：**
- 修改：`lib/db/schema.ts`（末尾追加）
- 创建：`lib/stats/schema.ts`（重导出便于独立引用）

- [ ] **Step 1：在 lib/db/schema.ts 末尾追加统计表定义**

```typescript
// ============================================================
// 数据统计引擎 — 原始事件流水
// ============================================================

export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventType: text('event_type').notNull(),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  payload: jsonb('payload').default({}),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  typeCreatedIdx: index('idx_events_type_created').on(table.eventType, table.createdAt),
}));

// ============================================================
// 日级聚合统计
// ============================================================

export const analyticsDailyStats = pgTable('analytics_daily_stats', {
  id: uuid('id').defaultRandom().primaryKey(),
  date: date('date').notNull(),
  metricKey: text('metric_key').notNull(),
  metricValue: numeric('metric_value').notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  dateKeyUnique: uniqueIndex('idx_daily_stats_date_key').on(table.date, table.metricKey),
}));

// ============================================================
// 月级聚合统计
// ============================================================

export const analyticsMonthlyStats = pgTable('analytics_monthly_stats', {
  id: uuid('id').defaultRandom().primaryKey(),
  yearMonth: text('year_month').notNull(),
  metricKey: text('metric_key').notNull(),
  metricValue: numeric('metric_value').notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  ymKeyUnique: uniqueIndex('idx_monthly_stats_ym_key').on(table.yearMonth, table.metricKey),
}));

// ============================================================
// 留存率快照
// ============================================================

export const analyticsRetention = pgTable('analytics_retention', {
  id: uuid('id').defaultRandom().primaryKey(),
  cohortDate: date('cohort_date').notNull(),
  dayN: smallint('day_n').notNull(),
  retentionRate: numeric('retention_rate').notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  cohortDayUnique: uniqueIndex('idx_retention_cohort_day').on(table.cohortDate, table.dayN),
}));
```

- [ ] **Step 2：在 schema.ts 顶部追加缺失的导入**

```typescript
// 在现有 import 中的 from 'drizzle-orm/pg-core' 追加：date, numeric, smallint, jsonb, uniqueIndex
import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  pgEnum,
  index,
  date,
  numeric,
  smallint,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
```

- [ ] **Step 3：创建 lib/stats/schema.ts 重导出**

```typescript
// lib/stats/schema.ts
// 统计引擎表定义 — 从 db/schema.ts 重导出

export {
  analyticsEvents,
  analyticsDailyStats,
  analyticsMonthlyStats,
  analyticsRetention,
} from '@/lib/db/schema';
```

- [ ] **Step 4：提交**

```bash
git add lib/db/schema.ts lib/stats/schema.ts
git commit -m "feat: add analytics tables to schema"
```

### Task 1.3：生成数据库迁移

- [ ] **Step 1：生成迁移**

```bash
npx drizzle-kit generate
```

- [ ] **Step 2：运行迁移**

```bash
npx drizzle-kit migrate
```

- [ ] **Step 3：提交**

```bash
git add lib/db/migrations/
git commit -m "feat: generate analytics tables migration"
```

### Task 1.4：实现事件采集器

**文件：** 创建 `lib/stats/collector.ts`

- [ ] **Step 1：实现 collector**

```typescript
// lib/stats/collector.ts
// 数据统计引擎 — 事件采集器
// 在业务关键节点异步记录原始事件，不阻塞主流程

import { db } from '@/lib/db';
import { analyticsEvents } from './schema';

/** 事件类型 */
export type EventType =
  | 'page_view'
  | 'message_sent'
  | 'auth_login'
  | 'auth_register'
  | 'subscription_change'
  | 'payment_completed';

/** 事件记录参数 */
interface TrackEventParams {
  eventType: EventType;
  userId?: string;
  payload?: Record<string, unknown>;
}

/**
 * 记录一条分析事件（异步，不阻塞主流程）
 * 调用方无需 await，fire-and-forget
 */
export function trackEvent(params: TrackEventParams): void {
  const { eventType, userId, payload = {} } = params;
  db.insert(analyticsEvents)
    .values({
      eventType,
      userId: userId ?? null,
      payload: payload as any,
    })
    .execute()
    .catch((err) => {
      console.error('[StatsCollector] 事件记录失败:', eventType, err);
    });
}

/** 页面访问快捷方法 */
export function trackPageView(path: string, userId?: string, referrer?: string): void {
  trackEvent({
    eventType: 'page_view',
    userId,
    payload: { path, referrer: referrer ?? '' },
  });
}

/** 消息发送快捷方法 */
export function trackMessageSent(
  userId: string,
  conversationId: string,
  expert: string,
  language: string
): void {
  trackEvent({
    eventType: 'message_sent',
    userId,
    payload: { conversationId, expert, language },
  });
}

/** 登录快捷方法 */
export function trackAuthLogin(userId: string): void {
  trackEvent({ eventType: 'auth_login', userId });
}

/** 注册快捷方法 */
export function trackAuthRegister(userId: string): void {
  trackEvent({ eventType: 'auth_register', userId });
}

/** 订阅变更快捷方法 */
export function trackSubscriptionChange(
  userId: string,
  subscriptionId: string,
  variantName: string,
  status: string
): void {
  trackEvent({
    eventType: 'subscription_change',
    userId,
    payload: { subscriptionId, variantName, status },
  });
}

/** 支付成功快捷方法 */
export function trackPaymentCompleted(
  userId: string,
  subscriptionId: string,
  amount: number
): void {
  trackEvent({
    eventType: 'payment_completed',
    userId,
    payload: { subscriptionId, amount },
  });
}
```

- [ ] **Step 2：提交**

```bash
git add lib/stats/collector.ts
git commit -m "feat: add analytics event collector"
```

### Task 1.5：实现聚合处理器

**文件：** 创建 `lib/stats/processor.ts`

- [ ] **Step 1：实现 processor**

```typescript
// lib/stats/processor.ts
// 数据统计引擎 — 聚合处理器
// 将原始事件按日/月聚合为统计指标，供查询层使用

import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { analyticsEvents, analyticsDailyStats, analyticsMonthlyStats, analyticsRetention } from './schema';

/**
 * 计算 DAU（当日至少发过 1 条消息的唯一用户数）
 * 写入 analytics_daily_stats，metric_key = 'dau'
 */
export async function processDAU(dateStr: string): Promise<number> {
  const result = await db
    .execute<{ count: number }>(
      sql`SELECT COUNT(DISTINCT user_id)::int as count
          FROM ${analyticsEvents}
          WHERE event_type = 'message_sent'
            AND created_at::date = ${dateStr}::date`
    );

  const count = result.rows[0]?.count ?? 0;

  await db
    .insert(analyticsDailyStats)
    .values({ date: dateStr, metricKey: 'dau', metricValue: String(count) })
    .onConflictDoUpdate({
      target: [analyticsDailyStats.date, analyticsDailyStats.metricKey],
      set: { metricValue: String(count) },
    });

  return count;
}

/**
 * 计算消息总数（按天）
 */
export async function processMessageCount(dateStr: string): Promise<number> {
  const result = await db
    .execute<{ count: number }>(
      sql`SELECT COUNT(*)::int as count
          FROM ${analyticsEvents}
          WHERE event_type = 'message_sent'
            AND created_at::date = ${dateStr}::date`
    );

  const count = result.rows[0]?.count ?? 0;

  await db
    .insert(analyticsDailyStats)
    .values({ date: dateStr, metricKey: 'message_count', metricValue: String(count) })
    .onConflictDoUpdate({
      target: [analyticsDailyStats.date, analyticsDailyStats.metricKey],
      set: { metricValue: String(count) },
    });

  return count;
}

/**
 * 计算 PV（页面访问次数）
 */
export async function processPV(dateStr: string): Promise<number> {
  const result = await db
    .execute<{ count: number }>(
      sql`SELECT COUNT(*)::int as count
          FROM ${analyticsEvents}
          WHERE event_type = 'page_view'
            AND created_at::date = ${dateStr}::date`
    );

  const count = result.rows[0]?.count ?? 0;

  await db
    .insert(analyticsDailyStats)
    .values({ date: dateStr, metricKey: 'pv', metricValue: String(count) })
    .onConflictDoUpdate({
      target: [analyticsDailyStats.date, analyticsDailyStats.metricKey],
      set: { metricValue: String(count) },
    });

  return count;
}

/**
 * 计算 UV（独立访客数）
 */
export async function processUV(dateStr: string): Promise<number> {
  const result = await db
    .execute<{ count: number }>(
      sql`SELECT COUNT(DISTINCT COALESCE(user_id, 'anon'))::int as count
          FROM ${analyticsEvents}
          WHERE event_type = 'page_view'
            AND created_at::date = ${dateStr}::date`
    );

  const count = result.rows[0]?.count ?? 0;

  await db
    .insert(analyticsDailyStats)
    .values({ date: dateStr, metricKey: 'uv', metricValue: String(count) })
    .onConflictDoUpdate({
      target: [analyticsDailyStats.date, analyticsDailyStats.metricKey],
      set: { metricValue: String(count) },
    });

  return count;
}

/**
 * 计算首页曝光量
 */
export async function processHomepageExposure(dateStr: string): Promise<number> {
  const result = await db
    .execute<{ count: number }>(
      sql`SELECT COUNT(*)::int as count
          FROM ${analyticsEvents}
          WHERE event_type = 'page_view'
            AND payload->>'path' = '/'
            AND created_at::date = ${dateStr}::date`
    );

  const count = result.rows[0]?.count ?? 0;

  await db
    .insert(analyticsDailyStats)
    .values({ date: dateStr, metricKey: 'homepage_exposure', metricValue: String(count) })
    .onConflictDoUpdate({
      target: [analyticsDailyStats.date, analyticsDailyStats.metricKey],
      set: { metricValue: String(count) },
    });

  return count;
}

/**
 * 计算日付费总额
 */
export async function processPaymentTotal(dateStr: string): Promise<number> {
  const result = await db
    .execute<{ total: number }>(
      sql`SELECT COALESCE(SUM((payload->>'amount')::numeric), 0) as total
          FROM ${analyticsEvents}
          WHERE event_type = 'payment_completed'
            AND created_at::date = ${dateStr}::date`
    );

  const total = result.rows[0]?.total ?? 0;

  await db
    .insert(analyticsDailyStats)
    .values({ date: dateStr, metricKey: 'payment_total', metricValue: String(total) })
    .onConflictDoUpdate({
      target: [analyticsDailyStats.date, analyticsDailyStats.metricKey],
      set: { metricValue: String(total) },
    });

  return total;
}

/**
 * 计算日付费率 = 当日首次付费用户数 / DAU × 100
 */
export async function processPaymentRate(dateStr: string, dau: number): Promise<number> {
  const result = await db
    .execute<{ count: number }>(
      sql`SELECT COUNT(DISTINCT user_id)::int as count
          FROM ${analyticsEvents}
          WHERE event_type = 'payment_completed'
            AND created_at::date = ${dateStr}::date
            AND user_id NOT IN (
              SELECT DISTINCT user_id FROM ${analyticsEvents}
              WHERE event_type = 'payment_completed'
                AND created_at::date < ${dateStr}::date
            )`
    );

  const firstPayers = result.rows[0]?.count ?? 0;
  const rate = dau > 0 ? (firstPayers / dau) * 100 : 0;

  await db
    .insert(analyticsDailyStats)
    .values({ date: dateStr, metricKey: 'payment_rate', metricValue: String(rate) })
    .onConflictDoUpdate({
      target: [analyticsDailyStats.date, analyticsDailyStats.metricKey],
      set: { metricValue: String(rate) },
    });

  return rate;
}

/**
 * 计算留存率 (D1/D7/D30)
 * cohortDate: 队列日期（用户首次活跃日期）
 * dayN: 1 / 7 / 30
 */
export async function processRetention(cohortDate: string, dayN: number): Promise<number> {
  const result = await db
    .execute<{ rate: number }>(
      sql`
        WITH cohort AS (
          SELECT DISTINCT user_id
          FROM ${analyticsEvents}
          WHERE event_type = 'message_sent'
            AND created_at::date = ${cohortDate}::date
        ),
        retained AS (
          SELECT DISTINCT e.user_id
          FROM ${analyticsEvents} e
          INNER JOIN cohort c ON e.user_id = c.user_id
          WHERE e.event_type = 'message_sent'
            AND e.created_at::date = (${cohortDate}::date + ${dayN}::int)
        )
        SELECT
          CASE WHEN (SELECT COUNT(*) FROM cohort) > 0
            THEN (SELECT COUNT(*)::numeric FROM retained) / (SELECT COUNT(*)::numeric FROM cohort) * 100
            ELSE 0
          END as rate
      `
    );

  const rate = result.rows[0]?.rate ?? 0;

  await db
    .insert(analyticsRetention)
    .values({ cohortDate, dayN, retentionRate: String(rate) })
    .onConflictDoUpdate({
      target: [analyticsRetention.cohortDate, analyticsRetention.dayN],
      set: { retentionRate: String(rate) },
    });

  return rate;
}

/**
 * 按月聚合：将当月所有日的 metric 汇总写入月表
 */
export async function processMonthlyAggregation(yearMonth: string): Promise<void> {
  const startDate = `${yearMonth}-01`;

  const metrics = ['dau', 'message_count', 'pv', 'uv', 'homepage_exposure', 'payment_total', 'payment_rate'];

  for (const key of metrics) {
    const result = await db
      .execute<{ total: number }>(
        sql`SELECT COALESCE(SUM(metric_value::numeric), 0) as total
            FROM ${analyticsDailyStats}
            WHERE metric_key = ${key}
              AND date >= ${startDate}::date
              AND date < (${startDate}::date + INTERVAL '1 month')`
      );

    await db
      .insert(analyticsMonthlyStats)
      .values({ yearMonth, metricKey: key, metricValue: String(result.rows[0]?.total ?? 0) })
      .onConflictDoUpdate({
        target: [analyticsMonthlyStats.yearMonth, analyticsMonthlyStats.metricKey],
        set: { metricValue: String(result.rows[0]?.total ?? 0) },
      });
  }
}

/**
 * 批量处理每日聚合（供定时任务调用）
 */
export async function processDailyStats(dateStr: string): Promise<void> {
  const dau = await processDAU(dateStr);
  await processMessageCount(dateStr);
  await processPV(dateStr);
  await processUV(dateStr);
  await processHomepageExposure(dateStr);
  await processPaymentTotal(dateStr);
  await processPaymentRate(dateStr, dau);
}
```

- [ ] **Step 2：提交**

```bash
git add lib/stats/processor.ts
git commit -m "feat: add analytics data processor"
```

### Task 1.6：实现查询接口

**文件：** 创建 `lib/stats/query.ts`

- [ ] **Step 1：实现 query**

```typescript
// lib/stats/query.ts
// 数据统计引擎 — 查询接口
// 为管理后台 API 提供统一的数据查询方法

import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  analyticsEvents,
  analyticsDailyStats,
  analyticsMonthlyStats,
  analyticsRetention,
} from './schema';

/** 日期范围查询参数 */
export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

/** 粒度 */
export type Granularity = 'day' | 'month' | 'year';

// ----- 仪表盘 -----

/** 用户总数 */
export async function queryTotalUsers(): Promise<number> {
  const result = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int as count FROM "user"`
  );
  return result.rows[0]?.count ?? 0;
}

/** 活跃订阅数 */
export async function queryActiveSubscriptions(): Promise<number> {
  const result = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int as count FROM subscriptions WHERE status = 'active'`
  );
  return result.rows[0]?.count ?? 0;
}

/** 今日消息量 */
export async function queryTodayMessages(): Promise<number> {
  const result = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int as count FROM messages WHERE created_at::date = CURRENT_DATE`
  );
  return result.rows[0]?.count ?? 0;
}

/** 收入总额 */
export async function queryTotalRevenue(): Promise<number> {
  const result = await db.execute<{ total: number }>(
    sql`SELECT COALESCE(SUM((payload->>'amount')::numeric), 0) as total
        FROM analytics_events WHERE event_type = 'payment_completed'`
  );
  return result.rows[0]?.total ?? 0;
}

// ----- 项目统计 -----

/** 按日期范围获取 DAU 序列 */
export async function queryDAUSeries(range: DateRange): Promise<{ date: string; value: number }[]> {
  const result = await db.execute<{ date: string; value: number }>(
    sql`SELECT date::text, metric_value::numeric as value
        FROM analytics_daily_stats
        WHERE metric_key = 'dau' AND date >= ${range.start}::date AND date <= ${range.end}::date
        ORDER BY date`
  );
  return result.rows.map((r) => ({ date: r.date, value: Number(r.value) }));
}

/** 按日期范围获取消息数序列 */
export async function queryMessageSeries(range: DateRange): Promise<{ date: string; value: number }[]> {
  const result = await db.execute<{ date: string; value: number }>(
    sql`SELECT date::text, metric_value::numeric as value
        FROM analytics_daily_stats
        WHERE metric_key = 'message_count' AND date >= ${range.start}::date AND date <= ${range.end}::date
        ORDER BY date`
  );
  return result.rows.map((r) => ({ date: r.date, value: Number(r.value) }));
}

/** 总对话数 */
export async function queryTotalConversations(): Promise<number> {
  const result = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int as count FROM conversations`
  );
  return result.rows[0]?.count ?? 0;
}

/** 总消息数 */
export async function queryTotalMessages(): Promise<number> {
  const result = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int as count FROM messages`
  );
  return result.rows[0]?.count ?? 0;
}

/** 专家使用分布 */
export async function queryExpertDistribution(): Promise<{ expert: string; count: number }[]> {
  const result = await db.execute<{ expert: string; count: number }>(
    sql`SELECT expert, COUNT(*)::int as count FROM conversations GROUP BY expert ORDER BY count DESC`
  );
  return result.rows;
}

/** 获取留存率序列 */
export async function queryRetentionSeries(
  cohortDate: string,
  days: number[]
): Promise<{ dayN: number; rate: number }[]> {
  const result = await db.execute<{ dayN: number; rate: number }>(
    sql`SELECT day_n::int as "dayN", retention_rate::numeric as rate
        FROM analytics_retention
        WHERE cohort_date = ${cohortDate}::date AND day_n = ANY(${days}::smallint[])
        ORDER BY day_n`
  );
  return result.rows.map((r) => ({ dayN: r.dayN, rate: Number(r.rate) }));
}

/** 获取留存率（单日） */
export async function queryRetention(cohortDate: string, dayN: number): Promise<number> {
  const result = await db.execute<{ rate: number }>(
    sql`SELECT retention_rate::numeric as rate
        FROM analytics_retention
        WHERE cohort_date = ${cohortDate}::date AND day_n = ${dayN}::smallint`
  );
  return Number(result.rows[0]?.rate ?? 0);
}

/** 按日期范围获取付费数据序列 */
export async function queryPaymentSeries(range: DateRange): Promise<{
  dates: string[];
  paymentTotal: number[];
  paymentRate: number[];
}> {
  const result = await db.execute<{ date: string; metricKey: string; value: number }>(
    sql`SELECT date::text, metric_key, metric_value::numeric as value
        FROM analytics_daily_stats
        WHERE metric_key IN ('payment_total', 'payment_rate')
          AND date >= ${range.start}::date AND date <= ${range.end}::date
        ORDER BY date, metric_key`
  );

  const dates: string[] = [];
  const paymentTotal: number[] = [];
  const paymentRate: number[] = [];

  const byDate = new Map<string, { total?: number; rate?: number }>();
  for (const r of result.rows) {
    if (!byDate.has(r.date)) byDate.set(r.date, {});
    const entry = byDate.get(r.date)!;
    if (r.metricKey === 'payment_total') entry.total = Number(r.value);
    if (r.metricKey === 'payment_rate') entry.rate = Number(r.value);
  }

  for (const [date, vals] of byDate) {
    dates.push(date);
    paymentTotal.push(vals.total ?? 0);
    paymentRate.push(vals.rate ?? 0);
  }

  return { dates, paymentTotal, paymentRate };
}

// ----- 流量统计 -----

/** 按日期范围获取 PV/UV/曝光 序列 */
export async function queryTrafficSeries(range: DateRange): Promise<{
  dates: string[];
  pv: number[];
  uv: number[];
  exposure: number[];
}> {
  const result = await db.execute<{ date: string; metricKey: string; value: number }>(
    sql`SELECT date::text, metric_key, metric_value::numeric as value
        FROM analytics_daily_stats
        WHERE metric_key IN ('pv', 'uv', 'homepage_exposure')
          AND date >= ${range.start}::date AND date <= ${range.end}::date
        ORDER BY date, metric_key`
  );

  const dates: string[] = [];
  const pv: number[] = [];
  const uv: number[] = [];
  const exposure: number[] = [];

  const byDate = new Map<string, { pv?: number; uv?: number; exposure?: number }>();
  for (const r of result.rows) {
    if (!byDate.has(r.date)) byDate.set(r.date, {});
    const entry = byDate.get(r.date)!;
    if (r.metricKey === 'pv') entry.pv = Number(r.value);
    if (r.metricKey === 'uv') entry.uv = Number(r.value);
    if (r.metricKey === 'homepage_exposure') entry.exposure = Number(r.value);
  }

  for (const [date, vals] of byDate) {
    dates.push(date);
    pv.push(vals.pv ?? 0);
    uv.push(vals.uv ?? 0);
    exposure.push(vals.exposure ?? 0);
  }

  return { dates, pv, uv, exposure };
}

// ----- 用户管理 -----

/** 用户列表（搜索/筛选/分页） */
export interface UserListParams {
  search?: string;
  page: number;
  pageSize: number;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  variantName: string | null;
  subscriptionStatus: string | null;
  messageCount: number;
  createdAt: string;
}

export async function queryUsers(params: UserListParams): Promise<{ users: UserRow[]; total: number }> {
  const offset = (params.page - 1) * params.pageSize;
  const searchFilter = params.search
    ? sql`AND (u.name ILIKE ${'%' + params.search + '%'} OR u.email ILIKE ${'%' + params.search + '%'})`
    : sql``;

  const countResult = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int as count FROM "user" u WHERE 1=1 ${searchFilter}`
  );

  const result = await db.execute<UserRow>(
    sql`SELECT
          u.id, u.name, u.email, u.created_at as "createdAt",
          s.variant_name as "variantName", s.status as "subscriptionStatus",
          COALESCE(m.msg_count, 0)::int as "messageCount"
        FROM "user" u
        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
        LEFT JOIN (
          SELECT user_id, COUNT(*) as msg_count
          FROM messages
          GROUP BY user_id
        ) m ON m.user_id = u.id
        WHERE 1=1 ${searchFilter}
        ORDER BY u.created_at DESC
        LIMIT ${params.pageSize} OFFSET ${offset}`
  );

  return { users: result.rows, total: countResult.rows[0]?.count ?? 0 };
}

// ----- 会员管理 -----

export interface MemberListParams {
  variantName?: string;
  page: number;
  pageSize: number;
}

export async function queryMembers(params: MemberListParams): Promise<{ members: UserRow[]; total: number }> {
  const offset = (params.page - 1) * params.pageSize;
  const variantFilter = params.variantName
    ? sql`AND s.variant_name = ${params.variantName}`
    : sql``;

  const countResult = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int as count FROM subscriptions s WHERE s.status = 'active' ${variantFilter}`
  );

  const result = await db.execute<UserRow>(
    sql`SELECT
          u.id, u.name, u.email, u.created_at as "createdAt",
          s.variant_name as "variantName", s.status as "subscriptionStatus",
          COALESCE(m.msg_count, 0)::int as "messageCount"
        FROM subscriptions s
        JOIN "user" u ON s.user_id = u.id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as msg_count
          FROM messages
          GROUP BY user_id
        ) m ON m.user_id = u.id
        WHERE s.status = 'active' ${variantFilter}
        ORDER BY s.created_at DESC
        LIMIT ${params.pageSize} OFFSET ${offset}`
  );

  return { members: result.rows, total: countResult.rows[0]?.count ?? 0 };
}

// ----- 订阅管理 -----

export interface SubListParams {
  status?: string;
  page: number;
  pageSize: number;
}

export interface SubRow {
  id: string;
  userName: string;
  userEmail: string;
  paypalSubscriptionId: string;
  paypalPlanId: string;
  variantName: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
}

export async function querySubscriptions(params: SubListParams): Promise<{ subs: SubRow[]; total: number }> {
  const offset = (params.page - 1) * params.pageSize;
  const statusFilter = params.status
    ? sql`AND s.status = ${params.status}`
    : sql``;

  const countResult = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int as count FROM subscriptions s WHERE 1=1 ${statusFilter}`
  );

  const result = await db.execute<SubRow>(
    sql`SELECT
          s.id, s.paypal_subscription_id as "paypalSubscriptionId",
          s.paypal_plan_id as "paypalPlanId", s.variant_name as "variantName",
          s.status, s.current_period_start as "currentPeriodStart",
          s.current_period_end as "currentPeriodEnd", s.created_at as "createdAt",
          u.name as "userName", u.email as "userEmail"
        FROM subscriptions s
        JOIN "user" u ON s.user_id = u.id
        WHERE 1=1 ${statusFilter}
        ORDER BY s.created_at DESC
        LIMIT ${params.pageSize} OFFSET ${offset}`
  );

  return { subs: result.rows, total: countResult.rows[0]?.count ?? 0 };
}
```

- [ ] **Step 2：提交**

```bash
git add lib/stats/query.ts
git commit -m "feat: add analytics query interface"
```

### Task 1.7：统���导出

**文件：** 创建 `lib/stats/index.ts`

- [ ] **Step 1：实现 index.ts**

```typescript
// lib/stats/index.ts
// 数据统计引擎 — 统一导出

export * from './schema';
export * from './collector';
export * from './processor';
export * from './query';
```

- [ ] **Step 2：提交**

```bash
git add lib/stats/index.ts
git commit -m "feat: add stats engine barrel export"
```

---

## Phase 2：权限守卫 + API 路由

### Task 2.1：实现 Admin 权限守卫

**文件：** 创建 `lib/admin/guard.ts`

- [ ] **Step 1：实现 guard**

```typescript
// lib/admin/guard.ts
// 管理员权限守卫 — 校验当前用户是否为 admin
// 调用方式：在每个 /api/admin/* route 入口调用 getAdminUserId()

import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * 从当前 session 获取 userId，并校验是否为 admin
 * 如果是 admin → 返回 userId
 * 如果不是 → 返回 403 Response
 */
export async function getAdminUserId(): Promise<string | NextResponse> {
  const { data: session } = await getSession();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.variantName, 'admin'),
        eq(subscriptions.status, 'active')
      )
    )
    .limit(1);

  if (!sub) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  return userId;
}

/**
 * 前端页面权限守卫（Server Component 用）
 * 返回 true/false，不抛 Response
 */
export async function isAdmin(userId?: string): Promise<boolean> {
  if (!userId) return false;

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.variantName, 'admin'),
        eq(subscriptions.status, 'active')
      )
    )
    .limit(1);

  return !!sub;
}
```

- [ ] **Step 2：提交**

```bash
git add lib/admin/guard.ts
git commit -m "feat: add admin permission guard"
```

### Task 2.2：仪表盘 API

**文件：** 创建 `app/api/admin/dashboard/route.ts`

- [ ] **Step 1：实现 dashboard route**

```typescript
// app/api/admin/dashboard/route.ts
// GET /api/admin/dashboard — 返回仪表盘数据卡片

import { getAdminUserId } from '@/lib/admin/guard';
import {
  queryTotalUsers,
  queryActiveSubscriptions,
  queryTodayMessages,
  queryTotalRevenue,
} from '@/lib/stats';
import { NextResponse } from 'next/server';

export async function GET() {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  try {
    const [totalUsers, activeSubs, todayMessages, totalRevenue] = await Promise.all([
      queryTotalUsers(),
      queryActiveSubscriptions(),
      queryTodayMessages(),
      queryTotalRevenue(),
    ]);

    return NextResponse.json({
      totalUsers,
      activeSubscriptions: activeSubs,
      todayMessages,
      totalRevenue,
    });
  } catch (error) {
    console.error('[AdminDashboard] 获取概览失败:', error);
    return NextResponse.json({ error: '获取概览失败' }, { status: 500 });
  }
}
```

- [ ] **Step 2：提交**

```bash
git add app/api/admin/dashboard/route.ts
git commit -m "feat: add admin dashboard API"
```

### Task 2.3：用户管理 API

**文件：** 创建 `app/api/admin/users/route.ts` 和 `app/api/admin/users/[id]/route.ts`

- [ ] **Step 1：实现用户列表 API**

```typescript
// app/api/admin/users/route.ts
// GET /api/admin/users — 用户列表（搜索/筛选/分页）

import { getAdminUserId } from '@/lib/admin/guard';
import { queryUsers } from '@/lib/stats';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  try {
    const data = await queryUsers({ search, page, pageSize });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[AdminUsers] 获取用户列表失败:', error);
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }
}
```

- [ ] **Step 2：实现用户详情/编辑/删除 API**

```typescript
// app/api/admin/users/[id]/route.ts
// GET/PATCH/DELETE /api/admin/users/:id — 查看/编辑/删除单个用户

import { getAdminUserId } from '@/lib/admin/guard';
import { db } from '@/lib/db';
import { user, subscriptions, messages, conversations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// GET: 查看用户详情
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const [u] = await db.select().from(user).where(eq(user.id, id)).limit(1);
  if (!u) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

  const sub = await db.select().from(subscriptions).where(eq(subscriptions.userId, id)).limit(1);
  const convCount = await db.$count(conversations, eq(conversations.userId, id));
  const msgCount = await db.$count(messages);

  return NextResponse.json({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    createdAt: u.createdAt,
    subscription: sub[0] ?? null,
    conversationCount: convCount,
    totalMessages: msgCount, // 近似统计（需按 user 关联查）
  });
}

// PATCH: 编辑用户
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const { name, email } = body;

  await db.update(user).set({ name, email }).where(eq(user.id, id));
  return NextResponse.json({ success: true });
}

// DELETE: 删除用户及其关联数据
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  // 级联删除：消息 → 对话 → 订阅 → 用户
  // 数据库已设置 ON DELETE CASCADE，只需删除用户即可
  await db.delete(user).where(eq(user.id, id));
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3：提交**

```bash
git add app/api/admin/users/
git commit -m "feat: add admin users API"
```

### Task 2.4：会员管理 API

**文件：** 创建 `app/api/admin/members/route.ts` 和 `app/api/admin/members/[id]/route.ts`

- [ ] **Step 1：实现会员列表 API**

```typescript
// app/api/admin/members/route.ts
// GET /api/admin/members — 会员列表（按等级筛选/分页）
// POST /api/admin/members — 批量导出

import { getAdminUserId } from '@/lib/admin/guard';
import { queryMembers } from '@/lib/stats';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const variantName = searchParams.get('variant') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  try {
    const data = await queryMembers({
      variantName: variantName || undefined,
      page,
      pageSize,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[AdminMembers] 获取会员列表失败:', error);
    return NextResponse.json({ error: '获取会员列表失败' }, { status: 500 });
  }
}

// POST: 批量导出
export async function POST(req: NextRequest) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { variantName } = await req.json();

  // 导出全部 (pageSize 设大)
  const data = await queryMembers({
    variantName: variantName || undefined,
    page: 1,
    pageSize: 10000,
  });

  // 生成 CSV
  const header = '姓名,邮箱,等级,消息数,注册时间';
  const rows = data.members.map(
    (m) => `${m.name},${m.email},${m.variantName ?? '-'},${m.messageCount},${m.createdAt}`
  );
  const csv = [header, ...rows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename=members.csv',
    },
  });
}
```

- [ ] **Step 2：实现会员详情/升降级 API**

```typescript
// app/api/admin/members/[id]/route.ts
// GET/PATCH /api/admin/members/:id — 查看/升降级会员

import { getAdminUserId } from '@/lib/admin/guard';
import { db } from '@/lib/db';
import { user, subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const [u] = await db.select().from(user).where(eq(user.id, id)).limit(1);
  if (!u) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

  const sub = await db.select().from(subscriptions).where(eq(subscriptions.userId, id)).limit(1);

  return NextResponse.json({ user: u, subscription: sub[0] ?? null });
}

// PATCH: 升降级
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { variantName } = await req.json();

  if (!['starter', 'pro', 'ultra', 'admin'].includes(variantName)) {
    return NextResponse.json({ error: '无效等级' }, { status: 400 });
  }

  await db
    .update(subscriptions)
    .set({ variantName, updatedAt: new Date() })
    .where(eq(subscriptions.userId, id));

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3：提交**

```bash
git add app/api/admin/members/
git commit -m "feat: add admin members API"
```

### Task 2.5：订阅管理 API

**文件：** 创建 `app/api/admin/subscriptions/route.ts`、`[id]/route.ts`、`[id]/history/route.ts`

- [ ] **Step 1：实现订阅列表 API**

```typescript
// app/api/admin/subscriptions/route.ts
// GET /api/admin/subscriptions — 订阅列表（按状态筛选/分页）

import { getAdminUserId } from '@/lib/admin/guard';
import { querySubscriptions } from '@/lib/stats';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  try {
    const data = await querySubscriptions({ status: status || undefined, page, pageSize });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[AdminSubscriptions] 获取订阅列表失败:', error);
    return NextResponse.json({ error: '获取订阅列表失败' }, { status: 500 });
  }
}
```

- [ ] **Step 2：实现订阅详情/操作 API**

```typescript
// app/api/admin/subscriptions/[id]/route.ts
// GET/PATCH /api/admin/subscriptions/:id — 查看详情 / 取消 / 标记到期

import { getAdminUserId } from '@/lib/admin/guard';
import { db } from '@/lib/db';
import { subscriptions, analyticsEvents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { trackSubscriptionChange } from '@/lib/stats';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1);
  if (!sub) return NextResponse.json({ error: '订阅不存在' }, { status: 404 });

  return NextResponse.json(sub);
}

// PATCH: 更新订阅状态 (取消/标记到期)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { status } = await req.json();

  if (!['cancelled', 'expired'].includes(status)) {
    return NextResponse.json({ error: '仅支持 cancelled/expired' }, { status: 400 });
  }

  await db
    .update(subscriptions)
    .set({ status: status as 'cancelled' | 'expired', updatedAt: new Date() })
    .where(eq(subscriptions.id, id));

  // 记录变更事件
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1);
  if (sub) {
    trackSubscriptionChange(sub.userId, sub.id, sub.variantName, status);
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3：实现订阅变更日志 API**

```typescript
// app/api/admin/subscriptions/[id]/history/route.ts
// GET /api/admin/subscriptions/:id/history — 查看订阅变更日志

import { getAdminUserId } from '@/lib/admin/guard';
import { db } from '@/lib/db';
import { analyticsEvents } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const events = await db
    .select()
    .from(analyticsEvents)
    .where(eq(analyticsEvents.eventType, 'subscription_change'))
    .orderBy(desc(analyticsEvents.createdAt))
    .limit(100);

  // 过滤 payload 中 subscriptionId 匹配的事件
  const history = events.filter((e) => {
    const payload = e.payload as Record<string, unknown>;
    return payload.subscriptionId === id;
  });

  return NextResponse.json(history);
}
```

- [ ] **Step 4：提交**

```bash
git add app/api/admin/subscriptions/
git commit -m "feat: add admin subscriptions API"
```

### Task 2.6：项目统计 API

**文件：** 创建 `app/api/admin/stats/project/route.ts`

- [ ] **Step 1：实现项目统计 API**

```typescript
// app/api/admin/stats/project/route.ts
// GET /api/admin/stats/project — 项目数据统计

import { getAdminUserId } from '@/lib/admin/guard';
import {
  queryDAUSeries,
  queryMessageSeries,
  queryTotalConversations,
  queryTotalMessages,
  queryExpertDistribution,
  queryPaymentSeries,
  queryRetentionSeries,
  DateRange,
} from '@/lib/stats';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start') || new Date().toISOString().slice(0, 10);
  const end = searchParams.get('end') || new Date().toISOString().slice(0, 10);

  const range: DateRange = { start, end };

  try {
    const [
      dauSeries,
      messageSeries,
      totalConversations,
      totalMessages,
      expertDist,
      paymentSeries,
      retentionD1,
      retentionD7,
      retentionD30,
    ] = await Promise.all([
      queryDAUSeries(range),
      queryMessageSeries(range),
      queryTotalConversations(),
      queryTotalMessages(),
      queryExpertDistribution(),
      queryPaymentSeries(range),
      queryRetentionSeries(start, [1, 7, 30]),
    ]);

    return NextResponse.json({
      dauSeries,
      messageSeries,
      totalConversations,
      totalMessages,
      expertDistribution: expertDist,
      paymentSeries,
      retention: {
        d1: retentionD1,
        d7: retentionD7,
        d30: retentionD30,
      },
    });
  } catch (error) {
    console.error('[AdminStatsProject] 获取项目统计失败:', error);
    return NextResponse.json({ error: '获取项目统计失败' }, { status: 500 });
  }
}
```

- [ ] **Step 2：提交**

```bash
git add app/api/admin/stats/project/route.ts
git commit -m "feat: add admin project stats API"
```

### Task 2.7：流量统计 API

**文件：** 创建 `app/api/admin/stats/traffic/route.ts`

- [ ] **Step 1：实现流量统计 API**

```typescript
// app/api/admin/stats/traffic/route.ts
// GET /api/admin/stats/traffic — 流量数据统计

import { getAdminUserId } from '@/lib/admin/guard';
import { queryTrafficSeries, DateRange } from '@/lib/stats';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start') || new Date().toISOString().slice(0, 10);
  const end = searchParams.get('end') || new Date().toISOString().slice(0, 10);

  const range: DateRange = { start, end };

  try {
    const traffic = await queryTrafficSeries(range);
    return NextResponse.json(traffic);
  } catch (error) {
    console.error('[AdminStatsTraffic] 获取流量统计失败:', error);
    return NextResponse.json({ error: '获取流量统计失败' }, { status: 500 });
  }
}
```

- [ ] **Step 2：提交**

```bash
git add app/api/admin/stats/traffic/route.ts
git commit -m "feat: add admin traffic stats API"
```

---

## Phase 3：Admin 布局 + 共享组件 + 仪表盘

### Task 3.1：AdminLayout 和 AdminSidebar

**文件：** 创建 `app/admin/layout.tsx` 和 `components/admin/AdminLayout.tsx` 和 `components/admin/AdminSidebar.tsx`

- [ ] **Step 1：实现 AdminLayout（Server Component 守卫）**

```typescript
// app/admin/layout.tsx
// 管理后台根布局 — 服务端权限校验 + AdminLayout 渲染

import { getSession } from '@/lib/auth';
import { isAdmin } from '@/lib/admin/guard';
import { redirect } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = await getSession();
  const userId = session?.user?.id;

  if (!userId) {
    redirect('/auth/login');
  }

  const admin = await isAdmin(userId);
  if (!admin) {
    redirect('/');
  }

  return <AdminLayout>{children}</AdminLayout>;
}
```

- [ ] **Step 2：实现 AdminLayout 客户端组件**

```typescript
'use client';
// components/admin/AdminLayout.tsx
// 管理后台外层布局：侧边栏 + 内容区

import AdminSidebar from './AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3：实现 AdminSidebar**

```typescript
'use client';
// components/admin/AdminSidebar.tsx
// 管理后台侧边栏导航（分组可折叠）

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavGroup {
  label: string;
  items: { href: string; label: string }[];
}

const navGroups: NavGroup[] = [
  {
    label: '数据概览',
    items: [{ href: '/admin/dashboard', label: '仪表盘' }],
  },
  {
    label: '用户体系',
    items: [
      { href: '/admin/users', label: '用户管理' },
      { href: '/admin/members', label: '会员管理' },
      { href: '/admin/subscriptions', label: '订阅管理' },
    ],
  },
  {
    label: '数据分析',
    items: [
      { href: '/admin/stats/project', label: '项目统计' },
      { href: '/admin/stats/traffic', label: '流量统计' },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-100">
        <Link href="/admin" className="text-lg font-bold text-gray-800">
          管理后台
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-2">
            <button
              onClick={() => toggle(group.label)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600"
            >
              {group.label}
              <span className="text-[10px]">{collapsed[group.label] ? '▸' : '▾'}</span>
            </button>
            {!collapsed[group.label] && (
              <div className="mt-1 space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                        active
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-100">
        <Link href="/" className="block px-3 py-2 text-sm text-gray-400 hover:text-gray-600 rounded-md">
          ← 返回首页
        </Link>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4：实现 /admin/page.tsx 重定向**

```typescript
// app/admin/page.tsx
// 默认重定向到仪表盘

import { redirect } from 'next/navigation';

export default function AdminPage() {
  redirect('/admin/dashboard');
}
```

- [ ] **Step 5：提交**

```bash
git add app/admin/layout.tsx app/admin/page.tsx components/admin/AdminLayout.tsx components/admin/AdminSidebar.tsx
git commit -m "feat: add admin layout and sidebar"
```

### Task 3.2：共享组件 — DataTable

**文件：** 创建 `components/admin/shared/DataTable.tsx`

- [ ] **Step 1：实现 DataTable**

```typescript
'use client';
// components/admin/shared/DataTable.tsx
// 通用数据表格（搜索/分页）

'use client';

import { useState } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onPageChange: (page: number) => void;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  total,
  page,
  pageSize,
  searchPlaceholder = '搜索...',
  onSearch,
  onPageChange,
  onRowClick,
  isLoading,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      {onSearch && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      )}

      {/* 表格 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase ${col.className ?? ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                    加载中...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                    暂无数据
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr
                    key={i}
                    onClick={() => onRowClick?.(row)}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                      onRowClick ? 'cursor-pointer' : ''
                    }`}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-sm text-gray-700 ${col.className ?? ''}`}
                      >
                        {col.render ? col.render(row) : String(row[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            共 {total} 条，第 {page} / {totalPages} 页
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              上一页
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2：提交**

```bash
git add components/admin/shared/DataTable.tsx
git commit -m "feat: add admin DataTable component"
```

### Task 3.3：共享组件 — DateRangePicker、StatFilter、ExportButton、ConfirmDialog

**文件：** 创建各共享组件

- [ ] **Step 1：实现 DateRangePicker**

```typescript
'use client';
// components/admin/shared/DateRangePicker.tsx
// 日期范围选择器 — 日/月/年/自定义

'use client';

type Preset = 'day' | 'month' | 'year' | 'custom';

interface DateRangePickerProps {
  value: { start: string; end: string; preset: Preset };
  onChange: (range: { start: string; end: string; preset: Preset }) => void;
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const presets: { key: Preset; label: string }[] = [
    { key: 'day', label: '今日' },
    { key: 'month', label: '本月' },
    { key: 'year', label: '本年' },
    { key: 'custom', label: '自定义' },
  ];

  const handlePreset = (preset: Preset) => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    switch (preset) {
      case 'day':
        onChange({ start: fmt(today), end: fmt(today), preset });
        break;
      case 'month':
        onChange({
          start: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
          end: fmt(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
          preset,
        });
        break;
      case 'year':
        onChange({
          start: fmt(new Date(today.getFullYear(), 0, 1)),
          end: fmt(new Date(today.getFullYear(), 11, 31)),
          preset,
        });
        break;
      case 'custom':
        onChange({ start: value.start, end: value.end, preset });
        break;
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePreset(p.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              value.preset === p.key
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {value.preset === 'custom' && (
        <div className="flex items-center gap-2 text-sm">
          <input
            type="date"
            value={value.start}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
          />
          <span className="text-gray-400">至</span>
          <input
            type="date"
            value={value.end}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2：实现 StatFilter、ExportButton、ConfirmDialog**

```typescript
'use client';
// components/admin/shared/StatFilter.tsx
// 统计筛选栏 — 日期范围 + 可选额外筛选

import DateRangePicker from './DateRangePicker';

interface StatFilterProps {
  dateRange: { start: string; end: string; preset: 'day' | 'month' | 'year' | 'custom' };
  onDateRangeChange: (range: { start: string; end: string; preset: 'day' | 'month' | 'year' | 'custom' }) => void;
}

export default function StatFilter({ dateRange, onDateRangeChange }: StatFilterProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
    </div>
  );
}
```

```typescript
'use client';
// components/admin/shared/ExportButton.tsx
// 导出按钮 — 调用 API 下载文件

'use client';

interface ExportButtonProps {
  label?: string;
  apiUrl: string;
  body?: Record<string, unknown>;
}

export default function ExportButton({ label = '导出', apiUrl, body }: ExportButtonProps) {
  const handleExport = async () => {
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('导出失败:', err);
    }
  };

  return (
    <button
      onClick={handleExport}
      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
    >
      {label}
    </button>
  );
}
```

```typescript
'use client';
// components/admin/shared/ConfirmDialog.tsx
// 确认对话框 — 用于删除/禁用等危险操作

'use client';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '确认',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3：提交**

```bash
git add components/admin/shared/DateRangePicker.tsx components/admin/shared/StatFilter.tsx components/admin/shared/ExportButton.tsx components/admin/shared/ConfirmDialog.tsx
git commit -m "feat: add admin shared UI components"
```

### Task 3.4：仪表盘组件 + 页面

**文件：** 创建仪表盘组件和页面

- [ ] **Step 1：实现 StatCard**

```typescript
'use client';
// components/admin/dashboard/StatCard.tsx
// 数据卡片 — 显示单个统计数值

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

export default function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-800">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}
```

- [ ] **Step 2：实现 TrendChart 和 DistributionChart**

```typescript
'use client';
// components/admin/dashboard/TrendChart.tsx
// 趋势折线图 — 消息/DAU 趋势

'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendChartProps {
  data: { date: string; value: number }[];
  label?: string;
  color?: string;
}

export default function TrendChart({ data, label = '数值', color = '#3b82f6' }: TrendChartProps) {
  if (!data.length) {
    return <div className="text-center text-gray-400 py-12">暂无数据</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{label}趋势</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

```typescript
'use client';
// components/admin/dashboard/DistributionChart.tsx
// 分布饼图 — 会员分布/专家分布

'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DistributionChartProps {
  data: { name: string; value: number; color?: string }[];
  label?: string;
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DistributionChart({ data, label = '分布' }: DistributionChartProps) {
  if (!data.length) {
    return <div className="text-center text-gray-400 py-12">暂无数据</div>;
  }

  const chartData = data.map((item, i) => ({
    ...item,
    color: item.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{label}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color!} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3：实现仪表盘页面**

```typescript
// app/admin/dashboard/page.tsx
// 仪表盘页面 — 混合架构：卡片数据服务端获取，图表客户端渲染

import { getAdminUserId } from '@/lib/admin/guard';
import {
  queryTotalUsers,
  queryActiveSubscriptions,
  queryTodayMessages,
  queryTotalRevenue,
  queryExpertDistribution,
  queryDAUSeries,
  queryMessageSeries,
} from '@/lib/stats';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const auth = await getAdminUserId();
  if (auth instanceof Response) redirect('/');

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [
    totalUsers,
    activeSubs,
    todayMessages,
    totalRevenue,
    expertDist,
    dauSeries,
    messageSeries,
  ] = await Promise.all([
    queryTotalUsers(),
    queryActiveSubscriptions(),
    queryTodayMessages(),
    queryTotalRevenue(),
    queryExpertDistribution(),
    queryDAUSeries({ start: thirtyDaysAgo, end: today }),
    queryMessageSeries({ start: thirtyDaysAgo, end: today }),
  ]);

  return (
    <DashboardClient
      totalUsers={totalUsers}
      activeSubscriptions={activeSubs}
      todayMessages={todayMessages}
      totalRevenue={totalRevenue}
      expertDistribution={expertDist.map((e) => ({ name: e.expert, value: e.count }))}
      dauSeries={dauSeries}
      messageSeries={messageSeries}
    />
  );
}
```

```typescript
'use client';
// app/admin/dashboard/DashboardClient.tsx
// 仪表盘客户端组件

'use client';

import StatCard from '@/components/admin/dashboard/StatCard';
import TrendChart from '@/components/admin/dashboard/TrendChart';
import DistributionChart from '@/components/admin/dashboard/DistributionChart';

interface DashboardClientProps {
  totalUsers: number;
  activeSubscriptions: number;
  todayMessages: number;
  totalRevenue: number;
  expertDistribution: { name: string; value: number }[];
  dauSeries: { date: string; value: number }[];
  messageSeries: { date: string; value: number }[];
}

export default function DashboardClient({
  totalUsers,
  activeSubscriptions,
  todayMessages,
  totalRevenue,
  expertDistribution,
  dauSeries,
  messageSeries,
}: DashboardClientProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">仪表盘</h1>

      {/* 数据卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="用户总数" value={totalUsers} />
        <StatCard title="活跃订阅" value={activeSubscriptions} />
        <StatCard title="今日消息" value={todayMessages} />
        <StatCard title="收入总额" value={`$${totalRevenue.toFixed(2)}`} />
      </div>

      {/* 图表区 */}
      <div className="grid grid-cols-2 gap-4">
        <TrendChart data={messageSeries} label="消息量" color="#3b82f6" />
        <TrendChart data={dauSeries} label="日活用户" color="#10b981" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DistributionChart data={expertDistribution} label="专家使用分布" />
        <DistributionChart
          data={[
            { name: 'Starter', value: totalUsers - activeSubscriptions, color: '#f59e0b' },
            { name: '付费用户', value: activeSubscriptions, color: '#3b82f6' },
          ]}
          label="会员构成"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4：提交**

```bash
git add components/admin/dashboard/ app/admin/dashboard/
git commit -m "feat: add admin dashboard page and components"
```

---

## Phase 4：用户管理 + 会员管理 + 订阅管理页面

### Task 4.1：用户管理页面和组件

**文件：** 创建 `app/admin/users/page.tsx`、`app/admin/users/[id]/page.tsx`、`components/admin/users/UserTable.tsx`、`components/admin/users/UserDetail.tsx`

- [ ] **Step 1：实现用户列表页面**

```typescript
'use client';
// app/admin/users/page.tsx
// 用户管理列表页

'use client';

import { useRouter } from 'next/navigation';
import UserTable from '@/components/admin/users/UserTable';
import { useState, useEffect, useCallback } from 'react';

export default function UsersPage() {
  const router = useRouter();
  const [data, setData] = useState<{ users: any[]; total: number }>({ users: [], total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) params.set('search', search);
    const res = await fetch(`/api/admin/users?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">用户管理</h1>
      <UserTable
        data={data.users}
        total={data.total}
        page={page}
        pageSize={20}
        isLoading={loading}
        onSearch={setSearch}
        onPageChange={setPage}
        onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
      />
    </div>
  );
}
```

- [ ] **Step 2：实现 UserTable 组件**

```typescript
'use client';
// components/admin/users/UserTable.tsx
// 用户表格

import DataTable, { Column } from '@/components/admin/shared/DataTable';

interface UserRow {
  id: string;
  name: string;
  email: string;
  variantName: string | null;
  subscriptionStatus: string | null;
  messageCount: number;
  createdAt: string;
}

interface UserTableProps {
  data: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onSearch: (q: string) => void;
  onPageChange: (p: number) => void;
  onRowClick: (row: UserRow) => void;
}

const columns: Column<UserRow>[] = [
  { key: 'name', header: '姓名' },
  { key: 'email', header: '邮箱' },
  {
    key: 'variantName',
    header: '等级',
    render: (row) => (
      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">
        {row.variantName ?? '无'}
      </span>
    ),
  },
  {
    key: 'subscriptionStatus',
    header: '订阅状态',
    render: (row) => (
      <span
        className={`inline-block px-2 py-0.5 text-xs rounded-full ${
          row.subscriptionStatus === 'active'
            ? 'bg-green-50 text-green-700'
            : 'bg-gray-50 text-gray-500'
        }`}
      >
        {row.subscriptionStatus ?? '无'}
      </span>
    ),
  },
  { key: 'messageCount', header: '消息数' },
  {
    key: 'createdAt',
    header: '注册时间',
    render: (row) => new Date(row.createdAt).toLocaleDateString('zh-CN'),
  },
];

export default function UserTable(props: UserTableProps) {
  return (
    <DataTable
      columns={columns}
      data={props.data}
      total={props.total}
      page={props.page}
      pageSize={props.pageSize}
      isLoading={props.isLoading}
      onSearch={props.onSearch}
      onPageChange={props.onPageChange}
      onRowClick={props.onRowClick}
      searchPlaceholder="搜索用户名或邮箱..."
    />
  );
}
```

- [ ] **Step 3：实现用户详情页面**

```typescript
'use client';
// app/admin/users/[id]/page.tsx
// 用户详情页

'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/components/admin/shared/ConfirmDialog';

interface UserDetailData {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
  subscription: {
    variantName: string;
    status: string;
    currentPeriodEnd: string | null;
    paypalSubscriptionId: string;
  } | null;
  conversationCount: number;
  totalMessages: number;
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setUser(data);
        setName(data.name);
        setEmail(data.email);
        setLoading(false);
      });
  }, [id]);

  const handleSave = async () => {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });
    setEditing(false);
    setUser((prev) => (prev ? { ...prev, name, email } : null));
  };

  const handleDelete = async () => {
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    router.push('/admin/users');
  };

  if (loading) return <div className="p-6 text-gray-400">加载中...</div>;
  if (!user) return <div className="p-6 text-gray-400">用户不存在</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600">
          ← 返回
        </button>
        <h1 className="text-2xl font-bold text-gray-800">用户详情</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex justify-between">
          <h2 className="text-lg font-semibold">基本信息</h2>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={handleSave} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg">
                  保存
                </button>
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm border rounded-lg">
                  取消
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 text-sm border rounded-lg">
                编辑
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">姓名</span>
            {editing ? (
              <input value={name} onChange={(e) => setName(e.target.value)} className="block mt-1 px-2 py-1 border rounded w-full" />
            ) : (
              <p className="mt-1 font-medium">{user.name}</p>
            )}
          </div>
          <div>
            <span className="text-gray-400">邮箱</span>
            {editing ? (
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="block mt-1 px-2 py-1 border rounded w-full" />
            ) : (
              <p className="mt-1 font-medium">{user.email}</p>
            )}
          </div>
          <div>
            <span className="text-gray-400">注册时间</span>
            <p className="mt-1 font-medium">{new Date(user.createdAt).toLocaleDateString('zh-CN')}</p>
          </div>
          <div>
            <span className="text-gray-400">对话数 / 消息数</span>
            <p className="mt-1 font-medium">{user.conversationCount} / {user.totalMessages}</p>
          </div>
        </div>

        {user.subscription && (
          <>
            <h3 className="text-sm font-semibold text-gray-600 pt-2">订阅信息</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">等级</span>
                <p className="mt-1 font-medium">{user.subscription.variantName}</p>
              </div>
              <div>
                <span className="text-gray-400">状态</span>
                <p className="mt-1 font-medium">{user.subscription.status}</p>
              </div>
              <div>
                <span className="text-gray-400">到期时间</span>
                <p className="mt-1 font-medium">
                  {user.subscription.currentPeriodEnd
                    ? new Date(user.subscription.currentPeriodEnd).toLocaleDateString('zh-CN')
                    : '-'}
                </p>
              </div>
            </div>
          </>
        )}

        <div className="pt-4 border-t border-gray-100">
          <button
            onClick={() => setShowDelete(true)}
            className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
          >
            删除用户
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        title="确认删除"
        message={`确定要删除用户 "${user.name}" 吗？此操作将删除该用户的所有对话、消息和订阅数据，不可撤销。`}
        confirmLabel="删除"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
```

- [ ] **Step 4：提交**

```bash
git add app/admin/users/ components/admin/users/
git commit -m "feat: add admin user management pages"
```

### Task 4.2：会员管理页面和组件

**文件：** 创建 `app/admin/members/page.tsx`、`app/admin/members/[id]/page.tsx`、`components/admin/members/MemberTable.tsx`、`components/admin/members/MemberDetail.tsx`

- [ ] **Step 1：实现会员列表页面**

```typescript
'use client';
// app/admin/members/page.tsx
// 会员管理列表页

'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import MemberTable from '@/components/admin/members/MemberTable';
import ExportButton from '@/components/admin/shared/ExportButton';

const LEVELS = ['全部', 'starter', 'pro', 'ultra', 'admin'];

export default function MembersPage() {
  const router = useRouter();
  const [data, setData] = useState<{ members: any[]; total: number }>({ members: [], total: 0 });
  const [page, setPage] = useState(1);
  const [variant, setVariant] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (variant) params.set('variant', variant);
    const res = await fetch(`/api/admin/members?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [page, variant]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">会员管理</h1>
        <ExportButton apiUrl="/api/admin/members" body={{ variantName: variant || undefined }} label="导出会员" />
      </div>

      {/* 等级筛选 Tab */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
        {LEVELS.map((lv) => (
          <button
            key={lv}
            onClick={() => { setVariant(lv === '全部' ? '' : lv); setPage(1); }}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              (lv === '全部' && !variant) || lv === variant
                ? 'bg-white text-gray-800 shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {lv === '全部' ? '全部' : lv.charAt(0).toUpperCase() + lv.slice(1)}
          </button>
        ))}
      </div>

      <MemberTable
        data={data.members}
        total={data.total}
        page={page}
        pageSize={20}
        isLoading={loading}
        onPageChange={setPage}
        onRowClick={(row) => router.push(`/admin/members/${row.id}`)}
      />
    </div>
  );
}
```

- [ ] **Step 2：实现会员详情页（含升降级）**

```typescript
'use client';
// app/admin/members/[id]/page.tsx
// 会员详情页 + 升降级操作

'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const LEVELS = ['starter', 'pro', 'ultra', 'admin'];

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newLevel, setNewLevel] = useState('');

  useEffect(() => {
    fetch(`/api/admin/members/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setNewLevel(d.subscription?.variantName ?? 'starter');
        setLoading(false);
      });
  }, [id]);

  const handleUpgrade = async () => {
    await fetch(`/api/admin/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantName: newLevel }),
    });
    setData((prev: any) => ({
      ...prev,
      subscription: { ...prev.subscription, variantName: newLevel },
    }));
  };

  if (loading) return <div className="p-6 text-gray-400">加载中...</div>;
  if (!data) return <div className="p-6 text-gray-400">会员不存在</div>;

  const { user, subscription } = data;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600">
          ← 返回
        </button>
        <h1 className="text-2xl font-bold text-gray-800">会员详情</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold">{user.name}</h2>
        <p className="text-sm text-gray-500">{user.email}</p>

        {subscription && (
          <div className="pt-4 border-t space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">当前等级</span>
                <p className="mt-1 font-semibold text-blue-600">{subscription.variantName}</p>
              </div>
              <div>
                <span className="text-gray-400">状态</span>
                <p className="mt-1">{subscription.status}</p>
              </div>
              <div>
                <span className="text-gray-400">到期</span>
                <p className="mt-1">
                  {subscription.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('zh-CN')
                    : '-'}
                </p>
              </div>
            </div>

            {/* 升降级 */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold mb-3">变更等级</h3>
              <div className="flex items-center gap-3">
                <select
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                <button
                  onClick={handleUpgrade}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  确认变更
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3：提交**

```bash
git add app/admin/members/ components/admin/members/
git commit -m "feat: add admin member management pages"
```

### Task 4.3：订阅管理页面和组件

**文件：** 创建订阅管理相关文件

- [ ] **Step 1：实现订阅列表页面**

```typescript
'use client';
// app/admin/subscriptions/page.tsx
// 订阅管理列表页

'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import DataTable, { Column } from '@/components/admin/shared/DataTable';

interface SubRow {
  id: string;
  userName: string;
  userEmail: string;
  paypalSubscriptionId: string;
  variantName: string;
  status: string;
  currentPeriodEnd: string | null;
  createdAt: string;
}

const STATUSES = ['全部', 'active', 'cancelled', 'expired'];

const columns: Column<SubRow>[] = [
  { key: 'userName', header: '用户' },
  { key: 'userEmail', header: '邮箱' },
  {
    key: 'variantName',
    header: '等级',
    render: (row) => (
      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">
        {row.variantName}
      </span>
    ),
  },
  {
    key: 'status',
    header: '状态',
    render: (row) => {
      const colors: Record<string, string> = {
        active: 'bg-green-50 text-green-700',
        cancelled: 'bg-yellow-50 text-yellow-700',
        expired: 'bg-red-50 text-red-700',
      };
      return (
        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${colors[row.status] ?? 'bg-gray-50 text-gray-500'}`}>
          {row.status}
        </span>
      );
    },
  },
  {
    key: 'currentPeriodEnd',
    header: '到期',
    render: (row) =>
      row.currentPeriodEnd ? new Date(row.currentPeriodEnd).toLocaleDateString('zh-CN') : '-',
  },
  {
    key: 'createdAt',
    header: '创建时间',
    render: (row) => new Date(row.createdAt).toLocaleDateString('zh-CN'),
  },
];

export default function SubscriptionsPage() {
  const router = useRouter();
  const [data, setData] = useState<{ subs: SubRow[]; total: number }>({ subs: [], total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (status) params.set('status', status);
    const res = await fetch(`/api/admin/subscriptions?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [page, status]);

  useEffect(() => {
    fetchSubs();
  }, [fetchSubs]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">订阅管理</h1>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s === '全部' ? '' : s); setPage(1); }}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              (s === '全部' && !status) || s === status
                ? 'bg-white text-gray-800 shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {s === '全部' ? '全部' : s}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data.subs}
        total={data.total}
        page={page}
        pageSize={20}
        isLoading={loading}
        onPageChange={setPage}
        onRowClick={(row) => router.push(`/admin/subscriptions/${row.id}`)}
      />
    </div>
  );
}
```

- [ ] **Step 2：实现订阅详情页（含取消/标记到期操作 + 变更日志）**

```typescript
'use client';
// app/admin/subscriptions/[id]/page.tsx
// 订阅详情页 + 操作 + 变更日志

'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/components/admin/shared/ConfirmDialog';

export default function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [sub, setSub] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [showExpire, setShowExpire] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/subscriptions/${id}`).then((r) => r.json()),
      fetch(`/api/admin/subscriptions/${id}/history`).then((r) => r.json()),
    ]).then(([subData, histData]) => {
      setSub(subData);
      setHistory(histData);
      setLoading(false);
    });
  }, [id]);

  const handleStatusChange = async (status: string) => {
    await fetch(`/api/admin/subscriptions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setSub((prev: any) => ({ ...prev, status }));
    setShowCancel(false);
    setShowExpire(false);
  };

  if (loading) return <div className="p-6 text-gray-400">加载中...</div>;
  if (!sub) return <div className="p-6 text-gray-400">订阅不存在</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600">
          ← 返回
        </button>
        <h1 className="text-2xl font-bold text-gray-800">订阅详情</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold">基本信息</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-400">PayPal 订阅 ID</span><p className="mt-1 font-mono text-xs">{sub.paypalSubscriptionId}</p></div>
          <div><span className="text-gray-400">计划 ID</span><p className="mt-1">{sub.paypalPlanId}</p></div>
          <div><span className="text-gray-400">等级</span><p className="mt-1 font-semibold">{sub.variantName}</p></div>
          <div><span className="text-gray-400">状态</span><p className="mt-1">{sub.status}</p></div>
          <div><span className="text-gray-400">周期开始</span><p className="mt-1">{sub.currentPeriodStart ? new Date(sub.currentPeriodStart).toLocaleDateString('zh-CN') : '-'}</p></div>
          <div><span className="text-gray-400">周期结束</span><p className="mt-1">{sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString('zh-CN') : '-'}</p></div>
        </div>

        {sub.status === 'active' && (
          <div className="pt-4 border-t flex gap-3">
            <button onClick={() => setShowCancel(true)} className="px-4 py-2 text-sm text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-50">
              取消订阅
            </button>
            <button onClick={() => setShowExpire(true)} className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
              标记到期
            </button>
          </div>
        )}
      </div>

      {/* 变更日志 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">变更日志</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">暂无变更记录</p>
        ) : (
          <div className="space-y-2">
            {history.map((e, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                <div>
                  <span className="text-gray-600">
                    {e.payload?.variantName} → {e.payload?.status}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(e.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog open={showCancel} title="取消订阅" message="确认取消此订阅？" confirmLabel="取消订阅" onConfirm={() => handleStatusChange('cancelled')} onCancel={() => setShowCancel(false)} />
      <ConfirmDialog open={showExpire} title="标记到期" message="确认将此订阅标记为到期？" confirmLabel="标记到期" onConfirm={() => handleStatusChange('expired')} onCancel={() => setShowExpire(false)} />
    </div>
  );
}
```

- [ ] **Step 3：提交**

```bash
git add app/admin/subscriptions/ components/admin/subscriptions/
git commit -m "feat: add admin subscription management pages"
```

---

## Phase 5：统计页面 + 集成

### Task 5.1：项目统计页面

**文件：** 创建 `app/admin/stats/project/page.tsx` 和相关图表组件

- [ ] **Step 1：实现项目统计页面**

```typescript
'use client';
// app/admin/stats/project/page.tsx
// 项目数据统计页

'use client';

import { useState, useEffect } from 'react';
import StatFilter from '@/components/admin/shared/StatFilter';
import StatCard from '@/components/admin/dashboard/StatCard';
import TrendChart from '@/components/admin/dashboard/TrendChart';
import DistributionChart from '@/components/admin/dashboard/DistributionChart';
import RetentionChart from '@/components/admin/stats/RetentionChart';
import PaymentChart from '@/components/admin/stats/PaymentChart';

export default function ProjectStatsPage() {
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return { start: today, end: today, preset: 'day' as const };
  });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ start: dateRange.start, end: dateRange.end });
    fetch(`/api/admin/stats/project?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [dateRange]);

  if (loading) return <div className="p-6 text-gray-400">加载中...</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">项目数据统计</h1>
      <StatFilter dateRange={dateRange} onDateRangeChange={setDateRange} />

      <div className="grid grid-cols-4 gap-4">
        <StatCard title="DAU" value={data.dauSeries[data.dauSeries.length - 1]?.value ?? 0} />
        <StatCard title="总对话数" value={data.totalConversations} />
        <StatCard title="总消息数" value={data.totalMessages} />
        <StatCard title="留存率(D1)" value={`${data.retention.d1?.[0]?.rate?.toFixed(1) ?? 0}%`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TrendChart data={data.dauSeries} label="DAU" color="#10b981" />
        <TrendChart data={data.messageSeries} label="消息量" color="#3b82f6" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <RetentionChart d1={data.retention.d1} d7={data.retention.d7} d30={data.retention.d30} />
        <PaymentChart
          dates={data.paymentSeries.dates}
          paymentTotal={data.paymentSeries.paymentTotal}
          paymentRate={data.paymentSeries.paymentRate}
        />
      </div>

      <DistributionChart data={data.expertDistribution} label="专家使用分布" />
    </div>
  );
}
```

- [ ] **Step 2：实现 RetentionChart 和 PaymentChart**

```typescript
'use client';
// components/admin/stats/RetentionChart.tsx
// 留存率柱状图

'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RetentionChartProps {
  d1: { dayN: number; rate: number }[];
  d7: { dayN: number; rate: number }[];
  d30: { dayN: number; rate: number }[];
}

export default function RetentionChart({ d1, d7, d30 }: RetentionChartProps) {
  const data = [
    { name: 'D1', rate: d1[0]?.rate ?? 0 },
    { name: 'D7', rate: d7[0]?.rate ?? 0 },
    { name: 'D30', rate: d30[0]?.rate ?? 0 },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">用户留存率</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} unit="%" />
          <Tooltip />
          <Bar dataKey="rate" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

```typescript
'use client';
// components/admin/stats/PaymentChart.tsx
// 付费趋势图 — 付费总额 + 付费率双轴

'use client';

import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PaymentChartProps {
  dates: string[];
  paymentTotal: number[];
  paymentRate: number[];
}

export default function PaymentChart({ dates, paymentTotal, paymentRate }: PaymentChartProps) {
  const data = dates.map((d, i) => ({
    date: d,
    total: paymentTotal[i] ?? 0,
    rate: paymentRate[i] ?? 0,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">付费趋势</h3>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} unit="%" />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="付费总额($)" />
          <Line yAxisId="right" type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={2} dot={false} name="付费率(%)" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3：提交**

```bash
git add app/admin/stats/project/ components/admin/stats/
git commit -m "feat: add admin project stats page"
```

### Task 5.2：流量统计页面

**文件：** 创建 `app/admin/stats/traffic/page.tsx`

- [ ] **Step 1：实现流量统计页面**

```typescript
'use client';
// app/admin/stats/traffic/page.tsx
// 流量数据统计页

'use client';

import { useState, useEffect } from 'react';
import StatFilter from '@/components/admin/shared/StatFilter';
import StatCard from '@/components/admin/dashboard/StatCard';
import TrendChart from '@/components/admin/dashboard/TrendChart';

export default function TrafficStatsPage() {
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return { start: today, end: today, preset: 'day' as const };
  });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ start: dateRange.start, end: dateRange.end });
    fetch(`/api/admin/stats/traffic?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [dateRange]);

  if (loading) return <div className="p-6 text-gray-400">加载中...</div>;
  if (!data) return null;

  const pvData = data.dates.map((d: string, i: number) => ({ date: d, value: data.pv[i] ?? 0 }));
  const uvData = data.dates.map((d: string, i: number) => ({ date: d, value: data.uv[i] ?? 0 }));
  const exposureData = data.dates.map((d: string, i: number) => ({ date: d, value: data.exposure[i] ?? 0 }));

  const lastIdx = data.dates.length - 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">流量数据统计</h1>
      <StatFilter dateRange={dateRange} onDateRangeChange={setDateRange} />

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="PV" value={data.pv[lastIdx] ?? 0} subtitle="页面访问量" />
        <StatCard title="UV" value={data.uv[lastIdx] ?? 0} subtitle="独立访客" />
        <StatCard title="首页曝光" value={data.exposure[lastIdx] ?? 0} subtitle="首页访问量" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TrendChart data={pvData} label="PV" color="#3b82f6" />
        <TrendChart data={uvData} label="UV" color="#10b981" />
      </div>

      <TrendChart data={exposureData} label="首页曝光" color="#f59e0b" />
    </div>
  );
}
```

- [ ] **Step 2：提交**

```bash
git add app/admin/stats/traffic/
git commit -m "feat: add admin traffic stats page"
```

### Task 5.3：集成 — Navbar 管理后台入口 + 登录跳转

- [ ] **Step 1：在 NavbarClient 中为用户头像下拉菜单增加管理后台入口**

需要先查看 `components/common/NavbarClient.tsx` 中现有的头像下拉菜单结构，然后增加一个 admin 可见的管理后台链接。

修改逻辑：在头像下拉菜单中，若用户为 admin，在现有菜单项中追加「管理后台」入口链接。

请在实现时读取 `NavbarClient.tsx` 确认现有菜单结构后再添加。

- [ ] **Step 2：登录后 admin 自动跳转 /admin**

修改 `app/[lang]/layout.tsx` 或登录回调逻辑。需要在用户登录成功后，查询 subscriptions 表判定 admin 角色，若是则重定向到 `/admin`。

具体实现方式：在根 layout 或首页增加一个客户端检查组件，结合 session 查询 subscriptions 表做跳转。

- [ ] **Step 3：提交**

```bash
git add components/common/NavbarClient.tsx app/[lang]/
git commit -m "feat: add admin navbar entry and login redirect"
```

### Task 5.4：创建管理员账号脚本

**文件：** 创建 `scripts/create-admin.ts`

- [ ] **Step 1：实现 create-admin 脚本**

```typescript
// scripts/create-admin.ts
// 创建管理员账号脚本
// 使用方式：npx tsx scripts/create-admin.ts

import { db } from '../lib/db';
import { user, subscriptions } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function createAdmin() {
  const email = 'blacker_admin';

  // 查找用户 (better-auth 创建时 email 存储带 @ 或不带)
  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.email, `${email}@lunara.admin`));

  const userId = existing?.id;

  if (!userId) {
    console.error('管理员用户不存在。请先在应用中注册 blacker_admin 账号。');
    process.exit(1);
  }

  // 插入 admin 订阅记录
  const [existingSub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));

  if (existingSub) {
    await db
      .update(subscriptions)
      .set({ variantName: 'admin', status: 'active', updatedAt: new Date() })
      .where(eq(subscriptions.userId, userId));
    console.log('管理员订阅已更新为 admin 等级。');
  } else {
    await db.insert(subscriptions).values({
      userId,
      paypalSubscriptionId: `admin_${userId}`,
      paypalPlanId: 'admin_plan',
      variantName: 'admin',
      status: 'active',
    });
    console.log('管理员订阅已创建。');
  }
}

createAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
```

- [ ] **Step 2：提交**

```bash
git add scripts/create-admin.ts
git commit -m "feat: add admin account creation script"
```

---

## 任务依赖关系

```
Phase 1 (数据库 + 统计引擎)
  └─→ Phase 2 (权限守卫 + API)
        └─→ Phase 3 (布局 + 共享组件 + 仪表盘)
              ├─→ Phase 4 (用户/会员/订阅页面)
              └─→ Phase 5 (统计页面 + 集成)
```

Phase 4 和 Phase 5 可以并行开发。
