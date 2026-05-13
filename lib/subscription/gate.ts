// lib/subscription/gate.ts
// 订阅门控：统一检查 trial + 订阅状态 + 专家锁定
// 供 chat 和 switch 路由复用

import { db, schema } from '@/lib/db';
import { eq, and, gte, count } from 'drizzle-orm';
import type { ExpertId } from '@/lib/prompts/experts';

/** 试用消息上限 */
const TRIAL_LIMIT = 3;

/** 日限额配置（默认值，可被 profiles.daily_limit 覆盖） */
const DAILY_LIMITS: Record<string, number> = {
  starter: 30,
  pro: 100,
  ultra: 10000,
};

/** Starter 可访问的专家 */
const STARTER_EXPERTS: ExpertId[] = ['evan', 'liam'];

/** 允许通过的结果 */
interface GateAllowed {
  allowed: true;
  isSubscribed: boolean;
  variant: string | null;
  trialUsed: number;
}

/** 拒绝的结果 */
interface GateDenied {
  allowed: false;
  code: 'TRIAL_EXHAUSTED' | 'DAILY_LIMIT' | 'EXPERT_LOCKED';
  status: 402 | 429 | 403;
  message: string;
}

export type GateResult = GateAllowed | GateDenied;

export interface TrialResult {
  allowed: boolean;
  trialUsed: number;
  trialLimit: number;
}

/**
 * 试用消息原子检查与递增
 * 通过 PostgreSQL 事务 + SELECT FOR UPDATE 保证并发安全
 */
export async function checkTrialAccess(userId: string): Promise<TrialResult> {
  const result = await db.transaction(async (tx) => {
    await tx
      .insert(schema.profiles)
      .values({ userId, trialUsed: 0 })
      .onConflictDoNothing({ target: schema.profiles.userId });

    const [profile] = await tx
      .select({ trialUsed: schema.profiles.trialUsed })
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, userId))
      .for('update');

    const current = profile!.trialUsed ?? 0;
    if (current >= TRIAL_LIMIT) {
      return { allowed: false, trialUsed: current, trialLimit: TRIAL_LIMIT };
    }

    const next = current + 1;
    await tx
      .update(schema.profiles)
      .set({ trialUsed: next })
      .where(eq(schema.profiles.userId, userId));

    return { allowed: true, trialUsed: next, trialLimit: TRIAL_LIMIT };
  });

  return result;
}

/**
 * 订阅门控统一检查
 * 按顺序检查：trial → 专家锁定 → 日限额
 *
 * @param userId - 用户 ID
 * @param expert - 当前请求的专家 ID
 * @param trial - 试用模式：'consume' 吞并计数 | 'peek' 只读检查
 */
export async function checkSubscriptionGate(
  userId: string,
  expert: ExpertId,
  trial: 'consume' | 'peek',
): Promise<GateResult> {
  // 1. 查询订阅状态
  const [subscription] = await db
    .select({ variant: schema.subscriptions.variantName, status: schema.subscriptions.status })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, userId));

  const isSubscribed = !!subscription && subscription.status === 'active';
  const variant = subscription?.variant || null;

  // 2. 未订阅 → trial 检查
  if (!isSubscribed) {
    if (trial === 'consume') {
      const tr = await checkTrialAccess(userId);
      if (!tr.allowed) {
        return {
          allowed: false,
          code: 'TRIAL_EXHAUSTED',
          status: 402,
          message: `Trial exhausted: ${tr.trialUsed}/${tr.trialLimit}`,
        };
      }
      return { allowed: true, isSubscribed: false, variant: null, trialUsed: tr.trialUsed };
    }

    // peek 模式：只读 trial 检查
    const [profile] = await db
      .select({ trialUsed: schema.profiles.trialUsed })
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, userId));

    const trialUsed = profile?.trialUsed || 0;
    if (trialUsed >= TRIAL_LIMIT) {
      return {
        allowed: false,
        code: 'TRIAL_EXHAUSTED',
        status: 402,
        message: `Trial exhausted: ${trialUsed}/${TRIAL_LIMIT}`,
      };
    }
    return { allowed: true, isSubscribed: false, variant: null, trialUsed };
  }

  // 3. 已订阅 → 专家锁定检查
  if (variant === 'starter' && !STARTER_EXPERTS.includes(expert)) {
    return {
      allowed: false,
      code: 'EXPERT_LOCKED',
      status: 403,
      message: 'Upgrade to Pro or Ultra to unlock this expert.',
    };
  }

  // 4. 已订阅 → 日限额检查（所有有 limit 配置的方案都检查）
  if (variant && DAILY_LIMITS[variant] !== undefined) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 查询当日用户消息数
    const [result] = await db
      .select({ count: count() })
      .from(schema.messages)
      .innerJoin(schema.conversations, eq(schema.messages.conversationId, schema.conversations.id))
      .where(
        and(
          eq(schema.conversations.userId, userId),
          eq(schema.messages.role, 'user'),
          gte(schema.messages.createdAt, todayStart),
        ),
      );

    // 用户自定义日限额优先，否则使用方案默认值；null 表示无限制
    const planLimit = DAILY_LIMITS[variant];
    const [profile] = await db
      .select({ dailyLimit: schema.profiles.dailyLimit })
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, userId));
    const limit = profile?.dailyLimit ?? planLimit;
    if (limit !== null && (result?.count || 0) >= limit) {
      return {
        allowed: false,
        code: 'DAILY_LIMIT',
        status: 429,
        message: `Daily limit reached: ${limit} messages per day.`,
      };
    }
  }

  return { allowed: true, isSubscribed: true, variant, trialUsed: 0 };
}
