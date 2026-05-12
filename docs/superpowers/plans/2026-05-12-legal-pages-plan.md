# 法律页面实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Lunara 添加三个法律页面（服务条款、隐私政策、退款政策），仅通过页脚链接进入，支持中英双语。

**Architecture:** 三个薄页面组件调用共享 `LegalPage` 服务端组件，内容通过 `next-intl` 的 `legal` 命名空间管理。`LegalPage` 负责渲染品牌色卡片容器 + 章节排版 + 页脚。Footer 更新链接并使用 `useParams()` 获取语言前缀。

**Tech Stack:** Next.js 16 App Router, next-intl, Tailwind CSS 4, React 19, TypeScript

---

### Task 1: 起草法律内容 — 英文版

**Files:**
- Modify: `messages/en.json`

- [ ] **Step 1: 在 `messages/en.json` 中添加 `legal` 命名空间和 `footer.refund` 字段**

在 `messages/en.json` 的 `footer` 对象中添加 `"refund": "Refund"`，并在文件末尾（`"membership"` 之后）添加完整的 `legal` 命名空间：

```json
{
  "footer": {
    "tagline": "A space for your emotional world.",
    "privacy": "Privacy",
    "terms": "Terms",
    "refund": "Refund",
    "contact": "Contact",
    "copyright": "© 2025 Lunara. All rights reserved."
  },

  "legal": {
    "terms": {
      "title": "Terms of Service",
      "lastUpdated": "Last updated: May 12, 2026",
      "sections": [
        {
          "heading": "1. Acceptance of Terms",
          "body": "By accessing or using Lunara (\"the Service\"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service."
        },
        {
          "heading": "2. Description of Service",
          "body": "Lunara is an AI-powered relationship guidance platform that provides conversational support through AI personas. The Service is not a substitute for professional therapy, counseling, or medical advice. Our AI experts provide general guidance and emotional support based on relationship psychology frameworks, not clinical diagnosis or treatment."
        },
        {
          "heading": "3. User Responsibilities",
          "body": "You are responsible for maintaining the confidentiality of your account credentials. You agree to use the Service in compliance with all applicable laws. You may not use the Service to upload, transmit, or share any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable. You must be at least 18 years of age to use the Service, or have the consent of a legal guardian."
        },
        {
          "heading": "4. Account and Subscription",
          "body": "Some features of the Service require a paid subscription. Subscription fees are billed in advance on a monthly or yearly basis as selected during checkout. You are responsible for providing accurate billing information. We reserve the right to change subscription fees with reasonable notice."
        },
        {
          "heading": "5. Intellectual Property",
          "body": "The Service, including its design, code, content, branding, and AI personas, is owned by Lunara and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the Service without our prior written consent."
        },
        {
          "heading": "6. Disclaimer of Warranties",
          "body": "The Service is provided \"as is\" without warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, error-free, or completely secure. AI-generated responses are for informational purposes only and should not be considered professional advice."
        },
        {
          "heading": "7. Limitation of Liability",
          "body": "To the maximum extent permitted by law, Lunara shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability shall not exceed the amount you paid us in the twelve months preceding the claim."
        },
        {
          "heading": "8. Termination",
          "body": "We reserve the right to suspend or terminate your account at any time for violation of these terms. You may cancel your subscription at any time through your account settings. Upon termination, your right to use the Service will immediately cease."
        },
        {
          "heading": "9. Changes to Terms",
          "body": "We may update these Terms of Service from time to time. We will notify users of material changes via email or through the Service. Continued use of the Service after changes constitutes acceptance of the updated terms."
        },
        {
          "heading": "10. Governing Law",
          "body": "These terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Lunara operates. Any disputes arising from these terms shall be resolved through binding arbitration where permitted by law."
        }
      ]
    },
    "privacy": {
      "title": "Privacy Policy",
      "lastUpdated": "Last updated: May 12, 2026",
      "sections": [
        {
          "heading": "1. Information We Collect",
          "body": "Account Information: When you sign up, we collect your email address and authentication credentials. These are managed through our authentication provider and we do not have access to your password.\n\nUsage Data: We collect information about your interactions with the Service, including expert selections, message timestamps, and subscription status. We do not store the content of your conversations on our servers.\n\nPayment Information: Payment processing is handled by our payment providers (Lemon Squeezy). We do not collect or store your full credit card details."
        },
        {
          "heading": "2. How We Use Your Information",
          "body": "We use your information to:\n- Provide, maintain, and improve the Service\n- Process your subscription and payments\n- Send service-related communications (e.g., subscription confirmations, account notices)\n- Enforce our Terms of Service and prevent misuse\n- Analyze usage patterns to improve the AI guidance experience"
        },
        {
          "heading": "3. Data Storage and Security",
          "body": "Your account data is stored on secure servers using industry-standard encryption. While we implement reasonable security measures, no method of electronic storage is 100% secure. We continuously monitor our systems for vulnerabilities and respond to security incidents promptly."
        },
        {
          "heading": "4. Cookies and Tracking",
          "body": "We use essential cookies for authentication and session management. We may use analytics cookies to understand how users interact with the Service. You can control cookie preferences through your browser settings. We do not use tracking cookies for advertising purposes."
        },
        {
          "heading": "5. Third-Party Services",
          "body": "We use third-party services for authentication (Better Auth), payment processing (Lemon Squeezy), hosting (Vercel), and database services (Supabase/PostgreSQL). These providers have their own privacy policies and data handling practices. We encourage you to review their policies."
        },
        {
          "heading": "6. Your Rights",
          "body": "Depending on your jurisdiction, you may have the right to:\n- Access the personal data we hold about you\n- Request correction or deletion of your data\n- Object to or restrict certain processing activities\n- Data portability\n- Withdraw consent where processing is based on consent\n\nTo exercise these rights, contact us at the email address provided in the Contact section."
        },
        {
          "heading": "7. Children's Privacy",
          "body": "The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal data, we will delete it promptly."
        },
        {
          "heading": "8. Changes to Privacy Policy",
          "body": "We may update this Privacy Policy from time to time. We will notify users of material changes via email or through the Service. Continued use of the Service after changes constitutes acceptance of the updated policy."
        }
      ]
    },
    "refund": {
      "title": "Refund Policy",
      "lastUpdated": "Last updated: May 12, 2026",
      "sections": [
        {
          "heading": "1. Refund Eligibility",
          "body": "We offer a 14-day money-back guarantee for all new subscription purchases. If you are unsatisfied with the Service for any reason, you may request a full refund within 14 days of your initial purchase date. This guarantee applies once per user."
        },
        {
          "heading": "2. How to Request a Refund",
          "body": "To request a refund, please contact us at the email address provided in the Contact section. Include your account email address and the date of purchase. We process refund requests within 5 business days. Refunds are issued to the original payment method used during purchase."
        },
        {
          "heading": "3. Non-Refundable Situations",
          "body": "Refunds are not available in the following circumstances:\n- More than 14 days have passed since your initial purchase\n- You have previously received a refund from us\n- The refund request is for a subscription renewal (as opposed to initial purchase)\n- You have violated our Terms of Service\n- The purchase was made more than 90 days ago"
        },
        {
          "heading": "4. Subscription Cancellation",
          "body": "You may cancel your subscription at any time through your account settings. Cancellation prevents future billing but does not automatically trigger a refund for the current billing period. After cancellation, you retain access to paid features until the end of your current billing cycle."
        },
        {
          "heading": "5. Chargebacks",
          "body": "If you initiate a chargeback with your payment provider without first contacting us for a refund, we reserve the right to suspend your account while the dispute is pending. We encourage you to reach out to us first so we can resolve the issue directly."
        },
        {
          "heading": "6. Contact",
          "body": "For refund inquiries or any billing questions, please contact us at support@lunara.ai. We aim to respond to all inquiries within 24 hours."
        }
      ]
    }
  }
}
```

