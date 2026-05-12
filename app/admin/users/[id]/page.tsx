'use client';
// app/admin/users/[id]/page.tsx
// 用户详情页 — 查看/编辑用户信息、订阅信息，支持删除用户

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/components/admin/shared/ConfirmDialog';

interface UserDetailData {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
  subscription: {
    variantName: string;
    status: string;
    currentPeriodEnd: string | null;
    paypalSubscriptionId: string;
  } | null;
  conversationCount: number;
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setUser(data);
        setName(data.name);
        setEmail(data.email);
        setLoading(false);
      });
  }, [id]);

  const handleSave = async () => {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });
    setEditing(false);
    setUser((prev) => (prev ? { ...prev, name, email } : null));
  };

  const handleDelete = async () => {
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    router.push('/admin/users');
  };

  if (loading) return <div className="p-6 text-gray-400">加载中...</div>;
  if (!user) return <div className="p-6 text-gray-400">用户不存在</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600">
          ← 返回
        </button>
        <h1 className="text-2xl font-bold text-gray-800">用户详情</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex justify-between">
          <h2 className="text-lg font-semibold">基本信息</h2>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={handleSave} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg">
                  保存
                </button>
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm border rounded-lg">
                  取消
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 text-sm border rounded-lg">
                编辑
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">姓名</span>
            {editing ? (
              <input value={name} onChange={(e) => setName(e.target.value)} className="block mt-1 px-2 py-1 border rounded w-full" />
            ) : (
              <p className="mt-1 font-medium">{user.name}</p>
            )}
          </div>
          <div>
            <span className="text-gray-400">邮箱</span>
            {editing ? (
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="block mt-1 px-2 py-1 border rounded w-full" />
            ) : (
              <p className="mt-1 font-medium">{user.email}</p>
            )}
          </div>
          <div>
            <span className="text-gray-400">注册时间</span>
            <p className="mt-1 font-medium">{new Date(user.createdAt).toLocaleDateString('zh-CN')}</p>
          </div>
          <div>
            <span className="text-gray-400">对话数</span>
            <p className="mt-1 font-medium">{user.conversationCount}</p>
          </div>
        </div>

        {user.subscription && (
          <>
            <h3 className="text-sm font-semibold text-gray-600 pt-2">订阅信息</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">等级</span>
                <p className="mt-1 font-medium">{user.subscription.variantName}</p>
              </div>
              <div>
                <span className="text-gray-400">状态</span>
                <p className="mt-1 font-medium">{user.subscription.status}</p>
              </div>
              <div>
                <span className="text-gray-400">到期时间</span>
                <p className="mt-1 font-medium">
                  {user.subscription.currentPeriodEnd
                    ? new Date(user.subscription.currentPeriodEnd).toLocaleDateString('zh-CN')
                    : '-'}
                </p>
              </div>
            </div>
          </>
        )}

        <div className="pt-4 border-t border-gray-100">
          <button
            onClick={() => setShowDelete(true)}
            className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
          >
            删除用户
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        title="确认删除"
        message={`确定要删除用户 "${user.name}" 吗？此操作将删除该用户的所有对话、消息和订阅数据，不可撤销。`}
        confirmLabel="删除"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
