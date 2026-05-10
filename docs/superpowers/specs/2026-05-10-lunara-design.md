# Lunara — AI 情感关系咨询产品设计文档

> 创建日期：2026-05-10 | 版本：MVP v1 | 目标市场：欧美（英文）

---

## 一、产品定义

**产品名：** Lunara

**定位：** 年轻人的 AI 情绪关系空间 —— 不是冷冰冰的工具，而是「这里有人理解我的情绪」。

**目标用户：** 18-30 岁恋爱群体，优先女性用户。

**四位 AI 专家：**

| 颜色 | 名字 | 称号 | 擅长 | 风格 |
|------|------|------|------|------|
| 🟦 | Evan Pierce | The Relationship Stabilizer | 建立安全感、降低冲突、沟通优化、情绪稳定 | calm, rational, structured |
| 🟩 | Liam Hart | The Relationship Gardener | 日常维护、情绪润滑、防微杜渐 | warm, supportive, gentle |
| 🟨 | Noah Sinclair | The Attraction Strategist | 吸引力提升、暧昧推进、关系升温 | insightful, playful, sharp |
| 🟥 | Dr. Adrian Cole | The Intervention Specialist | 冷战修复、危机处理、信任修复、挽回策略 | clinical-empathetic, structured |

**核心理念：** 人格 > 功能。用户信任的是 "Coach"，而不是 "Feature"。

---

## 二、技术架构

### 技术栈

| 层 | 选择 | 原因 |
|----|------|------|
| 全栈框架 | Next.js (App Router) | SSR+CSR 混合，SEO 友好，Vercel 原生支持 |
| 样式 | TailwindCSS + shadcn/ui | 与已有选型一致，组件丰富 |
| 动效 | Framer Motion | 微浮动、柔和过渡 |
| LLM | DeepSeek API | 兼容 OpenAI 格式，性价比高 |
| 后端/数据库 | Supabase (Auth + PostgreSQL) | Auth 与 DB 一体，轻量运维 |
| 部署 | Vercel | GitHub 联动，一条命令部署 |
| 语言 | TypeScript strict | 全量类型安全 |
| 国际化 | next-intl | App Router 原生支持，Vercel 推荐 |

### 多语言系统

使用 next-intl，通过 URL 子路径区分语言：

| 语言 | 默认路径 |
|------|----------|
| English | `/en` |
| 中文 | `/zh` |

**语言检测优先级：** URL 路径 > 手动切换 (Cookie) > Accept-Language 请求头 > 默认英文。

**翻译内容覆盖：**
- UI 文案（按钮、标签、错误提示）→ next-intl 字典
- 落地页静态内容（Hero、案例、技巧）→ 翻译 JSON 文件
- 四位专家 System Prompt → 每位专家 × 2 套语言 Prompt
- AI 回复语言 → System Prompt 中约束 `Reply in {language}`
- 数据库对话标题 → 存原始值，不翻译

**翻译文件结构：**
```
messages/
├── en.json      ← 英文 UI 文案
└── zh.json      ← 中文 UI 文案
```

### 架构图

```
┌─────────────────────────────────────────────────────┐
│                    Vercel (Deploy)                   │
│  ┌───────────────────────────────────────────────┐  │
│  │              Next.js App Router                │  │
│  │                                                │  │
│  │  /[lang]/ (Landing)       /[lang]/chat/[expert] │  │
│  │  Server Components        Client Components    │  │
│  │                                                │  │
│  │  /api/chat          /api/conversations/*       │  │
│  │  (DeepSeek proxy)   (CRUD)                     │  │
│  └───────────────────────────────────────────────┘  │
│         │                    │                       │
│         ▼                    ▼                       │
│  ┌──────────────┐   ┌─────────────────┐             │
│  │  DeepSeek API │   │    Supabase     │             │
│  │  (LLM 推理)   │   │  (Auth + DB)    │             │
│  └──────────────┘   └─────────────────┘             │
└─────────────────────────────────────────────────────┘
```

### AI 模式