**注：** `footer.refund` 插入到 footer 对象中；`legal` 整个命名空间追加到文件末尾（在 `"membership"` 对象闭合的 `}` 之后）。

- [ ] **Step 2: 验证 JSON 格式有效**

```bash
node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'))" && echo "OK"
```

- [ ] **Step 3: Commit**

```bash
git add messages/en.json
git commit -m "feat: add legal content and footer refund key — English"
```

---

### Task 2: 起草法律内容 — 中文版

**Files:**
- Modify: `messages/zh.json`

- [ ] **Step 1: 在 `messages/zh.json` 中添加 `footer.refund` 和 `legal` 命名空间**

```json
{
  "footer": {
    "tagline": "给你的情绪世界一个空间。",
    "privacy": "隐私政策",
    "terms": "服务条款",
    "refund": "退款政策",
    "contact": "联系我们",
    "copyright": "© 2025 Lunara. 保留所有权利。"
  },

  "legal": {
    "terms": {
      "title": "服务条款",
      "lastUpdated": "最后更新：2026年5月12日",
      "sections": [
        {
          "heading": "1. 条款接受",
          "body": "访问或使用 Lunara（以下简称「本服务」），即表示您同意受本服务条款的约束。如果您不同意这些条款，请勿使用本服务。"
        },
        {
          "heading": "2. 服务描述",
          "body": "Lunara 是一个基于人工智能的情感指导平台，通过 AI 角色提供对话支持。本服务不能替代专业的心理治疗、咨询或医疗建议。我们的 AI 专家基于关系心理学框架提供一般性指导和情感支持，而非临床诊断或治疗。"
        },
        {
          "heading": "3. 用户责任",
          "body": "您有责任维护账户凭据的机密性。您同意在遵守所有适用法律的前提下使用本服务。您不得使用本服务上传、传播或分享任何非法、有害、威胁性、辱骂性、骚扰性、诽谤性或其他令人反感的内容。您必须年满 18 岁，或在法定监护人的同意下使用本服务。"
        },
        {
          "heading": "4. 账户与订阅",
          "body": "本服务的部分功能需要付费订阅。订阅费用按您在结账时选择的月度或年度方式预先收取。您有责任提供准确的账单信息。我们保留在合理通知后调整订阅费用的权利。"
        },
        {
          "heading": "5. 知识产权",
          "body": "本服务，包括其设计、代码、内容、品牌和 AI 角色，归 Lunara 所有，并受知识产权法保护。未经我们事先书面同意，您不得复制、修改、分发或基于本服务创作衍生作品。"
        },
        {
          "heading": "6. 免责声明",
          "body": "本服务按「现状」提供，不作任何明示或暗示的保证。我们不保证服务不会中断、完全无错误或绝对安全。AI 生成的回复仅供参考，不应视为专业建议。"
        },
        {
          "heading": "7. 责任限制",
          "body": "在法律允许的最大范围内，Lunara 不对因使用本服务而产生的任何间接、偶然、特殊、后果性或惩罚性损害赔偿承担责任。我们的总责任不超过您在索赔前十二个月内向我们支付的金额。"
        },
        {
          "heading": "8. 终止",
          "body": "我们保留在您违反本条款时随时暂停或终止您账户的权利。您可以随时通过账户设置取消订阅。终止后，您使用本服务的权利将立即终止。"
        },
        {
          "heading": "9. 条款变更",
          "body": "我们可能会不时更新本服务条款。我们将通过电子邮件或通过服务通知用户重大变更。变更后继续使用本服务即表示接受更新后的条款。"
        },
        {
          "heading": "10. 适用法律",
          "body": "本条款受 Lunara 运营所在地司法管辖区的法律管辖并依其解释。在法律允许的情况下，因本条款引起的任何争议应通过有约束力的仲裁解决。"
        }
      ]
    },
    "privacy": {
      "title": "隐私政策",
      "lastUpdated": "最后更新：2026年5月12日",
      "sections": [
        {
          "heading": "1. 我们收集的信息",
          "body": "账户信息：当您注册时，我们收集您的电子邮件地址和认证凭据。这些信息由我们的认证提供商管理，我们无法访问您的密码。\n\n使用数据：我们收集您与服务的交互信息，包括专家选择、消息时间戳和订阅状态。我们不会将您的对话内容存储在我们的服务器上。\n\n支付信息：支付处理由我们的支付提供商（Lemon Squeezy）处理。我们不收集或存储您的完整信用卡信息。"
        },
        {
          "heading": "2. 我们如何使用您的信息",
          "body": "我们将您的信息用于：\n- 提供、维护和改进本服务\n- 处理您的订阅和支付\n- 发送与服务相关的通信（例如，订阅确认、账户通知）\n- 执行我们的服务条款并防止滥用\n- 分析使用模式以改善 AI 指导体验"
        },
        {
          "heading": "3. 数据存储与安全",
          "body": "您的账户数据使用行业标准加密存储在安全服务器上。虽然我们实施了合理的安全措施，但没有一种电子存储方式是 100% 安全的。我们持续监控系统漏洞并及时响应安全事件。"
        },
        {
          "heading": "4. Cookie 与追踪",
          "body": "我们使用必要的 Cookie 进行身份验证和会话管理。我们可能使用分析 Cookie 来了解用户如何与本服务交互。您可以通过浏览器设置控制 Cookie 偏好。我们不使用追踪 Cookie 进行广告目的。"
        },
        {
          "heading": "5. 第三方服务",
          "body": "我们使用第三方服务进行身份验证（Better Auth）、支付处理（Lemon Squeezy）、托管（Vercel）和数据库服务（Supabase/PostgreSQL）。这些提供商有其自己的隐私政策和数据处理方式。我们建议您查看他们的政策。"
        },
        {
          "heading": "6. 您的权利",
          "body": "根据您的司法管辖区，您可能有权：\n- 访问我们持有的关于您的个人数据\n- 请求更正或删除您的数据\n- 反对或限制某些处理活动\n- 数据可移植性\n- 在基于同意的处理中撤回同意\n\n如需行使这些权利，请通过「联系我们」部分提供的电子邮件地址与我们联系。"
        },
        {
          "heading": "7. 儿童隐私",
          "body": "本服务不面向 18 岁以下的个人。我们不会故意收集儿童的个人信息。如果我们发现儿童向我们提供了个人数据，我们将立即删除。"
        },
        {
          "heading": "8. 隐私政策变更",
          "body": "我们可能会不时更新本隐私政策。我们将通过电子邮件或通过服务通知用户重大变更。变更后继续使用本服务即表示接受更新后的政策。"
        }
      ]
    },
    "refund": {
      "title": "退款政策",
      "lastUpdated": "最后更新：2026年5月12日",
      "sections": [
        {
          "heading": "1. 退款资格",
          "body": "我们为所有新订阅购买提供 14 天退款保证。如果您因任何原因对服务不满意，可以在首次购买之日起 14 天内申请全额退款。此保证每位用户仅限使用一次。"
        },
        {
          "heading": "2. 如何申请退款",
          "body": "如需申请退款，请通过「联系我们」部分提供的电子邮件地址与我们联系。请提供您的账户电子邮件地址和购买日期。我们在 5 个工作日内处理退款申请。退款将退回至购买时使用的原始支付方式。"
        },
        {
          "heading": "3. 不可退款情形",
          "body": "以下情况不提供退款：\n- 自首次购买已超过 14 天\n- 您之前已从我们处获得过退款\n- 退款申请针对的是续费（而非首次购买）\n- 您违反了我们的服务条款\n- 购买已超过 90 天"
        },
        {
          "heading": "4. 订阅取消",
          "body": "您可以随时通过账户设置取消订阅。取消可防止未来扣费，但不会自动触发当前计费周期的退款。取消后，您在当前计费周期结束前仍可继续使用付费功能。"
        },
        {
          "heading": "5. 退单",
          "body": "如果您在未先联系我们申请退款的情况下向支付提供商发起退单（chargeback），我们保留在争议处理期间暂停您账户的权利。我们建议您先联系我们，以便直接解决问题。"
        },
        {
          "heading": "6. 联系方式",
          "body": "有关退款咨询或任何账单问题，请通过 support@lunara.ai 与我们联系。我们的目标是在 24 小时内回复所有咨询。"
        }
      ]
    }
  }
}
```

