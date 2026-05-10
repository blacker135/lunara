/**
 * ExpertCard 专家卡片组件
 *
 * 单个专家的展示卡片，包含：
 * - 抽象头像（颜色圆形 + EXPERT_META 中的 emoji）
 * - 专家名称
 * - 彩色头衔
 * - 一句话介绍（引用样式）
 * - 标签语
 * - "与专家对话" 按钮，链接到 /[lang]/chat/[expert]
 * - Framer Motion 悬停动画（上移 + 阴影增强）
 */

'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { EXPERT_META } from '@/lib/prompts/experts';

/**
 * ExpertCard 属性
 */
interface ExpertCardProps {
  id: string;
  name: string;
  title: string;
  description: string;
  tagline: string;
  lang: string;
}

/**
 * 单个专家卡片
 * 使用 EXPERT_META 获取颜色和 emoji 进行视觉区分
 */
export function ExpertCard({ id, name, title, description, tagline, lang }: ExpertCardProps) {
  const meta = EXPERT_META[id as keyof typeof EXPERT_META];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group relative overflow-hidden rounded-[24px] bg-white p-6 shadow-soft transition-shadow hover:shadow-lg"
    >
      {/* 顶部彩色指示条 */}
      <div
        className="absolute left-0 top-0 h-1 w-full"
        style={{ backgroundColor: meta.color }}
      />

      {/* 专家头像区域 — 模糊光晕 + 彩色圆形 + emoji */}
      <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
        {/* 模糊光晕背景 */}
        <div
          className="h-14 w-14 rounded-full opacity-20 blur-md"
          style={{ backgroundColor: meta.color }}
        />
        {/* 实色圆形 + emoji */}
        <div
          className="absolute flex h-12 w-12 items-center justify-center rounded-full text-2xl"
          style={{ backgroundColor: `${meta.color}20` }}
        >
          {meta.emoji}
        </div>
      </div>

      {/* 专家名称 */}
      <h3 className="text-xl font-semibold text-[#2B2B2B]">{name}</h3>

      {/* 彩色头衔 */}
      <p className="mt-0.5 text-sm font-medium" style={{ color: meta.color }}>
        {title}
      </p>

      {/* 一句话介绍（引用样式） */}
      <p className="mt-3 text-sm leading-relaxed text-[#777777]">
        &ldquo;{description}&rdquo;
      </p>

      {/* 标签语 */}
      <p className="mt-2 text-xs text-[#999999]">{tagline}</p>

      {/* CTA 按钮 — 链接到对应专家的对话页 */}
      <Link
        href={`/${lang}/chat/${id}`}
        className="mt-4 inline-block rounded-[12px] px-4 py-2 text-sm font-medium transition-colors"
        style={{
          backgroundColor: `${meta.color}10`,
          color: meta.color,
        }}
      >
        Talk to {name.split(' ')[0]} &rarr;
      </Link>
    </motion.div>
  );
}
