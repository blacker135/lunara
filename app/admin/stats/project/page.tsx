'use client';
// app/admin/stats/project/page.tsx
// 项目数据统计页 — DAU、消息、留存、付费等核心业务指标

import { useState, useEffect } from 'react';
import StatFilter from '@/components/admin/shared/StatFilter';
import StatCard from '@/components/admin/dashboard/StatCard';
import TrendChart from '@/components/admin/dashboard/TrendChart';
import DistributionChart from '@/components/admin/dashboard/DistributionChart';
import RetentionChart from '@/components/admin/stats/RetentionChart';
import PaymentChart from '@/components/admin/stats/PaymentChart';

export default function ProjectStatsPage() {
  const [dateRange, setDateRange] = useState<{ start: string; end: string; preset: 'day' | 'month' | 'year' | 'custom' }>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return { start: today, end: today, preset: 'day' };
  });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ start: dateRange.start, end: dateRange.end });
    fetch(`/api/admin/stats/project?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [dateRange]);

  if (loading) return <div className="p-6 text-gray-400">加载中...</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">项目数据统计</h1>
      <StatFilter dateRange={dateRange} onDateRangeChange={setDateRange} />

      <div className="grid grid-cols-4 gap-4">
        <StatCard title="DAU" value={data.dauSeries[data.dauSeries.length - 1]?.value ?? 0} />
        <StatCard title="总对话数" value={data.totalConversations} />
        <StatCard title="总消息数" value={data.totalMessages} />
        <StatCard title="留存率(D1)" value={`${data.retention.d1?.[0]?.rate?.toFixed(1) ?? 0}%`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TrendChart data={data.dauSeries} label="DAU" color="#10b981" />
        <TrendChart data={data.messageSeries} label="消息量" color="#3b82f6" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <RetentionChart d1={data.retention.d1} d7={data.retention.d7} d30={data.retention.d30} />
        <PaymentChart
          dates={data.paymentSeries.dates}
          paymentTotal={data.paymentSeries.paymentTotal}
          paymentRate={data.paymentSeries.paymentRate}
        />
      </div>

      <DistributionChart data={data.expertDistribution} label="专家使用分布" />
    </div>
  );
}
