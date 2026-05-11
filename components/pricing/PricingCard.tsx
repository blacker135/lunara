// components/pricing/PricingCard.tsx
// 单个方案卡片：展示方案名、价格、权益列表、CTA 按钮

'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface PlanData {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  onetimePrice: number;  // 国内一次性买断价格
  features: string[];
  highlighted?: boolean;
  validDays?: number; // 一次性买断的有效天数
}

interface PricingCardProps {
  plan: PlanData;
  isYearly: boolean;
  isOneTime: boolean;   // 国内一次性买断模式
  isTestPlan: boolean;   // $0.01 测试方案
  isLoggedIn: boolean;
  variantId: string;
  lang: string;
}

export function PricingCard({ plan, isYearly, isOneTime, isTestPlan, isLoggedIn, variantId, lang }: PricingCardProps) {
  const router = useRouter();
  const tp = useTranslations('pricing');

  // 折算月费（年费 ÷ 12）
  const monthlyEquivalent = (plan.yearlyPrice / 12).toFixed(2);
  // 年付比月付节省的金额
  const yearlySaving = plan.monthlyPrice * 12 - plan.yearlyPrice;

  // 确定展示价格和周期
  const displayPrice = isOneTime
    ? plan.onetimePrice    // 国内：展示一次性买断价格
    : isYearly
      ? monthlyEquivalent  // 国外年付：展示折算月费
      : plan.monthlyPrice; // 国外月付：展示月费

  const periodLabel = isOneTime
    ? ''                   // 一次性：无周期标注
    : `/${tp('month')}`;

  /** 处理 CTA 按钮点击：未登录跳转登录页，已登录跳转 LemonSqueezy checkout */
  const handleCTA = async () => {
    if (!isLoggedIn) {
      router.push(`/${lang}/auth/login?redirect=/pricing`);
      return;
    }

    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant_id: variantId }),
      });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch (err) {
      console.error('Checkout failed:', err);
    }
  };

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

      {/* 一次性付费标注 */}
      {isOneTime && plan.validDays && (
        <p className="mt-1 text-xs text-[#FF7A59]">
          {tp('validDays', { days: plan.validDays })}
        </p>
      )}

      {/* 年付折算：显示年费总额 + 省钱标注 */}
      {isYearly && !isOneTime && (
        <div className="mt-1">
          <p className="text-xs text-text-secondary">
            ${plan.yearlyPrice}/{tp('year')}
          </p>
          <p className="text-xs text-[#FF7A59]">
            {tp('savePerYear', { amount: yearlySaving })}
          </p>
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

      {/* CTA 按钮 */}
      <button
        type="button"
        onClick={handleCTA}
        className={`mt-6 w-full rounded-[16px] py-2.5 text-sm font-medium transition-colors ${
          plan.highlighted
            ? 'bg-[#FF7A59] text-white hover:bg-[#FF7A59]/90'
            : 'bg-[#FAF7F2] text-text-primary hover:bg-gray-100'
        }`}
      >
        {isTestPlan
          ? tp('testPlanCTA')
          : isLoggedIn
            ? tp('subscribe')
            : tp('startTrial')}
      </button>
    </div>
  );
}
