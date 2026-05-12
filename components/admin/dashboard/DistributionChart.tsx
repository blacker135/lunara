'use client';
// components/admin/dashboard/DistributionChart.tsx
// 分布饼图 — 会员分布/专家分布

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DistributionChartProps {
  data: { name: string; value: number; color?: string }[];
  label?: string;
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DistributionChart({ data, label = '分布' }: DistributionChartProps) {
  if (!data.length) {
    return <div className="text-center text-gray-400 py-12">暂无数据</div>;
  }

  const chartData = data.map((item, i) => ({
    ...item,
    color: item.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{label}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color!} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
