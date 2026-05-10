/**
 * 首页 / 落地页路由
 *
 * 每个语言路由的首页，渲染完整落地页：
 * Hero → ExpertSection → CaseStudies → Testimonials → TipsSection → FAQ → Footer
 */

import { Hero } from '@/components/landing/Hero';
import { ExpertSection } from '@/components/landing/ExpertSection';
import { CaseStudies } from '@/components/landing/CaseStudies';
import { Testimonials } from '@/components/landing/Testimonials';
import { TipsSection } from '@/components/landing/TipsSection';
import { FAQ } from '@/components/landing/FAQ';
import { Footer } from '@/components/landing/Footer';

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
      <ExpertSection lang={lang} />
      <CaseStudies lang={lang} />
      <Testimonials />
      <TipsSection />
      <FAQ />
      <Footer />
    </main>
  );
}
