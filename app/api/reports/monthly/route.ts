import { NextRequest, NextResponse } from 'next/server';
import { getSession, getActiveRouter } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { parseComment, PROFILE_LABELS } from '@/lib/parser';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getActiveRouter(session);
  if (!ctx) return NextResponse.json({ error: 'Pilih router terlebih dahulu' }, { status: 400 });

  const year = parseInt(new URL(request.url).searchParams.get('year') || String(new Date().getFullYear()));

  const monthlyData: Record<number, { total: number; new: number; active: number; expired: number; revenue: number; byProfile: Record<string, number> }> = {};
  for (let m = 1; m <= 12; m++) monthlyData[m] = { total: 0, new: 0, active: 0, expired: 0, revenue: 0, byProfile: {} };

  // 1. Data dari router (NEW + ACTIVE)
  try {
    const rawUsers = await ctx.client.getList('/ip/hotspot/user');
    const vouchers = rawUsers
      .map((u: Record<string, string>) => parseComment(u['comment'] || ''))
      .filter((m) => m.isVoucher);

    for (const meta of vouchers) {
      if (meta.status === 'NEW') {
        const m = meta.createdAt.getMonth() + 1;
        if (meta.createdAt.getFullYear() === year && monthlyData[m]) { monthlyData[m].total++; monthlyData[m].new++; }
      } else if (meta.status === 'ACTIVE' || meta.status === 'EXPIRED') {
        const usedDate = meta.activatedAt || meta.createdAt;
        const m = usedDate.getMonth() + 1;
        if (usedDate.getFullYear() === year && monthlyData[m]) {
          monthlyData[m].total++;
          if (meta.status === 'ACTIVE') monthlyData[m].active++; else monthlyData[m].expired++;
          monthlyData[m].revenue += meta.price ?? 0;
          const label = PROFILE_LABELS[meta.profileCode] || meta.profileCode;
          monthlyData[m].byProfile[label] = (monthlyData[m].byProfile[label] || 0) + 1;
        }
      }
    }
  } catch { /* router mungkin offline, lanjut dari DB */ }

  // 2. Data dari DB — semua router yang bisa diakses user (milik + shared)
  const { getAccessibleRouterIds } = await import('@/lib/session');
  const accessibleIds = await getAccessibleRouterIds(session);

  const dbRecords = await prisma.voucherHistory.findMany({
    where: {
      routerId: { in: accessibleIds },
      OR: [
        { activatedAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
        { expiredAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
        { activatedAt: null, expiredAt: null, migratedAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
      ],
    },
  });

  for (const rec of dbRecords) {
    const usedDate = rec.activatedAt || rec.expiredAt || rec.migratedAt;
    if (!usedDate) continue;
    const m = usedDate.getMonth() + 1;
    if (usedDate.getFullYear() === year && monthlyData[m]) {
      monthlyData[m].total++; monthlyData[m].expired++;
      monthlyData[m].revenue += rec.price ?? 0;
      const label = PROFILE_LABELS[rec.profileCode] || rec.profileCode;
      monthlyData[m].byProfile[label] = (monthlyData[m].byProfile[label] || 0) + 1;
    }
  }

  const months = Object.entries(monthlyData).map(([m, d]) => ({
    month: parseInt(m),
    monthName: new Date(year, parseInt(m) - 1, 1).toLocaleString('id-ID', { month: 'long' }),
    ...d,
  }));

  const yearly = {
    total: months.reduce((s, m) => s + m.total, 0),
    revenue: months.reduce((s, m) => s + m.revenue, 0),
    new: months.reduce((s, m) => s + m.new, 0),
    active: months.reduce((s, m) => s + m.active, 0),
    expired: months.reduce((s, m) => s + m.expired, 0),
  };

  return NextResponse.json({ year, yearly, months });
}
