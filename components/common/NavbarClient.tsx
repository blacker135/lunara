// ============================================================
// components/common/NavbarClient.tsx — 客户端导航栏交互
// ============================================================
// 职责：usePathname 判断路由、头像下拉菜单、登出操作
// 仅在客户端渲染（'use client'），从 Navbar（服务端组件）接收 props
// ============================================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { authClient } from '@/lib/auth/client';

/** 服务端传来的 session 用户数据 */
interface NavbarSessionUser {
  name?: string;
  email: string;
}

/** 会员订阅信息 */
interface MembershipData {
  variant: string;
  status: string;
  currentPeriodEnd: string | null;
}

/** 各方案的权益摘要（用于 Tooltip 展示） */
interface PlanBenefit {
  messagesKey: string;
  messagesCount?: number;
  expertsKey: string;
  depthKey: string;
  historyKey: string;
  historyCount?: number;
}

const PLAN_BENEFITS: Record<string, PlanBenefit> = {
  starter: {
    messagesKey: 'membership.benefitMessages',
    messagesCount: 30,
    expertsKey: 'membership.benefitExperts',
    depthKey: 'membership.benefitDepthLight',
    historyKey: 'membership.benefitHistoryDays',
    historyCount: 7,
  },
  pro: {
    messagesKey: 'membership.benefitMessages',
    messagesCount: 100,
    expertsKey: 'membership.benefitExpertsAll',
    depthKey: 'membership.benefitDepthStandard',
    historyKey: 'membership.benefitHistoryDays',
    historyCount: 30,
  },
  ultra: {
    messagesKey: 'membership.benefitUnlimitedMessages',
    expertsKey: 'membership.benefitExpertsAll',
    depthKey: 'membership.benefitDepthDeep',
    historyKey: 'membership.benefitHistoryForever',
  },
};

interface NavbarClientProps {
  lang: string;
  user: NavbarSessionUser | null;
  membership: MembershipData | null;
}

/**
 * NavbarClient — 客户端导航栏
 * 根据当前路由切换完整模式/极简模式（聊天页），
 * 提供已登录用户的头像下拉菜单与登出功能。
 */
