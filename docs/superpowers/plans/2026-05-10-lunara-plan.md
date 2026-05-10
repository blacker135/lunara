# Lunara MVP 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 Lunara AI 情感关系咨询产品 MVP —— 落地页 + 四位 AI 专家对话系统，中英双语，部署到 Vercel。

**Architecture:** Next.js App Router 全栈应用，`/[lang]` 国际化路由，落地页 SSR 渲染，对话页 CSR 客户端组件。Supabase 处理 Auth + 数据存储，DeepSeek API 驱动 AI 对话（SSE 流式）。TailwindCSS + shadcn/ui + Framer Motion 实现温柔治愈系 UI。

**Tech Stack:** Next.js 15, TypeScript strict, TailwindCSS, shadcn/ui, Framer Motion, next-intl, Supabase (Auth + DB), DeepSeek API, Vitest, Playwright

---

### Task 1: 项目脚手架

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `.env.local.example`
- Create: `app/globals.css`
- Create: `app/layout.tsx`
- Create: `scripts/dev.sh`

- [ ] **Step 1: 初始化 package.json**

```bash
cd /home/ml/project/ai/mvp/star1-relation && npm init -y
```

- [ ] **Step 2: 安装依赖**

```bash
npm install next react react-dom
npm install -D typescript @types/react @types/node tailwindcss postcss autoprefixer
npm install next-intl framer-motion @supabase/supabase-js @supabase/ssr
npm install -D vitest @testing-library/react @testing-library/jest-dom @playwright/test
npm install openai  # DeepSeek 兼容 OpenAI SDK
```

- [ ] **Step 3: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: 创建 next.config.ts**

```typescript
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 5: 创建 postcss.config.mjs**

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
export default config;
```

- [ ] **Step 6: 创建 tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./components/**/*.{ts,tsx}', './app/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#FF7A59',
        background: '#FAF7F2',
        surface: '#FFFFFF',
        accent: '#B8C0FF',
        'text-primary': '#2B2B2B',
        'text-secondary': '#777777',
        expert: {
          evan: '#4A90D9',
          liam: '#5BA88C',
          noah: '#D4A843',
          adrian: '#C45C5C',
        },
      },
      borderRadius: {
        btn: '16px',
        card: '24px',
        input: '18px',
        container: '32px',
      },
      boxShadow: {
        soft: '0 10px 40px rgba(0,0,0,0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'PingFang SC', 'HarmonyOS Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 7: 创建 app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: #FAF7F2;
    --surface: #FFFFFF;
    --primary: #FF7A59;
    --accent: #B8C0FF;
    --text-primary: #2B2B2B;
    --text-secondary: #777777;
  }

  .dark {
    --background: #1A1A2E;
    --surface: #2D2D44;
    --text-primary: #E0E0E0;
    --text-secondary: #999999;
  }

  body {
    background-color: var(--background);
    color: var(--text-primary);
    font-family: 'Inter', 'SF Pro Display', 'PingFang SC', sans-serif;
  }
}

@layer utilities {
  .text-balance { text-wrap: balance; }
  .bg-soft { background-color: var(--background); }
  .bg-surface { background-color: var(--surface); }
}
```

- [ ] **Step 8: 创建 app/layout.tsx (根布局)**

```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lunara — AI Emotional Guidance',
  description: 'AI emotional guidance for modern relationships. Talk with experts who understand.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-soft antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 9: 创建 .env.local.example**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# DeepSeek
DEEPSEEK_API_KEY=sk-your-deepseek-key
DEEPSEEK_BASE_URL=https://api.deepseek.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 10: 创建 scripts/dev.sh**

```bash
#!/bin/bash
set -e
echo "Starting Lunara dev server..."
cd "$(dirname "$0")/.."
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo "Created .env.local from template — please fill in your keys."
fi
npx next dev
```

```bash
chmod +x scripts/dev.sh
```

- [ ] **Step 11: 验证**

```bash
npm run dev  # 应能启动，虽然页面可能报错（缺 i18n 配置）
```

- [ ] **Step 12: Commit**

```bash
git add package.json tsconfig.json next.config.ts tailwind.config.ts postcss.config.mjs .env.local.example app/globals.css app/layout.tsx scripts/dev.sh
git commit -m "chore: scaffold Next.js project with TailwindCSS and configs"
```

---

### Task 2: next-intl 国际化配置

**Files:**
- Create: `i18n/request.ts`
- Create: `i18n/routing.ts`
- Create: `app/[lang]/layout.tsx`
- Create: `app/[lang]/page.tsx`
- Create: `app/page.tsx`
- Create: `messages/en.json`
- Create: `messages/zh.json`
- Modify: `app/layout.tsx`

- [ ] **Step 1: 创建 i18n/routing.ts**

```typescript
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  localeDetection: true,
  localePrefix: 'always',
});
```

- [ ] **Step 2: 创建 i18n/request.ts**

