import { NextRequest, NextResponse } from 'next/server';
import { getSession, getActiveRouter } from '@/lib/session';
import { generateVouchers } from '@/lib/voucher';
import { z } from 'zod';

const schema = z.object({
  count: z.number().int().min(1).max(500),
  profile: z.string().min(1),
  profileCode: z.string().min(1),
  prefix: z.string().min(1).max(20),
  price: z.number().int().min(0).default(0),
  sameAsUsername: z.boolean().default(false),
  usernameLength: z.number().int().min(4).max(16).default(8),
  passwordLength: z.number().int().min(4).max(16).default(8),
  format: z.enum(['numeric', 'alphanumeric', 'alpha']).default('alphanumeric'),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ctx = await getActiveRouter(session);
  if (!ctx) return NextResponse.json({ error: 'Pilih router terlebih dahulu' }, { status: 400 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Validation Error' }, { status: 422 });

  const { count, profile, profileCode, prefix, price, sameAsUsername, usernameLength, passwordLength, format } = parsed.data;

  try {
    const existing = await ctx.client.getList('/ip/hotspot/user');
    const existingUsernames = new Set(existing.map((u: Record<string, string>) => u['name']));
    const vouchers = generateVouchers({ count, profileCode, prefix, price, sameAsUsername, usernameLength, passwordLength, format, existingUsernames });

    const results = [];
    for (let i = 0; i < vouchers.length; i += 10) {
      for (const v of vouchers.slice(i, i + 10)) {
        try {
          await ctx.client.addEntry('/ip/hotspot/user', { name: v.username, password: v.password, profile, comment: v.comment });
          results.push({ ...v, success: true });
        } catch { results.push({ ...v, success: false }); }
      }
      if (i + 10 < vouchers.length) await new Promise((r) => setTimeout(r, 100));
    }

    const successful = results.filter((r) => r.success);
    return NextResponse.json({ success: true, generated: successful.length, total: count, vouchers: successful });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 503 });
  }
}
