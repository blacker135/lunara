'use client';
// components/admin/stats/PaymentChart.tsx
// 付费趋势图 — 付费总额 + 付费率双轴组合图

import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PaymentChartProps {
  dates: string[];
  paymentTotal: number[];
  paymentRate: number[];
}

export default function PaymentChart({ dates, paymentTotal, paymentRate }: PaymentChartProps) {
  const data = dates.map((d, i) => ({
    date: d,
    total: paymentTotal[i] ?? 0,
    rate: paymentRate[i] ?? 0,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">付费趋势</h3>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} unit="%" />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="付费总额($)" />
          <Line yAxisId="right" type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={2} dot={false} name="付费率(%)" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