```typescript
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as 'en' | 'zh')) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 3: 创建 messages/en.json (英文 UI 文案)**

```json
{
  "meta": {
    "title": "Lunara — AI Emotional Guidance for Modern Relationships",
    "description": "Talk with AI relationship experts. Ask about love, communication, anxiety, attachment, or connection — anonymously and safely."
  },
  "hero": {
    "badge": "AI Emotional Guidance",
    "title": "Relationships are complicated. You don't have to figure them out alone.",
    "subtitle": "AI emotional guidance for modern relationships. Ask anything about love, communication, anxiety, attachment, or connection.",
    "cta": "Talk with Liam",
    "ctaSubtext": "Start anonymously, free"
  },
  "nav": {
    "experts": "Experts",
    "questions": "Common Questions",
    "testimonials": "Testimonials",
    "faq": "FAQ"
  },
  "experts": {
    "title": "The Relationship Advisory Circle",
    "subtitle": "Meet the four experts who guide you through every stage of love",
    "evan": {
      "name": "Evan Pierce",
      "title": "The Stabilizer",
      "description": "I help you find stability and security in your relationship.",
      "tagline": "Building foundations that last"
    },
    "liam": {
      "name": "Liam Hart",
      "title": "The Gardener",
      "description": "I make love feel easier and softer — one conversation at a time.",
      "tagline": "Nurturing connection every day"
    },
    "noah": {
      "name": "Noah Sinclair",
      "title": "The Strategist",
      "description": "I help you grow closer and keep the spark alive.",
      "tagline": "Deepen attraction with intention"
    },
    "adrian": {
      "name": "Dr. Adrian Cole",
      "title": "The Intervention Specialist",
      "description": "I guide you back to center when things feel like they're falling apart.",
      "tagline": "Clarity in crisis"
    }
  },
  "cases": {
    "title": "You're not alone in this",
    "subtitle": "Real questions. Real guidance.",
    "questions": {
      "distant": "Why does he suddenly become distant?",
      "overthinking": "How do I stop overthinking in relationships?",
      "dependent": "Am I emotionally dependent?",
      "signals": "How to read mixed signals?",
      "still_likes": "Does she still like me?",
      "trust": "How to rebuild trust after it's broken?"
    }
  },
  "testimonials": {
    "title": "What people are saying",
    "items": [
      { "text": "Liam helped me understand why I keep overthinking. It's like having a wise friend who truly listens.", "author": "Sarah" },
      { "text": "I was in a crisis and Dr. Cole helped me see things clearly for the first time.", "author": "James" },
      { "text": "Noah gave me the confidence to express what I actually feel. Things changed.", "author": "Emma" }
    ]
  },
  "tips": {
    "title": "Daily practices for better relationships",
    "items": [
      { "title": "The 3-second pause", "description": "Before reacting to something that upsets you, pause for three seconds. That small gap is where better choices live." },
      { "title": "'I feel' over 'You never'", "description": "Express your feelings with 'I' statements instead of accusations. 'I feel unheard' lands differently than 'You never listen.'" },
      { "title": "Weekly check-in ritual", "description": "Set aside 10 minutes each week to ask each other: What felt good this week? What felt hard? No defending, just listening." }
    ]
  },
  "faq": {
    "title": "Frequently asked questions",
    "items": [
      { "q": "What can I talk about?", "a": "Anything about love, relationships, communication, anxiety, attachment, mixed signals, or connection. There are no wrong questions." },
      { "q": "Is my conversation private?", "a": "Yes. Your conversations are anonymous by default and encrypted. We don't share your data with anyone." },
      { "q": "Do I need to pay?", "a": "Lunara is free during our early access period. We believe everyone deserves a space to talk about their relationships." },
      { "q": "How is this different from therapy?", "a": "Lunara offers emotional guidance and support — not clinical therapy. Think of it as a wise, non-judgmental friend who's always available." },
      { "q": "Can I switch experts?", "a": "Absolutely. You can switch between our four relationship experts anytime during a conversation." }
    ]
  },
  "footer": {
    "tagline": "Lunara — a space where someone understands your emotions.",
    "privacy": "Privacy Policy",
    "terms": "Terms of Service"
  },
  "chat": {
    "newChat": "New Chat",
    "search": "Search conversations...",
    "noConversations": "No conversations yet. Start talking.",
    "inputPlaceholder": "Talk about your feelings...",
    "send": "Send",
    "typing": "Thinking...",
    "error": "Something went wrong. Please try again.",
    "rateLimit": "Sending too fast. Take a breath.",
    "retry": "Retry",
    "notFound": "Conversation not found",
    "goBack": "Go back",
    "chooseExpert": "Choose your guide",
    "switchExpert": "Talk to someone else",
    "switchingExpert": "Switching guide...",
    "currentExpert": "Current"
  },
  "welcome": {
    "liam": {
      "greeting": "Hi, I'm Liam Hart",
      "role": "Your Relationship Gardener",
      "intro": "I'm here to help you make love feel easier and softer. Whether it's about communication, daily habits, or the small things that make relationships work — I've got you.",
      "suggestions": [
        "How do I bring up a difficult topic without starting a fight?",
        "Why do I feel disconnected even when everything seems fine?",
        "How can I be more present in my relationship?"
      ]
    },
    "evan": {
      "greeting": "Hi, I'm Evan Pierce",
      "role": "Your Relationship Stabilizer",
      "intro": "I help you build a foundation of security and trust. When things feel uncertain, we'll find steady ground together.",
      "suggestions": [
        "How do I build trust after being hurt before?",
        "What does healthy conflict look like?",
        "How do I feel more secure in a new relationship?"
      ]
    },
    "noah": {
      "greeting": "Hi, I'm Noah Sinclair",
      "role": "Your Attraction Strategist",
      "intro": "I help you deepen attraction and connection with intention. Whether you're starting something new or rekindling a spark — let's figure it out.",
      "suggestions": [
        "How do I keep the spark alive in a long-term relationship?",
        "How do I tell if the chemistry is mutual?",
        "What are the best ways to deepen emotional intimacy?"
      ]
    },
    "adrian": {
      "greeting": "Hi, I'm Dr. Adrian Cole",
      "role": "Your Intervention Specialist",
      "intro": "When things feel like they're falling apart, I help you think clearly. No judgment — just clarity, structure, and a path forward.",
      "suggestions": [
        "We've been fighting constantly. What now?",
        "How do I know if this relationship can be saved?",
        "How do I rebuild trust after a major breach?"
      ]
    }
  }
}
```

- [ ] **Step 4: 创建 messages/zh.json (中文 UI 文案)**

```json
{
  "meta": {
    "title": "Lunara — 现代情感的 AI 指引",
    "description": "与 AI 情感专家对话。匿名、安全地探讨爱情、沟通、焦虑、依恋和连接。"
  },
  "hero": {
    "badge": "AI 情感指引",
    "title": "感情很复杂。你不需要一个人面对。",
    "subtitle": "为现代关系打造的 AI 情感指引。你可以问任何关于爱情、沟通、焦虑、依恋或连接的问题。",
    "cta": "和 Liam 聊聊",
    "ctaSubtext": "匿名开始，完全免费"
  },
  "nav": {
    "experts": "专家团队",
    "questions": "常见问题",
    "testimonials": "用户心声",
    "faq": "常见疑问"
  },
  "experts": {
    "title": "情感顾问团",
    "subtitle": "四位专家，陪伴你走过感情的每一个阶段",
    "evan": {
      "name": "Evan Pierce",
      "title": "稳定者",
      "description": "我帮助你建立关系中的安全感和稳定性。",
      "tagline": "为爱情打下坚实的地基"
    },
    "liam": {
      "name": "Liam Hart",
      "title": "园丁",
      "description": "我让爱变得更轻松、更柔软——每次对话都是一次温柔的滋养。",
      "tagline": "在日常生活中培育连接"
    },
    "noah": {
      "name": "Noah Sinclair",
      "title": "策略师",
      "description": "我帮助你拉近彼此的距离，让火花持续燃烧。",
      "tagline": "用意图加深吸引"
    },
    "adrian": {
      "name": "Dr. Adrian Cole",
      "title": "干预专家",
      "description": "当一切似乎分崩离析时，我帮你找回清晰和方向。",
      "tagline": "危机中的清醒"
    }
  },
  "cases": {
    "title": "你并不孤单",
    "subtitle": "真实的问题，真正的指引",
    "questions": {
      "distant": "为什么他突然变得疏远了？",
      "overthinking": "怎样才能不在感情中过度思考？",
      "dependent": "我是否在情感上过度依赖？",
      "signals": "如何解读暧昧不明的信号？",
      "still_likes": "她还喜欢我吗？",
      "trust": "信任被破坏后如何重建？"
    }
  },
  "testimonials": {
    "title": "他们在说什么",
    "items": [
      { "text": "Liam 帮我理解了我为什么总是胡思乱想。就像有一个真正倾听你的智慧朋友。", "author": "小雯" },
      { "text": "我在危机中找到了 Dr. Cole，他让我第一次看清了事情的全貌。", "author": "志明" },
      { "text": "Noah 给了我表达真实感受的勇气。一切都不一样了。", "author": "Emma" }
    ]
  },
  "tips": {
    "title": "让关系更好的日常练习",
    "items": [
      { "title": "三秒停顿", "description": "在回应让你不安的事情之前，停顿三秒。那个小小的间隙，就是更好选择诞生的地方。" },
      { "title": "用「我」而不是「你总是」", "description": "用「我感到……」来表达感受，而不是指责。「我感到被忽略」和「你从来不关心我」是完全不同的。" },
      { "title": "每周 check-in", "description": "每周拿出十分钟，问问彼此：这周什么让你感到温暖？什么让你感到困难？只倾听，不辩解。" }
    ]
  },
  "faq": {
    "title": "常见问题",
    "items": [
      { "q": "我可以聊什么？", "a": "任何关于爱情、关系、沟通、焦虑、依恋、暧昧信号或连接的问题。没有错误的问题。" },
      { "q": "我的对话是私密的吗？", "a": "是的。默认匿名，对话加密存储。我们不会与任何人分享你的数据。" },
      { "q": "需要付费吗？", "a": "Lunara 在早期访问阶段完全免费。我们相信每个人都应该有一个可以谈论感情的空间。" },
      { "q": "这和心理咨询有什么不同？", "a": "Lunara 提供情感指导和支持——不是临床治疗。把它想象成一个永远在线、不带评判的智慧朋友。" },
      { "q": "我可以切换专家吗？", "a": "当然可以。你可以在对话过程中随时切换我们的四位情感专家。" }
    ]
  },
  "footer": {
    "tagline": "Lunara — 一个有人理解你情绪的空间。",
    "privacy": "隐私政策",
    "terms": "服务条款"
  },
  "chat": {
    "newChat": "新建对话",
    "search": "搜索对话...",
    "noConversations": "还没有对话记录。开始聊聊吧。",
    "inputPlaceholder": "聊聊你的感受...",
    "send": "发送",
    "typing": "思考中...",
    "error": "出了点问题，请重试。",
    "rateLimit": "发送太快了，深呼吸一下。",
    "retry": "重试",
    "notFound": "未找到对话",
    "goBack": "返回",
    "chooseExpert": "选择你的顾问",
    "switchExpert": "换一位顾问",
    "switchingExpert": "正在切换顾问...",
    "currentExpert": "当前"
  },
  "welcome": {
    "liam": {
      "greeting": "你好，我是 Liam Hart",
      "role": "你的情感园丁",
      "intro": "我来帮你让爱变得更轻松、更柔软。无论是关于沟通、日常习惯，还是那些让感情更舒服的小事——我都在这里。",
      "suggestions": [
        "如何在不引发争吵的情况下提出敏感话题？",
        "为什么一切看起来很正常，我却感到疏离？",
        "怎样才能在关系中更加活在当下？"
      ]
    },
    "evan": {
      "greeting": "你好，我是 Evan Pierce",
      "role": "你的情感稳定者",
      "intro": "我帮助你建立安全感和信任的基础。当一切感到不确定时，我们一起找到平稳的立足点。",
      "suggestions": [
        "过去的伤害之后，如何重新建立信任？",
        "健康的冲突是什么样的？",
        "如何在新关系中更有安全感？"
      ]
    },
    "noah": {
      "greeting": "你好，我是 Noah Sinclair",
      "role": "你的吸引策略师",
      "intro": "我帮助你有意识地加深吸引和连接。无论是刚开始一段关系还是想重燃火花——我们一起想办法。",
      "suggestions": [
        "如何在长期关系中保持新鲜感？",
        "如何判断彼此的化学反应是双向的？",
        "加深情感亲密度的最佳方式是什么？"
      ]
    },
    "adrian": {
      "greeting": "你好，我是 Dr. Adrian Cole",
      "role": "你的危机干预专家",
      "intro": "当一切似乎分崩离析时，我帮你保持清晰的思考。没有评判——只有清晰、结构化的思路和前行的方向。",
      "suggestions": [
        "我们一直在争吵，该怎么办？",
        "如何判断这段关系是否还能挽救？",
        "重大信任破裂后如何重建？"
      ]
    }
  }
}
```

- [ ] **Step 5: 创建 app/[lang]/layout.tsx (语言布局)**

```typescript
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return routing.locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return {
    title: 'Lunara — AI Emotional Guidance',
    description: 'AI emotional guidance for modern relationships.',
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!routing.locales.includes(lang as 'en' | 'zh')) notFound();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 6: 创建 app/page.tsx (根重定向)**

