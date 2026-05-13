// app/api/admin/users/route.ts
// GET /api/admin/users — 统一用户列表（搜索/身份筛选/分页）
// 支持参数：search, variant, page, pageSize

import { getAdminUserId } from '@/lib/admin/guard';
import { queryUsers } from '@/lib/stats';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const variant = searchParams.get('variant') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  try {
    const data = await queryUsers({ search, variant: variant || undefined, page, pageSize });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[AdminUsers] 获取用户列表失败:', error);
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }
}
