/**
 * 首页 / 落地页路由
 *
 * 每个语言路由的首页，渲染 Hero 主视觉组件。
 * 后续任务将在此页追加 Trust、Experts、Cases 等模块。
 */

import { Hero } from '@/components/landing/Hero';

/**
 * 首页组件 — 服务端渲染，从路由参数中提取语言
 */
export default async function LandingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <main>
      <Hero lang={lang} />
    </main>
  );
}