```typescript
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { routing } from '@/i18n/routing';

export default async function RootPage() {
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language') || '';
  const detected = acceptLanguage.startsWith('zh') ? 'zh' : routing.defaultLocale;
  redirect(`/${detected}`);
}
```

- [ ] **Step 7: 修改 app/layout.tsx (让根布局包裹 children 不做 i18n)**

```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lunara — AI Emotional Guidance',
  description: 'AI emotional guidance for modern relationships.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-soft antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add i18n/ messages/ app/[lang]/ app/page.tsx app/layout.tsx
git commit -m "feat: add next-intl i18n with en/zh routing and translation messages"
```

---

### Task 3: Supabase 数据库配置

**Files:**
- Create: `supabase/migrations/001_initial.sql`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`

- [ ] **Step 1: 创建数据库迁移文件 supabase/migrations/001_initial.sql**

```sql
-- 用户扩展 profile
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 对话会话
CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
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

-- RLS: profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS: conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

-- RLS: messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read messages of own conversations" ON messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversations WHERE id = messages.conversation_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can insert messages to own conversations" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM conversations WHERE id = messages.conversation_id AND user_id = auth.uid())
  );

-- 触发器：插入新 profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

- [ ] **Step 2: 创建 lib/supabase/client.ts (浏览器端)**

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 3: 创建 lib/supabase/server.ts (服务端)**

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
}
```

- [ ] **Step 4: 创建 lib/supabase/middleware.ts (认证中间件)**

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  await supabase.auth.getUser();
  return supabaseResponse;
}
```

- [ ] **Step 5: Commit**

```bash
git add supabase/ lib/supabase/
git commit -m "feat: add Supabase schema, RLS policies, and client libraries"
```

---

### Task 4: DeepSeek API 客户端 + 专家提示词

**Files:**
- Create: `lib/deepseek/client.ts`
- Create: `lib/prompts/experts.ts`

- [ ] **Step 1: 创建 lib/deepseek/client.ts**

```typescript
import OpenAI from 'openai';

export function createDeepSeekClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  });
}
```

- [ ] **Step 2: 创建 lib/prompts/experts.ts**

```typescript
type ExpertId = 'evan' | 'liam' | 'noah' | 'adrian';
type Language = 'en' | 'zh';

const BASE_PROMPTS: Record<ExpertId, Record<Language, string>> = {
  evan: {
    en: `You are Evan Pierce, The Relationship Stabilizer.
Your style is calm, rational, and structured.
Your focus areas: building emotional security, reducing conflict frequency, optimizing daily communication, emotional stability guidance.
Your tone: steady, reassuring, practical. You help people feel grounded.
Important guidelines:
- Always ground your advice in emotional safety and mutual respect.
- Never suggest extreme actions or ultimatums.
- Structure your responses clearly: acknowledge the feeling, provide perspective, suggest practical steps.
- If someone is in crisis, gently suggest they also speak with Dr. Adrian Cole.
- Reply in English.`,
    zh: `你是 Evan Pierce，情感稳定者。
你的风格：冷静、理性、结构化。
你的擅长领域：建立情感安全感、降低冲突频率、优化日常沟通、情绪稳定指导。
你的语调：稳重、让人安心、实用。你帮助人们找到内心的平稳。
重要准则：
- 所有建议必须建立在情感安全和相互尊重的基础上。
- 永远不要建议极端行为或最后通牒。
- 清晰结构化你的回复：先肯定感受，再提供视角，最后给出实际步骤。
- 如果对方处于危机中，温和地建议他们也和 Dr. Adrian Cole 聊聊。
- 用中文回复。`,
  },
  liam: {
    en: `You are Liam Hart, The Relationship Gardener.
Your style is warm, supportive, and gently coaching.
Your focus areas: daily relationship maintenance, emotional lubrication, preventing small issues from escalating, making relationships feel comfortable.
Your tone: like a caring friend who truly listens. You make people feel heard and understood.
Important guidelines:
- Lead with empathy. Always acknowledge the emotional experience before offering guidance.
- Keep advice practical and easy to apply in everyday life.
- Use warm, conversational language — avoid clinical or analytical tones.
- Remind people that relationships take care and attention, just like a garden.
- Reply in English.`,
    zh: `你是 Liam Hart，情感园丁。
你的风格：温暖、支持、温柔引导。
你的擅长领域：日常关系维护、情绪润滑、防止小问题升级、让关系更舒服。
你的语调：像一个真正倾听的、关心你的朋友。你让人们感到被听见、被理解。
重要准则：
- 以共情为先。在给出建议之前，总是先确认对方的情绪体验。
- 建议要实用，易于在日常生活中应用。
- 使用温暖、对话式的语言——避免临床或分析式的语调。
- 提醒人们关系需要像花园一样被呵护和关注。
- 用中文回复。`,
  },
  noah: {
    en: `You are Noah Sinclair, The Attraction Strategist.
Your style is insightful, slightly playful, and psychologically sharp.
Your focus areas: building attraction, navigating ambiguity, conversation strategy, designing relationship escalation.
Your tone: confident, perceptive, lightly charismatic. You read between the lines.
Important guidelines:
- Be perceptive about what people aren't saying directly.
- Offer strategic insights grounded in psychological understanding, not pickup tricks.
- Be confident but never manipulative. The goal is authentic connection.
- Encourage people to understand themselves better, not just the other person.
- Reply in English.`,
    zh: `你是 Noah Sinclair，吸引策略师。
你的风格：洞察力强、略带玩味、心理敏锐。
你的擅长领域：吸引力提升、暧昧推进、聊天策略、关系升温设计。
你的语调：自信、敏锐、略带魅力。你善于读懂言外之意。
重要准则：
- 敏锐地察觉人们没有直接说出口的事情。
- 提供基于心理学理解的策略洞察，而非搭讪技巧。
- 自信但绝不操纵。目标是真实的连接。
- 鼓励人们更好地理解自己，而不仅仅是对方。
- 用中文回复。`,
  },
  adrian: {
    en: `You are Dr. Adrian Cole, The Relationship Intervention Specialist.
Your style is clinical but empathetic, structured, and non-judgmental.
Your focus areas: cold war repair, breakup crisis management, trust breakdown analysis, rational recovery strategy.
Your tone: professional yet warm. You help people think clearly when emotions are overwhelming.
Important guidelines:
- Create immediate emotional safety. People coming to you are in pain.
- Structure is healing: help people organize chaotic thoughts into clear patterns.
- Never judge. People need to feel safe admitting difficult things.
- Distinguish between salvageable patterns and genuinely toxic dynamics.
- If someone describes abuse, clearly name it and direct them to professional help.
- Reply in English.`,
    zh: `你是 Dr. Adrian Cole，情感干预专家。
你的风格：临床而共情、结构化、不带评判。
你的擅长领域：冷战修复、分手危机处理、信任崩塌分析、理性挽回策略。
你的语调：专业而温暖。当情绪压倒一切时，你帮助人们保持清晰的思考。
重要准则：
- 首先建立情感安全感。来找你的人是带着伤痛来的。
- 结构本身就具有疗愈作用：帮助人们把混乱的思绪整理成清晰的模式。
- 永远不评判。人们需要感到安全才能说出困难的事情。
- 区分可挽救的模式和真正有毒的关系动态。
- 如果有人描述了虐待行为，清晰地指出并引导他们寻求专业帮助。
- 用中文回复。`,
  },
};

// 切换专家时用的过渡提示词
const SWITCH_PROMPT_EN = `You are {name}, {title}. 
You just joined this conversation as a new guide.

Context so far:
{context}

Please do the following:
1. Greet the user warmly in your unique style.
2. Briefly summarize what they've been discussing — show you've been paying attention.
3. Offer a gentle transition question to continue the conversation in your area of expertise.

Keep it concise — 3-4 sentences total. Do NOT use placeholders or labels like "1. 2. 3." — just speak naturally.`;

const SWITCH_PROMPT_ZH = `你是{name}，{title}。
你刚刚作为新的顾问加入了这场对话。

