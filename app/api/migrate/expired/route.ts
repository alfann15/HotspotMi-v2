import { NextRequest, NextResponse } from 'next/server';
import { getSession, getActiveRouter } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { parseComment } from '@/lib/parser';

// GET — list user expired dari router aktif
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getActiveRouter(session);
  if (!ctx) return NextResponse.json({ error: 'Pilih router terlebih dahulu' }, { status: 400 });

  try {
    const rawUsers = await ctx.client.getList('/ip/hotspot/user');
    const expired = rawUsers
      .map((u: Record<string, string>) => {
        const meta = parseComment(u['comment'] || '');
        return { id: u['.id'], username: u['name'], password: u['password'] || '', profile: u['profile'] || '', comment: u['comment'] || '', meta };
      })
      .filter((u) => u.meta.isVoucher && u.meta.status === 'EXPIRED');

    return NextResponse.json({ expired, total: expired.length });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 503 });
  }
}

// POST — migrasi user expired ke DB
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getActiveRouter(session);
  if (!ctx) return NextResponse.json({ error: 'Pilih router terlebih dahulu' }, { status: 400 });

  const { userIds, deleteFromRouter } = await request.json().catch(() => ({}));
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: 'userIds wajib diisi' }, { status: 422 });
  }

  try {
    const rawUsers = await ctx.client.getList('/ip/hotspot/user');
    const toMigrate = rawUsers.filter((u: Record<string, string>) => userIds.includes(u['.id']));

    const records = toMigrate.map((u: Record<string, string>) => {
      const meta = parseComment(u['comment'] || '');
      return {
        routerId: ctx.router.id,
        userId: session.userId,
        username: u['name'],
        password: u['password'] || '',
        profile: u['profile'] || '',
        profileCode: meta.profileCode || '',
        prefix: meta.prefix || '',
        price: meta.price ?? 0,
        activatedAt: meta.activatedAt ?? null,
        expiredAt: meta.expiredAt ?? null,
      };
    });

    await prisma.voucherHistory.createMany({ data: records, skipDuplicates: true });

    if (deleteFromRouter) {
      for (const u of toMigrate) {
        await ctx.client.removeEntry('/ip/hotspot/user', u['.id']).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, migrated: records.length, deleted: deleteFromRouter ? records.length : 0 });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 503 });
  }
}
