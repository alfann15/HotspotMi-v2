'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wifi, WifiOff, Loader2, Search, ArrowUpDown, RefreshCw, Zap } from 'lucide-react';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatBytes(bytes: number) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

// Parse "1h30m20s" atau "2d3h" ke detik
function parseUptime(uptime: string): number {
  let total = 0;
  const d = uptime.match(/(\d+)d/); if (d) total += parseInt(d[1]) * 86400;
  const h = uptime.match(/(\d+)h/); if (h) total += parseInt(h[1]) * 3600;
  const m = uptime.match(/(\d+)m/); if (m) total += parseInt(m[1]) * 60;
  const s = uptime.match(/(\d+)s/); if (s) total += parseInt(s[1]);
  return total;
}

// Parse session time left ke detik
function parseTimeLeft(t: string): number | null {
  if (!t || t === 'none') return null;
  return parseUptime(t);
}

interface Session {
  id: string; user: string; address: string; macAddress: string;
  uptime: string; bytesIn: string; bytesOut: string; loginBy: string;
  sessionTimeLeft: string;
}

export default function ActiveSessionsPage() {
  const { data, isLoading, mutate } = useSWR('/api/hotspot/active', fetcher, { refreshInterval: 10000 });
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [kickingAll, setKickingAll] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'uptime' | 'download' | 'upload' | 'user'>('uptime');
  const [countdown, setCountdown] = useState(10);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { mutate(); return 10; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [mutate]);

  const handleKick = async (id: string, user: string) => {
    setKickingId(id);
    const res = await fetch(`/api/hotspot/active?id=${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success(`${user} berhasil di-kick`); mutate(); }
    else toast.error('Gagal kick sesi');
    setKickingId(null);
  };

  const handleKickAll = async () => {
    if (!confirm(`Kick semua ${data?.total} sesi?`)) return;
    setKickingAll(true);
    for (const s of data?.sessions || []) {
      await fetch(`/api/hotspot/active?id=${s.id}`, { method: 'DELETE' }).catch(() => {});
    }
    toast.success('Semua sesi di-kick');
    mutate();
    setKickingAll(false);
  };

  const sessions: Session[] = data?.sessions || [];

  const filtered = sessions
    .filter((s) => !search || s.user.toLowerCase().includes(search.toLowerCase()) || s.address.includes(search))
    .sort((a, b) => {
      if (sortBy === 'uptime') return parseUptime(b.uptime) - parseUptime(a.uptime);
      if (sortBy === 'download') return parseInt(b.bytesOut || '0') - parseInt(a.bytesOut || '0');
      if (sortBy === 'upload') return parseInt(b.bytesIn || '0') - parseInt(a.bytesIn || '0');
      return a.user.localeCompare(b.user);
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Sesi Aktif</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? 'Memuat...' : `${data?.total ?? 0} pengguna online`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Refresh dalam {countdown}s
          </div>
          <Button variant="outline" size="sm" onClick={() => { mutate(); setCountdown(10); }}>
            <RefreshCw className="mr-2 h-4 w-4" />Refresh
          </Button>
          {sessions.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleKickAll} disabled={kickingAll}>
              {kickingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Kick Semua
            </Button>
          )}
        </div>
      </div>

      {/* Filter & sort */}
      {sessions.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Cari username atau IP..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-44">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="uptime">Sort: Uptime</SelectItem>
              <SelectItem value="download">Sort: Download</SelectItem>
              <SelectItem value="upload">Sort: Upload</SelectItem>
              <SelectItem value="user">Sort: Username</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Sessions */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><div className="h-24 animate-pulse rounded bg-muted" /></CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <WifiOff className="mb-3 h-10 w-10 opacity-30" />
            <p className="font-medium">{search ? 'Tidak ada hasil' : 'Tidak ada sesi aktif'}</p>
            <p className="text-xs mt-1">{search ? 'Coba kata kunci lain' : 'Semua pengguna sedang offline'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const totalBytes = parseInt(s.bytesIn || '0') + parseInt(s.bytesOut || '0');
            const timeLeft = parseTimeLeft(s.sessionTimeLeft);
            const uptimeSec = parseUptime(s.uptime);

            // Progress sisa waktu (jika ada session time left)
            const sessionProgress = timeLeft !== null && uptimeSec > 0
              ? Math.round((uptimeSec / (uptimeSec + timeLeft)) * 100)
              : null;

            return (
              <Card key={s.id} className="group relative overflow-hidden">
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
                        <Wifi className="h-4 w-4 text-emerald-500" />
                        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm leading-tight">{s.user}</p>
                        <p className="text-xs text-muted-foreground font-mono">{s.address}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={kickingId === s.id} onClick={() => handleKick(s.id, s.user)}>
                      {kickingId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Kick'}
                    </Button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="rounded-lg bg-muted/50 p-2 text-center">
                      <p className="text-xs text-muted-foreground">Uptime</p>
                      <p className="text-xs font-semibold mt-0.5 truncate">{s.uptime}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2 text-center">
                      <p className="text-xs text-muted-foreground">↓ DL</p>
                      <p className="text-xs font-semibold mt-0.5">{formatBytes(parseInt(s.bytesOut || '0'))}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2 text-center">
                      <p className="text-xs text-muted-foreground">↑ UL</p>
                      <p className="text-xs font-semibold mt-0.5">{formatBytes(parseInt(s.bytesIn || '0'))}</p>
                    </div>
                  </div>

                  {/* Session time progress */}
                  {sessionProgress !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Sisa waktu</span>
                        <span>{s.sessionTimeLeft}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${sessionProgress > 80 ? 'bg-red-500' : sessionProgress > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${sessionProgress}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <Badge variant="outline" className="text-xs">{s.loginBy || 'hotspot'}</Badge>
                    <p className="text-xs text-muted-foreground font-mono">{s.macAddress}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
