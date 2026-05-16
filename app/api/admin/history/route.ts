import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return null;
  return session;
}

// GET /api/admin/history?userId=xxx — list semua history
export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const userId = new URL(request.url).searchParams.get('userId');

  const records = await prisma.voucherHistory.findMany({
    where: { ...(userId ? { userId } : {}) },
    include: {
      user: { select: { username: true } },
      router: { select: { label: true, host: true } },
    },
    orderBy: { migratedAt: 'desc' },
    take: 500,
  });

  return NextResponse.json({ records, total: records.length });
}

// PATCH /api/admin/history — reassign ke router lain
export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { ids, routerId } = await request.json().catch(() => ({}));
  if (!Array.isArray(ids) || !routerId) return NextResponse.json({ error: 'ids dan routerId wajib diisi' }, { status: 422 });

  // Verifikasi router ada
  const router = await prisma.router.findUnique({ where: { id: routerId } });
  if (!router) return NextResponse.json({ error: 'Router tidak ditemukan' }, { status: 404 });

  const result = await prisma.voucherHistory.updateMany({
    where: { id: { in: ids } },
    data: { routerId, userId: router.userId },
  });

  return NextResponse.json({ success: true, updated: result.count });
}
