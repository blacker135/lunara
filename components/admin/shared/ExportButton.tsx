'use client';
// components/admin/shared/ExportButton.tsx
// 导出按钮

interface ExportButtonProps {
  label?: string;
  apiUrl: string;
  body?: Record<string, unknown>;
}

export default function ExportButton({ label = '导出', apiUrl, body }: ExportButtonProps) {
  const handleExport = async () => {
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('导出失败:', err);
    }
  };

  return (
    <button
      onClick={handleExport}
      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
    >
      {label}
    </button>
  );
}
