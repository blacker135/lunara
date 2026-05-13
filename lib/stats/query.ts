// lib/stats/query.ts
// 数据统计引擎 — 查询接口
// 为管理后台 API 提供统一的数据查询方法

import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

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
  return Number(result.rows[0]?.total ?? 0);
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
        WHERE cohort_date = ${cohortDate}::date AND day_n IN (${days})
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
    sql`SELECT date::text, metric_key as "metricKey", metric_value::numeric as value
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
    sql`SELECT date::text, metric_key as "metricKey", metric_value::numeric as value
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
  variant?: string;  // 按会员身份筛选：free | starter | pro | ultra | admin
  page: number;
  pageSize: number;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  variantName: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;  // 订阅当期结束时间
  dailyLimit: number | null;        // 每日用量上限
  messageCount: number;
  createdAt: string;
}

export async function queryUsers(params: UserListParams): Promise<{ users: UserRow[]; total: number }> {
  const offset = (params.page - 1) * params.pageSize;

  // 构建 WHERE 条件数组，始终以 1=1 为基准，然后追加过滤条件
  const conditions = [sql`1=1`];

  if (params.search) {
    conditions.push(sql`AND (u.name ILIKE ${'%' + params.search + '%'} OR u.email ILIKE ${'%' + params.search + '%'})`);
  }

  if (params.variant) {
    if (params.variant === 'free') {
      // 免费用户：无订阅记录 或 订阅状态非 active
      conditions.push(sql`AND (s.id IS NULL OR s.status != 'active')`);
    } else {
      // 按具体会员身份筛选（starter / pro / ultra / admin）
      conditions.push(sql`AND s.status = 'active' AND s.variant_name = ${params.variant}`);
    }
  }

  const whereClause = sql.join(conditions, sql` `);

  const countResult = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int as count FROM "user" u
        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
        WHERE ${whereClause}`
  );

  const result = await db.execute(
    sql`SELECT
          u.id, u.name, u.email, u.created_at as "createdAt",
          s.variant_name as "variantName", s.status as "subscriptionStatus",
          s.current_period_end as "currentPeriodEnd",
          p.daily_limit as "dailyLimit",
          COALESCE(m.msg_count, 0)::int as "messageCount"
        FROM "user" u
        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
        LEFT JOIN profiles p ON u.id = p.user_id
        LEFT JOIN (
          SELECT c.user_id, COUNT(*) as msg_count
          FROM messages m
          JOIN conversations c ON m.conversation_id = c.id
          GROUP BY c.user_id
        ) m ON m.user_id = u.id
        WHERE ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT ${params.pageSize} OFFSET ${offset}`
  );

  return { users: result.rows as unknown as UserRow[], total: countResult.rows[0]?.count ?? 0 };
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

  const result = await db.execute(
    sql`SELECT
          u.id, u.name, u.email, u.created_at as "createdAt",
          s.variant_name as "variantName", s.status as "subscriptionStatus",
          COALESCE(m.msg_count, 0)::int as "messageCount"
        FROM subscriptions s
        JOIN "user" u ON s.user_id = u.id
        LEFT JOIN (
          SELECT c.user_id, COUNT(*) as msg_count
          FROM messages m
          JOIN conversations c ON m.conversation_id = c.id
          GROUP BY c.user_id
        ) m ON m.user_id = u.id
        WHERE s.status = 'active' ${variantFilter}
        ORDER BY s.created_at DESC
        LIMIT ${params.pageSize} OFFSET ${offset}`
  );

  return { members: result.rows as unknown as UserRow[], total: countResult.rows[0]?.count ?? 0 };
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

  const result = await db.execute(
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

  return { subs: result.rows as unknown as SubRow[], total: countResult.rows[0]?.count ?? 0 };
}
