import { NextResponse } from 'next/server';
import { getSession, getActiveRouter } from '@/lib/session';

const ON_LOGIN_SCRIPT = `
:local uname $user;
:local ucomment [/ip hotspot user get [find name=$uname] comment];
:if ([:typeof $ucomment] = "str" && [:pick $ucomment 0 3] = "vc-") do={
  :local findNew [:find $ucomment "-NEW"];
  :if ([:typeof $findNew] = "num") do={
    :local len [:len $ucomment];
    :local newcomment ([:pick $ucomment 0 ($len - 3)] . "ACTIVE");
    /ip hotspot user set [find name=$uname] comment=$newcomment;
    :local parts [:toarray ""];
    :local current $ucomment;
    :local dashIdx [:find $current "-"];
    :while ([:typeof $dashIdx] = "num") do={
      :set parts ($parts, [:pick $current 0 $dashIdx]);
      :set current [:pick $current ($dashIdx + 1) [:len $current]];
      :set dashIdx [:find $current "-"];
    }
    :set parts ($parts, $current);
    :local profileCode ($parts->([:len $parts] - 3));
    :local interval "";
    :if ($profileCode = "1m")  do={ :set interval "00:01:00" }
    :if ($profileCode = "1h")  do={ :set interval "01:00:00" }
    :if ($profileCode = "2h")  do={ :set interval "02:00:00" }
    :if ($profileCode = "4h")  do={ :set interval "04:00:00" }
    :if ($profileCode = "8h")  do={ :set interval "08:00:00" }
    :if ($profileCode = "1d")  do={ :set interval "1d00:00:00" }
    :if ($profileCode = "3d")  do={ :set interval "3d00:00:00" }
    :if ($profileCode = "7d")  do={ :set interval "7d00:00:00" }
    :if ($profileCode = "14d") do={ :set interval "14d00:00:00" }
    :if ($profileCode = "30d") do={ :set interval "30d00:00:00" }
    :if ($interval != "") do={
      :local schedName ("exp-" . $uname);
      :if ([:len [/system scheduler find name=$schedName]] > 0) do={
        /system scheduler remove [find name=$schedName];
      }
      :local ev (":local u \\"" . $uname . "\\"; /ip hotspot user disable [find name=\\$u]; /ip hotspot active remove [find user=\\$u]; :local c [/ip hotspot user get [find name=\\$u] comment]; /ip hotspot user set [find name=\\$u] comment=([:pick \\$c 0 ([:len \\$c]-6)] . \\"EXPIRED\\"); /system scheduler remove [find name=\\"exp-\\$u\\"];");
      /system scheduler add name=$schedName interval=$interval on-event=$ev;
    }
  }
}
`;

const INJECT_MARKER = '# HotspotMi:managed';

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ctx = await getActiveRouter(session);
  if (!ctx) return NextResponse.json({ error: 'Pilih router terlebih dahulu' }, { status: 400 });

  try {
    const profiles = await ctx.client.getList('/ip/hotspot/user/profile');
    for (const profile of profiles) {
      let base = (profile['on-login'] ?? '').trim();
      if (base.includes(INJECT_MARKER)) base = base.split(INJECT_MARKER)[0].trim();
      const newScript = [base, INJECT_MARKER, ON_LOGIN_SCRIPT.trim()].filter(Boolean).join('\n');
      await ctx.client.updateEntry('/ip/hotspot/user/profile', profile['.id'], { 'on-login': newScript });
    }
    return NextResponse.json({ success: true, message: `Script di-install ke ${profiles.length} profil.` });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 503 });
  }
}
