'use client';
// components/admin/users/UserTable.tsx
// 用户表格 — 展示用户列表，支持搜索、分页、行点击

import DataTable, { Column } from '@/components/admin/shared/DataTable';

interface UserRow {
  id: string;
  name: string;
  email: string;
  variantName: string | null;
  subscriptionStatus: string | null;
  messageCount: number;
  createdAt: string;
}

interface UserTableProps {
  data: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onSearch: (q: string) => void;
  onPageChange: (p: number) => void;
  onRowClick: (row: UserRow) => void;
}

const columns: Column<UserRow>[] = [
  { key: 'name', header: '姓名' },
  { key: 'email', header: '邮箱' },
  {
    key: 'variantName',
    header: '等级',
    render: (row) => (
      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">
        {row.variantName ?? '无'}
      </span>
    ),
  },
  {
    key: 'subscriptionStatus',
    header: '订阅状态',
    render: (row) => (
      <span
        className={`inline-block px-2 py-0.5 text-xs rounded-full ${
          row.subscriptionStatus === 'active'
            ? 'bg-green-50 text-green-700'
            : 'bg-gray-50 text-gray-500'
        }`}
      >
        {row.subscriptionStatus ?? '无'}
      </span>
    ),
  },
  { key: 'messageCount', header: '消息数' },
  {
    key: 'createdAt',
    header: '注册时间',
    render: (row) => new Date(row.createdAt).toLocaleDateString('zh-CN'),
  },
];

export default function UserTable(props: UserTableProps) {
  return (
    <DataTable
      columns={columns}
      data={props.data}
      total={props.total}
      page={props.page}
      pageSize={props.pageSize}
      isLoading={props.isLoading}
      onSearch={props.onSearch}
      onPageChange={props.onPageChange}
      onRowClick={props.onRowClick}
      searchPlaceholder="搜索用户名或邮箱..."
    />
  );
}
