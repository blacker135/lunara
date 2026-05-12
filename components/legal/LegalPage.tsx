/**
 * LegalPage 法律页面共享容器
 *
 * 为服务条款、隐私政策、退款政策提供统一的布局框架：
 * - 品牌色卡片容器
 * - 标题 + 更新日期
 * - 章节（heading + body）排版
 * - 页脚
 *
 * 服务端组件，内容通过 next-intl getTranslations 获取
 */

import { getTranslations } from 'next-intl/server';
import { Footer } from '@/components/landing/Footer';

/** 法律页面类型 */
type LegalPageKey = 'terms' | 'privacy' | 'refund';

/** 单个章节的 i18n 数据结构 */
interface LegalSection {
  heading: string;
  body: string;
}

/**
 * LegalPage 组件
 * @param pageKey - 法律页面标识，用于从 legal 命名空间读取对应内容
 */
export async function LegalPage({ pageKey }: { pageKey: LegalPageKey }) {
  const t = await getTranslations('legal');

  // 获取标题和更新日期
  const title = t(`${pageKey}.title`);
  const lastUpdated = t(`${pageKey}.lastUpdated`);

  // 通过 raw 方式读取 sections 数组（next-intl 支持 JSON 结构透传）
  const sections = t.raw(`${pageKey}.sections`) as unknown as LegalSection[];

  return (
    <>
      <main className="mx-auto max-w-3xl px-6 py-12">
        {/* 页面标题 */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[#FF7A59]">{title}</h1>
          <p className="mt-2 text-sm text-[#BBBBBB]">{lastUpdated}</p>
        </div>

        {/* 条款章节 */}
        <div className="space-y-8">
          {sections.map((section, index) => (
            <section key={index}>
              <h2 className="mb-3 text-lg font-semibold text-[#333333]">
                {section.heading}
              </h2>
              {/* 按 \n\n 拆分段落，每段渲染为 <p> */}
              {section.body.split('\n\n').map((paragraph, pIndex) => (
                <p
                  key={pIndex}
                  className="mb-3 leading-relaxed text-[#666666]"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </main>

      {/* 页脚 — Footer 通过 useParams() 自行获取 lang */}
      <Footer />
    </>
  );
}
