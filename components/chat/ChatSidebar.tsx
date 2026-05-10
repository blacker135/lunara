// ============================================================
// components/chat/ChatSidebar.tsx — 对话列表侧边栏
// ============================================================
// 客户端组件，功能：
//   - 加载当前用户的对话列表（GET /api/conversations）
//   - 加载中：3 个骨架屏占位块
//   - 空状态："No conversations yet. Start talking."
//   - 对话列表：专家颜色圆点 + 标题 + 日期
//   - "New Chat" 按钮导航至 /[lang]/chat/liam
//   - 点击对话项导航至 /[lang]/chat/[expert]?c=[id]
//   - 移动端：通过 sidebarOpen prop 和 onClose 回调控制滑入/滑出
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { EXPERT_META } from '@/lib/prompts/experts';
import type { ExpertId } from '@/lib/prompts/experts';
import Link from 'next/link';

/** 对话项类型 */
interface ConversationItem {
  id: string;
  expert: string;
  title: string;
  updated_at: string;
}

/** ChatSidebar Props */
interface ChatSidebarProps {
  /** 移动端侧边栏开关状态 */
  sidebarOpen?: boolean;
  /** 移动端关闭侧边栏的回调 */
  onClose?: () => void;
}

/**
 * ChatSidebar — 侧边栏对话列表
 * 使用 useTranslations('chat') 获取翻译文本
 * 支持桌面端固定显示 + 移动端滑入抽屉
 */
export function ChatSidebar({ sidebarOpen = false, onClose }: ChatSidebarProps) {
  const t = useTranslations('chat');
  const router = useRouter();
  const pathname = usePathname();
  // 从当前路径中提取语言前缀（/en/... → en, /zh/... → zh）
  const lang = pathname.startsWith('/zh') ? 'zh' : 'en';
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ---------- 加载对话列表 ----------
  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/conversations');
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations || []);
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, []);

  // ---------- 格式化日期显示 ----------
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // 侧边栏左侧内容（桌面端和移动端共用样式）
  const sidebarContent = (
    <aside className="flex h-full w-72 flex-shrink-0 flex-col border-r border-gray-100 bg-white">
      {/* 移动端顶部：关闭按钮 */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 rounded-[8px] p-1.5 text-[#777777] transition-colors hover:bg-gray-100 lg:hidden"
        aria-label="Close sidebar"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* 顶部：新建对话按钮 */}
      <div className="border-b border-gray-100 px-4 py-4">
        <Link
          href={`/${lang}/chat/liam`}
          onClick={onClose}
          className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#FF7A59] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#FF7A59]/90"
        >
          <span className="text-lg leading-none">+</span>
          {t('newChat')}
        </Link>
      </div>

      {/* 对话列表区域 */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {/* 加载骨架屏 */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-[12px] bg-gray-100"
                style={{ height: `${48 + i * 4}px` }}
              />
            ))}
          </div>
        )}

        {/* 空状态 */}
        {!loading && conversations.length === 0 && (
          <div className="flex h-full items-center justify-center px-4">
            <p className="text-center text-sm text-text-secondary">
              {t('noConversations')}
            </p>
          </div>
        )}

        {/* 对话列表 */}
        {!loading && conversations.length > 0 && (
          <div className="space-y-1">
            {conversations.map((conv) => {
              const expert = (conv.expert || 'liam') as ExpertId;
              const meta = EXPERT_META[expert] || EXPERT_META.liam;

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => {
                    router.push(`/${lang}/chat/${expert}?c=${conv.id}`);
                    onClose?.();
                  }}
                  className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
                >
                  {/* 专家颜色圆点 */}
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                  {/* 标题和日期 */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {conv.title || 'New Conversation'}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {formatDate(conv.updated_at)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* 桌面端：始终可见的侧边栏 */}
      <div className="hidden lg:block">{sidebarContent}</div>

      {/* 移动端：滑入抽屉 + 背景蒙层 */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* 半透明背景蒙层 */}
          <div
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* 滑入抽屉 */}
          <div className="absolute inset-y-0 left-0 z-50 animate-slide-in-left">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
