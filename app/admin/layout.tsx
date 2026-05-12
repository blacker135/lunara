// app/admin/layout.tsx
// 管理后台根布局 — 服务端权限校验

import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin/guard';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import AdminLayout from '@/components/admin/AdminLayout';

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;

  if (!userId) {
    redirect('/auth/login');
  }

  const admin = await isAdmin(userId);
  if (!admin) {
    redirect('/');
  }

  return <AdminLayout>{children}</AdminLayout>;
}
