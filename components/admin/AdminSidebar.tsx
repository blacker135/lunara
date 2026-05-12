'use client';
// components/admin/AdminSidebar.tsx
// 管理后台侧边栏导航（分组可折叠）

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavGroup {
  label: string;
  items: { href: string; label: string }[];
}

const navGroups: NavGroup[] = [
  {
    label: '数据概览',
    items: [{ href: '/admin/dashboard', label: '仪表盘' }],
  },
  {
    label: '用户体系',
    items: [
      { href: '/admin/users', label: '用户管理' },
      { href: '/admin/members', label: '会员管理' },
      { href: '/admin/subscriptions', label: '订阅管理' },
    ],
  },
  {
    label: '数据分析',
    items: [
      { href: '/admin/stats/project', label: '项目统计' },
      { href: '/admin/stats/traffic', label: '流量统计' },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-100">
        <Link href="/admin" className="text-lg font-bold text-gray-800">
          管理后台
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-2">
            <button
              onClick={() => toggle(group.label)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600"
            >
              {group.label}
              <span className="text-[10px]">{collapsed[group.label] ? '▸' : '▾'}</span>
            </button>
            {!collapsed[group.label] && (
              <div className="mt-1 space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                        active
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-100">
        <Link href="/" className="block px-3 py-2 text-sm text-gray-400 hover:text-gray-600 rounded-md">
          ← 返回首页
        </Link>
      </div>
    </aside>
  );
}
