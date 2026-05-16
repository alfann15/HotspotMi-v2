import { NextRequest, NextResponse } from 'next/server';
import { getSession, getActiveRouter } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ctx = await getActiveRouter(session);
  if (!ctx) return NextResponse.json({ error: 'Pilih router terlebih dahulu' }, { status: 400 });

  try {
    const active = await ctx.client.getList('/ip/hotspot/active');
    const sessions = active.map((s: Record<string, string>) => ({
      id: s['.id'], user: s['user'], address: s['address'], macAddress: s['mac-address'],
      loginBy: s['login-by'], uptime: s['uptime'], bytesIn: s['bytes-in'], bytesOut: s['bytes-out'],
      sessionTimeLeft: s['session-time-left'],
    }));
    return NextResponse.json({ sessions, total: sessions.length });
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

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  try {
    await ctx.client.removeEntry('/ip/hotspot/active', id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 503 });
  }
}
