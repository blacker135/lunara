// app/api/admin/users/route.ts
// GET /api/admin/users — 用户列表（搜索/筛选/分页）

import { getAdminUserId } from '@/lib/admin/guard';
import { queryUsers } from '@/lib/stats';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  try {
    const data = await queryUsers({ search, page, pageSize });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[AdminUsers] 获取用户列表失败:', error);
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }
}
