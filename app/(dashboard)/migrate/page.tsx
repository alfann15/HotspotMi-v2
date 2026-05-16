'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RefreshCw, Loader2, Database, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ExpiredUser {
  id: string; username: string; password: string; profile: string;
  meta: { prefix: string; profileCode: string; price: number; expiredAt?: string };
}

export default function MigrateExpiredPage() {
  const { data, isLoading, mutate } = useSWR('/api/migrate/expired', fetcher);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteFromRouter, setDeleteFromRouter] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const expired: ExpiredUser[] = data?.expired || [];

  const toggleAll = () => {
    if (selected.size === expired.length) setSelected(new Set());
    else setSelected(new Set(expired.map((u) => u.id)));
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleMigrate = async () => {
    if (selected.size === 0) { toast.warning('Pilih user yang ingin dimigrasi'); return; }
    setMigrating(true);
    try {
      const res = await fetch('/api/migrate/expired', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: Array.from(selected), deleteFromRouter }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(`${d.migrated} user berhasil dimigrasi ke database${d.deleted > 0 ? `, ${d.deleted} dihapus dari router` : ''}`);
        setSelected(new Set());
        mutate();
      } else {
        toast.error(d.error || 'Gagal migrasi');
      }
    } catch { toast.error('Error'); }
    finally { setMigrating(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Migrasi User Expired</h1>
          <p className="text-muted-foreground">Pindahkan data user expired dari router ke database</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          <RefreshCw className="mr-2 h-4 w-4" />Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">User Expired di Router</CardTitle>
            <CardDescription>{isLoading ? '...' : `${expired.length} user expired ditemukan`}</CardDescription>
          </div>
          {expired.length > 0 && (
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {selected.size === expired.length ? 'Batal Semua' : 'Pilih Semua'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 w-10"></th>
                  {['Username', 'Profil', 'Prefix', 'Harga', 'Expired'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b"><td colSpan={6} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
                )) : expired.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <Database className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    <p>Tidak ada user expired di router</p>
                  </td></tr>
                ) : expired.map((u) => (
                  <tr key={u.id} className={`border-b last:border-0 hover:bg-muted/30 cursor-pointer ${selected.has(u.id) ? 'bg-accent/50' : ''}`} onClick={() => toggle(u.id)}>
                    <td className="px-4 py-3">
                      <Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggle(u.id)} onClick={(e) => e.stopPropagation()} />
                    </td>
                    <td className="px-4 py-3"><code className="font-semibold">{u.username}</code></td>
                    <td className="px-4 py-3">{u.profile}</td>
                    <td className="px-4 py-3">{u.meta.prefix ? <Badge variant="outline">{u.meta.prefix}</Badge> : '—'}</td>
                    <td className="px-4 py-3">{u.meta.price > 0 ? `Rp ${u.meta.price.toLocaleString('id-ID')}` : '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {u.meta.expiredAt ? new Date(u.meta.expiredAt).toLocaleDateString('id-ID') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
        {expired.length > 0 && (
          <CardFooter className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-2">
              <Checkbox id="deleteCheck" checked={deleteFromRouter} onCheckedChange={(v) => setDeleteFromRouter(!!v)} />
              <Label htmlFor="deleteCheck" className="cursor-pointer flex items-center gap-1 text-sm">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                Hapus dari router setelah migrasi
              </Label>
            </div>
            <Button onClick={handleMigrate} disabled={migrating || selected.size === 0}>
              {migrating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Migrasi...</> : <><Database className="mr-2 h-4 w-4" />Migrasi {selected.size} User</>}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
