/**
 * ExpertSection 专家展示区组件
 *
 * 落地页的专家展示区域，包含：
 * - 区域标题和副标题（从 i18n messages 获取）
 * - 4 张专家卡片的网格布局（2 列 / 响应式）
 * - Framer Motion whileInView 滚动触发入场动画（交错延迟）
 */

'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ExpertCard } from '@/components/landing/ExpertCard';

/** 四位专家的 ID 列表 */
const EXPERT_IDS = ['evan', 'liam', 'noah', 'adrian'] as const;

/**
 * 专家展示区
 * 显示四位情感顾问的网格，每张卡片链接到对应对话页
 * @param lang - 当前语言代码
 */
export function ExpertSection({ lang }: { lang: string }) {
  const t = useTranslations('experts');

  return (
    <section className="py-24">
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

        {/* 专家卡片网格 — 2 列桌面布局，移动端单列 */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {EXPERT_IDS.map((id, index) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <ExpertCard
                id={id}
                name={t(`${id}.name`)}
                title={t(`${id}.role`)}
                description={t(`${id}.description`)}
                tagline={t(`${id}.specialty`)}
                lang={lang}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