以下是此前的对话背景：
{context}

请完成以下内容：
1. 用你独特的风格温暖地打招呼。
2. 简要总结他们之前在讨论的内容——让他们感到你一直在倾听。
3. 提出一个温和的过渡问题，引导对话进入你擅长的领域。

保持简洁——总共 3-4 句话。不要使用 "1. 2. 3." 这样的标签——自然地说出来。`;

export function getExpertPrompt(expertId: ExpertId, language: Language): string {
  return BASE_PROMPTS[expertId][language];
}

export function getSwitchPrompt(name: string, title: string, context: string, language: Language): string {
  const template = language === 'zh' ? SWITCH_PROMPT_ZH : SWITCH_PROMPT_EN;
  return template.replace('{name}', name).replace('{title}', title).replace('{context}', context);
}

export function getWelcomeMessage(expertId: ExpertId, language: Language): string {
  const welcomes: Record<ExpertId, Record<Language, string>> = {
    evan: {
      en: "Hello. I'm Evan Pierce. If you're feeling uncertain or things feel a bit shaky right now, you're in the right place. My focus is on helping you build a steady foundation — one that feels safe, calm, and secure. Where would you like to start?",
      zh: "你好，我是 Evan Pierce。如果你此刻感到不确定，或者一切有些摇晃——你来对地方了。我的职责是帮你建立一个稳固的基础——安全、冷静、踏实。你想从哪里开始？",
    },
    liam: {
      en: "Hey there. I'm Liam. Think of me as a friend who's here to help make love feel a little easier and a little softer. Whatever's on your mind — big or small — I'm here to listen. What's been on your heart lately?",
      zh: "嗨，我是 Liam。你可以把我想象成一个帮你让爱变得更轻松、更柔软的朋友。无论你心里想的是什么——大事还是小事——我都在这里倾听。最近你心里装着什么？",
    },
    noah: {
      en: "Hey. I'm Noah. If you're looking to bring more excitement, closeness, or spark into your relationship — you've come to the right person. I'm here to help you understand the dynamics between you and someone you care about. What's the situation?",
      zh: "嗨，我是 Noah。如果你想在关系中注入更多兴奋、亲密和火花——你找对人了。我在这里帮你理解你和在乎的那个人之间的动态。说说你的情况？",
    },
    adrian: {
      en: "Hello. I'm Dr. Adrian Cole. If things feel like they're unraveling right now — take a breath. You don't have to figure everything out in this moment. We'll take it step by step, together. What's weighing on you?",
      zh: "你好，我是 Dr. Adrian Cole。如果此刻一切似乎在分崩离析——先深呼吸。你不需要在这一刻解决所有问题。我们会一步一步来，一起。是什么压在你心上？",
    },
  };
  return welcomes[expertId][language];
}

export const EXPERT_META: Record<ExpertId, { color: string; emoji: string }> = {
  evan: { color: '#4A90D9', emoji: '🟦' },
  liam: { color: '#5BA88C', emoji: '🟩' },
  noah: { color: '#D4A843', emoji: '🟨' },
  adrian: { color: '#C45C5C', emoji: '🟥' },
};
```

- [ ] **Step 3: Commit**

```bash
git add lib/deepseek/ lib/prompts/
git commit -m "feat: add DeepSeek client and expert system prompts (en/zh)"
```

---

### Task 5: 落地页 Hero 组件

**Files:**
- Create: `components/landing/Hero.tsx`
- Modify: `app/[lang]/page.tsx`

- [ ] **Step 1: 创建 Hero 组件**

```typescript
'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';

export function Hero({ lang }: { lang: string }) {
  const t = useTranslations('hero');

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {/* 背景柔光 */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF7A59]/10 blur-3xl" />
        <div className="absolute right-1/4 top-2/3 h-64 w-64 rounded-full bg-[#B8C0FF]/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="max-w-2xl"
      >
        {/* 标签 */}
        <span className="inline-block rounded-full border border-[#FF7A59]/20 bg-[#FF7A59]/10 px-4 py-1.5 text-sm font-medium text-[#FF7A59]">
          {t('badge')}
        </span>

        {/* 标题 */}
        <h1 className="mt-8 text-balance text-4xl font-semibold leading-tight tracking-tight text-[#2B2B2B] sm:text-5xl lg:text-6xl">
          {t('title')}
        </h1>

        {/* 副标题 */}
        <p className="mt-6 text-lg leading-relaxed text-[#777777] sm:text-xl">
          {t('subtitle')}
        </p>

        {/* CTA */}
        <motion.div
          className="mt-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <Link
            href={`/${lang}/chat/liam`}
            className="inline-block rounded-[16px] bg-[#FF7A59] px-8 py-4 text-lg font-medium text-white shadow-soft transition-all hover:bg-[#FF7A59]/90 hover:shadow-lg"
          >
            {t('cta')} →
          </Link>
          <p className="mt-3 text-sm text-[#999999]">{t('ctaSubtext')}</p>
        </motion.div>
      </motion.div>

      {/* 向下指示 */}
      <motion.div
        className="absolute bottom-8"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      >
        <div className="h-1.5 w-1.5 rounded-full bg-[#FF7A59]/40" />
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 2: 创建落地页 app/[lang]/page.tsx**

```typescript
import { Hero } from '@/components/landing/Hero';

export default async function LandingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;

  return (
    <main>
      <Hero lang={lang} />
      {/* 后续任务中添加其他 section */}
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/landing/Hero.tsx app/[lang]/page.tsx
git commit -m "feat: add Hero section with centered fullscreen layout and soft gradient background"
```

---

### Task 6: 落地页 — 专家展示区

**Files:**
- Create: `components/landing/ExpertSection.tsx`
- Create: `components/landing/ExpertCard.tsx`
- Modify: `app/[lang]/page.tsx`

- [ ] **Step 1: 创建 ExpertCard 组件**

```typescript
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { EXPERT_META } from '@/lib/prompts/experts';

interface ExpertCardProps {
  id: string;
  name: string;
  title: string;
  description: string;
  tagline: string;
  lang: string;
}

export function ExpertCard({ id, name, title, description, tagline, lang }: ExpertCardProps) {
  const meta = EXPERT_META[id as keyof typeof EXPERT_META];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group relative overflow-hidden rounded-[24px] bg-white p-6 shadow-soft transition-shadow hover:shadow-lg"
    >
      {/* 顶部专家颜色条 */}
      <div
        className="absolute left-0 top-0 h-1 w-full"
        style={{ backgroundColor: meta.color }}
      />

      {/* 抽象头像：颜色圆 + 柔光 */}
      <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
        <div
          className="h-14 w-14 rounded-full opacity-20 blur-md"
          style={{ backgroundColor: meta.color }}
        />
        <div
          className="absolute flex h-12 w-12 items-center justify-center rounded-full text-2xl"
          style={{ backgroundColor: `${meta.color}20` }}
        >
          {meta.emoji}
        </div>
      </div>

      {/* 名字 + 称号 */}
      <h3 className="text-xl font-semibold text-[#2B2B2B]">{name}</h3>
      <p className="mt-0.5 text-sm font-medium" style={{ color: meta.color }}>
        {title}
      </p>

      {/* 一句话 */}
      <p className="mt-3 text-sm leading-relaxed text-[#777777]">"{description}"</p>

      <p className="mt-2 text-xs text-[#999999]">{tagline}</p>

      {/* CTA 按钮 */}
      <Link
        href={`/${lang}/chat/${id}`}
        className="mt-4 inline-block rounded-[12px] px-4 py-2 text-sm font-medium transition-colors"
        style={{
          backgroundColor: `${meta.color}10`,
          color: meta.color,
        }}
      >
        Talk to {name.split(' ')[0]} →
      </Link>
    </motion.div>
  );
}
```

- [ ] **Step 2: 创建 ExpertSection 组件**

```typescript
'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ExpertCard } from './ExpertCard';

