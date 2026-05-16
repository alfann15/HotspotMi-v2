import { NextRequest, NextResponse } from 'next/server';
import { getSession, getActiveRouter } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ctx = await getActiveRouter(session);
  if (!ctx) return NextResponse.json({ error: 'Pilih router terlebih dahulu' }, { status: 400 });

  try {
    const profiles = await ctx.client.getList('/ip/hotspot/user/profile');
    return NextResponse.json({
      profiles: profiles.map((p: Record<string, string>) => ({
        id: p['.id'], name: p['name'], rateLimit: p['rate-limit'] || 'unlimited',
        sharedUsers: p['shared-users'] || '1', sessionTimeout: p['session-timeout'] || 'unlimited',
        idleTimeout: p['idle-timeout'] || 'unlimited',
      })),
    });
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
  try {
    await ctx.client.addEntry('/ip/hotspot/user/profile', {
      name: body.name, 'rate-limit': body.rateLimit || '',
      'shared-users': String(body.sharedUsers || 1),
      'session-timeout': body.sessionTimeout || '', 'idle-timeout': body.idleTimeout || '',
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 503 });
  }
}
