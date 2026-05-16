import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });

  // Ambil info router aktif jika ada
  let activeRouter = null;
  if (session.activeRouterId) {
    activeRouter = await prisma.router.findUnique({
      where: { id: session.activeRouterId },
      select: { id: true, label: true, host: true, port: true, username: true },
    });
  }

  return NextResponse.json({
    authenticated: true,
    userId: session.userId,
    username: session.username,
    role: session.role,
    activeRouter,
  });
}
