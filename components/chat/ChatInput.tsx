// ============================================================
// components/chat/ChatInput.tsx — 消息输入框组件
// ============================================================
// 客户端组件：
//   - Form 表单，容器 rounded-[18px]、bg-[#FAF7F2]
//   - 输入框 placeholder 来自 chat.inputPlaceholder
//   - 提交按钮：rounded-full、bg-[#FF7A59]、↗ 图标、空内容时 disabled
//   - Enter 发送、Shift+Enter 换行
// ============================================================

'use client';

import { useState, FormEvent, KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';

/** ChatInput Props */
interface ChatInputProps {
  /** 发送消息回调 */
  onSend: (message: string) => void;
  /** 禁用发送（内容生成中） */
  disabled?: boolean;
  /** AI 正在生成中 */
  generating?: boolean;
  /** 停止生成回调 */
  onStop?: () => void;
}

/**
 * ChatInput — 聊天消息输入区域
 * 底部固定区域，包含输入框和发送按钮
 */
export function ChatInput({ onSend, disabled = false, generating = false, onStop }: ChatInputProps) {
  const t = useTranslations('chat');
  const [input, setInput] = useState('');

  // ---------- 提交处理 ----------
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    const trimmed = input.trim();
    if (!trimmed) return;

    onSend(trimmed);
    setInput('');
  };

  // ---------- 键盘事件：Enter 发送，Shift+Enter 换行 ----------
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (disabled) return;
      const trimmed = input.trim();
      if (!trimmed) return;
      onSend(trimmed);
      setInput('');
    }
  };

  // ---------- 渲染 ----------
  return (
    <div className="border-t border-gray-100 bg-white px-3 sm:px-4 py-3 pb-[env(safe-area-inset-bottom,12px)]">
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 sm:gap-3 rounded-[14px] sm:rounded-[18px] bg-[#FAF7F2] px-3 sm:px-4 py-2.5 sm:py-3"
      >
        {/* 消息输入框 — 自适应高度 textarea */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('inputPlaceholder')}
          rows={1}
          className="flex-1 resize-none bg-transparent text-[16px] leading-relaxed text-text-primary placeholder-gray-400 outline-none touch-manipulation"
          style={{ maxHeight: '120px' }}
          onInput={(e) => {
            // 自动调整高度
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
          }}
        />

        {/* 发送 / 停止按钮 */}
        {generating ? (
          <button
            type="button"
            onClick={onStop}
            className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-white transition-all hover:bg-red-600 cursor-pointer touch-manipulation"
            aria-label="Stop generating"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-full bg-[#FF7A59] text-white transition-all hover:bg-[#FF7A59]/90 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer touch-manipulation"
            aria-label={t('send')}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 19V5m0 0l-7 7m7-7l7 7"
              />
            </svg>
          </button>
        )}
      </form>
    </div>
  );
}
