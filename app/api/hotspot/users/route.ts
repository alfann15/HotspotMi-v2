import { NextRequest, NextResponse } from 'next/server';
import { getSession, getActiveRouter } from '@/lib/session';
import { parseComment } from '@/lib/parser';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ctx = await getActiveRouter(session);
  if (!ctx) return NextResponse.json({ error: 'Pilih router terlebih dahulu' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const prefix = searchParams.get('prefix') || '';
  const status = searchParams.get('status') || '';
  const profile = searchParams.get('profile') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  try {
    const rawUsers = await ctx.client.getList('/ip/hotspot/user');
    const users = rawUsers.map((u: Record<string, string>) => ({
      id: u['.id'], username: u['name'], password: u['password'], profile: u['profile'],
      comment: u['comment'] || '', disabled: u['disabled'] === 'true',
      uptime: u['uptime'] || '0s', metadata: parseComment(u['comment'] || ''),
    }));

    let filtered = users;
    if (prefix) filtered = filtered.filter((u) => u.metadata.isVoucher && u.metadata.prefix === prefix.toUpperCase());
    if (status) filtered = filtered.filter((u) => u.metadata.status === status.toUpperCase());
    if (profile) filtered = filtered.filter((u) => u.profile === profile);

    const total = filtered.length;
    return NextResponse.json({
      users: filtered.slice((page - 1) * pageSize, page * pageSize),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      summary: {
        total: users.length,
        new: users.filter((u) => u.metadata.status === 'NEW').length,
        active: users.filter((u) => u.metadata.status === 'ACTIVE').length,
        expired: users.filter((u) => u.metadata.status === 'EXPIRED').length,
      },
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ctx = await getActiveRouter(session);
  if (!ctx) return NextResponse.json({ error: 'Pilih router terlebih dahulu' }, { status: 400 });

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  // Bulk delete via body
  if (!id) {
    const { ids } = await request.json().catch(() => ({}));
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: 'ids required' }, { status: 400 });
    let deleted = 0;
    for (const i of ids) {
      try { await ctx.client.removeEntry('/ip/hotspot/user', i); deleted++; } catch { /* skip */ }
    }
    return NextResponse.json({ success: true, deleted });
  }

  try {
    await ctx.client.removeEntry('/ip/hotspot/user', id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ctx = await getActiveRouter(session);
  if (!ctx) return NextResponse.json({ error: 'Pilih router terlebih dahulu' }, { status: 400 });

  const { id, action, password, profile, disabled } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  try {
    if (action === 'toggle-disable') {
      await ctx.client.updateEntry('/ip/hotspot/user', id, { disabled: disabled ? 'yes' : 'no' });
      return NextResponse.json({ success: true });
    }
    const params: Record<string, string> = {};
    if (password) params.password = password;
    if (profile) params.profile = profile;
    if (Object.keys(params).length === 0) return NextResponse.json({ error: 'Tidak ada yang diubah' }, { status: 400 });
    await ctx.client.updateEntry('/ip/hotspot/user', id, params);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ctx = await getActiveRouter(session);
  if (!ctx) return NextResponse.json({ error: 'Pilih router terlebih dahulu' }, { status: 400 });

  const body = await request.json();
  const { username, password, profile, profileCode, price = 0, comment: customComment } = body;
  if (!username || !profile) return NextResponse.json({ error: 'Username dan profil wajib diisi' }, { status: 422 });

  const { buildVoucherComment } = await import('@/lib/voucher');
  const finalComment = customComment || buildVoucherComment('MANUAL', profileCode || 'custom', price);

  try {
    await ctx.client.addEntry('/ip/hotspot/user', { name: username, password: password || username, profile, comment: finalComment });
    return NextResponse.json({ success: true, username, password: password || username });
  } catch (err: unknown) {
    const e = err as { message?: string };
    if (e.message?.includes('already')) return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 503 });
  }
}
