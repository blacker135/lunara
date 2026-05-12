// ============================================================
// components/settings/SettingsPage.tsx
// 设置页面客户端组件：展示账户/安全/订阅信息 + Modal 编辑
// ============================================================
// 职责：渲染用户设置页，包含名称/邮箱/密码修改的 Modal 弹窗，
// 以及订阅状态展示。所有修改操作通过 fetch 调用服务端 API。
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { authClient } from '@/lib/auth/client';

interface SettingsPageProps {
  lang: string;
  userName: string;
  userEmail: string;
}

interface SubscriptionInfo {
  variant: string | null;
  status: string | null;
  periodEnd: string | null;
  trialUsed: number;
  trialLimit: number;
}

export function SettingsPage({ lang, userName, userEmail }: SettingsPageProps) {
  const t = useTranslations('settings');
  const tNav = useTranslations('nav');

  const [sub, setSub] = useState<SubscriptionInfo>({
    variant: null, status: null, periodEnd: null, trialUsed: 0, trialLimit: 3,
  });
  const [subLoading, setSubLoading] = useState(true);

  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/subscription/status')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setSub({
            variant: data.variant,
            status: data.status,
            periodEnd: data.period_end,
            trialUsed: data.trial_used ?? 0,
            trialLimit: data.trial_limit ?? 3,
          });
        }
      })
      .catch(console.error)
      .finally(() => setSubLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      window.location.href = `/${lang}`;
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '--';
    return new Date(iso).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US');
  };

  const statusLabel = sub.status ? t(sub.status) : '--';
  const planLabel = sub.variant
    ? sub.variant.charAt(0).toUpperCase() + sub.variant.slice(1)
    : (sub.trialUsed >= sub.trialLimit ? t('expired') : 'Trial');

  return (
    <>
      <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>

      {/* 账户信息 */}
      <section className="mt-8 rounded-[20px] border border-gray-100 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">{t('account')}</h2>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">{t('name')}</p>
              <p className="text-sm text-text-primary">{userName || '--'}</p>
            </div>
            <button
              onClick={() => { setNameModalOpen(true); }}
              className="rounded-[12px] px-3 py-1.5 text-xs font-medium text-[#FF7A59] hover:bg-[#FF7A59]/10 transition-colors"
            >
              {t('edit')}
            </button>
          </div>

          <div className="border-t border-gray-50" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">{t('email')}</p>
              <p className="text-sm text-text-primary">{userEmail}</p>
            </div>
            <button
              onClick={() => { setEmailModalOpen(true); }}
              className="rounded-[12px] px-3 py-1.5 text-xs font-medium text-[#FF7A59] hover:bg-[#FF7A59]/10 transition-colors"
            >
              {t('edit')}
            </button>
          </div>
        </div>
      </section>

      {/* 安全 */}
      <section className="mt-4 rounded-[20px] border border-gray-100 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">{t('security')}</h2>
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">{t('password')}</p>
              <p className="text-sm text-text-primary">********</p>
            </div>
            <button
              onClick={() => { setPasswordModalOpen(true); }}
              className="rounded-[12px] px-3 py-1.5 text-xs font-medium text-[#FF7A59] hover:bg-[#FF7A59]/10 transition-colors"
            >
              {t('change')}
            </button>
          </div>
        </div>
      </section>

      {/* 订阅信息 */}
      <section className="mt-4 rounded-[20px] border border-gray-100 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">{t('subscription')}</h2>
        {subLoading ? (
          <p className="mt-4 text-sm text-text-secondary">Loading...</p>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">{t('plan')}</span>
              <span className="text-sm font-medium text-text-primary">{planLabel}</span>
            </div>
            {sub.status && (
              <div className="flex justify-between">
                <span className="text-sm text-text-secondary">{t('status')}</span>
                <span className={`text-sm font-medium capitalize ${sub.status === 'active' ? 'text-green-600' : 'text-text-secondary'}`}>
                  {statusLabel}
                </span>
              </div>
            )}
            {sub.periodEnd && (
              <div className="flex justify-between">
                <span className="text-sm text-text-secondary">{t('expires')}</span>
                <span className="text-sm text-text-primary">{formatDate(sub.periodEnd)}</span>
              </div>
            )}
            {!sub.variant && (
              <div className="flex justify-between">
                <span className="text-sm text-text-secondary">{t('messages')}</span>
                <span className="text-sm text-text-primary">
                  {sub.trialUsed} / {sub.trialLimit}
                </span>
              </div>
            )}
            {sub.variant && (
              <div className="pt-2">
                <a
                  href="https://www.paypal.com/myaccount/autopay/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-[#FF7A59] hover:underline"
                >
                  {t('manageSubscription')} →
                </a>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 退出登录 */}
      <section className="mt-4 rounded-[20px] border border-gray-100 bg-white p-6">
        <button
          onClick={handleLogout}
          className="w-full text-left text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
        >
          {tNav('logout')}
        </button>
      </section>

      {/* ---- Modals ---- */}

      {nameModalOpen && (
        <NameModal
          currentName={userName}
          onClose={() => setNameModalOpen(false)}
          onSuccess={() => { setNameModalOpen(false); window.location.reload(); }}
          t={t}
        />
      )}

      {emailModalOpen && (
        <EmailModal
          currentEmail={userEmail}
          onClose={() => setEmailModalOpen(false)}
          t={t}
        />
      )}

      {passwordModalOpen && (
        <PasswordModal
          onClose={() => setPasswordModalOpen(false)}
          t={t}
        />
      )}
    </>
  );
}

// ============================================================
// Modal 子组件
// ============================================================

/** 名称修改 Modal */
function NameModal({ currentName, onClose, onSuccess, t }: {
  currentName: string;
  onClose: () => void;
  onSuccess: () => void;
  t: any;
}) {
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/settings/name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || t('error'));
      }
    } catch {
      setError(t('error'));
    } finally {
      setSaving(false);
    }
  };

  return <ModalOverlay onClose={onClose}>
    <div className="w-full max-w-sm rounded-[20px] bg-white p-6">
      <h3 className="text-lg font-semibold text-text-primary">{t('edit')} {t('name')}</h3>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-4 w-full rounded-[12px] border border-gray-200 px-3 py-2 text-sm focus:border-[#FF7A59] focus:outline-none"
      />
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <div className="mt-4 flex justify-end gap-3">
        <button onClick={onClose} className="rounded-[12px] px-4 py-2 text-sm text-text-secondary hover:bg-gray-100">{t('cancel')}</button>
        <button onClick={handleSave} disabled={saving || !name.trim()} className="rounded-[12px] bg-[#FF7A59] px-4 py-2 text-sm font-medium text-white hover:bg-[#FF7A59]/90 disabled:opacity-50">
          {saving ? '...' : t('save')}
        </button>
      </div>
    </div>
  </ModalOverlay>;
}

