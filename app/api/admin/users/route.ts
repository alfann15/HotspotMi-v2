import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return null;
  return session;
}

const createSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'USER']).default('USER'),
});

// GET /api/admin/users
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, createdAt: true, _count: { select: { routers: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ users });
}

// POST /api/admin/users — buat user baru
export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Data tidak valid', issues: parsed.error.issues }, { status: 422 });

  const { username, password, role } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, password: hashed, role },
    select: { id: true, username: true, role: true, createdAt: true },
  });
  return NextResponse.json({ user });
}

// DELETE /api/admin/users?id=xxx
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  if (id === admin.userId) return NextResponse.json({ error: 'Tidak bisa hapus akun sendiri' }, { status: 400 });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

// PATCH /api/admin/users — reset password
export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, password, role } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (password) data.password = await bcrypt.hash(password, 10);
  if (role) data.role = role;

  const user = await prisma.user.update({ where: { id }, data, select: { id: true, username: true, role: true } });
  return NextResponse.json({ user });
}
