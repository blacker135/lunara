# 全局导航栏与认证完善 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 添加全局导航栏（聊天页最小化），完善认证 UI 集成，调整落地页文案聚焦爱情关系指导

**Architecture:** 混合方案 — Navbar 服务端组件获取 Better Auth session，传给客户端 NavbarClient 处理路径判断和下拉交互。导航栏放在 `[lang]/layout.tsx` 全局生效，`/chat/*` 路径自动切换最小模式。

**Tech Stack:** Next.js 16 App Router, React 19, Better Auth, next-intl, Tailwind CSS v4, TypeScript 6

---

### 文件结构总览

| # | 文件 | 职责 |
|---|------|------|
| 1 | `components/common/Navbar.tsx` | 服务端 — 获取 session，渲染 NavbarClient |
| 2 | `components/common/NavbarClient.tsx` | 客户端 — usePathname 路径判断、头像下拉菜单、登出 |
| 3 | `components/auth/AuthForm.tsx` | 修改 — 修复登录跳转硬编码 `en` |
| 4 | `components/landing/Hero.tsx` | 修改 — 移除 ctaSubtext 渲染 |
| 5 | `app/[lang]/layout.tsx` | 修改 — 集成 Navbar |
| 6 | `messages/zh.json` | 修改 — hero/trust/faq/nav 文案 |
| 7 | `messages/en.json` | 修改 — hero/trust/faq/nav 文案 |
| 8 | `.env.local.example` | 修改 — 更新数据库 URL 模板说明 |

---

### Task 1: 更新 i18n 翻译文件（en.json + zh.json）

**Files:**
- Modify: `messages/zh.json`
- Modify: `messages/en.json`

- [ ] **Step 1: 更新 zh.json — nav 命名空间扩展 + hero/trust/faq**

在 `zh.json` 的 `nav` 对象中添加 `startChat` 和 `logout` 键：

```json
"nav": {
  "brand": "Lunara",
  "home": "首页",
  "chat": "对话",
  "language": "语言",
  "login": "登录",
  "signup": "开始使用",
  "startChat": "开始对话",
  "logout": "退出登录"
}
```

修改 `hero` 对象：

```json
"hero": {
  "badge": "AI 爱情关系指导",
  "title": "感情世界很复杂，你不必独自面对。",
  "subtitle": "专注爱情关系的建立、维护、促进与拯救——四位 AI 专家，四种视角，帮你应对感情中的每一个阶段。",
  "cta": "与 Liam 聊聊"
}
```

注意：`ctaSubtext` 键被删除（不再在 Hero 组件中渲染，但保留在 JSON 中无副作用；为干净起见直接删除）。

修改 `trust` 对象：

```json
"trust": {
  "title": "从建立到拯救，全程陪伴你的爱情关系",
  "items": [
    {
      "title": "建立 — 关系基础",
      "description": "帮助你在关系中建立安全感、信任和健康的沟通模式，为爱情打下坚实的地基。"
    },
    {
      "title": "维护 — 日常滋养",
      "description": "日常的情感润滑，让关系在平淡中保持温度与深度连接，不让琐碎消磨爱意。"
    },
    {
      "title": "促进 — 吸引升温",
      "description": "理解吸引力动态，驾驭暧昧期，让你的关系持续升温、稳步推进。"
    },
    {
      "title": "拯救 — 危机修复",
      "description": "当信任崩塌、冷战僵持、分手危机来临时，帮你理性思考、找回方向。"
    }
  ]
}
```

修改 `faq` 对象 — 删除 items 数组中的第 4 项（索引 3，对应 "Lunara 是免费的吗？"），调整其余条目中的"情感引导"为"爱情关系指导"：

```json
"faq": {
  "title": "常见问题",
  "items": [
    {
      "question": "Lunara 是真正的心理咨询师吗？",
      "answer": "Lunara 是一个 AI 爱情关系指导平台，不是持证心理治疗师。我们的专家是基于关系心理学框架训练的 AI 人格。他们提供有温度的引导和视角——而非临床诊断或治疗。"
    },
    {
      "question": "我的对话真的私密吗？",
      "answer": "是的。我们不在服务器上存储你的对话。你的聊天记录默认就是私密的——我们不收集任何个人数据，除你之外的任何人都无法访问你的对话历史。"
    },
    {
      "question": "我可以切换专家吗？",
      "answer": "当然可以。你可以在对话过程中随时在 Evan、Liam、Noah 和 Dr. Cole 之间切换。每位专家都带来不同的视角，你可以自由探索全部四位。"
    },
    {
      "question": "我可以谈论什么类型的关系问题？",
      "answer": "你可以谈论任何与爱情关系相关的话题：沟通困难、依恋焦虑、暧昧信号、信任问题、冲突模式、情感疏离、分手等。所有关系类型和情境都欢迎。"
    }
  ]
}
```

