// lib/paypal/index.ts
// PayPal 模块公共导出 + Plan ID → 等级名称映射

/**
 * 面向业务的订阅等级名称
 */
export type VariantName = 'starter' | 'pro' | 'ultra';

/**
 * PayPal Plan ID → 等级名称 的映射表
 * 在首次调用 getVariantName 时延迟初始化，确保环境变量已加载
 */
const PLAN_MAP: Record<string, VariantName> = {};

/**
 * 从环境变量构建 Plan 映射
 */
function initPlanMap() {
  const pairs: [string | undefined, VariantName][] = [
    [process.env.PAYPAL_PLAN_STARTER_MONTHLY, 'starter'],
    [process.env.PAYPAL_PLAN_STARTER_YEARLY, 'starter'],
    [process.env.PAYPAL_PLAN_PRO_MONTHLY, 'pro'],
    [process.env.PAYPAL_PLAN_PRO_YEARLY, 'pro'],
    [process.env.PAYPAL_PLAN_ULTRA_MONTHLY, 'ultra'],
    [process.env.PAYPAL_PLAN_ULTRA_YEARLY, 'ultra'],
    [process.env.PAYPAL_PLAN_TEST, 'starter'],
  ];
  for (const [id, name] of pairs) {
    if (id) PLAN_MAP[id] = name;
  }
}

/**
 * 根据 PayPal Plan ID 查询对应的订阅等级
 * @param planId - PayPal Plan ID
 * @returns 等级名称，若未匹配则返回 null
 */
export function getVariantName(planId: string): VariantName | null {
  if (Object.keys(PLAN_MAP).length === 0) initPlanMap();
  return PLAN_MAP[planId] || null;
}

export { getSubscription, verifyWebhookSignature } from './client';
