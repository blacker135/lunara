'use client';
// app/admin/dashboard/DashboardClient.tsx
// 仪表盘客户端渲染组件

import StatCard from '@/components/admin/dashboard/StatCard';
import TrendChart from '@/components/admin/dashboard/TrendChart';
import DistributionChart from '@/components/admin/dashboard/DistributionChart';

interface DashboardClientProps {
  totalUsers: number;
  activeSubscriptions: number;
  todayMessages: number;
  totalRevenue: number;
  expertDistribution: { name: string; value: number }[];
  dauSeries: { date: string; value: number }[];
  messageSeries: { date: string; value: number }[];
}

export default function DashboardClient({
  totalUsers,
  activeSubscriptions,
  todayMessages,
  totalRevenue,
  expertDistribution,
  dauSeries,
  messageSeries,
}: DashboardClientProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">仪表盘</h1>

      <div className="grid grid-cols-4 gap-4">
        <StatCard title="用户总数" value={totalUsers} />
        <StatCard title="活跃订阅" value={activeSubscriptions} />
        <StatCard title="今日消息" value={todayMessages} />
        <StatCard title="收入总额" value={`$${totalRevenue.toFixed(2)}`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TrendChart data={messageSeries} label="消息量" color="#3b82f6" />
        <TrendChart data={dauSeries} label="日活用户" color="#10b981" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DistributionChart data={expertDistribution} label="专家使用分布" />
        <DistributionChart
          data={[
            { name: 'Starter', value: activeSubscriptions > 0 ? Math.max(totalUsers - activeSubscriptions, 0) : totalUsers, color: '#f59e0b' },
            { name: '付费用户', value: activeSubscriptions, color: '#3b82f6' },
          ]}
          label="会员构成"
        />
      </div>
    </div>
  );
}
