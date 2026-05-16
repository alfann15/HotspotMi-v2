'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, Loader2, MoveRight } from 'lucide-react';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface HistoryRecord {
  id: string; username: string; profile: string; prefix: string;
  price: number; migratedAt: string;
  user: { username: string } | null;
  router: { label: string; host: string } | null;
}

export default function AdminHistoryPage() {
  const { data, isLoading, mutate } = useSWR('/api/admin/history', fetcher);
  const { data: usersData } = useSWR('/api/admin/users', fetcher);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetRouterId, setTargetRouterId] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  // Ambil router dari user yang dipilih
  const { data: routersData } = useSWR(
    selectedUserId ? `/api/admin/routers?userId=${selectedUserId}` : null,
    fetcher
  );

  const records: HistoryRecord[] = data?.records || [];

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => {
    if (selected.size === records.length) setSelected(new Set());
    else setSelected(new Set(records.map((r) => r.id)));
  };

  const handleReassign = async () => {
    if (selected.size === 0 || !targetRouterId) {
      toast.warning('Pilih data dan router tujuan');
      return;
    }
    setReassigning(true);
    try {
      const res = await fetch('/api/admin/history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected), routerId: targetRouterId }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(`${d.updated} data berhasil dipindahkan`);
        setSelected(new Set());
        setTargetRouterId('');
        mutate();
      } else toast.error(d.error || 'Gagal memindahkan data');
    } catch { toast.error('Error'); }
    finally { setReassigning(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manajemen History</h1>
        <p className="text-muted-foreground">Semua data voucher yang telah dimigrasi — pindahkan ke router lain jika perlu</p>
      </div>

      {/* Reassign panel */}
      {selected.size > 0 && (
        <Card className="border-primary">
          <CardContent className="flex items-center gap-3 pt-4 flex-wrap">
            <span className="text-sm font-medium">{selected.size} data dipilih → Pindah ke:</span>
            <Select value={selectedUserId} onValueChange={(v) => { setSelectedUserId(v); setTargetRouterId(''); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Pilih user..." /></SelectTrigger>
              <SelectContent>
                {usersData?.users?.map((u: { id: string; username: string }) => (
                  <SelectItem key={u.id} value={u.id}>{u.username}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={targetRouterId} onValueChange={setTargetRouterId} disabled={!selectedUserId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Pilih router..." /></SelectTrigger>
              <SelectContent>
                {routersData?.routers?.map((r: { id: string; label: string; host: string }) => (
                  <SelectItem key={r.id} value={r.id}>{r.label} ({r.host})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleReassign} disabled={reassigning || !targetRouterId} size="sm">
              {reassigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MoveRight className="mr-2 h-4 w-4" />}
              Pindahkan
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Semua History</CardTitle>
            <CardDescription>{isLoading ? '...' : `${records.length} data ditemukan`}</CardDescription>
          </div>
          {records.length > 0 && (
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {selected.size === records.length ? 'Batal Semua' : 'Pilih Semua'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 w-10"></th>
                  {['Username', 'Profil', 'Prefix', 'Harga', 'Router Asal', 'Pemilik', 'Tanggal Migrasi'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b"><td colSpan={7} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
                )) : records.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <Database className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    <p>Tidak ada data orphan</p>
                  </td></tr>
                ) : records.map((r) => (
                  <tr key={r.id} className={`border-b last:border-0 hover:bg-muted/30 cursor-pointer ${selected.has(r.id) ? 'bg-accent/40' : ''}`} onClick={() => toggle(r.id)}>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                    </td>
                    <td className="px-4 py-3"><code className="font-semibold">{r.username}</code></td>
                    <td className="px-4 py-3">{r.profile}</td>
                    <td className="px-4 py-3">{r.prefix ? <Badge variant="outline">{r.prefix}</Badge> : '—'}</td>
                    <td className="px-4 py-3">{r.price > 0 ? `Rp ${r.price.toLocaleString('id-ID')}` : '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.router ? `${r.router.label} (${r.router.host})` : <Badge variant="destructive" className="text-xs">Dihapus</Badge>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.user?.username || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.migratedAt).toLocaleDateString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
