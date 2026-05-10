// ============================================================
// /[lang]/chat/[expert]/page.tsx — 对话页核心组件
// ============================================================
// 客户端组件，负责整个对话页的编排：
//   - 解析 URL 参数（lang、expert）和查询参数（c=conversation_id、q=预填问题）
//   - 管理移动端侧边栏开关状态（sidebarOpen）
//   - 管理错误状态（error）和限流错误（rateLimited）
//   - 管理专家切换面板的开关状态
//   - 管理消息列表状态
//   - handleSend：发送消息 → POST /api/chat → SSE 流式读取
//   - handleSwitchExpert：切换专家 → POST /api/chat/switch
//   - 布局：ChatSidebar | ChatHeader + MessageList + ChatInput | ExpertSwitchPanel
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ExpertSwitchPanel } from '@/components/chat/ExpertSwitchPanel';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';

/** 消息项类型 */
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * ChatPageClient — 对话页主组件
 * 组合所有聊天子组件，管理对话状态和数据流
 */
export default function ChatPageClient() {
  // ---------- URL 参数 ----------
  const params = useParams<{ lang: string; expert: string }>();
  const searchParams = useSearchParams();

  // ---------- UI 状态 ----------
  const [sidebarOpen, setSidebarOpen] = useState(false); // 移动端侧边栏开关
  const [expertPanelOpen, setExpertPanelOpen] = useState(false);
  const [currentExpert, setCurrentExpert] = useState(params.expert || 'liam');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(
    searchParams.get('c'),
  );
  // 错误状态管理
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [sending, setSending] = useState(false);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  // ---------- 处理 URL 预填问题 ----------
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      handleSend(q);
    }
    // 仅在组件挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- 发送消息 ----------
  const handleSend = useCallback(
    async (message: string) => {
      if (!message.trim() || sending) return;

      // 清除之前的错误状态
      setError(null);
      setRateLimited(false);
      setSending(true);

      // 立即将用户消息添加到列表（乐观更新）
      const userMsg: ChatMessage = { role: 'user', content: message };
      setMessages((prev) => [...prev, userMsg]);

      try {
        // 调用 SSE 流式对话 API
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: conversationId,
            expert: currentExpert,
            message,
            language: params.lang,
          }),
        });

        // 限流错误特殊处理（429 Too Many Requests）
        if (res.status === 429) {
          setRateLimited(true);
          setError('发送太快了，请稍等片刻再试。'); // Sending too fast
          // 移除已添加的用户消息（乐观更新回滚）
          setMessages((prev) => prev.filter((m) => m !== userMsg));
          return;
        }

        if (!res.ok) {
          // 其他 API 错误处理 — 显示错误消息
          const errData = await res.json().catch(() => ({
            error: 'Unknown error',
          }));
          const errMsg =
            errData.error || 'Something went wrong. Please try again.';
          setError(errMsg);
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: errMsg,
            },
          ]);
          return;
        }

        // 读取 SSE 流
        const reader = res.body?.getReader();
        if (!reader) {
          const errMsg = 'Failed to connect to chat service.';
          setError(errMsg);
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: errMsg },
          ]);
          return;
        }

        const decoder = new TextDecoder();
        let aiContent = '';

        // 立即添加一个空的 AI 消息占位（用于流式更新）
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

        // 循环读取 SSE 流数据
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

          for (const line of lines) {
            const data = line.slice(6); // 去掉 "data: " 前缀
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              // 处理 conversation_id — 服务端通过 SSE 首条事件返回
              if (parsed.conversation_id) {
                setConversationId(parsed.conversation_id);
                setSidebarRefreshKey((k) => k + 1); // 触发侧边栏刷新
                continue;
              }
              if (parsed.content) {
                aiContent += parsed.content;
                // 更新最后一条 AI 消息的内容
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: aiContent,
                  };
                  return updated;
                });
              }
              if (parsed.error) {
                const streamErr = `Error: ${parsed.error}`;
                setError(streamErr);
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: streamErr,
                  };
                  return updated;
                });
              }
            } catch {
              // 跳过无法解析的行
            }
          }
        }
      } catch (err) {
        console.error('Chat send error:', err);
        const netErr = '网络错误，请检查连接后重试。';
        setError(netErr);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: netErr },
        ]);
      } finally {
        setSending(false);
      }
    },
    [conversationId, currentExpert, params.lang, sending],
  );

  // ---------- 切换专家 ----------
  const handleSwitchExpert = async (newExpert: string) => {
    // 清除错误状态
    setError(null);
    setRateLimited(false);

    // 关闭面板
    setExpertPanelOpen(false);

    // 如果没有对话 ID，直接切换并清空消息（新对话）
    if (!conversationId) {
      setCurrentExpert(newExpert);
      setMessages([]);
      return;
    }

    // 有对话 ID → 调用切换 API 获取过渡消息
    try {
      const res = await fetch('/api/chat/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          new_expert: newExpert,
          language: params.lang,
        }),
      });

      if (!res.ok) {
        // 降级：直接切换专家
        setCurrentExpert(newExpert);
        return;
      }

      const data = await res.json();
      setCurrentExpert(newExpert);

      // 添加 AI 过渡消息
      if (data.content) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.content },
        ]);
      }
    } catch (err) {
      console.error('Expert switch error:', err);
      setCurrentExpert(newExpert);
    }
  };

  // 清除错误并重试
  const handleClearError = () => {
    setError(null);
    setRateLimited(false);
  };

  // ---------- 渲染 ----------
  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* 左侧：对话列表侧边栏（含移动端抽屉支持） */}
      <ChatSidebar
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        refreshKey={sidebarRefreshKey}
      />

      {/* 右侧：主聊天区域 */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* 顶部导航栏 */}
        <ChatHeader
          onOpenExpertPanel={() => setExpertPanelOpen(true)}
          expert={currentExpert}
          onToggleSidebar={() => setSidebarOpen(true)}
        />

        {/* 错误提示横幅（非消息型错误，如网络错误、限流等） */}
        {error && (
          <div className="mx-4 mt-3 flex items-center gap-3 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 lg:mx-6">
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">
                {rateLimited ? '发送太快' : '出错了'}
              </p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
            <button
              type="button"
              onClick={handleClearError}
              className="flex-shrink-0 rounded-[8px] px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              关闭
            </button>
            {rateLimited && (
              <button
                type="button"
                onClick={() => {
                  handleClearError();
                  // 用户可以重新发送上一条用户消息
                }}
                className="flex-shrink-0 rounded-[8px] bg-[#FF7A59] px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[#FF7A59]/90"
              >
                重试
              </button>
            )}
          </div>
        )}

        {/* 消息列表（含欢迎卡片） */}
        <MessageList
          messages={messages}
          expert={currentExpert}
          onSuggestionClick={(text) => handleSend(text)}
        />

        {/* 底部输入区域 */}
        <ChatInput onSend={handleSend} />
      </div>

      {/* 专家切换浮动面板（条件渲染） */}
      {expertPanelOpen && (
        <ExpertSwitchPanel
          onSelect={handleSwitchExpert}
          onClose={() => setExpertPanelOpen(false)}
          currentExpert={currentExpert}
          lang={params.lang}
        />
      )}
    </div>
  );
}
