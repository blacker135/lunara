// components/pricing/PayPalButton.tsx
// PayPal Smart Button 封装组件
// 处理创建订阅、审批回调、错误和取消

'use client';

import { PayPalButtons } from '@paypal/react-paypal-js';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface PayPalButtonProps {
  planId: string;
  planName: string;
  isLoggedIn: boolean;
  lang: string;
}

export function PayPalButton({ planId, planName, isLoggedIn, lang }: PayPalButtonProps) {
  const router = useRouter();
  const tp = useTranslations('pricing');

  if (!isLoggedIn) {
    return (
      <button
        type="button"
        onClick={() => router.push(`/${lang}/auth/login?redirect=/pricing`)}
        className="mt-6 w-full rounded-[16px] py-2.5 text-sm font-medium bg-[#FF7A59] text-white hover:bg-[#FF7A59]/90 transition-colors"
      >
        {tp('startTrial')}
      </button>
    );
  }

  return (
    <div className="mt-6">
      <PayPalButtons
        style={{
          shape: 'pill',
          color: 'gold',
          layout: 'vertical',
          label: 'subscribe',
        }}
        createSubscription={(_data, actions) => {
          return actions.subscription.create({
            plan_id: planId,
          });
        }}
        onApprove={async (data) => {
          const res = await fetch('/api/subscription/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscription_id: data.subscriptionID,
              plan_id: planId,
            }),
          });

          if (res.ok) {
            router.push(`/${lang}/chat`);
          } else {
            const err = await res.json();
            console.error('Subscription activation failed:', err);
            alert(err.error || 'Activation failed');
          }
        }}
        onError={(err) => {
          console.error('PayPal button error:', err);
        }}
        onCancel={() => {
          // 用户取消支付，无需处理
        }}
      />
      <p className="mt-1 text-center text-xs text-text-secondary">
        {tp('subscribe')} — {planName}
      </p>
    </div>
  );
}