同步更新 `meta.description`：

```json
"meta": {
  "title": "Lunara — AI 爱情关系指导",
  "description": "专注爱情关系的建立、维护、促进与拯救。四位 AI 专家，四种视角，帮你应对感情中的每一个阶段。",
  "siteName": "Lunara"
}
```

- [ ] **Step 2: 更新 en.json — nav 命名空间扩展 + hero/trust/faq**

在 `en.json` 的 `nav` 对象中添加：

```json
"nav": {
  "brand": "Lunara",
  "home": "Home",
  "chat": "Chat",
  "language": "Language",
  "login": "Sign In",
  "signup": "Get Started",
  "startChat": "Start Chat",
  "logout": "Logout"
}
```

修改 `hero` 对象：

```json
"hero": {
  "badge": "AI Relationship Guidance",
  "title": "Relationships are complicated. You don't have to figure them out alone.",
  "subtitle": "Focused on building, maintaining, growing, and saving love relationships — four AI experts, four perspectives, guiding you through every stage of love.",
  "cta": "Talk with Liam"
}
```

删除 `ctaSubtext` 键。

修改 `trust` 对象：

```json
"trust": {
  "title": "From building to saving — guiding your love relationship every step of the way",
  "items": [
    {
      "title": "Build — Relationship Foundations",
      "description": "Build security, trust, and healthy communication patterns. Lay a solid foundation for your love to grow."
    },
    {
      "title": "Maintain — Daily Nurturing",
      "description": "Daily emotional care that keeps your relationship warm, connected, and resilient — before small cracks become big breaks."
    },
    {
      "title": "Grow — Attraction & Escalation",
      "description": "Understand attraction dynamics, navigate ambiguity, and move your relationship forward with confidence and authenticity."
    },
    {
      "title": "Save — Crisis & Recovery",
      "description": "When trust breaks, cold wars set in, or breakup looms — think clearly, find direction, and rebuild from strength."
    }
  ]
}
```

修改 `faq` 对象 — 删除 items[3]（"Is Lunara free?"），调整其余：

```json
"faq": {
  "title": "Frequently Asked Questions",
  "items": [
    {
      "question": "Is Lunara a real therapist?",
      "answer": "Lunara is an AI relationship guidance platform, not a licensed therapist. Our experts are AI personas trained on relationship psychology frameworks. They provide compassionate guidance and perspective — not clinical diagnosis or treatment."
    },
    {
      "question": "Is my conversation really private?",
      "answer": "Yes. We do not store your conversations on our servers. Your chats are private by design — no personal data is collected, and no conversation history is accessible to anyone but you."
    },
    {
      "question": "Can I switch between experts?",
      "answer": "Absolutely. You can switch between Evan, Liam, Noah, and Dr. Cole at any time during your conversation. Each brings a different perspective, and you can explore all four."
    },
    {
      "question": "What kind of relationship issues can I talk about?",
      "answer": "You can talk about anything related to love relationships: communication struggles, attachment anxiety, mixed signals, trust issues, conflict patterns, emotional distance, breakups, and more. All relationship types and situations are welcome."
    }
  ]
}
```

更新 `meta.description`：

```json
"meta": {
  "title": "Lunara — AI Relationship Guidance",
  "description": "Focused on building, maintaining, growing, and saving love relationships. Four AI experts, four perspectives, guiding you through every stage of love.",
  "siteName": "Lunara"
}
```

- [ ] **Step 3: 验证 JSON 语法正确**

```bash
node -e "JSON.parse(require('fs').readFileSync('messages/zh.json','utf8'))" && echo "zh.json OK"
node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'))" && echo "en.json OK"
```

Expected: `zh.json OK` / `en.json OK`

- [ ] **Step 4: Commit**

