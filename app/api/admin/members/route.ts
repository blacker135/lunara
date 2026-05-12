// app/api/admin/members/route.ts
// GET /api/admin/members — 会员列表（按等级筛选/分页）
// POST /api/admin/members — 批量导出 CSV

import { getAdminUserId } from '@/lib/admin/guard';
import { queryMembers } from '@/lib/stats';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const variantName = searchParams.get('variant') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  try {
    const data = await queryMembers({
      variantName: variantName || undefined,
      page,
      pageSize,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[AdminMembers] 获取会员列表失败:', error);
    return NextResponse.json({ error: '获取会员列表失败' }, { status: 500 });
  }
}

// POST: 批量导出会员数据为 CSV
export async function POST(req: NextRequest) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { variantName } = await req.json();

  const data = await queryMembers({
    variantName: variantName || undefined,
    page: 1,
    pageSize: 10000,
  });

  const header = '姓名,邮箱,等级,消息数,注册时间';
  const rows = data.members.map(
    (m) =>
      `${m.name},${m.email},${m.variantName ?? '-'},${m.messageCount},${m.createdAt}`,
  );
  const csv = [header, ...rows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename=members.csv',
    },
  });
}
