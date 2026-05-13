// ============================================================
// components/chat/MessageList.tsx — 消息列表组件
// ============================================================
// 客户端组件：
//   - 渲染消息列表：空时显示 WelcomeCard
//   - 智能滚动：仅在用户处于底部时自动滚动，否则显示提示按钮
//   - 支持 loadingHistory 骨架屏状态
// ============================================================

'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MessageBubble } from './MessageBubble';
import { WelcomeCard } from './WelcomeCard';

/** 消息项类型 */
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/** MessageList Props */
interface MessageListProps {
  messages: Message[];
  expert: string;
  onSuggestionClick?: (text: string) => void;
  subscriptionStatus?: { subscribed: boolean; trialUsed: number; trialLimit: number } | null;
  /** 加载历史消息中 */
  loadingHistory?: boolean;
}

/**
 * MessageList — 对话消息列表
 * 管理消息渲染、智能自动滚动和加载状态
 */
export function MessageList({
  messages,
  expert,
  onSuggestionClick,
  subscriptionStatus,
  loadingHistory = false,
}: MessageListProps) {
  const tp = useTranslations('pricing');
  const pathname = usePathname();
  const lang = pathname.startsWith('/zh') ? 'zh' : 'en';

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 用户是否在底部附近（距离底部 < 100px）
  const [isNearBottom, setIsNearBottom] = useState(true);
  // 是否有新消息到达且用户不在底部
  const [hasNewMessage, setHasNewMessage] = useState(false);

  // 监听滚动位置
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distFromBottom < 100;
    setIsNearBottom(nearBottom);
    if (nearBottom) {
      setHasNewMessage(false);
    }
  }, []);

  // 新消息到达时：在底部则自动滚，否则显示提示
  useEffect(() => {
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setHasNewMessage(true);
    }
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // 手动滚到底部
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setHasNewMessage(false);
  };

  // 加载骨架屏
  if (loadingHistory) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div
                className="animate-pulse rounded-[18px] bg-gray-100"
                style={{
                  width: `${140 + i * 40}px`,
                  height: `${48 + i * 8}px`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 空消息 → 欢迎卡片
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center overflow-y-auto">
        <WelcomeCard
          expert={expert}
          onSuggestionClick={(text) => onSuggestionClick?.(text)}
        />
      </div>
    );
  }

  // 渲染消息列表
  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="relative flex-1 overflow-y-auto px-4 py-6"
    >
      {messages.map((msg, index) => (
        <MessageBubble key={index} role={msg.role} content={msg.content} />
      ))}

      {/* 试用横幅 */}
      {subscriptionStatus && !subscriptionStatus.subscribed && subscriptionStatus.trialUsed < subscriptionStatus.trialLimit && (
        <div className="mx-4 mt-3 rounded-[12px] bg-[#FF7A59]/5 border border-[#FF7A59]/20 px-4 py-3 text-center lg:mx-6">
          <span className="text-sm text-text-secondary">
            {tp('trialBanner', { used: subscriptionStatus.trialUsed, limit: subscriptionStatus.trialLimit })}
          </span>
          <Link
            href={`/${lang}/pricing`}
            className="ml-1 text-sm font-medium text-[#FF7A59] hover:underline"
          >
            {tp('trialLink')}
          </Link>
        </div>
      )}

      {/* 滚动锚点 */}
      <div ref={bottomRef} />

      {/* 新消息浮动按钮 — 用户不在底部时显示 */}
      {hasNewMessage && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="fixed bottom-28 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-full bg-[#FF7A59] px-4 py-2 text-xs font-medium text-white shadow-lg transition-all hover:bg-[#FF7A59]/90 animate-bounce cursor-pointer touch-manipulation"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          New messages
        </button>
      )}
    </div>
  );
}