```bash
git add messages/zh.json messages/en.json
git commit -m "feat: update i18n — love relationship focus, trust section rewrite, nav keys, remove FAQ#4

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: 创建 NavbarClient 客户端组件

**Files:**
- Create: `components/common/NavbarClient.tsx`

- [ ] **Step 1: 创建 NavbarClient.tsx**

```tsx
// components/common/NavbarClient.tsx — 客户端导航栏交互
// 职责：usePathname 判断路由、头像下拉菜单、登出操作

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

interface NavbarClientProps {
  lang: string;
  user: NavbarSessionUser | null;
}

export function NavbarClient({ lang, user }: NavbarClientProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 判断是否在聊天页 — 路径包含 /chat
  const isChatPage = pathname.includes('/chat');

  // 点击外部关闭下拉
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = `/${lang}`;
  };

  // 用户头像字母（取 name 首字母或 email 首字母大写）
  const avatarLetter = user?.name?.charAt(0).toUpperCase() || user?.email.charAt(0).toUpperCase() || '?';

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
            <Link href={`/${lang}`} className="text-[#777777] hover:text-[#2B2B2B] transition-colors">
              {t('home')}
            </Link>
            <Link href={`/${lang}/chat/liam`} className="text-[#777777] hover:text-[#2B2B2B] transition-colors">
              {t('startChat')}
            </Link>
          </div>
        )}

        {/* 右侧：认证区域 */}
        <div className="flex items-center gap-3">
          {user ? (
            /* 已登录 — 头像 + 下拉菜单 */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF7A59] text-sm font-medium text-white hover:bg-[#FF7A59]/90 transition-colors"
              >
                {avatarLetter}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-[16px] bg-white py-2 shadow-soft border border-gray-100">
                  <div className="px-4 py-2 text-sm text-[#777777] truncate">
                    {user.name || user.email}
                  </div>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={handleLogout}
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
```

- [ ] **Step 2: 验证组件编译（TypeScript 检查）**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 无 NavbarClient 相关类型错误

- [ ] **Step 3: Commit**

```bash
git add components/common/NavbarClient.tsx
git commit -m "feat: add NavbarClient — path-aware navbar with auth dropdown

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: 创建 Navbar 服务端组件

**Files:**
- Create: `components/common/Navbar.tsx`

- [ ] **Step 1: 创建 Navbar.tsx**

```tsx
// components/common/Navbar.tsx — 服务端导航栏
// 职责：获取 Better Auth session，将用户数据传给 NavbarClient

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NavbarClient } from './NavbarClient';

interface NavbarProps {
  lang: string;
}

export async function Navbar({ lang }: NavbarProps) {
  const session = await auth.api.getSession({ headers: await headers() });

  const user = session?.user
    ? { name: session.user.name ?? undefined, email: session.user.email }
    : null;

  return <NavbarClient lang={lang} user={user} />;
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 无 Navbar 相关类型错误

- [ ] **Step 3: Commit**

```bash
git add components/common/Navbar.tsx
git commit -m "feat: add Navbar server component — fetch session for NavbarClient

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: 集成 Navbar 到 LangLayout + 修复 AuthForm 语言跳转

**Files:**
- Modify: `app/[lang]/layout.tsx`
- Modify: `components/auth/AuthForm.tsx`

- [ ] **Step 1: 在 LangLayout 中集成 Navbar**

修改 `app/[lang]/layout.tsx`，在 `NextIntlClientProvider` 之前、children 之外包裹 Navbar：

```tsx
/**
 * 语言路由布局
 * 为每个语言路由提供 next-intl 国际化上下文 + 全局导航栏
 */

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Providers } from '@/components/common/Providers';
import { Navbar } from '@/components/common/Navbar';

// 支持的语言类型
type SupportedLocale = 'en' | 'zh';

/**
 * 生成静态参数：预渲染所有支持的语言路由
 */
export function generateStaticParams() {
  return routing.locales.map((lang) => ({ lang }));
}

/**
 * 语言布局组件
 * 校验语言有效性，加载翻译消息，渲染全局导航栏和子组件
 */
export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  // 验证语言是否在支持列表中，不支持则返回 404
  if (!routing.locales.includes(lang as SupportedLocale)) {
    notFound();
  }

  // 加载当前语言的翻译消息
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <Navbar lang={lang} />
      {/* pt-14 为固定导航栏留出空间（h-14 = 56px） */}
      <div className="pt-14">
        <Providers>{children}</Providers>
      </div>
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 2: 修复 AuthForm 登录跳转语言问题**

修改 `components/auth/AuthForm.tsx`，从 2 处：

1. 第 5 行：`import { useState, FormEvent } from 'react';` → 添加 `useParams` 导入
2. 第 34 行：`window.location.href = '/en/chat/liam';` → 使用当前语言

具体改动：

第 5 行，修改 import 语句：
```tsx
import { useState, FormEvent } from 'react';
import { useParams } from 'next/navigation';
```

第 8 行后添加 `params` 获取：
```tsx
export function AuthForm() {
  const params = useParams<{ lang: string }>();
  const lang = params?.lang || 'en';
```

第 34 行，修改跳转：
```tsx
// 旧：window.location.href = '/en/chat/liam';
window.location.href = `/${lang}/chat/liam`;
```

完整修改后的 AuthForm 顶部：

```tsx
// components/auth/AuthForm.tsx — 登录/注册表单组件

'use client';

import { useState, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { authClient } from '@/lib/auth/client';

export function AuthForm() {
  const params = useParams<{ lang: string }>();
  const lang = params?.lang || 'en';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({ name, email, password });
        if (error) {
          setMessage({ type: 'error', text: error.message || 'Sign up failed' });
        } else {
          setMessage({ type: 'success', text: 'Account created! You can now sign in.' });
        }
      } else {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) {
          setMessage({ type: 'error', text: error.message || 'Sign in failed' });
        } else {
          window.location.href = `/${lang}/chat/liam`;
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };
  // ... 其余 JSX 保持不变
```

- [ ] **Step 3: 移除 Hero 组件中的 ctaSubtext**

修改 `components/landing/Hero.tsx` 第 75 行，删除 ctaSubtext 显示行：

```tsx
// 删除这一行：
// <p className="mt-3 text-sm text-[#999999]">{t('ctaSubtext')}</p>
```

修改后 CTA 按钮区域为：

```tsx
        {/* CTA 按钮 */}
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
            {t('cta')} &rarr;
          </Link>
        </motion.div>
```

– [ ] **Step 4: 验证编译 + 构建**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 无错误

```bash
npm run build 2>&1 | tail -10
```

Expected: build 成功

- [ ] **Step 5: Commit**

```bash
git add app/[lang]/layout.tsx components/auth/AuthForm.tsx components/landing/Hero.tsx
git commit -m "feat: integrate Navbar into layout, fix AuthForm lang redirect, remove ctaSubtext

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: 更新 .env.local.example

**Files:**
- Modify: `.env.local.example`

- [ ] **Step 1: 更新模板说明**

```bash
# PostgreSQL — 本地开发使用 localhost，生产部署使用域名隧道
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/lunara

# Better Auth
BETTER_AUTH_SECRET=<generate-a-random-secret>
BETTER_AUTH_URL=http://localhost:3000

# DeepSeek
DEEPSEEK_API_KEY=<your-deepseek-api-key>
DEEPSEEK_BASE_URL=https://api.deepseek.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 2: Commit**

```bash
git add .env.local.example
git commit -m "chore: update .env.local.example with production DB domain notes

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: 端到端验证

- [ ] **Step 1: 启动开发服务器**

```bash
bash scripts/dev.sh
```

- [ ] **Step 2: 验证导航栏显示**
  - 访问 `http://localhost:3000/en` → 确认导航栏显示完整模式（Logo + 首页 + 开始对话 + 登录/注册按钮）
  - 访问 `http://localhost:3000/zh` → 确认中文文案正确
  - 点击「开始对话」→ 被 auth guard 跳转到登录页 → 导航栏仍然可见

- [ ] **Step 3: 验证认证流程**
  - 注册新用户 → 登录成功 → 跳转到 `/zh/chat/liam`（保持语言）
  - 导航栏切换到最小模式（仅 Logo + 头像）
  - 头像下拉 → 退出登录 → 跳转回首页

- [ ] **Step 4: 验证落地页文案**
  - Hero badge 显示 "AI 爱情关系指导"
  - Trust 板块显示四个维度
  - FAQ 只有 4 条（不含免费问题）
  - Hero 不再显示 "免费开始，无需注册"

- [ ] **Step 5: 运行测试**

```bash
npm test
```

Expected: 所有已有测试通过
