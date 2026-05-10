// ============================================================
// components/chat/ChatHeader.tsx — 聊天页顶部导航栏
// ============================================================
// 客户端组件，包含：
//   - 移动端汉堡菜单按钮（lg:hidden）
//   - 专家切换按钮（颜色圆点 + 名称 + ▾ 箭头）
//   - 语言切换按钮（/en ↔ /zh）
//   - 深色模式切换（☀️ / 🌙 toggle）
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EXPERT_META } from '@/lib/prompts/experts';
import type { ExpertId } from '@/lib/prompts/experts';

/** ChatHeader Props */
interface ChatHeaderProps {
  /** 打开专家选择面板的回调 */
  onOpenExpertPanel: () => void;
  /** 当前专家标识符 */
  expert: string;
  /** 移动端切换侧边栏的回调 */
  onToggleSidebar?: () => void;
}

/** 专家名称映射（简短显示名） */
const EXPERT_SHORT_NAMES: Record<string, string> = {
  evan: 'Evan',
  liam: 'Liam',
  noah: 'Noah',
  adrian: 'Adrian',
};

/**
 * ChatHeader — 聊天页顶部导航栏
 * 显示当前专家、语言切换和深色模式按钮
 * 移动端显示汉堡菜单按钮用于打开侧边栏
 */
export function ChatHeader({
  onOpenExpertPanel,
  expert,
  onToggleSidebar,
}: ChatHeaderProps) {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);

  // ---------- 初始化深色模式状态 ----------
  useEffect(() => {
    const hasDark = document.documentElement.classList.contains('dark');
    setIsDark(hasDark);
  }, []);

  // ---------- 切换深色模式 ----------
  const toggleDarkMode = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle('dark', newDark);
  };

  // ---------- 获取当前专家元数据 ----------
  const expertId = expert as ExpertId;
  const meta = EXPERT_META[expertId] || EXPERT_META.liam;
  const expertName = EXPERT_SHORT_NAMES[expertId] || expert;

  // ---------- 渲染 ----------
  return (
    <header className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 lg:px-6">
      {/* 左侧：汉堡菜单按钮（仅移动端） + 专家切换按钮 */}
      <div className="flex items-center gap-2">
        {/* 汉堡菜单按钮 — 仅移动端显示 */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-[8px] p-2 text-[#777777] transition-colors hover:bg-gray-100 lg:hidden"
          aria-label="Open sidebar menu"
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
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* 专家切换按钮 */}
        <button
          type="button"
          onClick={onOpenExpertPanel}
          className="flex items-center gap-2 rounded-[14px] border border-gray-200 bg-[#FAF7F2] px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-gray-100 lg:px-4"
        >
          {/* 专家颜色圆点 */}
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: meta.color }}
          />
          <span>{expertName}</span>
          {/* 下拉箭头指示 */}
          <svg
            className="ml-1 h-3 w-3 text-text-secondary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* 右侧：语言切换 + 深色模式 */}
      <div className="flex items-center gap-2">
        {/* 语言切换 */}
        <button
          type="button"
          onClick={() => {
            // 切换语言路径
            const currentPath = window.location.pathname;
            const newPath = currentPath.startsWith('/en')
              ? currentPath.replace('/en', '/zh')
              : currentPath.replace('/zh', '/en');
            router.push(newPath);
          }}
          className="rounded-[12px] border border-gray-200 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-gray-50"
        >
          EN / 中文
        </button>

        {/* 深色模式切换 */}
        <button
          type="button"
          onClick={toggleDarkMode}
          className="rounded-[12px] border border-gray-200 px-3 py-1.5 text-sm transition-colors hover:bg-gray-50"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