/** 邮箱修改 Modal */
function EmailModal({ currentEmail, onClose, t }: {
  currentEmail: string;
  onClose: () => void;
  t: any;
}) {
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!email.includes('@')) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: email.trim() }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || t('error'));
      }
    } catch {
      setError(t('error'));
    } finally {
      setSaving(false);
    }
  };

  return <ModalOverlay onClose={onClose}>
    <div className="w-full max-w-sm rounded-[20px] bg-white p-6">
      <h3 className="text-lg font-semibold text-text-primary">{t('edit')} {t('email')}</h3>
      <p className="mt-1 text-xs text-text-secondary">{currentEmail}</p>
      {!success ? (
        <>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('newEmail')}
            className="mt-3 w-full rounded-[12px] border border-gray-200 px-3 py-2 text-sm focus:border-[#FF7A59] focus:outline-none"
          />
          <p className="mt-1 text-xs text-text-secondary">{t('emailHint')}</p>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={onClose} className="rounded-[12px] px-4 py-2 text-sm text-text-secondary hover:bg-gray-100">{t('cancel')}</button>
            <button onClick={handleSave} disabled={saving || !email.includes('@')} className="rounded-[12px] bg-[#FF7A59] px-4 py-2 text-sm font-medium text-white hover:bg-[#FF7A59]/90 disabled:opacity-50">
              {saving ? '...' : 'Send Verification'}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-green-600">{t('emailSent')}</p>
          <button onClick={onClose} className="mt-3 rounded-[12px] px-4 py-2 text-sm text-[#FF7A59] hover:bg-[#FF7A59]/10">{t('cancel')}</button>
        </div>
      )}
    </div>
  </ModalOverlay>;
}

/** 密码修改 Modal */
function PasswordModal({ onClose, t }: {
  onClose: () => void;
  t: any;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || t('error'));
      }
    } catch {
      setError(t('error'));
    } finally {
      setSaving(false);
    }
  };

  return <ModalOverlay onClose={onClose}>
    <div className="w-full max-w-sm rounded-[20px] bg-white p-6">
      <h3 className="text-lg font-semibold text-text-primary">{t('changePassword')}</h3>
      {!success ? (
        <>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder={t('currentPassword')} className="mt-4 w-full rounded-[12px] border border-gray-200 px-3 py-2 text-sm focus:border-[#FF7A59] focus:outline-none" />
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('newPassword')} className="mt-3 w-full rounded-[12px] border border-gray-200 px-3 py-2 text-sm focus:border-[#FF7A59] focus:outline-none" />
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('confirmPassword')} className="mt-3 w-full rounded-[12px] border border-gray-200 px-3 py-2 text-sm focus:border-[#FF7A59] focus:outline-none" />
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={onClose} className="rounded-[12px] px-4 py-2 text-sm text-text-secondary hover:bg-gray-100">{t('cancel')}</button>
            <button onClick={handleSave} disabled={saving || !currentPassword || !newPassword || !confirmPassword} className="rounded-[12px] bg-[#FF7A59] px-4 py-2 text-sm font-medium text-white hover:bg-[#FF7A59]/90 disabled:opacity-50">
              {saving ? '...' : t('changePassword')}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-green-600">{t('passwordChanged')}</p>
          <button onClick={onClose} className="mt-3 rounded-[12px] px-4 py-2 text-sm text-[#FF7A59] hover:bg-[#FF7A59]/10">{t('cancel')}</button>
        </div>
      )}
    </div>
  </ModalOverlay>;
}

/** Modal 遮罩组件 — 点击遮罩区域可关闭 Modal */
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {children}
    </div>
  );
}
