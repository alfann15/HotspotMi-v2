import { NextRequest, NextResponse } from 'next/server';
import { getSession, getActiveRouter } from '@/lib/session';

const DANGEROUS = ['/system/reboot', '/system/shutdown', '/system/reset-configuration'];

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ctx = await getActiveRouter(session);
  if (!ctx) return NextResponse.json({ error: 'Pilih router terlebih dahulu' }, { status: 400 });

  const { command, sentences = [], force = false } = await request.json().catch(() => ({}));
  if (!command) return NextResponse.json({ error: 'Perintah wajib diisi' }, { status: 400 });

  const routerCmd = (command.startsWith('/') ? command : `/${command}`).replace(/\s+/g, '/');
  if (DANGEROUS.some((d) => routerCmd.startsWith(d)) && !force) {
    return NextResponse.json({ requireConfirm: true, command: routerCmd, message: `Perintah "${routerCmd}" berbahaya. Yakin?` });
  }

  try {
    const result = await ctx.client.executeCommand(routerCmd, sentences);
    return NextResponse.json({ success: true, result, command: routerCmd });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ success: false, error: e.message });
  }
}
