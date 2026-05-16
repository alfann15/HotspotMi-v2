import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import { createMikrotikClient } from '@/lib/mikrotik';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { routerId } = await request.json().catch(() => ({}));
  if (!routerId) return NextResponse.json({ error: 'routerId required' }, { status: 400 });

  const router = await prisma.router.findFirst({
    where: { id: routerId, ...(session.role === 'USER' ? { userId: session.userId } : {}) },
  });
  if (!router) return NextResponse.json({ error: 'Router tidak ditemukan' }, { status: 404 });

  const start = Date.now();
  try {
    const client = createMikrotikClient({
      host: router.host, port: router.port,
      user: router.username, password: decrypt(router.passwordEncrypted),
      timeout: 5000,
    });
    await client.testConnection();
    return NextResponse.json({ online: true, latency: Date.now() - start });
  } catch (err: unknown) {
    const e = err as { message?: string; type?: string };
    return NextResponse.json({ online: false, error: e.message, type: e.type });
  }
}
