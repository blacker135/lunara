/**
 * FAQ 手风琴式常见问题组件
 *
 * 展示 4 个手风琴样式的常见问题。
 * 包含：
 * - 区域标题
 * - 手风琴列表，使用 useState 管理展开索引
 * - + 按钮在展开时旋转为 ×
 * - AnimatePresence 实现高度过渡动画
 * - 一次只能展开一个问题（切换打开项时关闭前一项）
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * FAQ 手风琴组件
 * 最多同时展开一项，点击切换展开/折叠
 */
export function FAQ() {
  const t = useTranslations('faq');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // 从 i18n messages 获取常见问题列表
  const items = [0, 1, 2, 3].map((i) => ({
    question: t(`items.${i}.question`),
    answer: t(`items.${i}.answer`),
  }));

  /**
   * 处理手风琴项的点击
   * 点击已展开项时折叠，点击其他项时切换
   */
  const handleToggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section className="py-24">
      <div className="mx-auto max-w-2xl px-6">
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

        {/* 手风琴列表 */}
        <div className="mt-12 flex flex-col gap-3">
          {items.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="overflow-hidden rounded-[24px] bg-white shadow-soft"
              >
                {/* 问题标题栏 — 点击切换展开/折叠 */}
                <button
                  onClick={() => handleToggle(index)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left"
                >
                  <span className="pr-4 text-base font-semibold text-[#2B2B2B]">
                    {item.question}
                  </span>

                  {/* 展开/折叠图标 — 旋转动画 */}
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#FF7A59]/10 text-lg font-light text-[#FF7A59]"
                  >
                    +
                  </motion.span>
                </button>

                {/* 答案区域 — 带高度动画的展开/折叠 */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-sm leading-relaxed text-[#777777]">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