- [ ] **Step 2: 验证 JSON 格式有效**

```bash
node -e "JSON.parse(require('fs').readFileSync('messages/zh.json','utf8'))" && echo "OK"
```

- [ ] **Step 3: Commit**

```bash
git add messages/zh.json
git commit -m "feat: add legal content and footer refund key — Chinese"
```

---

### Task 3: 创建 LegalPage 共享容器组件

**Files:**
- Create: `components/legal/LegalPage.tsx`

- [ ] **Step 1: 创建 `components/legal/LegalPage.tsx`**

```tsx
/**
 * LegalPage 法律页面共享容器
 *
 * 为服务条款、隐私政策、退款政策提供统一的布局框架：
 * - 品牌色卡片容器
 * - 标题 + 更新日期
 * - 章节（heading + body）排版
 * - 页脚
 *
 * 服务端组件，内容通过 next-intl getTranslations 获取
 */

import { getTranslations } from 'next-intl/server';
import { Footer } from '@/components/landing/Footer';

/** 法律页面类型 */
type LegalPageKey = 'terms' | 'privacy' | 'refund';

/** 单个章节的 i18n 数据结构 */
interface LegalSection {
  heading: string;
  body: string;
}

/**
 * LegalPage 组件
 * @param pageKey - 法律页面标识，用于从 legal 命名空间读取对应内容
 */
export async function LegalPage({ pageKey }: { pageKey: LegalPageKey }) {
  const t = await getTranslations('legal');

  // 获取当前页面的章节数组（next-intl 对数组结构的 key 支持有限，转为读取完整内容）
  const title = t(`${pageKey}.title`);
  const lastUpdated = t(`${pageKey}.lastUpdated`);

  // 通过 raw 方式读取 sections 数组（next-intl 支持 JSON 结构透传）
  const sections = t.raw(`${pageKey}.sections`) as unknown as LegalSection[];

  return (
    <>
      <main className="mx-auto max-w-3xl px-6 py-12">
        {/* 页面标题 */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[#FF7A59]">{title}</h1>
          <p className="mt-2 text-sm text-[#BBBBBB]">{lastUpdated}</p>
        </div>

        {/* 条款章节 */}
        <div className="space-y-8">
          {sections.map((section, index) => (
            <section key={index}>
              <h2 className="mb-3 text-lg font-semibold text-[#333333]">
                {section.heading}
              </h2>
              {/* 按 \n\n 拆分段落，每段渲染为 <p> */}
              {section.body.split('\n\n').map((paragraph, pIndex) => (
                <p
                  key={pIndex}
                  className="mb-3 leading-relaxed text-[#666666]"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </main>

      {/* 页脚 — Footer 通过 useParams() 自行获取 lang */}
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/legal/LegalPage.tsx
git commit -m "feat: add LegalPage shared container component"
```

