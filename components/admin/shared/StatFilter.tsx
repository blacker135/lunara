'use client';
// components/admin/shared/StatFilter.tsx
// 统计筛选栏 — 日期范围

import DateRangePicker from './DateRangePicker';

interface StatFilterProps {
  dateRange: { start: string; end: string; preset: 'day' | 'month' | 'year' | 'custom' };
  onDateRangeChange: (range: { start: string; end: string; preset: 'day' | 'month' | 'year' | 'custom' }) => void;
}

export default function StatFilter({ dateRange, onDateRangeChange }: StatFilterProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
    </div>
  );
}
