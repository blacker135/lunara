// app/admin/dashboard/page.tsx
// 仪表盘页面 — 服务端获取数据，客户端渲染图表

import { getAdminUserId } from '@/lib/admin/guard';
import {
  queryTotalUsers,
  queryActiveSubscriptions,
  queryTodayMessages,
  queryTotalRevenue,
  queryExpertDistribution,
  queryDAUSeries,
  queryMessageSeries,
} from '@/lib/stats';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const auth = await getAdminUserId();
  // getAdminUserId 返回 userId 字符串或 NextResponse
  // 如果返回 NextResponse，说明不是 admin，跳转到首页
  if (typeof auth !== 'string') {
    redirect('/');
  }

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [
    totalUsers,
    activeSubs,
    todayMessages,
    totalRevenue,
    expertDist,
    dauSeries,
    messageSeries,
  ] = await Promise.all([
    queryTotalUsers(),
    queryActiveSubscriptions(),
    queryTodayMessages(),
    queryTotalRevenue(),
    queryExpertDistribution(),
    queryDAUSeries({ start: thirtyDaysAgo, end: today }),
    queryMessageSeries({ start: thirtyDaysAgo, end: today }),
  ]);

  return (
    <DashboardClient
      totalUsers={totalUsers}
      activeSubscriptions={activeSubs}
      todayMessages={todayMessages}
      totalRevenue={totalRevenue}
      expertDistribution={expertDist.map((e: { expert: string; count: number }) => ({ name: e.expert, value: e.count }))}
      dauSeries={dauSeries}
      messageSeries={messageSeries}
    />
  );
}
