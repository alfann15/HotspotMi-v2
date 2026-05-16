'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cpu, MemoryStick, HardDrive, Clock, Wifi, ArrowDown, ArrowUp, Users } from 'lucide-react';
import { useChartColors } from '@/hooks/use-chart-colors';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatBytes(bytes: number, decimals = 1) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(decimals) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(decimals) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(decimals) + ' KB';
  return bytes + ' B';
}

function formatBps(bps: number) {
  if (bps >= 1000000) return (bps / 1000000).toFixed(1) + ' Mbps';
  if (bps >= 1000) return (bps / 1000).toFixed(0) + ' Kbps';
  return bps + ' bps';
}

interface HistoryPoint { time: string; cpu: number; mem: number; sessions: number; }
interface TrafficPoint { time: string; [key: string]: number | string; }

export default function MonitoringPage() {
  const { data: resource } = useSWR('/api/system/resource', fetcher, { refreshInterval: 5000 });
  const { data: activeData } = useSWR('/api/hotspot/active', fetcher, { refreshInterval: 5000 });
  const { data: ifaceData } = useSWR('/api/system/interfaces', fetcher, { refreshInterval: 3000 });

  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [trafficHistory, setTrafficHistory] = useState<TrafficPoint[]>([]);
  const prevIfaceRef = useRef<Record<string, { rx: number; tx: number; time: number }>>({});
  const c = useChartColors();

  useEffect(() => {
    if (!resource) return;
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const memUsed = resource.totalMemory - resource.freeMemory;
    const memPercent = Math.round((memUsed / resource.totalMemory) * 100);
    const sessions = activeData?.total ?? 0;
    setHistory((prev) => [...prev, { time, cpu: resource.cpuLoad, mem: memPercent, sessions }].slice(-60));
  }, [resource, activeData?.total]);

  useEffect(() => {
    if (!ifaceData?.interfaces?.length) return;
    const now = Date.now();
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const point: TrafficPoint = { time };

    for (const iface of ifaceData.interfaces) {
      const prev = prevIfaceRef.current[iface.name];
      if (prev) {
        const dt = (now - prev.time) / 1000;
        point[`${iface.name}_rx`] = Math.max(0, Math.round((iface.rxBytes - prev.rx) / dt));
        point[`${iface.name}_tx`] = Math.max(0, Math.round((iface.txBytes - prev.tx) / dt));
      }
      prevIfaceRef.current[iface.name] = { rx: iface.rxBytes, tx: iface.txBytes, time: now };
    }

    if (Object.keys(point).length > 1) {
      setTrafficHistory((prev) => [...prev, point].slice(-60));
    }
  }, [ifaceData]);

  const memUsed = resource ? resource.totalMemory - resource.freeMemory : 0;
  const memPercent = resource ? Math.round((memUsed / resource.totalMemory) * 100) : 0;
  const hddUsed = resource ? resource.totalHddSpace - resource.freeHddSpace : 0;
  const hddPercent = resource ? Math.round((hddUsed / resource.totalHddSpace) * 100) : 0;

  // Top users by bandwidth
  const topUsers = [...(activeData?.sessions || [])]
    .sort((a: Record<string, string>, b: Record<string, string>) =>
      (parseInt(b.bytesIn || '0') + parseInt(b.bytesOut || '0')) - (parseInt(a.bytesIn || '0') + parseInt(a.bytesOut || '0'))
    ).slice(0, 5);

  // Interface colors
  const ifaceColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const activeIfaces = ifaceData?.interfaces?.slice(0, 3) || [];

  const statCards = [
    { title: 'CPU', value: `${resource?.cpuLoad ?? '—'}%`, sub: resource?.platform, icon: Cpu, progress: resource?.cpuLoad || 0, color: (resource?.cpuLoad || 0) > 80 ? 'bg-red-500' : 'bg-primary' },
    { title: 'Memory', value: `${memPercent}%`, sub: `${formatBytes(memUsed)} / ${formatBytes(resource?.totalMemory || 0)}`, icon: MemoryStick, progress: memPercent, color: memPercent > 90 ? 'bg-red-500' : 'bg-primary' },
    { title: 'Storage', value: `${hddPercent}%`, sub: `${formatBytes(hddUsed)} / ${formatBytes(resource?.totalHddSpace || 0)}`, icon: HardDrive, progress: hddPercent, color: hddPercent > 90 ? 'bg-red-500' : 'bg-primary' },
    { title: 'Uptime', value: resource?.uptime || '—', sub: `RouterOS v${resource?.version || '—'}`, icon: Clock, progress: null, color: 'bg-primary' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time · refresh 5 detik</p>
        </div>
        <Badge variant="outline" className="gap-1.5 text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </Badge>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ title, value, sub, icon: Icon, progress, color }) => (
          <Card key={title}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
                  <p className="text-2xl font-semibold mt-1 tracking-tight">{value}</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              {progress !== null && (
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${progress}%` }} />
                </div>
              )}
              {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CPU + Memory + Sessions chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">CPU, Memory & Sesi Aktif</CardTitle>
          <CardDescription className="text-xs">{history.length} titik data</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: -15 }}>
                <defs>
                  <linearGradient id="gCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c.primary} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={c.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gMem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c.green} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={c.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: c.mutedForeground }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: c.mutedForeground }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v, n) => [`${v}${n === 'sessions' ? '' : '%'}`, n === 'cpu' ? 'CPU' : n === 'mem' ? 'Memory' : 'Sesi']} contentStyle={{ fontSize: '0.75rem', borderRadius: '0.5rem' }} />
                <Legend formatter={(v) => v === 'cpu' ? 'CPU %' : v === 'mem' ? 'Memory %' : 'Sesi Aktif'} wrapperStyle={{ fontSize: '0.75rem' }} />
                <Area type="monotone" dataKey="cpu" stroke={c.primary} strokeWidth={1.5} fill="url(#gCpu)" dot={false} />
                <Area type="monotone" dataKey="mem" stroke={c.green} strokeWidth={1.5} fill="url(#gMem)" dot={false} />
                <Line type="monotone" dataKey="sessions" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">Mengumpulkan data...</div>
          )}
        </CardContent>
      </Card>

      {/* Interface traffic + Top users */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Interface traffic */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wifi className="h-4 w-4" />Interface Traffic
            </CardTitle>
            <CardDescription className="text-xs">Bandwidth realtime per interface</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Current traffic per interface */}
            <div className="space-y-2 mb-4">
              {activeIfaces.map((iface: Record<string, string | number>, idx: number) => {
                const last = trafficHistory[trafficHistory.length - 1];
                const rx = last ? (last[`${iface.name}_rx`] as number || 0) : 0;
                const tx = last ? (last[`${iface.name}_tx`] as number || 0) : 0;
                return (
                  <div key={String(iface.name)} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ background: ifaceColors[idx] }} />
                      <span className="text-sm font-mono">{String(iface.name)}</span>
                      <Badge variant="outline" className="text-xs">{String(iface.type)}</Badge>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3 text-emerald-500" />{formatBps(rx)}</span>
                      <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3 text-blue-500" />{formatBps(tx)}</span>
                    </div>
                  </div>
                );
              })}
              {activeIfaces.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Tidak ada interface aktif</p>}
            </div>
            {/* Traffic chart */}
            {trafficHistory.length > 1 && activeIfaces.length > 0 && (
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={trafficHistory} margin={{ top: 4, right: 4, bottom: 0, left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: c.mutedForeground }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: c.mutedForeground }} axisLine={false} tickLine={false} tickFormatter={(v) => formatBps(v)} />
                  <Tooltip formatter={(v) => formatBps(v as number)} contentStyle={{ fontSize: '0.7rem', borderRadius: '0.5rem' }} />
                  {activeIfaces.map((iface: Record<string, string | number>, idx: number) => (
                    <Line key={`${iface.name}_rx`} type="monotone" dataKey={`${iface.name}_rx`}
                      stroke={ifaceColors[idx]} strokeWidth={1.5} dot={false} name={`${iface.name} ↓`} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top users */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />Top Users
            </CardTitle>
            <CardDescription className="text-xs">Pengguna dengan bandwidth terbesar saat ini</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {topUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Wifi className="mb-2 h-8 w-8 opacity-30" />
                <p className="text-sm">Tidak ada sesi aktif</p>
              </div>
            ) : (
              <div className="divide-y">
                {topUsers.map((s: Record<string, string>, idx) => {
                  const total = parseInt(s.bytesIn || '0') + parseInt(s.bytesOut || '0');
                  const maxTotal = parseInt(topUsers[0].bytesIn || '0') + parseInt(topUsers[0].bytesOut || '0');
                  const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
                  return (
                    <div key={s.id} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-4">{idx + 1}</span>
                          <span className="text-sm font-medium">{s.user}</span>
                          <span className="text-xs text-muted-foreground font-mono">{s.address}</span>
                        </div>
                        <span className="text-xs font-medium">{formatBytes(total)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex gap-2 text-xs text-muted-foreground shrink-0">
                          <span className="flex items-center gap-0.5"><ArrowDown className="h-3 w-3 text-emerald-500" />{formatBytes(parseInt(s.bytesOut || '0'))}</span>
                          <span className="flex items-center gap-0.5"><ArrowUp className="h-3 w-3 text-blue-500" />{formatBytes(parseInt(s.bytesIn || '0'))}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
