// lib/db/schema.ts
// Drizzle ORM 数据库 Schema 定义
// 包含 Better Auth 认证表 + Lunara 业务表

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

// ============================================================
// Better Auth 认证表
// ============================================================

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

// ============================================================
// Lunara 订阅表
// ============================================================

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'cancelled',
  'expired',
  'suspended',
]);

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

// ============================================================
// Lunara 业务表
// ============================================================

export const expertEnum = pgEnum('expert', ['evan', 'liam', 'noah', 'adrian']);
export const languageEnum = pgEnum('language', ['en', 'zh']);
export const roleEnum = pgEnum('message_role', ['user', 'assistant']);

export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  nickname: text('nickname'),
  trialUsed: integer('trial_used').default(0), // 试用消息使用次数
  createdAt: timestamp('created_at').defaultNow(),
});

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  expert: expertEnum('expert').notNull(),
  language: languageEnum('language').notNull().default('en'),
  title: text('title').default('New Conversation'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull(),
  content: text('content').notNull(),
  tokens: integer('tokens'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  conversationIdx: index('idx_messages_conversation').on(table.conversationId),
  conversationCreatedIdx: index('idx_messages_conv_created').on(table.conversationId, table.createdAt),
}));

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
