# AI 对话页 MVP 完善 — 设计规格

**日期:** 2026-05-13
**状态:** 已确认
**范围:** 8 项体验修复，不改架构

---

## 一、概述

对 AI 对话页面进行 MVP 阶段体验完善，解决 4 个体验阻断级问题 + 4 个体验打磨级问题。数据流、API 接口签名、数据库 Schema 均不变。

## 二、改动文件清单

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `app/[lang]/chat/[expert]/page.tsx` | 修改 | 停止生成、冷却倒计时、加载过渡、错误处理一致性 |
| `components/chat/ChatInput.tsx` | 修改 | 发送/停止按钮切换 |
| `components/chat/MessageList.tsx` | 修改 | 智能滚动 |
| `components/chat/MessageBubble.tsx` | 修改 | Markdown 渲染 |
| `components/chat/ChatSidebar.tsx` | 修改 | 删除对话按钮 |
| `components/common/NavbarClient.tsx` | 修改 | Start Chat 链接目标 |
| `app/api/chat/route.ts` | 修改 | Retry-After 响应头 |
| `package.json` | 修改 | 添加 react-markdown, remark-gfm |

## 三、逐项设计

### 1. 停止生成按钮

**ChatInput.tsx:**
- 新增 props: `generating: boolean`, `onStop: () => void`
- `generating=true` 时发送按钮替换为红色 ▢ 停止按钮
- 点击停止按钮触发 `onStop`

**page.tsx:**
- 新增 `abortControllerRef = useRef<AbortController | null>(null)`
- `handleSend` 开始时创建 AbortController，fetch 传入 signal
- `handleStop` 调用 abort，关闭 SSE reader
- 将 `sending` 传给 ChatInput 的 `generating`

### 2. 智能滚动

**MessageList.tsx:**
- `useRef` 追踪用户是否在底部（距离底部 > 100px 视为离开）
- 监听 scroll 事件判断位置
- 仅当用户在底部时自动 scrollIntoView
- 用户不在底部时显示浮动「↓ 新消息」按钮

### 3. 侧边栏删除对话

**ChatSidebar.tsx:**
- 每项对话悬停时右侧显示删除按钮（✕）
- 点击后 `window.confirm` 确认
- 确认后 `DELETE /api/conversations/[id]` → 刷新列表

### 4. Navbar 链接修正

**NavbarClient.tsx:**
- "Start Chat" 链接从 `/${lang}/chat/liam` 改为 `/${lang}/chat`
- `/chat` 页已有重定向逻辑 → `/chat/liam`

### 5. 限流冷却倒计时

**route.ts:**
- 429 响应添加 `Retry-After` 头（计算剩余秒数）

**page.tsx:**
- 新增 `retryAfter` 状态（秒数）
- 429 时读取 Retry-After 头，启动倒计时
- 错误横幅显示剩余秒数，重试按钮在倒计时结束后启用

### 6. Markdown 渲染

**安装:** `react-markdown` + `remark-gfm`

**MessageBubble.tsx:**
- AI 消息 (`role === 'assistant'`) 使用 ReactMarkdown 渲染
- 用户消息保持纯文本
- 气泡内使用 prose 样式限制

### 7. 402/429 错误处理一致性

**page.tsx:**
- 统一行为：402 也回滚乐观更新的用户消息
- 在消息列表末尾添加系统 assistant 提示消息

### 8. 会话切换加载过渡

**page.tsx:**
- 切换会话时设置 `loadingHistory = true`
- 加载完成后 `loadingHistory = false`
- MessageList 在 loadingHistory 时显示骨架屏

## 四、不变部分

- 组件树结构不变
- API 路由接口签名不变
- 数据流方向不变
- 数据库 Schema 不变
- 不拆解 ChatPageClient（MVP 阶段接受当前结构）

## 五、测试要点

- [ ] 发送消息后点击停止按钮，生成中断，最后一条 AI 消息保留已生成内容
- [ ] 向上滚动历史后收到新消息，不自动滚到底部，显示「新消息」按钮
- [ ] 删除对话后侧边栏列表即时更新
- [ ] 限流时显示倒计时，归零前重试按钮不可用
- [ ] AI 回复中的 Markdown 格式（列表、粗体、链接）正确渲染
- [ ] 试用耗尽时用户消息被回滚，显示订阅提示
- [ ] 切换会话时显示加载过渡而非白屏
- [ ] Navbar "Start Chat" 正常跳转到聊天页
