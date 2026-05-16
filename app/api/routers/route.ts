import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/crypto';
import { createMikrotikClient } from '@/lib/mikrotik';
import { signToken } from '@/lib/jwt';
import { z } from 'zod';

const schema = z.object({
  label: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(8728),
  username: z.string().min(1),
  password: z.string().default(''),
});

// GET — list router milik user + yang di-share ke user ini
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ownRouters = await prisma.router.findMany({
    where: session.role === 'ADMIN' ? {} : { userId: session.userId },
    select: { id: true, label: true, host: true, port: true, username: true, createdAt: true, userId: true, sharedWith: { select: { userId: true, user: { select: { username: true } }, id: true } } },
    orderBy: { createdAt: 'desc' },
  });

  // Router yang di-share ke user ini (bukan miliknya)
  const sharedAccess = session.role === 'USER' ? await prisma.routerAccess.findMany({
    where: { userId: session.userId },
    include: { router: { select: { id: true, label: true, host: true, port: true, username: true, createdAt: true, userId: true } } },
  }) : [];

  const sharedRouters = sharedAccess.map((a) => ({ ...a.router, isShared: true, sharedWith: [] }));
  const routers = [
    ...ownRouters.map((r) => ({ ...r, isShared: false })),
    ...sharedRouters,
  ];

  return NextResponse.json({ routers, activeRouterId: session.activeRouterId });
}

// POST — tambah router baru
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid' }, { status: 422 });

  const { label, host, port, username, password } = parsed.data;
  const client = createMikrotikClient({ host, port, user: username, password, timeout: 8000 });
  try {
    await client.testConnection();
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message || 'Gagal terhubung ke router' }, { status: 503 });
  }

  const router = await prisma.router.create({
    data: { userId: session.userId, label, host, port, username, passwordEncrypted: encrypt(password) },
    select: { id: true, label: true, host: true, port: true, username: true },
  });
  return NextResponse.json({ router });
}

// DELETE — hapus router
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  await prisma.router.deleteMany({
    where: { id, ...(session.role === 'USER' ? { userId: session.userId } : {}) },
  });
  return NextResponse.json({ success: true });
}

// PATCH — pilih router aktif ATAU share/unshare
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  // Share router ke user lain
  if (body.action === 'share') {
    const { routerId, targetUserId } = body;
    if (!routerId || !targetUserId) return NextResponse.json({ error: 'routerId dan targetUserId wajib diisi' }, { status: 400 });

    // Hanya pemilik atau admin yang bisa share
    const router = await prisma.router.findFirst({ where: { id: routerId, ...(session.role === 'USER' ? { userId: session.userId } : {}) } });
    if (!router) return NextResponse.json({ error: 'Router tidak ditemukan' }, { status: 404 });

    await prisma.routerAccess.upsert({
      where: { routerId_userId: { routerId, userId: targetUserId } },
      create: { routerId, userId: targetUserId },
      update: {},
    });
    return NextResponse.json({ success: true });
  }

  // Unshare
  if (body.action === 'unshare') {
    const { routerId, targetUserId } = body;
    await prisma.routerAccess.deleteMany({ where: { routerId, userId: targetUserId } });
    return NextResponse.json({ success: true });
  }

  // Pilih router aktif
  const { routerId } = body;
  if (!routerId) return NextResponse.json({ error: 'routerId required' }, { status: 400 });

  const router = await prisma.router.findFirst({
    where: {
      id: routerId,
      ...(session.role === 'USER' ? {
        OR: [{ userId: session.userId }, { sharedWith: { some: { userId: session.userId } } }],
      } : {}),
    },
  });
  if (!router) return NextResponse.json({ error: 'Router tidak ditemukan' }, { status: 404 });

  const newToken = signToken({ userId: session.userId, username: session.username, role: session.role, activeRouterId: routerId });
  const res = NextResponse.json({ success: true, router: { id: router.id, label: router.label } });
  res.cookies.set('auth_token', newToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24, path: '/' });
  return res;
}
