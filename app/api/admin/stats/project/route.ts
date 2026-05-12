// app/api/admin/stats/project/route.ts
// GET /api/admin/stats/project — 项目数据统计

import { getAdminUserId } from '@/lib/admin/guard';
import {
  queryDAUSeries,
  queryMessageSeries,
  queryTotalConversations,
  queryTotalMessages,
  queryExpertDistribution,
  queryPaymentSeries,
  queryRetentionSeries,
} from '@/lib/stats';
import type { DateRange } from '@/lib/stats';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start') || new Date().toISOString().slice(0, 10);
  const end = searchParams.get('end') || new Date().toISOString().slice(0, 10);

  const range: DateRange = { start, end };

  try {
    const [
      dauSeries,
      messageSeries,
      totalConversations,
      totalMessages,
      expertDist,
      paymentSeries,
    ] = await Promise.all([
      queryDAUSeries(range),
      queryMessageSeries(range),
      queryTotalConversations(),
      queryTotalMessages(),
      queryExpertDistribution(),
      queryPaymentSeries(range),
    ]);

    // 查询留存率序列 [d1, d7, d30]，从数组中提取各天数据
    const retentionSeries = await queryRetentionSeries(start, [1, 7, 30]);
    const findRate = (day: number) =>
      retentionSeries.find((r) => r.dayN === day)?.rate ?? 0;

    return NextResponse.json({
      dauSeries,
      messageSeries,
      totalConversations,
      totalMessages,
      expertDistribution: expertDist,
      paymentSeries,
      retention: {
        d1: findRate(1),
        d7: findRate(7),
        d30: findRate(30),
      },
    });
  } catch (error) {
    console.error('[AdminStatsProject] 获取项目统计失败:', error);
    return NextResponse.json({ error: '获取项目统计失败' }, { status: 500 });
  }
}
