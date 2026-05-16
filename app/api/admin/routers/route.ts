import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const userId = new URL(request.url).searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const routers = await prisma.router.findMany({
    where: { userId },
    select: { id: true, label: true, host: true, port: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ routers });
}
