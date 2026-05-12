// lib/subscription/gate.ts
// 订阅门控：trial 原子检查 + 订阅状态查询
// 通过 PostgreSQL 事务 + SELECT FOR UPDATE 保证并发安全

import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

/** 试用消息上限 */
const TRIAL_LIMIT = 3;

export interface TrialResult {
  allowed: boolean;
  trialUsed: number;
  trialLimit: number;
}

/**
 * 试用消息原子检查与递增
 * 未订阅用户每次发消息时调用，通过行锁防止并发绕过试用限制。
 *
 * 并发安全策略：先插入哨兵行（计数=0），再统一走 UPDATE + 1 的分支归一路径。
 * 避免两个并发请求都 SELECT FOR UPDATE 无行 → 一方 INSERT 后另一方 onConflictDoNothing
 * 重读得到旧值却未递增的漏增问题。
 */
export async function checkTrialAccess(userId: string): Promise<TrialResult> {
  const result = await db.transaction(async (tx) => {
    // 确保 profile 行存在（无则插入哨兵行，计数=0）
    await tx
      .insert(schema.profiles)
      .values({ userId, trialUsed: 0 })
      .onConflictDoNothing({ target: schema.profiles.userId });

    // 统一路径：锁定后读取 → 判断 → 递增
    const [profile] = await tx
      .select({ trialUsed: schema.profiles.trialUsed })
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, userId))
      .for('update');

    // 此时行一定存在（刚刚插入哨兵行或已存在），但 Drizzle 类型推断 trialUsed 可为 null
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
