/**
 * CaseStudies 常见问题案例组件
 *
 * 展示 6 个常见情感问题卡片，让用户产生共鸣。
 * 包含：
 * - 区域标题和副标题
 * - 💬 图标 + 问题的卡片网格（3 列桌面布局）
 * - 点击链接到 /[lang]/chat/liam?q=问题文本
 * - 悬停边框变为主色调
 * - whileInView 交错入场动画
 */

'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';

/**
 * 常见问题案例展示区
 * 6 个问题卡片，点击可跳转到 Liam 对话页并预填问题
 * @param lang - 当前语言代码
 */
export function CaseStudies({ lang }: { lang: string }) {
  const t = useTranslations('cases');

  // 从 i18n messages 获取前 6 个问题
  const questions = [0, 1, 2, 3, 4, 5].map((i) => ({
    question: t(`items.${i}.question`),
    summary: t(`items.${i}.summary`),
    tag: t(`items.${i}.tag`),
  }));

  return (
    <section className="py-24 bg-[#FAF7F2]">
      <div className="mx-auto max-w-6xl px-6">
        {/* 区域标题 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="text-3xl font-semibold text-[#2B2B2B] sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-3 text-lg text-[#777777]">{t('subtitle')}</p>
        </motion.div>

        {/* 问题卡片网格 — 3 列桌面布局 */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {questions.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              <Link
                href={`/${lang}/chat/liam?q=${encodeURIComponent(item.question)}`}
                className="group block rounded-[24px] border border-transparent bg-white p-6 shadow-soft transition-all hover:border-[#FF7A59]/30 hover:shadow-lg"
              >
                {/* 标签 + 图标 */}
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-lg">💬</span>
                  <span className="rounded-full bg-[#FF7A59]/10 px-3 py-0.5 text-xs font-medium text-[#FF7A59]">
                    {item.tag}
                  </span>
                </div>

                {/* 问题 */}
                <h3 className="text-lg font-semibold text-[#2B2B2B] group-hover:text-[#FF7A59] transition-colors">
                  {item.question}
                </h3>

                {/* 摘要 */}
                <p className="mt-2 text-sm leading-relaxed text-[#777777]">
                  {item.summary}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
