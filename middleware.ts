// ============================================================
// middleware.ts — 根级中间件
// ============================================================
// 合并两大功能：
//   1. Supabase Auth session 刷新（updateSession）
//   2. next-intl 国际化路由（locale redirect / prefix）
//
// 执行顺序：先刷新 session → 再处理国际化路由
// cookie 合并：intl 的 locale cookie 合并到 Supabase response 中
// ============================================================

import createMiddleware from 'next-intl/middleware';
import { type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';

// 创建 next-intl 中间件实例（基于 routing 配置）
const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 1. 刷新 Supabase session（读取和写入 auth cookies）
  const supabaseResponse = await updateSession(request);

  // 2. 执行 next-intl 国际化路由处理
  const intlResponse = intlMiddleware(request);

  // 3. 合并 cookie：将 intl 产生的 cookie 写入 Supabase response
  //    确保 locale cookie 和 auth cookie 都在最终的 response 中
  intlResponse.cookies.getAll().forEach((cookie) => {
    supabaseResponse.cookies.set(cookie.name, cookie.value);
  });

  return supabaseResponse;
}

export const config = {
  // 匹配所有路由，排除：
  //   - api        → API 路由（不需要国际化）
  //   - _next      → Next.js 内部静态资源
  //   - _vercel    → Vercel 内部路径
  //   - .*\\..*    → 静态文件（如 favicon.ico, robots.txt）
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