---

### Task 4: 创建三个法律页面路由

**Files:**
- Create: `app/[lang]/terms/page.tsx`
- Create: `app/[lang]/privacy/page.tsx`
- Create: `app/[lang]/refund/page.tsx`

- [ ] **Step 1: 创建 `app/[lang]/terms/page.tsx`**

```tsx
// app/[lang]/terms — 服务条款页面
import { LegalPage } from '@/components/legal/LegalPage';

export default function TermsPage() {
  return <LegalPage pageKey="terms" />;
}
```

- [ ] **Step 2: 创建 `app/[lang]/privacy/page.tsx`**

```tsx
// app/[lang]/privacy — 隐私政策页面
import { LegalPage } from '@/components/legal/LegalPage';

export default function PrivacyPage() {
  return <LegalPage pageKey="privacy" />;
}
```

- [ ] **Step 3: 创建 `app/[lang]/refund/page.tsx`**

```tsx
// app/[lang]/refund — 退款政策页面
import { LegalPage } from '@/components/legal/LegalPage';

export default function RefundPage() {
  return <LegalPage pageKey="refund" />;
}
```

- [ ] **Step 4: Commit**

```bash
git add app/[lang]/terms/page.tsx app/[lang]/privacy/page.tsx app/[lang]/refund/page.tsx
git commit -m "feat: add terms, privacy, and refund page routes"
```

