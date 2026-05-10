/**
 * Testimonials 用户评价组件
 *
 * 展示 3 条用户评价卡片，营造信任感。
 * 包含：
 * - 区域标题
 * - 3 张评价卡片（浅色背景、斜体引用文本、作者署名）
 * - 无星级评分（情感产品不需要量化）
 * - whileInView 滚动入场动画
 */

'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

/**
 * 用户评价展示区
 * 3 张评价卡片，斜体引用 + 上下文说明
 */
export function Testimonials() {
  const t = useTranslations('testimonials');

  const testimonials = [0, 1, 2].map((i) => ({
    quote: t(`items.${i}.quote`),
    author: t(`items.${i}.author`),
    context: t(`items.${i}.context`),
  }));

  return (
    <section className="py-24">
      <div className="mx-auto max-w-4xl px-6">
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
        </motion.div>

        {/* 评价卡片列表 */}
        <div className="mt-12 flex flex-col gap-6">
          {testimonials.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="rounded-[24px] bg-[#FAF7F2] p-8 shadow-soft"
            >
              {/* 引用文本 — 斜体，字号跟随视口放大 */}
              <p className="text-lg leading-relaxed text-[#2B2B2B] italic sm:text-xl">
                &ldquo;{item.quote}&rdquo;
              </p>

              {/* 作者信息 */}
              <div className="mt-4 flex items-center gap-3">
                {/* 作者名 */}
                <span className="text-sm font-semibold text-[#2B2B2B]">
                  {item.author}
                </span>
                {/* 分隔线 */}
                <span className="text-[#CCCCCC]">|</span>
                {/* 上下文说明 */}
                <span className="text-sm text-[#999999]">{item.context}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
