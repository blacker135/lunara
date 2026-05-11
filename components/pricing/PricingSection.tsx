// components/pricing/PricingSection.tsx
// 三方案对比区：月付/年付切换 + 三列 PricingCard

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PricingCard } from './PricingCard';

interface PricingSectionProps {
  lang: string;
  isLoggedIn: boolean;
  isDomestic: boolean;       // 国内用户使用国内专用 Variant ID
  showTestPlan: boolean;     // 显示 $0.01 测试方案
  variantIds: {
    starterMonthly: string;
    starterYearly: string;
    proMonthly: string;
    proYearly: string;
    ultraMonthly: string;
    ultraYearly: string;
    starterMonthlyDomestic: string;
    starterYearlyDomestic: string;
    proMonthlyDomestic: string;
    proYearlyDomestic: string;
    ultraMonthlyDomestic: string;
    ultraYearlyDomestic: string;
    test: string;
  };
}

export function PricingSection({ lang, isLoggedIn, isDomestic, showTestPlan, variantIds }: PricingSectionProps) {
  const [isYearly, setIsYearly] = useState(false);
  const tp = useTranslations('pricing');

  /** 三个定价方案的定义 */
  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 9,
      yearlyPrice: 99,
      variantIdMonthly: variantIds.starterMonthly,
      variantIdYearly: variantIds.starterYearly,
      variantIdDomesticMonthly: variantIds.starterMonthlyDomestic,
      variantIdDomesticYearly: variantIds.starterYearlyDomestic,
      features: [
        tp('features.dailyMessages', { count: 30 }),
        tp('features.expertsStarter'),
        tp('features.historyDays', { count: 7 }),
        tp('features.effectLight'),
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      monthlyPrice: 29,
      yearlyPrice: 319,
      highlighted: true,
      variantIdMonthly: variantIds.proMonthly,
      variantIdYearly: variantIds.proYearly,
      variantIdDomesticMonthly: variantIds.proMonthlyDomestic,
      variantIdDomesticYearly: variantIds.proYearlyDomestic,
      features: [
        tp('features.dailyMessages', { count: 100 }),
        tp('features.expertsAll'),
        tp('features.historyDays', { count: 30 }),
        tp('features.effectStandard'),
      ],
    },
    {
      id: 'ultra',
      name: 'Ultra',
      monthlyPrice: 49,
      yearlyPrice: 539,
      variantIdMonthly: variantIds.ultraMonthly,
      variantIdYearly: variantIds.ultraYearly,
      variantIdDomesticMonthly: variantIds.ultraMonthlyDomestic,
      variantIdDomesticYearly: variantIds.ultraYearlyDomestic,
      features: [
        tp('features.unlimitedMessages'),
        tp('features.expertsAll'),
        tp('features.historyForever'),
        tp('features.effectDeep'),
      ],
    },
  ];

  // 计算年付折扣百分比（取最大折扣展示）
  const maxSavePercent = Math.round(
    (1 - plans[2].yearlyPrice / (plans[2].monthlyPrice * 12)) * 100
  );

  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      {/* 页头 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">{tp('title')}</h2>
        <p className="mt-2 text-text-secondary">{tp('subtitle')}</p>
      </div>

      {/* 月付/年付按钮切换 */}
      <div className="mt-8 flex items-center justify-center">
        <div className="inline-flex items-center rounded-full bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setIsYearly(false)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              !isYearly ? 'bg-[#FF7A59] text-white' : 'text-text-secondary'
            }`}
          >
            {tp('monthly')}
          </button>
          <button
            type="button"
            onClick={() => setIsYearly(true)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              isYearly ? 'bg-[#FF7A59] text-white' : 'text-text-secondary'
            }`}
          >
            {tp('yearly')}
          </button>
          {/* 年付省钱标签 */}
          <span className="ml-1 rounded-full bg-[#FF7A59]/10 px-2 py-0.5 text-xs font-medium text-[#FF7A59]">
            {tp('savePercent', { percent: maxSavePercent })}
          </span>
        </div>
      </div>

      {/* 方案卡片网格 — 测试方案开启时 4 列，否则 3 列 */}
      <div className={`mt-10 grid gap-6 ${showTestPlan ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
        {plans.map((plan) => {
          const cardVariantId = isDomestic
            ? (isYearly ? plan.variantIdDomesticYearly : plan.variantIdDomesticMonthly)
            : (isYearly ? plan.variantIdYearly : plan.variantIdMonthly);

          return (
            <PricingCard
              key={plan.id}
              plan={plan}
              isYearly={isYearly}
              isTestPlan={false}
              isLoggedIn={isLoggedIn}
              variantId={cardVariantId}
              lang={lang}
            />
          );
        })}

        {/* $0.01 测试方案 */}
        {showTestPlan && (
          <PricingCard
            plan={{
              id: 'test',
              name: tp('testPlanName'),
              monthlyPrice: 0.01,
              yearlyPrice: 0.01,
              features: [
                tp('features.dailyMessages', { count: 30 }),
                tp('features.expertsStarter'),
                tp('features.historyDays', { count: 7 }),
                tp('features.effectLight'),
              ],
            }}
            isYearly={false}
            isTestPlan={true}
            isLoggedIn={isLoggedIn}
            variantId={variantIds.test}
            lang={lang}
          />
        )}
      </div>
    </section>
  );
}