---

### Task 5: 更新 Footer 链接

**Files:**
- Modify: `components/landing/Footer.tsx`

- [ ] **Step 1: 将 Footer 中的 `#` 占位符替换为真实路由，新增退款链接**

编辑 `components/landing/Footer.tsx`，将 `href="#"` 替换为通过 `useParams` 构建的实际路径：

```tsx
/**
 * Footer 页脚组件
 *
 * 简洁的页脚区域，包含：
 * - 品牌标语
 * - 隐私政策 / 服务条款 / 退款政策 / 联系链接
 * - 版权信息
 */

'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

/**
 * 页脚组件
 * 从 URL 获取当前语言，构建本地化法律页面链接
 */
export function Footer() {
  const t = useTranslations('footer');
  const { lang } = useParams<{ lang: string }>();

  return (
    <footer className="border-t border-[#E8E0D8] py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          {/* 品牌标语 */}
          <p className="text-sm text-[#999999]">{t('tagline')}</p>

          {/* 链接区 */}
          <div className="flex items-center gap-6">
            <a href={`/${lang}/privacy`} className="text-sm text-[#999999] transition-colors hover:text-[#FF7A59]">
              {t('privacy')}
            </a>
            <a href={`/${lang}/terms`} className="text-sm text-[#999999] transition-colors hover:text-[#FF7A59]">
              {t('terms')}
            </a>
            <a href={`/${lang}/refund`} className="text-sm text-[#999999] transition-colors hover:text-[#FF7A59]">
              {t('refund')}
            </a>
            <a href="#" className="text-sm text-[#999999] transition-colors hover:text-[#FF7A59]">
              {t('contact')}
            </a>
          </div>
        </div>

        {/* 版权信息 */}
        <p className="mt-6 text-center text-xs text-[#BBBBBB]">
          {t('copyright')}
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/landing/Footer.tsx
git commit -m "feat: wire footer links to legal pages, add refund link"
```