- **默认专家：** 进入对话页默认 Liam Hart（最通用的情感顾问），降低用户启动门槛。
- **专家切换：** 用户点击对话区顶部专家标签，弹出选择面板。切换时触发 AI 请求：
  - 有对话历史 → 新专家打招呼 + 总结已聊内容 + 引导继续对话
  - 无对话历史 → 新专家默认欢迎语（自我介绍 + 建议话题）
- 四位专家共用 DeepSeek 模型，通过不同 System Prompt 切换人格。

---

## 三、数据库模型

```sql
-- 用户扩展信息 (auth.users 由 Supabase Auth 自动管理)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  nickname    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 对话会话
CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) NOT NULL,
  expert      TEXT NOT NULL CHECK (expert IN ('evan', 'liam', 'noah', 'adrian')),
  language    TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'zh')),
  title       TEXT DEFAULT 'New Conversation',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 消息
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_conversations_user ON conversations(user_id, updated_at DESC);
CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at ASC);
```

RLS 策略确保用户只能访问自己的数据。

---

## 四、页面与组件设计

### 落地页 (`/[lang]`)  lang ∈ {en, zh}

Server Component 渲染。信息结构从上到下：

| 模块 | 组件 | 说明 |
|------|------|------|
| Hero | `<Hero />` | Badge + 标题 + 副标题 + CTA → `/[lang]/chat` |
| 专家展示 | `<ExpertSection />` + 4× `<ExpertCard />` | 头像、颜色、名字、称号、描述、入口按钮 |
| 问题案例 | `<CaseStudies />` | 常见情感问题卡片，点击跳转对话并预填 |
| 用户评价 | `<Testimonials />` | 3-5 条评价卡片 |
| 实践技巧 | `<TipsSection />` | 柔和卡片，可关闭 |
| 问答 | `<FAQ />` | shadcn/ui Accordion |
| 页脚 | `<Footer />` | 链接 + 隐私声明 |

### AI 对话页 (`/[lang]/chat/[expert]`)

Client Components。布局：左历史侧边栏 + 中对话区。进入对话默认 Liam Hart。

| 组件 | 说明 |
|------|------|
| `<ChatSidebar />` | 可折叠，历史对话列表（按专家分组），新建/搜索/删除 |
| `<ChatHeader />` | 专家头像+名称、专家切换标签（点击弹出选择面板）、暗色模式切换、语言切换 |
| `<ExpertSwitchPanel />` | 弹出面板，展示四位专家卡片，点击触发 AI 切换流程 |
| `<MessageList />` | 消息列表，首次进入显示 WelcomeCard |
| `<WelcomeCard />` | 当前专家自我介绍 + 3 个建议问题（根据语言动态显示） |
| `<MessageBubble />` | 消息气泡，assistant 侧打字动画 |
| `<ChatInput />` | 大圆角输入框 + 专家下拉选择器 + 发送按钮 |

### 路由说明

| 路径 | 说明 |
|------|------|
| `/[lang]` | 落地页，`lang` ∈ {en, zh} |
| `/[lang]/chat/[expert]` | 指定专家的对话页，默认 Lia​m Hart |
| `/` | 自动检测浏览器语言，302 重定向至 `/en` 或 `/zh` |

### 关键交互

- 点击 ExpertCard → `/[lang]/chat/[expert]`
- 点击 CaseStudy → `/[lang]/chat/liam` 并预填问题
- 专家切换 → 弹出 ExpertSwitchPanel，确认后 AI 执行切换流程，URL 同步更新
- 切换流程：有历史 → 新专家打招呼+总结+引导；无历史 → 新专家欢迎语
- 首次进入无历史 → 显示当前专家 WelcomeCard

---

## 五、API 设计

### 路由表

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | 对话（SSE 流式返回） |
| GET | `/api/conversations` | 获取用户对话列表 |
| POST | `/api/conversations` | 创建新对话 |
| GET | `/api/conversations/[id]` | 获取对话消息 |
| DELETE | `/api/conversations/[id]` | 删除对话 |
| PATCH | `/api/conversations/[id]/title` | 修改对话标题 |

