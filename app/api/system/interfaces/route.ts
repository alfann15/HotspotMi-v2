import { NextResponse } from 'next/server';
import { getSession, getActiveRouter } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ctx = await getActiveRouter(session);
  if (!ctx) return NextResponse.json({ error: 'Pilih router terlebih dahulu' }, { status: 400 });

  try {
    const ifaces = await ctx.client.getList('/interface');
    return NextResponse.json({
      interfaces: ifaces
        .filter((i: Record<string, string>) => i['running'] === 'true')
        .map((i: Record<string, string>) => ({
          name: i['name'],
          type: i['type'],
          rxBytes: parseInt(i['rx-byte'] || '0'),
          txBytes: parseInt(i['tx-byte'] || '0'),
          rxPackets: parseInt(i['rx-packet'] || '0'),
          txPackets: parseInt(i['tx-packet'] || '0'),
        })),
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 503 });
  }
}
