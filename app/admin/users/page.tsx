'use client';
// app/admin/users/page.tsx
// 用户管理列表页 — 展示所有注册用户，支持搜索和分页

import { useRouter } from 'next/navigation';
import UserTable from '@/components/admin/users/UserTable';
import { useState, useEffect, useCallback } from 'react';

export default function UsersPage() {
  const router = useRouter();
  const [data, setData] = useState<{ users: any[]; total: number }>({ users: [], total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) params.set('search', search);
    const res = await fetch(`/api/admin/users?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">用户管理</h1>
      <UserTable
        data={data.users}
        total={data.total}
        page={page}
        pageSize={20}
        isLoading={loading}
        onSearch={setSearch}
        onPageChange={setPage}
        onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
      />
    </div>
  );
}
