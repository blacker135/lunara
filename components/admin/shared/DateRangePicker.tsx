'use client';
// components/admin/shared/DateRangePicker.tsx
// 日期范围选择器 — 日/月/年/自定义

type Preset = 'day' | 'month' | 'year' | 'custom';

interface DateRangePickerProps {
  value: { start: string; end: string; preset: Preset };
  onChange: (range: { start: string; end: string; preset: Preset }) => void;
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const presets: { key: Preset; label: string }[] = [
    { key: 'day', label: '今日' },
    { key: 'month', label: '本月' },
    { key: 'year', label: '本年' },
    { key: 'custom', label: '自定义' },
  ];

  const handlePreset = (preset: Preset) => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    switch (preset) {
      case 'day':
        onChange({ start: fmt(today), end: fmt(today), preset });
        break;
      case 'month':
        onChange({
          start: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
          end: fmt(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
          preset,
        });
        break;
      case 'year':
        onChange({
          start: fmt(new Date(today.getFullYear(), 0, 1)),
          end: fmt(new Date(today.getFullYear(), 11, 31)),
          preset,
        });
        break;
      case 'custom':
        onChange({ start: value.start, end: value.end, preset });
        break;
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePreset(p.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              value.preset === p.key
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {value.preset === 'custom' && (
        <div className="flex items-center gap-2 text-sm">
          <input
            type="date"
            value={value.start}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
          />
          <span className="text-gray-400">至</span>
          <input
            type="date"
            value={value.end}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
          />
        </div>
      )}
    </div>
  );
}
