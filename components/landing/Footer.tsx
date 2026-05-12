/**
 * Footer 页脚组件
 *
 * 简洁的页脚区域，包含：
 * - 品牌标语
 * - 隐私政策 / 服务条款 / 退款政策 / 联系链接
 * - 版权信息
 */

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

/**
 * 页脚组件
 * 从 URL 获取当前语言，构建本地化法律页面链接
 */
export function Footer() {
  const t = useTranslations('footer');
  const { lang } = useParams<{ lang: string }>();

  return (
    <footer className="border-t border-[#E8E0D8] py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          {/* 品牌标语 */}
          <p className="text-sm text-[#999999]">{t('tagline')}</p>

          {/* 链接区 */}
          <div className="flex items-center gap-6">
            <Link href={`/${lang}/privacy`} className="text-sm text-[#999999] transition-colors hover:text-[#FF7A59]">
              {t('privacy')}
            </Link>
            <Link href={`/${lang}/terms`} className="text-sm text-[#999999] transition-colors hover:text-[#FF7A59]">
              {t('terms')}
            </Link>
            <Link href={`/${lang}/refund`} className="text-sm text-[#999999] transition-colors hover:text-[#FF7A59]">
              {t('refund')}
            </Link>
            <Link href="#" className="text-sm text-[#999999] transition-colors hover:text-[#FF7A59]">
              {t('contact')}
            </Link>
          </div>
        </div>

        {/* 版权信息 */}
        <p className="mt-6 text-center text-xs text-[#BBBBBB]">
          {t('copyright')}
        </p>
      </div>
    </footer>
  );
}
