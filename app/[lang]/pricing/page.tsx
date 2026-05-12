// app/[lang]/pricing/page.tsx
// /[lang]/pricing — 定价页（服务端组件）

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { PricingSection } from '@/components/pricing/PricingSection';

export default async function PricingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const showTestPlan = process.env.NEXT_PUBLIC_SHOW_TEST_PLAN === 'true';

  const planIds = {
    starterMonthly: process.env.PAYPAL_PLAN_STARTER_MONTHLY || '',
    starterYearly: process.env.PAYPAL_PLAN_STARTER_YEARLY || '',
    proMonthly: process.env.PAYPAL_PLAN_PRO_MONTHLY || '',
    proYearly: process.env.PAYPAL_PLAN_PRO_YEARLY || '',
    ultraMonthly: process.env.PAYPAL_PLAN_ULTRA_MONTHLY || '',
    ultraYearly: process.env.PAYPAL_PLAN_ULTRA_YEARLY || '',
    test: process.env.PAYPAL_PLAN_TEST || '',
  };

  return (
    <main>
      <PricingSection
        lang={lang}
        isLoggedIn={!!session?.user}
        showTestPlan={showTestPlan}
        planIds={planIds}
      />
    </main>
  );
}
