-- 数据统计引擎 — 原始事件流水表
CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_type" text NOT NULL,
  "user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "payload" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now()
);

-- 事件类型 + 时间索引（查询热点）
CREATE INDEX IF NOT EXISTS "idx_events_type_created" ON "analytics_events" ("event_type", "created_at");

-- 日级聚合统计表
CREATE TABLE IF NOT EXISTS "analytics_daily_stats" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "date" date NOT NULL,
  "metric_key" text NOT NULL,
  "metric_value" numeric DEFAULT '0' NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- 日期 + 指标唯一约束（upsert 语义）
CREATE UNIQUE INDEX IF NOT EXISTS "idx_daily_stats_date_key" ON "analytics_daily_stats" ("date", "metric_key");

-- 月级聚合统计表
CREATE TABLE IF NOT EXISTS "analytics_monthly_stats" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "year_month" text NOT NULL,
  "metric_key" text NOT NULL,
  "metric_value" numeric DEFAULT '0' NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- 年月 + 指标唯一约束（upsert 语义）
CREATE UNIQUE INDEX IF NOT EXISTS "idx_monthly_stats_ym_key" ON "analytics_monthly_stats" ("year_month", "metric_key");

-- 留存率快照表
CREATE TABLE IF NOT EXISTS "analytics_retention" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cohort_date" date NOT NULL,
  "day_n" smallint NOT NULL,
  "retention_rate" numeric DEFAULT '0' NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- 同期队列 + 天数唯一约束（upsert 语义）
CREATE UNIQUE INDEX IF NOT EXISTS "idx_retention_cohort_day" ON "analytics_retention" ("cohort_date", "day_n");