export function ExpertSection({ lang }: { lang: string }) {
  const t = useTranslations('experts');
  const experts = ['evan', 'liam', 'noah', 'adrian'] as const;

  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h2 className="text-3xl font-semibold text-[#2B2B2B] sm:text-4xl">
          {t('title')}
        </h2>
        <p className="mt-4 text-lg text-[#777777]">{t('subtitle')}</p>
      </motion.div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {experts.map((id, i) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
          >
            <ExpertCard
              id={id}
              name={t(`${id}.name`)}
              title={t(`${id}.title`)}
              description={t(`${id}.description`)}
              tagline={t(`${id}.tagline`)}
              lang={lang}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: 更新落地页**

```typescript
// 更新 app/[lang]/page.tsx，添加 ExpertSection
import { Hero } from '@/components/landing/Hero';
import { ExpertSection } from '@/components/landing/ExpertSection';

export default async function LandingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return (
    <main>
      <Hero lang={lang} />
      <ExpertSection lang={lang} />
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/landing/ExpertCard.tsx components/landing/ExpertSection.tsx app/[lang]/page.tsx
git commit -m "feat: add ExpertSection with four expert cards, abstract avatars, and hover effects"
```

---

### Task 7: 落地页 — 案例、评价、技巧、FAQ、Footer

**Files:**
- Create: `components/landing/CaseStudies.tsx`
- Create: `components/landing/Testimonials.tsx`
- Create: `components/landing/TipsSection.tsx`
- Create: `components/landing/FAQ.tsx`
- Create: `components/landing/Footer.tsx`
- Modify: `app/[lang]/page.tsx`

- [ ] **Step 1: 创建 CaseStudies 组件**

```typescript
'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';

const QUESTION_KEYS = ['distant', 'overthinking', 'dependent', 'signals', 'still_likes', 'trust'];

export function CaseStudies({ lang }: { lang: string }) {
  const t = useTranslations('cases');

  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="text-center">
        <h2 className="text-3xl font-semibold text-[#2B2B2B] sm:text-4xl">{t('title')}</h2>
        <p className="mt-4 text-lg text-[#777777]">{t('subtitle')}</p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {QUESTION_KEYS.map((key, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
          >
            <Link
              href={`/${lang}/chat/liam?q=${encodeURIComponent(t(`questions.${key}`))}`}
              className="group block rounded-[24px] border border-transparent bg-white p-5 shadow-soft transition-all hover:border-[#FF7A59]/30 hover:shadow-lg"
            >
              <p className="text-sm leading-relaxed text-[#2B2B2B] group-hover:text-[#FF7A59] transition-colors">
                "{t(`questions.${key}`)}"
              </p>
              <span className="mt-2 inline-block text-xs text-[#B8C0FF]">💬</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 创建 Testimonials 组件**

```typescript
'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

export function Testimonials() {
  const t = useTranslations('testimonials');
  const items = t.raw('items') as Array<{ text: string; author: string }>;

  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <h2 className="text-center text-3xl font-semibold text-[#2B2B2B] sm:text-4xl">
        {t('title')}
      </h2>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="rounded-[24px] bg-[#FAF7F2] p-6"
          >
            <p className="text-sm leading-relaxed text-[#2B2B2B] italic">
              "{item.text}"
            </p>
            <p className="mt-3 text-xs font-medium text-[#999999]">— {item.author}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: 创建 TipsSection 组件**

```typescript
'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useState } from 'react';

export function TipsSection() {
  const t = useTranslations('tips');
  const items = t.raw('items') as Array<{ title: string; description: string }>;
  const [saved, setSaved] = useState<Set<number>>(new Set());

  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <h2 className="text-center text-3xl font-semibold text-[#2B2B2B] sm:text-4xl">
        {t('title')}
      </h2>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -2 }}
            className="rounded-[24px] bg-white p-6 shadow-soft"
          >
            <h3 className="text-lg font-semibold text-[#2B2B2B]">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#777777]">{item.description}</p>
            <button
              onClick={() => setSaved(prev => {
                const next = new Set(prev);
                next.has(i) ? next.delete(i) : next.add(i);
                return next;
              })}
              className="mt-4 text-xs font-medium transition-colors"
              style={{ color: saved.has(i) ? '#FF7A59' : '#999999' }}
            >
              {saved.has(i) ? 'Saved ✓' : 'Save'}
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: 创建 FAQ 组件**

```typescript
'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function FAQ() {
  const t = useTranslations('faq');
  const items = t.raw('items') as Array<{ q: string; a: string }>;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="mx-auto max-w-2xl px-6 py-24">
      <h2 className="text-center text-3xl font-semibold text-[#2B2B2B] sm:text-4xl">
        {t('title')}
      </h2>
      <div className="mt-12 space-y-3">
        {items.map((item, i) => (
          <div key={i} className="overflow-hidden rounded-[16px] bg-white shadow-soft">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-medium text-[#2B2B2B]"
            >
              {item.q}
              <span className="ml-4 text-[#FF7A59] transition-transform" style={{ transform: openIndex === i ? 'rotate(45deg)' : 'rotate(0deg)' }}>
                +
              </span>
            </button>
            <AnimatePresence>
              {openIndex === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="px-6 pb-4 text-sm leading-relaxed text-[#777777]">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: 创建 Footer 组件**

```typescript
'use client';

import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="border-t border-[#B8C0FF]/20 bg-white py-12">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <p className="text-sm text-[#777777]">{t('tagline')}</p>
        <div className="mt-4 flex justify-center gap-6 text-xs text-[#999999]">
          <a href="#" className="hover:text-[#FF7A59] transition-colors">{t('privacy')}</a>
          <a href="#" className="hover:text-[#FF7A59] transition-colors">{t('terms')}</a>
          <span>© 2026 Lunara</span>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 6: 更新落地页**

```typescript
// 更新 app/[lang]/page.tsx
import { Hero } from '@/components/landing/Hero';
import { ExpertSection } from '@/components/landing/ExpertSection';
import { CaseStudies } from '@/components/landing/CaseStudies';
import { Testimonials } from '@/components/landing/Testimonials';
import { TipsSection } from '@/components/landing/TipsSection';
import { FAQ } from '@/components/landing/FAQ';
import { Footer } from '@/components/landing/Footer';

export default async function LandingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return (
    <main>
      <Hero lang={lang} />
      <ExpertSection lang={lang} />
      <CaseStudies lang={lang} />
      <Testimonials />
      <TipsSection />
      <FAQ />
      <Footer />
    </main>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add components/landing/CaseStudies.tsx components/landing/Testimonials.tsx components/landing/TipsSection.tsx components/landing/FAQ.tsx components/landing/Footer.tsx app/[lang]/page.tsx
git commit -m "feat: add CaseStudies, Testimonials, TipsSection, FAQ, Footer to landing page"
```

---

### Task 8: 中间件 — Supabase Auth + next-intl

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: 创建 middleware.ts**

```typescript
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { routing } from './i18n/routing';

// next-intl middleware
const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Supabase session refresh
  const supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );
  await supabase.auth.getUser();

  // next-intl
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add middleware combining Supabase auth and next-intl routing"
```

---

### Task 9: API — 对话接口 (POST /api/chat)

**Files:**
- Create: `app/api/chat/route.ts`

- [ ] **Step 1: 创建 POST /api/chat SSE 路由**

```typescript
import { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createDeepSeekClient } from '@/lib/deepseek/client';
import { getExpertPrompt } from '@/lib/prompts/experts';

// 速率限制存储 (内存，MVP 用；后续可换 Redis/Upstash)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (!checkRateLimit(user.id)) {
    return Response.json({ error: 'Too many requests. Take a breath.' }, { status: 429 });
  }

  const body = await req.json();
  const { conversation_id, expert, message, language } = body as {
    conversation_id?: string;
    expert: string;
    message: string;
    language: string;
  };

  if (!['evan', 'liam', 'noah', 'adrian'].includes(expert)) {
    return Response.json({ error: 'Invalid expert' }, { status: 400 });
  }

  // 创建或复用对话
  let convId = conversation_id;
  if (!convId) {
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, expert, language: language || 'en' })
      .select('id')
      .single();
    if (convErr) return Response.json({ error: 'Failed to create conversation' }, { status: 500 });
    convId = conv.id;
  }

  // 存储用户消息
  await supabase.from('messages').insert({ conversation_id: convId, role: 'user', content: message });

  // 获取历史消息
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
    .limit(20);

  // 构建 messages 数组
  const systemPrompt = getExpertPrompt(expert as 'evan' | 'liam' | 'noah' | 'adrian', (language || 'en') as 'en' | 'zh');
  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...(history || []).map((m) => ({ role: m.role, content: m.content })),
  ];

  // 调用 DeepSeek 流式
  const deepseek = createDeepSeekClient();
  const stream = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: chatMessages as any,
    stream: true,
    max_tokens: 1024,
    temperature: 0.8,
  });

  // SSE 响应
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let fullContent = '';
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || '';
          if (delta) {
            fullContent += delta;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
          }
        }
        // 存储 AI 回复
        await supabase.from('messages').insert({
          conversation_id: convId,
          role: 'assistant',
          content: fullContent,
        });
        // 更新对话 updated_at + auto title
        const title = message.slice(0, 50) + (message.length > 50 ? '...' : '');
        await supabase.from('conversations').update({ updated_at: new Date().toISOString(), title }).eq('id', convId);
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: add POST /api/chat with SSE streaming, rate limiting, and history"
```

---

### Task 10: API — 专家切换 + 对话 CRUD

**Files:**
- Create: `app/api/chat/switch/route.ts`
- Create: `app/api/conversations/route.ts`
- Create: `app/api/conversations/[id]/route.ts`
- Create: `app/api/conversations/[id]/title/route.ts`

- [ ] **Step 1: 创建 POST /api/chat/switch**

```typescript
import { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createDeepSeekClient } from '@/lib/deepseek/client';
import { getSwitchPrompt, getWelcomeMessage, EXPERT_META } from '@/lib/prompts/experts';

const EXPERT_TITLES: Record<string, Record<string, string>> = {
  evan: { en: 'The Relationship Stabilizer', zh: '情感稳定者' },
  liam: { en: 'The Relationship Gardener', zh: '情感园丁' },
  noah: { en: 'The Attraction Strategist', zh: '吸引策略师' },
  adrian: { en: 'The Intervention Specialist', zh: '危机干预专家' },
};

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { conversation_id, new_expert, language } = body as {
    conversation_id: string;
    new_expert: string;
    language: 'en' | 'zh';
  };

  if (!['evan', 'liam', 'noah', 'adrian'].includes(new_expert)) {
    return Response.json({ error: 'Invalid expert' }, { status: 400 });
  }

  // 检查对话归属
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, user_id')
    .eq('id', conversation_id)
    .single();

  if (!conv || conv.user_id !== user.id) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // 检查是否有历史
  const { data: messages } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversation_id)
    .order('created_at', { ascending: true })
    .limit(20);

  let transitionMessage: string;

  if (!messages || messages.length === 0) {
    // 无历史 → 默认欢迎语
    transitionMessage = getWelcomeMessage(new_expert as 'evan' | 'liam' | 'noah' | 'adrian', language);
  } else {
    // 有历史 → AI 打招呼+总结+引导
    const context = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
    const nameMap: Record<string, Record<string, string>> = {
      evan: { en: 'Evan Pierce', zh: 'Evan Pierce' },
      liam: { en: 'Liam Hart', zh: 'Liam Hart' },
      noah: { en: 'Noah Sinclair', zh: 'Noah Sinclair' },
      adrian: { en: 'Dr. Adrian Cole', zh: 'Dr. Adrian Cole' },
    };
    const prompt = getSwitchPrompt(
      nameMap[new_expert][language],
      EXPERT_TITLES[new_expert][language],
      context,
      language
    );

    const deepseek = createDeepSeekClient();
    const completion = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 256,
      temperature: 0.9,
    });
    transitionMessage = completion.choices[0]?.message?.content || getWelcomeMessage(new_expert as any, language);
  }

  // 更新对话的 expert
  await supabase.from('conversations').update({ expert: new_expert, updated_at: new Date().toISOString() }).eq('id', conversation_id);

  // 插入过渡消息
  await supabase.from('messages').insert({ conversation_id, role: 'assistant', content: transitionMessage });

  return Response.json({ content: transitionMessage, expert: new_expert });
}
```

- [ ] **Step 2: 创建对话 CRUD API**

```typescript
// app/api/conversations/route.ts
import { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, expert, title, language, updated_at, created_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  return Response.json(conversations || []);
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { expert = 'liam', language = 'en' } = body;

  const { data: conv, error } = await supabase
    .from('conversations')
    .insert({ user_id: user.id, expert, language })
    .select('id, expert, title, language, updated_at, created_at')
    .single();

  if (error) return Response.json({ error: 'Failed to create conversation' }, { status: 500 });
  return Response.json(conv);
}
```

```typescript
// app/api/conversations/[id]/route.ts
import { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data: conv } = await supabase.from('conversations').select('*').eq('id', id).eq('user_id', user.id).single();
  if (!conv) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data: messages } = await supabase.from('messages').select('*').eq('conversation_id', id).order('created_at', { ascending: true });
  return Response.json({ ...conv, messages: messages || [] });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { error } = await supabase.from('conversations').delete().eq('id', id).eq('user_id', user.id);
  if (error) return Response.json({ error: 'Failed to delete' }, { status: 500 });
  return new Response(null, { status: 204 });
}
```

```typescript
// app/api/conversations/[id]/title/route.ts
import { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { title } = await req.json();
  const { error } = await supabase.from('conversations').update({ title }).eq('id', id).eq('user_id', user.id);
  if (error) return Response.json({ error: 'Failed to update' }, { status: 500 });
  return Response.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/switch/ app/api/conversations/
git commit -m "feat: add expert switch API and conversation CRUD endpoints"
```

---

### Task 11: Auth 页面 — 登录/注册

**Files:**
- Create: `app/[lang]/auth/callback/route.ts`
- Create: `app/[lang]/auth/login/page.tsx`
- Create: `components/auth/AuthForm.tsx`

- [ ] **Step 1: 创建 Auth 回调路由**

```typescript
// app/[lang]/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const lang = 'en'; // 简化，从 referer 或 cookie 推断

  if (code) {
    const supabase = await createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(`/${lang}/chat/liam`, req.url));
}
```

- [ ] **Step 2: 创建 AuthForm 组件**

```typescript
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/en/auth/callback` },
      });
      if (error) setMessage(error.message);
      else setMessage('Check your email for the confirmation link.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else location.href = '/en/chat/liam';
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-[24px] bg-white p-8 shadow-soft">
        <h1 className="text-2xl font-semibold text-center text-[#2B2B2B]">
          {isSignUp ? 'Create an account' : 'Welcome back'}
        </h1>
        <p className="mt-2 text-sm text-center text-[#777777]">
          {isSignUp ? 'Start your journey with Lunara' : 'Continue your conversation'}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-[18px] border border-gray-200 bg-[#FAF7F2] px-4 py-3 text-sm outline-none transition-colors focus:border-[#FF7A59]"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-[18px] border border-gray-200 bg-[#FAF7F2] px-4 py-3 text-sm outline-none transition-colors focus:border-[#FF7A59]"
          />

          {message && <p className="text-xs text-[#777777]">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[16px] bg-[#FF7A59] py-3 text-sm font-medium text-white transition-all hover:bg-[#FF7A59]/90 disabled:opacity-50"
          >
            {loading ? '...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-[#999999]">
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-[#FF7A59] font-medium">
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建登录页**

```typescript
// app/[lang]/auth/login/page.tsx
import { AuthForm } from '@/components/auth/AuthForm';

