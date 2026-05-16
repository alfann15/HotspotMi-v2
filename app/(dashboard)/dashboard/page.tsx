'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Cpu, MemoryStick, Clock, Wifi, Users, TrendingUp, Ticket, Zap, AlertTriangle, Database, Download, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useChartColors } from '@/hooks/use-chart-colors';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}
function formatRupiah(n: number) { return 'Rp ' + n.toLocaleString('id-ID'); }

export default function DashboardPage() {
  const { data: resource, isLoading } = useSWR('/api/system/resource', fetcher, { refreshInterval: 10000 });
  const { data: usersData } = useSWR('/api/hotspot/users?pageSize=1', fetcher, { refreshInterval: 15000 });
  const { data: activeData } = useSWR('/api/hotspot/active', fetcher, { refreshInterval: 10000 });
  const { data: summary, mutate: mutateSummary } = useSWR('/api/dashboard/summary', fetcher, { refreshInterval: 30000 });
  const [cpuHistory, setCpuHistory] = useState<{ time: string; cpu: number; mem: number }[]>([]);
  const [installingScript, setInstallingScript] = useState(false);
  const [kickingAll, setKickingAll] = useState(false);
  const c = useChartColors();

  useEffect(() => {
    if (resource?.cpuLoad !== undefined) {
      const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const memUsed = resource.totalMemory - resource.freeMemory;
      const memPercent = Math.round((memUsed / resource.totalMemory) * 100);
      setCpuHistory((prev) => [...prev, { time, cpu: resource.cpuLoad, mem: memPercent }].slice(-20));
    }
  }, [resource?.cpuLoad]);

  const memUsed = resource ? resource.totalMemory - resource.freeMemory : 0;
  const memPercent = resource ? Math.round((memUsed / resource.totalMemory) * 100) : 0;

  const handleInstallScript = async () => {
    setInstallingScript(true);
    const res = await fetch('/api/system/setup', { method: 'POST' });
    const d = await res.json();
    if (res.ok) toast.success(d.message || 'Script berhasil di-install');
    else toast.error(d.error || 'Gagal install script');
    setInstallingScript(false);
  };

  const handleKickAll = async () => {
    if (!activeData?.sessions?.length) { toast.info('Tidak ada sesi aktif'); return; }
    if (!confirm(`Kick semua ${activeData.total} sesi aktif?`)) return;
    setKickingAll(true);
    for (const s of activeData.sessions) {
      await fetch(`/api/hotspot/active?id=${s.id}`, { method: 'DELETE' }).catch(() => {});
    }
    toast.success('Semua sesi berhasil di-kick');
    setKickingAll(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {resource?.boardName ? `${resource.boardName} · RouterOS v${resource.version}` : 'Overview sistem MikroTik'}
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Live
        </Badge>
      </div>

      {/* Alert expired */}
      {summary?.expiredCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span><strong>{summary.expiredCount}</strong> user expired di router belum dimigrasi ke database</span>
          </div>
          <Button size="sm" variant="outline" asChild className="border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10">
            <Link href="/migrate">Migrasi <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <Button asChild variant="outline" className="h-auto flex-col gap-1.5 py-4">
          <Link href="/vouchers">
            <Ticket className="h-5 w-5" />
            <span className="text-xs font-medium">Generate Voucher</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-1.5 py-4" onClick={handleKickAll} disabled={kickingAll}>
          {kickingAll ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
          <span className="text-xs font-medium">Kick All ({activeData?.total ?? 0})</span>
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-1.5 py-4" onClick={handleInstallScript} disabled={installingScript}>
          {installingScript ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          <span className="text-xs font-medium">Install Script</span>
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
        )) : <>
          {[
            { title: 'CPU Load', value: `${resource?.cpuLoad ?? '—'}%`, sub: resource?.platform, icon: Cpu, progress: resource?.cpuLoad || 0 },
            { title: 'Memory', value: `${memPercent}%`, sub: `${formatBytes(memUsed)} / ${formatBytes(resource?.totalMemory || 0)}`, icon: MemoryStick, progress: memPercent },
            { title: 'Sesi Aktif', value: activeData?.total ?? '—', sub: `${usersData?.summary?.total ?? '—'} total user`, icon: Wifi, progress: null },
            { title: 'Uptime', value: resource?.uptime || '—', sub: `RouterOS v${resource?.version || '—'}`, icon: Clock, progress: null },
          ].map(({ title, value, sub, icon: Icon, progress }) => (
            <Card key={title}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
                    <p className="text-2xl font-semibold mt-1 tracking-tight">{value}</p>
                    {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                {progress !== null && (
                  <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </>}
      </div>

      {/* Revenue today + Voucher status */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pendapatan Hari Ini</p>
                <p className="text-2xl font-semibold mt-1 tracking-tight">
                  {summary ? formatRupiah(summary.revenueToday) : <Skeleton className="h-7 w-28" />}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">dari voucher yang diaktifkan hari ini</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <Button variant="ghost" size="sm" className="mt-3 -ml-2 h-7 text-xs" asChild>
              <Link href="/reports">Lihat laporan <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Status Voucher</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                <Link href="/vouchers">+ Generate <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {usersData?.summary ? (
              [
                { label: 'Belum Dipakai', value: usersData.summary.new, color: 'bg-blue-500' },
                { label: 'Aktif', value: usersData.summary.active, color: 'bg-emerald-500' },
                { label: 'Expired', value: usersData.summary.expired, color: 'bg-red-500' },
              ].map(({ label, value, color }) => {
                const pct = usersData.summary.total > 0 ? Math.round((value / usersData.summary.total) * 100) : 0;
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">{value} <span className="text-muted-foreground">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            ) : <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>}
          </CardContent>
        </Card>
      </div>

      {/* Chart + Recent activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">CPU & Memory History</CardTitle>
            <CardDescription className="text-xs">{cpuHistory.length} titik data</CardDescription>
          </CardHeader>
          <CardContent>
            {cpuHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={cpuHistory} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c.primary} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={c.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gMem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c.green} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={c.green} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: c.mutedForeground }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: c.mutedForeground }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: '0.75rem', borderRadius: '0.5rem' }} formatter={(v, n) => [`${v}%`, n === 'cpu' ? 'CPU' : 'Memory']} />
                  <Area type="monotone" dataKey="cpu" stroke={c.primary} strokeWidth={1.5} fill="url(#gCpu)" dot={false} />
                  <Area type="monotone" dataKey="mem" stroke={c.green} strokeWidth={1.5} fill="url(#gMem)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">Mengumpulkan data...</div>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Aktivitas Terbaru</CardTitle>
            <CardDescription className="text-xs">Voucher yang baru diaktifkan</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!summary ? (
              <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : summary.recentActivity?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <CheckCircle className="mb-2 h-7 w-7 opacity-30" />
                <p className="text-xs">Belum ada aktivitas</p>
              </div>
            ) : (
              <div className="divide-y">
                {summary.recentActivity.map((a: { username: string; profile: string; prefix: string; price: number; activatedAt: string }, i: number) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.username}</p>
                      <p className="text-xs text-muted-foreground">{a.profile} · {a.prefix || '—'}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      {a.price > 0 && <p className="text-xs font-medium">{formatRupiah(a.price)}</p>}
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.activatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active sessions */}
      {activeData?.sessions?.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-medium">Sesi Aktif</CardTitle>
              <CardDescription className="text-xs">{activeData.total} pengguna online</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link href="/hotspot/active">Lihat semua <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  {['User', 'IP', 'Uptime', 'Download', 'Upload'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeData.sessions.slice(0, 5).map((s: Record<string, string>) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{s.user}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{s.address}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.uptime}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatBytes(parseInt(s.bytesOut || '0'))}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatBytes(parseInt(s.bytesIn || '0'))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
