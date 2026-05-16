import { NextResponse } from 'next/server';
import { getSession, getActiveRouter } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ctx = await getActiveRouter(session);
  if (!ctx) return NextResponse.json({ error: 'Pilih router terlebih dahulu' }, { status: 400 });

  try {
    const resources = await ctx.client.getList('/system/resource');
    const data = resources[0] as Record<string, string>;
    return NextResponse.json({
      boardName: data['board-name'] || 'Unknown', platform: data['platform'] || 'Unknown',
      version: data['version'] || 'Unknown', uptime: data['uptime'] || '0s',
      cpuLoad: parseInt(data['cpu-load'] || '0'),
      totalMemory: parseInt(data['total-memory'] || '0'), freeMemory: parseInt(data['free-memory'] || '0'),
      totalHddSpace: parseInt(data['total-hdd-space'] || '0'), freeHddSpace: parseInt(data['free-hdd-space'] || '0'),
      architecture: data['architecture-name'] || 'Unknown',
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 503 });
  }
}
