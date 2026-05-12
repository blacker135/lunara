# 法律页面设计规范

**日期**: 2026-05-12  
**状态**: 已批准  
**范围**: 为 Lunara 添加服务条款、隐私政策、退款政策三个法律页面

---

## 1. 概述

三个法律页面（服务条款、隐私政策、退款政策）仅通过页脚链接进入，导航栏不做入口。页面采用品牌暖色调风格，支持中英双语。

## 2. 路由设计

| 页面 | 英文路径 | 中文路径 |
|------|----------|----------|
| 服务条款 | `/en/terms` | `/zh/terms` |
| 隐私政策 | `/en/privacy` | `/zh/privacy` |
| 退款政策 | `/en/refund` | `/zh/refund` |

## 3. 文件结构

```
app/[lang]/
├── terms/page.tsx              # 服务条款页面（RSC）
├── privacy/page.tsx            # 隐私政策页面（RSC）
├── refund/page.tsx             # 退款政策页面（RSC）

components/legal/
├── LegalPage.tsx               # 共享布局容器（服务端组件）

components/landing/
├── Footer.tsx                  # 更新：替换 # 为实际路由 + 新增退款链接

messages/
├── en.json                     # 新增 legal 命名空间
├── zh.json                     # 新增 legal 命名空间
```

## 4. 组件设计

### 4.1 LegalPage（共享容器）

三个页面结构一致，抽取共享容器 `LegalPage`：

- **Props**: `pageKey: 'terms' | 'privacy' | 'refund'`
- **职责**: 使用 `getTranslations('legal')`（服务端）获取数据，渲染品牌色卡片容器、标题、更新日期、条款章节、页脚
- **类型**: 服务端组件。Footer 自行通过 `useParams()` 获取 `lang`，无需传 prop

### 4.2 页面组件（terms/privacy/refund）

每个页面仅 3-4 行，调用 `LegalPage`：

```tsx
// app/[lang]/terms/page.tsx
import { LegalPage } from '@/components/legal/LegalPage';
export default function TermsPage() {
  return <LegalPage pageKey="terms" />;
}
```

### 4.3 Footer 更新

- 将 `#` 占位符替换为 `/{lang}/terms`、`/{lang}/privacy`（通过 `useParams()` 获取 `lang`）
- 新增第三个链接 `/{lang}/refund`（「退款政策 / Refund Policy」）
- 同时需要在 `footer` 翻译命名空间中新增 `refund` 字段（en: "Refund", zh: "退款政策"）

## 5. i18n 结构

在 `messages/en.json` 和 `zh.json` 中新增 `legal` 命名空间：

```json
{
  "legal": {
    "terms": {
      "title": "Terms of Service",
      "lastUpdated": "Last updated: May 12, 2026",
      "sections": [
        { "heading": "1. Acceptance of Terms", "body": "..." },
        { "heading": "2. Description of Service", "body": "..." }
      ]
    },
    "privacy": { ... },
    "refund": { ... }
  }
}
```

每个页面约 5-8 个章节，每个章节包含 `heading`（string）和 `body`（string）。`body` 为纯文本，段落用 `\n\n` 分隔，渲染时按双换行拆分为 `<p>` 标签。

## 6. 视觉设计

- 延续落地页暖色调品牌风格（主色 `#FF7A59`，边框 `#E8E0D8`）
- 顶部保留全局导航栏，底部放页脚
- 内容区域：`max-w-3xl` 宽度居中，白色圆角卡片容器，内边距充足
- 标题使用品牌色，章节标题用深灰（`#333`），正文用中灰（`#666`），行高 1.8 保证可读性
- 「最后更新日期」以浅灰小字显示在标题下方

## 7. 内容起草

三个法律页面需起草内容。内容需覆盖：

- **服务条款**: 服务描述、用户责任、账户条款、知识产权、免责声明、责任限制、终止条款、适用法律
- **隐私政策**: 信息收集范围、使用方式、数据存储/安全、Cookie、第三方服务、用户权利、儿童隐私、政策更新
- **退款政策**: 退款条件、退款流程、退款时限、不可退款情形、订阅取消、联系渠道

内容在实现阶段用英文起草，随后翻译为中文。

## 8. 不在范围内

- 导航栏不增加法律页面入口
- 不需要「同意条款」的 checkbox 或弹窗交互
- 不需要版本历史或条款变更通知机制
- 不在聊天页面显示页脚