---

### Task 6: 验证

- [ ] **Step 1: 构建项目确认无编译错误**

```bash
npm run build
```
预期：构建成功，无 TypeScript 或路由错误。

- [ ] **Step 2: 启动开发服务器并手动验证页面**

```bash
npm run dev
```

在浏览器中验证以下 URL 可以正常渲染：
- `http://localhost:3000/en/terms` — 英文服务条款
- `http://localhost:3000/en/privacy` — 英文隐私政策
- `http://localhost:3000/en/refund` — 英文退款政策
- `http://localhost:3000/zh/terms` — 中文服务条款
- `http://localhost:3000/zh/privacy` — 中文隐私政策
- `http://localhost:3000/zh/refund` — 中文退款政策

验证首页页脚链接指向正确的法律页面。

- [ ] **Step 3: Commit（如有修改）**

如有任何修复，提交。否则无需操作。

---

## 任务依赖图

```
Task 1 (en content)  ──┐
                       ├──> Task 3 (LegalPage) ──> Task 4 (routes) ──> Task 6 (verify)
Task 2 (zh content)  ──┘                                    │
                                                            │
                       Task 5 (Footer update) ──────────────┘
```

- Task 1 和 Task 2 可并行执行（无依赖）
- Task 3 依赖 Task 1/2（LegalPage 需要 legal 命名空间存在）
- Task 4 依赖 Task 3
- Task 5 可与 Task 3/4 并行（仅依赖 messages 中 footer.refund 字段，Task 1/2 已覆盖）
- Task 6 最后执行
