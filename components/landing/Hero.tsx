/**
 * Hero 首页主视觉组件
 *
 * 全屏居中 Hero 区域，包含：
 * - 两层模糊渐变背景光晕（主色调 + 辅色调）
 * - 标签胶囊：AI 情感引导
 * - 大标题（text-balance 避免孤行）
 * - 副标题
 * - CTA 按钮链接到 /[lang]/chat/liam
 * - Framer Motion 入场动画（淡入 + 上滑）
 * - 底部浮动圆点指示器
 */

'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';

/**
 * Hero 组件
 * @param lang - 当前语言代码，用于构建 CTA 链接
 */
export function Hero({ lang }: { lang: string }) {
  const t = useTranslations('hero');

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {/* 背景柔光 — 两层模糊圆形，营造深度感 */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF7A59]/10 blur-3xl" />
        <div className="absolute right-1/4 top-2/3 h-64 w-64 rounded-full bg-[#B8C0FF]/10 blur-3xl" />
      </div>

      {/* 主内容区域 — 入场动画容器 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="max-w-2xl"
      >
        {/* 标签胶囊 */}
        <motion.span
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="inline-block rounded-full border border-[#FF7A59]/20 bg-[#FF7A59]/10 px-4 py-1.5 text-sm font-medium text-[#FF7A59]"
        >
          {t('badge')}
        </motion.span>

        {/* 主标题 */}
        <h1 className="mt-8 text-balance text-4xl font-semibold leading-tight tracking-tight text-[#2B2B2B] sm:text-5xl lg:text-6xl">
          {t('title')}
        </h1>

        {/* 副标题 */}
        <p className="mt-6 text-lg leading-relaxed text-[#777777] sm:text-xl">
          {t('subtitle')}
        </p>

        {/* CTA 按钮 + 底部提示文字 */}
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
          <p className="mt-3 text-sm text-[#999999]">{t('ctaSubtext')}</p>
        </motion.div>
      </motion.div>

      {/* 向下滚动指示器 — 浮动圆点，暗示下方还有内容 */}
      <motion.div
        className="absolute bottom-8"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      >
        <div className="mx-auto h-1.5 w-1.5 rounded-full bg-[#FF7A59]/40" />
      </motion.div>
    </section>
  );
}
