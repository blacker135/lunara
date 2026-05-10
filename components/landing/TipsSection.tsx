/**
 * TipsSection 情感小贴士组件
 *
 * 展示 3 条实用情感建议卡片，每条可独立收藏。
 * 包含：
 * - 区域标题
 * - 3 张提示卡片（标题 + 描述）
 * - 每张卡片有 "收藏" 按钮，使用本地状态切换
 * - 收藏后显示绿色对勾标记
 * - whileInView 滚动入场动画
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

/**
 * 情感小贴士展示区
 * 3 张可收藏的提示卡片
 */
export function TipsSection() {
  const t = useTranslations('tips');

  // 收藏状态 — key 为卡片索引，value 为是否已收藏
  const [saved, setSaved] = useState<Record<number, boolean>>({});

  const tips = [0, 1, 2].map((i) => ({
    title: t(`items.${i}.title`),
    description: t(`items.${i}.description`),
  }));

  return (
    <section className="py-24 bg-[#FAF7F2]">
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

        {/* 提示卡片列表 */}
        <div className="mt-12 flex flex-col gap-6">
          {tips.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex items-start gap-5 rounded-[24px] bg-white p-6 shadow-soft"
            >
              {/* 左侧内容区 — 标题 + 描述 */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#2B2B2B]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#777777]">
                  {item.description}
                </p>
              </div>

              {/* 右侧收藏按钮 */}
              <button
                onClick={() =>
                  setSaved((prev) => ({ ...prev, [index]: !prev[index] }))
                }
                className={`flex-shrink-0 rounded-[12px] px-4 py-2 text-sm font-medium transition-all ${
                  saved[index]
                    ? 'bg-green-100 text-green-600'
                    : 'bg-[#FF7A59]/10 text-[#FF7A59] hover:bg-[#FF7A59]/20'
                }`}
              >
                {saved[index] ? (
                  <span className="flex items-center gap-1">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    已收藏
                  </span>
                ) : (
                  '收藏'
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
