import { NextResponse } from 'next/server';
import { getSession, getActiveRouter } from '@/lib/session';
import { parseComment } from '@/lib/parser';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ctx = await getActiveRouter(session);
  if (!ctx) return NextResponse.json({ error: 'Pilih router terlebih dahulu' }, { status: 400 });

  try {
    const rawUsers = await ctx.client.getList('/ip/hotspot/user');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let revenueToday = 0;
    let expiredCount = 0;
    const recentActivity: { username: string; profile: string; prefix: string; price: number; activatedAt: string }[] = [];

    for (const u of rawUsers) {
      const meta = parseComment(u['comment'] || '');
      if (!meta.isVoucher) continue;

      if (meta.status === 'EXPIRED') expiredCount++;

      if (meta.status === 'ACTIVE' && meta.activatedAt) {
        if (meta.activatedAt >= today) {
          revenueToday += meta.price ?? 0;
        }
        recentActivity.push({
          username: u['name'],
          profile: u['profile'] || '',
          prefix: meta.prefix,
          price: meta.price ?? 0,
          activatedAt: meta.activatedAt.toISOString(),
        });
      }
    }

    // Sort by activatedAt desc, take 5
    recentActivity.sort((a, b) => new Date(b.activatedAt).getTime() - new Date(a.activatedAt).getTime());

    return NextResponse.json({
      revenueToday,
      expiredCount,
      recentActivity: recentActivity.slice(0, 5),
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 503 });
  }
}
