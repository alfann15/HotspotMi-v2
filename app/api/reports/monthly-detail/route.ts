import { NextRequest, NextResponse } from 'next/server';
import { getSession, getActiveRouter } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { parseComment, PROFILE_LABELS } from '@/lib/parser';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ctx = await getActiveRouter(session);
  if (!ctx) return NextResponse.json({ error: 'Pilih router terlebih dahulu' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return NextResponse.json({ error: 'Parameter tidak valid' }, { status: 400 });

  // Data dari router
  let routerVouchers: { username: string; password: string; profile: string; meta: ReturnType<typeof parseComment> }[] = [];
  try {
    const rawUsers = await ctx.client.getList('/ip/hotspot/user');
    routerVouchers = rawUsers
      .map((u: Record<string, string>) => ({ username: u['name'], password: u['password'] || '', profile: u['profile'] || '', meta: parseComment(u['comment'] || '') }))
      .filter(({ meta }) => {
        if (!meta.isVoucher) return false;
        if (meta.status === 'NEW') return meta.createdAt.getFullYear() === year && meta.createdAt.getMonth() + 1 === month;
        const d = meta.activatedAt || meta.createdAt;
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });
  } catch { /* router offline */ }

  // Data dari DB (expired yang dimigrasi)
  const { getAccessibleRouterIds } = await import('@/lib/session');
  const accessibleIds = await getAccessibleRouterIds(session);

  const dbRecords = await prisma.voucherHistory.findMany({
    where: {
      routerId: { in: accessibleIds },
      OR: [
        { activatedAt: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } },
        { expiredAt: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } },
        { activatedAt: null, expiredAt: null, migratedAt: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } },
      ],
    },
  });

  // Gabungkan
  const allVouchers = [
    ...routerVouchers.map((v) => ({ username: v.username, password: v.password, profile: v.profile, profileLabel: PROFILE_LABELS[v.meta.profileCode] || v.meta.profileCode, prefix: v.meta.prefix, status: v.meta.status, price: v.meta.price ?? 0, createdAt: v.meta.createdAt.toISOString(), activatedAt: v.meta.activatedAt?.toISOString() || null, source: 'router' })),
    ...dbRecords.map((r: any) => ({ username: r.username, password: r.password, profile: r.profile, profileLabel: PROFILE_LABELS[r.profileCode] || r.profileCode, prefix: r.prefix, status: 'EXPIRED', price: r.price ?? 0, createdAt: r.migratedAt.toISOString(), activatedAt: r.activatedAt?.toISOString() || null, source: 'db' })),
  ];

  const summary = {
    total: allVouchers.length,
    new: allVouchers.filter((v) => v.status === 'NEW').length,
    active: allVouchers.filter((v) => v.status === 'ACTIVE').length,
    expired: allVouchers.filter((v) => v.status === 'EXPIRED').length,
    revenue: allVouchers.filter((v) => v.status !== 'NEW').reduce((s, v) => s + v.price, 0),
  };

  const prefixMap: Record<string, { total: number; revenue: number }> = {};
  for (const v of allVouchers) {
    const k = v.prefix || '(tanpa prefix)';
    if (!prefixMap[k]) prefixMap[k] = { total: 0, revenue: 0 };
    prefixMap[k].total++;
    if (v.status !== 'NEW') prefixMap[k].revenue += v.price;
  }

  const profileMap: Record<string, { total: number; sold: number; revenue: number }> = {};
  for (const v of allVouchers) {
    const k = v.profile || '(tanpa profil)';
    if (!profileMap[k]) profileMap[k] = { total: 0, sold: 0, revenue: 0 };
    profileMap[k].total++;
    if (v.status !== 'NEW') { profileMap[k].sold++; profileMap[k].revenue += v.price; }
  }

  return NextResponse.json({
    year, month,
    monthName: new Date(year, month - 1, 1).toLocaleString('id-ID', { month: 'long' }),
    summary,
    byPrefix: Object.entries(prefixMap).map(([prefix, d]) => ({ prefix, ...d })).sort((a, b) => b.total - a.total),
    byProfile: Object.entries(profileMap).map(([profile, d]) => ({ profile, ...d })).sort((a, b) => b.sold - a.sold),
    vouchers: allVouchers,
  });
}
