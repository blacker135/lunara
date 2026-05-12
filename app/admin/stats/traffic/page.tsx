'use client';
// app/admin/stats/traffic/page.tsx
// 流量数据统计页 — PV、UV、首页曝光

import { useState, useEffect } from 'react';
import StatFilter from '@/components/admin/shared/StatFilter';
import StatCard from '@/components/admin/dashboard/StatCard';
import TrendChart from '@/components/admin/dashboard/TrendChart';

export default function TrafficStatsPage() {
  const [dateRange, setDateRange] = useState<{ start: string; end: string; preset: 'day' | 'month' | 'year' | 'custom' }>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return { start: today, end: today, preset: 'day' };
  });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ start: dateRange.start, end: dateRange.end });
    fetch(`/api/admin/stats/traffic?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [dateRange]);

  if (loading) return <div className="p-6 text-gray-400">加载中...</div>;
  if (!data) return null;

  const pvData = data.dates.map((d: string, i: number) => ({ date: d, value: data.pv[i] ?? 0 }));
  const uvData = data.dates.map((d: string, i: number) => ({ date: d, value: data.uv[i] ?? 0 }));
  const exposureData = data.dates.map((d: string, i: number) => ({ date: d, value: data.exposure[i] ?? 0 }));

  const lastIdx = data.dates.length - 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">流量数据统计</h1>
      <StatFilter dateRange={dateRange} onDateRangeChange={setDateRange} />

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="PV" value={data.pv[lastIdx] ?? 0} subtitle="页面访问量" />
        <StatCard title="UV" value={data.uv[lastIdx] ?? 0} subtitle="独立访客" />
        <StatCard title="首页曝光" value={data.exposure[lastIdx] ?? 0} subtitle="首页访问量" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TrendChart data={pvData} label="PV" color="#3b82f6" />
        <TrendChart data={uvData} label="UV" color="#10b981" />
      </div>

      <TrendChart data={exposureData} label="首页曝光" color="#f59e0b" />
    </div>
  );
}