### `POST /api/chat` 流程

1. 验证 Supabase JWT
2. 根据 `expert` 参数选择对应 System Prompt（含语言约束）
3. 根据 `lang` 参数约束 AI 回复语言
4. 调用 DeepSeek `/v1/chat/completions`，`stream: true`
5. SSE 透传至前端
6. 流结束后，将完整消息对写入 `messages` 表

### System Prompt 关键结构

每个专家 Prompt 包含：名字、人设 (Persona)、风格约束 (Style)、擅长领域 (Focus)、行为边界 (Guardrails)、回复语言约束 (`Reply in {language}`)。
每位专家配置英文和中文两套 Prompt。

### 专家切换 API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat/switch` | 切换专家，返回 AI 生成的过渡消息（打招呼+总结+引导） |

请求体：`{ conversation_id, new_expert, language }`
若对话无历史，返回新专家默认欢迎语。

### 安全策略

| 层面 | 措施 |
|------|------|
| 认证 | API 路由验证 Supabase JWT |
| 限流 | 每分钟 10 条消息 |
| 数据隔离 | RLS + API 双重校验 user_id |
| Key 保护 | DeepSeek API Key 仅存服务端环境变量 |

---

## 六、设计系统

### 配色

| 角色 | 色值 | 用途 |
|------|------|------|
| 主色 (Primary) | `#FF7A59` | 温暖、情绪连接 |
| 背景色 | `#FAF7F2` | 奶油白、柔和 |
| 卡片色 | `#FFFFFF` | 表面容器 |
| 辅助色 | `#B8C0FF` | 情绪氛围、高级感 |
| 主文字 | `#2B2B2B` | 正文 |
| 次级文字 | `#777777` | 辅助信息 |

### 圆角

| 元素 | 圆角 |
|------|------|
| 按钮 | 16px |
| 卡片 | 24px |
| 输入框 | 18px |
| 大容器 | 32px |

### 阴影

```css
box-shadow: 0 10px 40px rgba(0,0,0,0.06);
```

不用重阴影、强发光。

### 字体

- 英文：Inter / SF Pro Display
- 中文：PingFang SC / HarmonyOS Sans

### 动效

推荐：微漂浮、柔和渐变、hover 缩放、透明度过渡。
不推荐：夸张 3D、强霓虹、大面积动画。

---

## 七、错误与边界状态

| 状态 | 组件 | 表现 |
|------|------|------|
| 加载中 | ChatSidebar | 骨架屏（3 条灰色块） |
| 加载中 | MessageList | 柔和闪烁 loading |
| 加载中 | 发送按钮 | 变为 spinner |
| 空状态 | 对话列表 | "No conversations yet. Start talking." |
| 空状态 | 消息区（新对话） | WelcomeCard |
| API 错误 | 消息区 | 错误提示 + 重试按钮 |
| 网络断开 | 全局 | Toast "Connection lost. Reconnecting..." |
| 限流 | 输入框 | "Sending too fast. Take a breath." 禁用 3 秒 |
| 404 | 对话页 | "Conversation not found" + 返回 |
| 500 | 全站 | ErrorBoundary 友好错误页 |

---

## 八、测试策略

| 层级 | 工具 | 覆盖 |
|------|------|------|
| 类型检查 | TypeScript strict | 全量 |
| 单元测试 | Vitest | API handlers, utils |
| 组件测试 | Vitest + Testing Library | 输入、发送、切换专家 |
| E2E | Playwright | 核心流程：落地页 → 注册 → 对话 → 切换专家 |

---

## 九、MVP 不做的

- 离线缓存/离线聊天
- 消息编辑/删除/重发
- 对话分享
- 用户头像上传
- 数据分析/埋点
- 管理后台
- 邮件通知

---

## 十、冲突解决规则

当 `star1-relation.md` 与 `star1-relation-ui.md` 存在冲突时，以 `star1-relation.md` 为准。
