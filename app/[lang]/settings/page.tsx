// ============================================================
// app/[lang]/settings/page.tsx
// /[lang]/settings — 用户设置页面（服务端入口）
// ============================================================
// 职责：验证用户登录状态，获取 session 后渲染 SettingsPage 客户端组件
// 未登录用户将被重定向到登录页
// ============================================================

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SettingsPage } from '@/components/settings/SettingsPage';

export default async function SettingsRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect(`/${lang}/auth/login?redirect=/settings`);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <SettingsPage
        lang={lang}
        userName={session.user.name || ''}
        userEmail={session.user.email}
      />
    </main>
  );
}
