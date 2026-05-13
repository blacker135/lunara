// ExpertAvatar — 可复用专家头像组件
// 用彩色圆形 + 名字首字母替换 emoji 图标（🟦🟩🟨🟥）
// 被 WelcomeCard（Task 2）和 ExpertSwitchPanel（Task 3）复用

import type { ExpertId } from '@/lib/prompts/experts';
import { EXPERT_META } from '@/lib/prompts/experts';

/** 专家首字母映射 */
const EXPERT_INITIAL: Record<ExpertId, string> = {
  evan: 'E',
  liam: 'L',
  noah: 'N',
  adrian: 'A',
};

/** ExpertAvatar 属性 */
interface ExpertAvatarProps {
  expert: ExpertId;
  /** 尺寸: 'sm' = h-12 w-12, 'md' = h-16 w-16, 'lg' = h-20 w-20 */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** 尺寸→Tailwind 样式映射 */
const SIZE_CLASSES = {
  sm: 'h-12 w-12 text-xl',
  md: 'h-16 w-16 text-2xl',
  lg: 'h-20 w-20 text-4xl',
} as const;

/** 获取指定尺寸对应的 Tailwind 响应式类名 */
function getSizeClasses(size: 'sm' | 'md' | 'lg') {
  return SIZE_CLASSES[size];
}

/**
 * ExpertAvatar — 专家彩色圆形头像
 *
 * 渲染一个填满专家主题色的圆形容器，中央显示专家名字的首字母。
 * 支持 sm/md/lg 三种尺寸和额外的 className 扩展。
 *
 * @param expert - 专家标识符
 * @param size - 尺寸等级，默认 'md'
 * @param className - 附加的自定义 CSS 类名
 */
export function ExpertAvatar({ expert, size = 'md', className = '' }: ExpertAvatarProps) {
  const meta = EXPERT_META[expert] || EXPERT_META.liam;
  const initial = EXPERT_INITIAL[expert] || 'L';
  const sizeClasses = getSizeClasses(size);

  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold text-white select-none ${sizeClasses} ${className}`}
      style={{ backgroundColor: meta.color }}
      aria-label={`${expert} avatar`}
    >
      {initial}
    </div>
  );
}
