// components/pricing/PricingCard.tsx
// 单个方案卡片：展示方案名、价格、权益列表、PayPal 订阅按钮

'use client';

import { useTranslations } from 'next-intl';
import { PayPalButton } from './PayPalButton';

interface PlanData {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  planId: string;
  features: string[];
  highlighted?: boolean;
}

interface PricingCardProps {
  plan: PlanData;
  isYearly: boolean;
  isTestPlan: boolean;
  isLoggedIn: boolean;
  lang: string;
}

export function PricingCard({ plan, isYearly, isTestPlan, isLoggedIn, lang }: PricingCardProps) {
  const tp = useTranslations('pricing');

  // 折算月费（年费 ÷ 12）
  const monthlyEquivalent = (plan.yearlyPrice / 12).toFixed(2);
  // 年付比月付节省的百分比
  const savePercent = Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100);

  const displayPrice = isYearly
    ? monthlyEquivalent
    : plan.monthlyPrice;

  const periodLabel = `/${tp('month')}`;

  return (
    <div
      className={`flex flex-col rounded-[24px] border-2 p-6 ${
        isTestPlan
          ? 'border-dashed border-gray-300 bg-white/60'
          : plan.highlighted
            ? 'border-[#FF7A59] bg-[#FF7A59]/5'
            : 'border-gray-100 bg-white'
      }`}
    >
      {/* 方案名称 */}
      <h3 className="text-lg font-semibold text-text-primary">{plan.name}</h3>

      {/* 价格展示 */}
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-text-primary">${displayPrice}</span>
        {periodLabel && (
          <span className="text-sm text-text-secondary">{periodLabel}</span>
        )}
      </div>

      {/* 年付省钱展示 */}
      {isYearly && (
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-xs text-text-secondary line-through">
            ${plan.monthlyPrice}/{tp('month')}
          </span>
          <span className="text-xs text-[#FF7A59] font-medium">
            {tp('savePerYear', { percent: savePercent })}
          </span>
        </div>
      )}

      {/* 功能列表 */}
      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#FF7A59]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA — PayPal 订阅按钮 */}
      <PayPalButton
        planId={plan.planId}
        planName={isTestPlan ? tp('testPlanName') : plan.name}
        isLoggedIn={isLoggedIn}
        lang={lang}
      />
    </div>
  );
}
