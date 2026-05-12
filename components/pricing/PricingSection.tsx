// components/pricing/PricingSection.tsx
// 三方案对比区：月付/年付切换 + 三列 PricingCard

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { PricingCard } from './PricingCard';

interface PlanIds {
  starterMonthly: string;
  starterYearly: string;
  proMonthly: string;
  proYearly: string;
  ultraMonthly: string;
  ultraYearly: string;
  test: string;
}

interface PricingSectionProps {
  lang: string;
  isLoggedIn: boolean;
  showTestPlan: boolean;
  planIds: PlanIds;
}

/** PayPal Client ID，前端直用 */
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';

export function PricingSection({ lang, isLoggedIn, showTestPlan, planIds }: PricingSectionProps) {
  const [isYearly, setIsYearly] = useState(false);
  const tp = useTranslations('pricing');

  /** 三个定价方案的定义 */
  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 9.9,
      yearlyPrice: 108.9,
      planId: isYearly ? planIds.starterYearly : planIds.starterMonthly,
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
      monthlyPrice: 29.9,
      yearlyPrice: 328.9,
      highlighted: true,
      planId: isYearly ? planIds.proYearly : planIds.proMonthly,
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
      monthlyPrice: 49.9,
      yearlyPrice: 548.9,
      planId: isYearly ? planIds.ultraYearly : planIds.ultraMonthly,
      features: [
        tp('features.unlimitedMessages'),
        tp('features.expertsAll'),
        tp('features.historyForever'),
        tp('features.effectDeep'),
      ],
    },
  ];

  // 计算年付折扣百分比
  const maxSavePercent = Math.round(
    (1 - plans[2].yearlyPrice / (plans[2].monthlyPrice * 12)) * 100
  );

  return (
    <PayPalScriptProvider
      options={{
        clientId: PAYPAL_CLIENT_ID,
        vault: true,
        intent: 'subscription',
      }}
    >
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
            <span className="ml-1 rounded-full bg-[#FF7A59]/10 px-2 py-0.5 text-xs font-medium text-[#FF7A59]">
              {tp('savePercent', { percent: maxSavePercent })}
            </span>
          </div>
        </div>

        {/* 方案卡片网格 */}
        <div className={`mt-10 grid gap-6 ${showTestPlan ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isYearly={isYearly}
              isTestPlan={false}
              isLoggedIn={isLoggedIn}
              lang={lang}
            />
          ))}

          {/* 测试方案 */}
          {showTestPlan && (
            <PricingCard
              plan={{
                id: 'test',
                name: tp('testPlanName'),
                monthlyPrice: 0.1,
                yearlyPrice: 0.1,
                planId: planIds.test,
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
              lang={lang}
            />
          )}
        </div>
      </section>
    </PayPalScriptProvider>
  );
}
