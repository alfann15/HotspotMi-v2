import { NextRequest, NextResponse } from 'next/server';
import { getSession, getActiveRouter } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ctx = await getActiveRouter(session);
  if (!ctx) return NextResponse.json({ error: 'Pilih router terlebih dahulu' }, { status: 400 });

  try {
    const profiles = await ctx.client.getList('/ip/hotspot/profile');
    return NextResponse.json({
      serverProfiles: profiles.map((p: Record<string, string>) => ({
        id: p['.id'], name: p['name'], dnsName: p['dns-name'] || '',
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

  const { name, dnsName } = await request.json();
  if (!name) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 422 });

  try {
    await ctx.client.addEntry('/ip/hotspot/profile', { name, ...(dnsName ? { 'dns-name': dnsName } : {}) });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 503 });
  }
}
