// app/admin/page.tsx
// 默认重定向到仪表盘

import { redirect } from 'next/navigation';

export default function AdminPage() {
  redirect('/admin/dashboard');
}