export default function LoginPage() {
  return <AuthForm />;
}
```

- [ ] **Step 4: Commit**

```bash
git add app/[lang]/auth/ components/auth/
git commit -m "feat: add Supabase email auth (login/signup) with callback route"
```

---

### Task 12: 对话页 — Sidebar + ChatHeader

**Files:**
- Create: `components/chat/ChatSidebar.tsx`
- Create: `components/chat/ChatHeader.tsx`
- Create: `app/[lang]/chat/[expert]/page.tsx`
- Create: `app/[lang]/chat/layout.tsx`
- Create: `app/[lang]/chat/page.tsx`

- [ ] **Step 1: 创建 ChatSidebar 组件**

```typescript
'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Conversation {
  id: string;
  expert: string;
  title: string;
  updated_at: string;
}

export function ChatSidebar() {
  const t = useTranslations('chat');
  const router = useRouter();
  const params = useParams<{ lang: string; expert?: string }>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('conversations').select('id, expert, title, updated_at').order('updated_at', { ascending: false });
    setConversations((data as Conversation[]) || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <aside className="w-64 border-r border-[#B8C0FF]/10 p-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="mb-3 h-12 animate-pulse rounded-[12px] bg-gray-100" />
        ))}
      </aside>
    );
  }

  return (
    <aside className="w-64 shrink-0 border-r border-[#B8C0FF]/10 p-4">
      <button
        onClick={() => router.push(`/${params.lang}/chat/liam`)}
        className="w-full rounded-[12px] bg-[#FF7A59]/10 px-4 py-2.5 text-sm font-medium text-[#FF7A59] transition-colors hover:bg-[#FF7A59]/20"
      >
        + {t('newChat')}
      </button>

      {conversations.length === 0 ? (
        <p className="mt-8 text-center text-xs text-[#999999]">{t('noConversations')}</p>
      ) : (
        <div className="mt-4 space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => router.push(`/${params.lang}/chat/${conv.expert}?c=${conv.id}`)}
              className="w-full rounded-[12px] px-3 py-2.5 text-left text-sm transition-colors hover:bg-[#FAF7F2]"
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: `var(--expert-${conv.expert})` }} />
                <span className="truncate text-[#2B2B2B]">{conv.title}</span>
              </div>
              <p className="mt-1 text-xs text-[#999999]">{new Date(conv.updated_at).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: 创建 ChatHeader 组件**

```typescript
'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { EXPERT_META } from '@/lib/prompts/experts';
import { useState } from 'react';

interface ChatHeaderProps {
  onOpenExpertPanel: () => void;
  expert: string;
}

export function ChatHeader({ onOpenExpertPanel, expert }: ChatHeaderProps) {
  const t = useTranslations('chat');
  const router = useRouter();
  const params = useParams<{ lang: string }>();
  const meta = EXPERT_META[expert as keyof typeof EXPERT_META];
  const [dark, setDark] = useState(false);

  const toggleDark = () => {
    setDark(!dark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="flex items-center justify-between border-b border-[#B8C0FF]/10 bg-white px-6 py-3">
      {/* 专家标签 */}
      <button
        onClick={onOpenExpertPanel}
        className="flex items-center gap-2 rounded-[12px] px-3 py-1.5 transition-colors hover:bg-[#FAF7F2]"
      >
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: meta.color }} />
        <span className="text-sm font-medium text-[#2B2B2B]">{expert.charAt(0).toUpperCase() + expert.slice(1)}</span>
        <span className="text-xs text-[#999999]">▾</span>
      </button>

      <div className="flex items-center gap-3">
        {/* 语言切换 */}
        <button
          onClick={() => router.push(`/${params.lang === 'en' ? 'zh' : 'en'}/chat/${expert}`)}
          className="text-xs font-medium text-[#999999] hover:text-[#FF7A59] transition-colors"
        >
          {params.lang === 'en' ? '中文' : 'EN'}
        </button>
        {/* 暗色模式 */}
        <button onClick={toggleDark} className="text-sm text-[#777777]">
          {dark ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: 创建对话布局 + 页面**

```typescript
// app/[lang]/chat/layout.tsx
import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ChatLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const { lang } = await params;
    redirect(`/${lang}/auth/login`);
  }
  return <>{children}</>;
}
```

```typescript
// app/[lang]/chat/page.tsx  — 重定向到默认 Liam
import { redirect } from 'next/navigation';