export function NavbarClient({ lang, user, membership }: NavbarClientProps) {
  const t = useTranslations('nav');
  const tm = useTranslations('membership');
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // 判断是否在聊天页 — 路径包含 /chat
  const isChatPage = pathname.includes('/chat');

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escape 键关闭下拉菜单（键盘无障碍）
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && dropdownOpen) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dropdownOpen]);

  // 点击外部关闭 Tooltip
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setTooltipOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escape 键关闭 Tooltip
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && tooltipOpen) {
        setTooltipOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tooltipOpen]);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      window.location.href = `/${lang}`;
    }
  };

  // 会员等级配色映射
  const variantBadgeClass: Record<string, string> = {
    starter: 'bg-gray-100 text-gray-600',
    pro: 'bg-blue-50 text-blue-600',
    ultra: 'bg-amber-50 text-amber-600',
  };

  // 格式化到期日期
  const formatDate = (iso: string | null): string => {
    if (!iso) return '--';
    return new Date(iso).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // 获取权益摘要
  const getBenefits = (variant: string): string[] => {
    const b = PLAN_BENEFITS[variant];
    if (!b) return [];
    const benefits: string[] = [];
    if (b.messagesCount !== undefined) {
      benefits.push(tm('benefitMessages', { count: b.messagesCount }));
    } else {
      benefits.push(tm('benefitUnlimitedMessages'));
    }
    benefits.push(tm(b.expertsKey));
    benefits.push(tm(b.depthKey));
    if (b.historyCount !== undefined) {
      benefits.push(tm('benefitHistoryDays', { count: b.historyCount }));
    } else {
      benefits.push(tm('benefitHistoryForever'));
    }
    return benefits;
  };

  // 用户头像字母（取 name 首字母或 email 首字母大写，空值兜底为 ?）
  const avatarLetter = user
    ? (user.name?.charAt(0) || user.email.charAt(0)).toUpperCase() || '?'
    : '?';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* 左侧：Logo */}
        <Link
          href={`/${lang}`}
          className="text-lg font-semibold text-[#2B2B2B] hover:text-[#FF7A59] transition-colors"
        >
          {t('brand')}
        </Link>

        {/* 中间：菜单 — 聊天页隐藏 */}
        {!isChatPage && (
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link
              href={`/${lang}`}
              className="text-[#777777] hover:text-[#2B2B2B] transition-colors"
            >
              {t('home')}
            </Link>
            <Link
              href={`/${lang}/chat/liam`}
              className="text-[#777777] hover:text-[#2B2B2B] transition-colors"
            >
              {t('startChat')}
            </Link>
            <Link
              href={`/${lang}/pricing`}
              className="text-[#777777] hover:text-[#2B2B2B] transition-colors"
            >
              {t('pricing')}
            </Link>
          </div>
        )}

        {/* 右侧：认证区域 */}
        <div className="flex items-center gap-3">
          {user ? (
            /* 已登录 — 头像 + 会员标识 + 下拉菜单 */
            <div className="relative flex items-center gap-2" ref={dropdownRef}>
              {/* 会员标识 Tag — 悬停显示 Tooltip */}
              {membership && (
                <div className="relative" ref={tooltipRef}>
                  <button
                    type="button"
                    onMouseEnter={() => setTooltipOpen(true)}
                    onMouseLeave={() => setTooltipOpen(false)}
                    onClick={() => setTooltipOpen(!tooltipOpen)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize transition-opacity hover:opacity-80 ${
                      variantBadgeClass[membership.variant] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {membership.variant}
                  </button>

                  {/* Tooltip */}
                  {tooltipOpen && (
                    <div
                      role="tooltip"
                      className="absolute right-0 top-full mt-2 w-56 rounded-[12px] bg-white p-4 shadow-soft border border-gray-100 z-50"
                    >
                      <p className="text-sm font-semibold text-text-primary capitalize">
                        {membership.variant} {lang === 'zh' ? '会员' : 'Member'}
                      </p>
                      <div className="my-2 border-t border-gray-100" />
                      <ul className="space-y-1">
                        {getBenefits(membership.variant).map((benefit) => (
                          <li key={benefit} className="flex items-center gap-1.5 text-xs text-text-secondary">
                            <svg className="h-3 w-3 flex-shrink-0 text-[#FF7A59]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                      <div className="my-2 border-t border-gray-100" />
                      <p className="text-xs text-text-secondary">
                        {tm('expires', { date: formatDate(membership.currentPeriodEnd) })}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 非会员 — 升级按钮 */}
              {!membership && (
                <Link
                  href={`/${lang}/pricing`}
                  className="rounded-full bg-[#FF7A59]/10 px-2.5 py-0.5 text-xs font-medium text-[#FF7A59] hover:bg-[#FF7A59]/20 transition-colors"
                >
                  {tm('upgrade')}
                </Link>
              )}

              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                aria-label={t('userMenu')}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF7A59] text-sm font-medium text-white hover:bg-[#FF7A59]/90 transition-colors"
              >
                {avatarLetter}
              </button>

              {dropdownOpen && (
                <div role="menu" className="absolute right-0 top-full mt-2 w-48 rounded-[16px] bg-white py-2 shadow-soft border border-gray-100">
                  <div className="px-4 py-2 text-sm text-[#777777] truncate">
                    {user.name || user.email}
                  </div>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={handleLogout}
                    role="menuitem"
                    className="w-full px-4 py-2 text-left text-sm text-[#777777] hover:bg-gray-50 hover:text-[#FF7A59] transition-colors"
                  >
                    {t('logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* 未登录 — 登录 + 注册按钮 */
            <>
              <Link
                href={`/${lang}/auth/login`}
                className="text-sm font-medium text-[#777777] hover:text-[#2B2B2B] transition-colors"
              >
                {t('login')}
              </Link>
              <Link
                href={`/${lang}/auth/login`}
                className="rounded-[16px] bg-[#FF7A59] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#FF7A59]/90 transition-colors"
              >
                {t('signup')}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