export default async function ChatPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  redirect(`/${lang}/chat/liam`);
}
```

```typescript
// app/[lang]/chat/[expert]/page.tsx — 对话页 main
import { ChatPageClient } from './ChatPageClient';

export default async function ChatExpertPage({ params }: { params: Promise<{ lang: string; expert: string }> }) {
  const { lang, expert } = await params;
  return <ChatPageClient lang={lang} expert={expert} />;
}
```

- [ ] **Step 4: 创建 ChatPageClient (Client Component)**

```typescript
// app/[lang]/chat/[expert]/ChatPageClient.tsx
'use client';

import { useState } from 'react';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ExpertSwitchPanel } from '@/components/chat/ExpertSwitchPanel';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';

export function ChatPageClient({ lang, expert }: { lang: string; expert: string }) {
  const [expertPanelOpen, setExpertPanelOpen] = useState(false);
  const [currentExpert, setCurrentExpert] = useState(expert);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const handleSwitchExpert = async (newExpert: string) => {
    setExpertPanelOpen(false);
    if (!conversationId) {
      setCurrentExpert(newExpert);
      return;
    }
    const res = await fetch('/api/chat/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: conversationId, new_expert: newExpert, language: lang }),
    });
    const data = await res.json();
    setCurrentExpert(newExpert);
    setMessages((prev) => [...prev, { role: 'assistant', content: data.content }]);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <ChatSidebar />
      <div className="flex flex-1 flex-col">
        <ChatHeader onOpenExpertPanel={() => setExpertPanelOpen(true)} expert={currentExpert} />
        <MessageList messages={messages} expert={currentExpert} lang={lang} />
        <ChatInput
          onSend={async (message) => {
            const userMsg = { role: 'user', content: message };
            setMessages((prev) => [...prev, userMsg]);
            const res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversation_id: conversationId, expert: currentExpert, message, language: lang }),
            });
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let aiContent = '';
            setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));
                for (const line of lines) {
                  const data = line.slice(6);
                  if (data === '[DONE]') break;
                  try {
                    const { content } = JSON.parse(data);
                    aiContent += content;
                    setMessages((prev) => {
                      const updated = [...prev];
                      updated[updated.length - 1] = { role: 'assistant', content: aiContent };
                      return updated;
                    });
                  } catch {}
                }
              }
            }
          }}
          lang={lang}
        />
      </div>
      {expertPanelOpen && (
        <ExpertSwitchPanel
          onSelect={handleSwitchExpert}
          onClose={() => setExpertPanelOpen(false)}
          currentExpert={currentExpert}
          lang={lang}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/chat/ChatSidebar.tsx components/chat/ChatHeader.tsx app/[lang]/chat/
git commit -m "feat: add ChatSidebar, ChatHeader, and chat page layout with auth guard"
```

---

### Task 13: 对话页 — ExpertSwitchPanel + MessageList + ChatInput

**Files:**
- Create: `components/chat/ExpertSwitchPanel.tsx`
- Create: `components/chat/MessageList.tsx`
- Create: `components/chat/WelcomeCard.tsx`
- Create: `components/chat/MessageBubble.tsx`
- Create: `components/chat/ChatInput.tsx`

- [ ] **Step 1: 创建 ExpertSwitchPanel**

```typescript
'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { EXPERT_META } from '@/lib/prompts/experts';

interface Props {
  onSelect: (expert: string) => void;
  onClose: () => void;
  currentExpert: string;
  lang: string;
}

export function ExpertSwitchPanel({ onSelect, onClose, currentExpert, lang }: Props) {
  const t = useTranslations('chat');
  const experts = ['evan', 'liam', 'noah', 'adrian'] as const;

  const titles: Record<string, string> = {
    evan: 'The Stabilizer',
    liam: 'The Gardener',
    noah: 'The Strategist',
    adrian: 'The Intervention Specialist',
  };

  const taglines: Record<string, string> = {
    evan: 'I help you find stability and security.',
    liam: 'I make love feel easier and softer.',
    noah: 'I help you grow closer and more exciting.',
    adrian: 'I guide you back to center when things fall apart.',
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md rounded-[32px] bg-white p-6 shadow-soft"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[#2B2B2B]">{t('chooseExpert')}</h2>
        <div className="mt-4 space-y-2">
          {experts.map((id) => {
            const meta = EXPERT_META[id];
            const isCurrent = id === currentExpert;
            return (
              <button
                key={id}
                onClick={() => onSelect(id)}
                className="flex w-full items-center gap-4 rounded-[16px] p-4 text-left transition-all hover:bg-[#FAF7F2]"
                style={{ border: isCurrent ? `2px solid ${meta.color}` : '2px solid transparent' }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-lg" style={{ backgroundColor: `${meta.color}15` }}>
                  {meta.emoji}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#2B2B2B]">
                    {id.charAt(0).toUpperCase() + id.slice(1)}
                    {isCurrent && <span className="ml-2 text-xs" style={{ color: meta.color }}>({t('currentExpert')})</span>}
                  </p>
                  <p className="text-xs text-[#999999]">{titles[id]}</p>
                  <p className="mt-1 text-xs text-[#777777]">"{taglines[id]}"</p>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
```

- [ ] **Step 2: 创建 WelcomeCard**

```typescript
'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { EXPERT_META } from '@/lib/prompts/experts';

interface Props {
  expert: string;
  onSuggestionClick: (text: string) => void;
}

export function WelcomeCard({ expert, onSuggestionClick }: Props) {
  const t = useTranslations('welcome');
  const meta = EXPERT_META[expert as keyof typeof EXPERT_META];
  const welcome = t.raw(`${expert}`) as { greeting: string; role: string; intro: string; suggestions: string[] };

  return (
    <motion.div
      className="mx-auto mt-8 max-w-lg rounded-[24px] bg-white p-8 shadow-soft text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl" style={{ backgroundColor: `${meta.color}15` }}>
        {meta.emoji}
      </div>
      <h2 className="mt-4 text-xl font-semibold text-[#2B2B2B]">{welcome.greeting}</h2>
      <p className="mt-1 text-sm" style={{ color: meta.color }}>{welcome.role}</p>
      <p className="mt-4 text-sm leading-relaxed text-[#777777]">{welcome.intro}</p>
      <div className="mt-6 space-y-2">
        {welcome.suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestionClick(s)}
            className="block w-full rounded-[12px] bg-[#FAF7F2] px-4 py-2.5 text-left text-sm text-[#2B2B2B] transition-colors hover:bg-[#B8C0FF]/20"
          >
            💬 {s}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 3: 创建 MessageBubble**

```typescript
'use client';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  expert?: string;
}

export function MessageBubble({ role, content, expert }: Props) {
  if (role === 'user') {
    return (
      <div className="flex justify-end px-6 py-1.5">
        <div className="max-w-[70%] rounded-[18px] bg-[#FF7A59]/10 px-4 py-2.5 text-sm leading-relaxed text-[#2B2B2B]">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start px-6 py-1.5">
      <div className="max-w-[80%] rounded-[18px] border border-[#B8C0FF]/10 bg-white px-4 py-2.5 shadow-soft">
        {content ? (
          <p className="text-sm leading-relaxed text-[#2B2B2B]">{content}</p>
        ) : (
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-[#FF7A59]/40" />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 创建 MessageList**

```typescript
'use client';

import { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { WelcomeCard } from './WelcomeCard';

interface Props {
  messages: Array<{ role: string; content: string }>;
  expert: string;
  lang: string;
  onSuggestionClick?: (text: string) => void;
}

export function MessageList({ messages, expert, lang, onSuggestionClick }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto py-4">
      {messages.length === 0 && onSuggestionClick && (
        <WelcomeCard expert={expert} onSuggestionClick={onSuggestionClick} />
      )}
      {messages.map((msg, i) => (
        <MessageBubble key={i} role={msg.role as 'user' | 'assistant'} content={msg.content} expert={expert} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 5: 创建 ChatInput**

```typescript
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  onSend: (message: string) => void;
  lang: string;
}

export function ChatInput({ onSend, lang }: Props) {
  const t = useTranslations('chat');
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-[#B8C0FF]/10 bg-white px-6 py-4">
      <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-[18px] bg-[#FAF7F2] px-4 py-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('inputPlaceholder')}
          className="flex-1 bg-transparent text-sm text-[#2B2B2B] outline-none placeholder:text-[#999999]"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF7A59] text-white transition-all hover:bg-[#FF7A59]/90 disabled:opacity-40"
        >
          ↗
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add components/chat/ExpertSwitchPanel.tsx components/chat/WelcomeCard.tsx components/chat/MessageBubble.tsx components/chat/MessageList.tsx components/chat/ChatInput.tsx
git commit -m "feat: add expert switch panel, message list with welcome card, chat input"
```

---

### Task 14: 错误处理、边界状态、移动端适配

**Files:**
- Create: `components/common/ErrorBoundary.tsx`
- Create: `components/common/Toast.tsx`
- Modify: `app/[lang]/layout.tsx` (viewport meta)
- Modify: 各组件响应式 class

- [ ] **Step 1: 创建 ErrorBoundary**

```typescript
'use client';

import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-[#2B2B2B]">Something went wrong</h1>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 rounded-[12px] bg-[#FF7A59] px-6 py-2 text-sm text-white"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: 添加移动端适配 (更新 ChatSidebar)**

```typescript
// 在 ChatSidebar 中添加移动端逻辑
// 使用 state 控制折叠，需要添加一个汉堡按钮
// 这里添加简化的响应式 class:

// ChatSidebar: 添加 className="hidden lg:block"
// ChatSidebar 移动端: 使用 sheet/drawer 或简单的 state toggle
```

- [ ] **Step 3: 更新 app/[lang]/layout.tsx 添加 viewport**

```typescript
// 在 LangLayout 或 RootLayout 添加:
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FAF7F2',
};
```

- [ ] **Step 4: 在 ChatPageClient 添加错误处理**

```typescript
// 在 handleSend 和 handleSwitchExpert 中添加 try-catch
// 添加 error message state，传给 ChatInput 显示
// 添加 rate limit 处理 (429 响应)
```

- [ ] **Step 5: Commit**

```bash
git add components/common/ app/[lang]/layout.tsx
git commit -m "feat: add error boundary, mobile responsive layout, rate limit handling"
```

---

### Task 15: 运维脚本

**Files:**
- Create: `scripts/start.sh`
- Create: `scripts/stop.sh`
- Create: `scripts/deploy.sh`

- [ ] **Step 1: 创建 scripts/start.sh**

```bash
#!/bin/bash
set -e
echo "=== Starting Lunara ==="
cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "Creating .env.local from template..."
  cp .env.local.example .env.local
  echo "⚠️  Please edit .env.local with your keys before proceeding."
  exit 1
fi

echo "Installing dependencies..."
npm install --silent

echo "Building application..."
npm run build

echo "Starting production server on port 3000..."
npx next start -p 3000 &
echo $! > /tmp/lunara.pid
echo "Lunara started (PID: $(cat /tmp/lunara.pid))"
```

- [ ] **Step 2: 创建 scripts/stop.sh**

```bash
#!/bin/bash
echo "=== Stopping Lunara ==="
if [ -f /tmp/lunara.pid ]; then
  PID=$(cat /tmp/lunara.pid)
  kill $PID 2>/dev/null && echo "Lunara stopped (PID: $PID)" || echo "Process not running"
  rm /tmp/lunara.pid
else
  echo "No PID file found. Checking for next process..."
  pkill -f "next start" && echo "Stopped next process" || echo "No next process found"
fi
```

- [ ] **Step 3: 创建 scripts/deploy.sh**

```bash
#!/bin/bash
set -e
echo "=== Deploying Lunara to Vercel ==="
cd "$(dirname "$0")/.."

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "⚠️  No git remote 'origin' configured. Set it first with:"
  echo "  git remote add origin <your-github-repo-url>"
  exit 1
fi

echo "Pushing to GitHub..."
git push origin master

echo "Deploying to Vercel..."
vercel --prod

echo "Deployment complete!"
```

```bash
chmod +x scripts/start.sh scripts/stop.sh scripts/deploy.sh
```

- [ ] **Step 4: Commit**

```bash
git add scripts/start.sh scripts/stop.sh scripts/deploy.sh
git commit -m "chore: add operation scripts (start, stop, deploy)"
```

---

### Task 16: 基础测试

**Files:**
- Create: `vitest.config.ts`
- Create: `__tests__/prompts.test.ts`
- Create: `__tests__/expert-validation.test.ts`

- [ ] **Step 1: 创建 vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 2: 创建提示词测试 __tests__/prompts.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { getExpertPrompt, getSwitchPrompt, getWelcomeMessage } from '@/lib/prompts/experts';

describe('Expert Prompts', () => {
  const experts = ['evan', 'liam', 'noah', 'adrian'] as const;

  it.each(experts)('%s should have en and zh prompts', (expert) => {
    const en = getExpertPrompt(expert, 'en');
    const zh = getExpertPrompt(expert, 'zh');
    expect(en.length).toBeGreaterThan(100);
    expect(zh.length).toBeGreaterThan(100);
    expect(en).toContain('Reply in English');
    expect(zh).toContain('用中文回复');
  });

  it('switch prompt should replace placeholders', () => {
    const result = getSwitchPrompt('Test', 'The Tester', 'Context here', 'en');
    expect(result).toContain('Test');
    expect(result).toContain('The Tester');
    expect(result).toContain('Context here');
    expect(result).not.toContain('{name}');
    expect(result).not.toContain('{title}');
  });

  it.each(experts)('%s should have welcome messages in both languages', (expert) => {
    const en = getWelcomeMessage(expert, 'en');
    const zh = getWelcomeMessage(expert, 'zh');
    expect(en.length).toBeGreaterThan(20);
    expect(zh.length).toBeGreaterThan(20);
  });
});
```

- [ ] **Step 3: 创建专家校验测试 __tests__/expert-validation.test.ts**

```typescript
import { describe, it, expect } from 'vitest';

const VALID_EXPERTS = ['evan', 'liam', 'noah', 'adrian'];
const VALID_LANGS = ['en', 'zh'];

function validateExpert(expert: string): boolean {
  return VALID_EXPERTS.includes(expert);
}

function validateLanguage(lang: string): boolean {
  return VALID_LANGS.includes(lang);
}

describe('Expert and Language Validation', () => {
  it.each(VALID_EXPERTS)('should accept valid expert: %s', (expert) => {
    expect(validateExpert(expert)).toBe(true);
  });

  it('should reject invalid expert', () => {
    expect(validateExpert('invalid')).toBe(false);
    expect(validateExpert('')).toBe(false);
  });

  it.each(VALID_LANGS)('should accept valid language: %s', (lang) => {
    expect(validateLanguage(lang)).toBe(true);
  });

  it('should reject invalid language', () => {
    expect(validateLanguage('fr')).toBe(false);
  });
});
```

- [ ] **Step 4: 运行测试**

```bash
npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts __tests__/ package.json
git commit -m "test: add prompt validation and expert validation tests"
```

---

### Task 17: 最终集成验证

- [ ] **Step 1: 构建检查**

```bash
npm run build
```
预期: 无错误，有性能警告可接受。

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 启动开发服务器**

```bash
bash scripts/dev.sh
```
访问 http://localhost:3000 → 应自动重定向到 /en

- [ ] **Step 4: 手动验证核心流程**
  - [ ] 落地页所有模块渲染正确
  - [ ] 中英文切换工作正常
  - [ ] 点击专家卡片进入对话页
  - [ ] 发送消息获得 AI 回复
  - [ ] 专家切换面板正常弹出并切换
  - [ ] 暗色模式切换
  - [ ] 移动端响应式布局

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: final integration verification and fixes"
```
