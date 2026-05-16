'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wifi, Plus, Trash2, Loader2, CheckCircle, Router, Signal, Share2, X } from 'lucide-react';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SharedUser { id: string; userId: string; user: { username: string }; }
interface RouterItem { id: string; label: string; host: string; port: number; username: string; isShared?: boolean; userId: string; sharedWith?: SharedUser[]; }
interface PingResult { online: boolean; latency?: number; error?: string; }

export default function RoutersPage() {
  const router = useRouter();
  const { data, mutate } = useSWR('/api/routers', fetcher);
  const { data: usersData } = useSWR('/api/admin/users', fetcher);
  const { data: sessionData } = useSWR('/api/auth/session', fetcher);

  const [showForm, setShowForm] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: '', host: '', port: '8728', username: 'admin', password: '' });
  const [pingResults, setPingResults] = useState<Record<string, PingResult>>({});
  const [pinging, setPinging] = useState<string | null>(null);
  const [sharingRouterId, setSharingRouterId] = useState<string | null>(null);
  const [shareTargetUserId, setShareTargetUserId] = useState('');
  const [sharing, setSharing] = useState(false);

  const currentUserId = sessionData?.userId;
  const isAdmin = sessionData?.role === 'ADMIN';

  const handleSelect = async (routerId: string) => {
    setSelecting(routerId);
    const res = await fetch('/api/routers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ routerId }) });
    if (res.ok) { toast.success('Router aktif dipilih'); router.push('/dashboard'); router.refresh(); }
    else toast.error('Gagal memilih router');
    setSelecting(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus router ini?')) return;
    setDeleting(id);
    const res = await fetch(`/api/routers?id=${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Router dihapus'); mutate(); }
    else toast.error('Gagal menghapus router');
    setDeleting(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/routers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, port: parseInt(form.port) || 8728 }) });
      const d = await res.json();
      if (res.ok) { toast.success('Router berhasil ditambahkan'); setShowForm(false); setForm({ label: '', host: '', port: '8728', username: 'admin', password: '' }); mutate(); }
      else toast.error(d.error || 'Gagal menambah router');
    } catch { toast.error('Error'); }
    finally { setSaving(false); }
  };

  const handlePing = async (id: string) => {
    setPinging(id);
    try {
      const res = await fetch('/api/routers/ping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ routerId: id }) });
      const d = await res.json();
      setPingResults((prev) => ({ ...prev, [id]: d }));
    } catch { setPingResults((prev) => ({ ...prev, [id]: { online: false, error: 'Network error' } })); }
    setPinging(null);
  };

  const handleShare = async (routerId: string) => {
    if (!shareTargetUserId) { toast.warning('Pilih user tujuan'); return; }
    setSharing(true);
    const res = await fetch('/api/routers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'share', routerId, targetUserId: shareTargetUserId }) });
    if (res.ok) { toast.success('Router berhasil dibagikan'); setShareTargetUserId(''); setSharingRouterId(null); mutate(); }
    else toast.error('Gagal membagikan router');
    setSharing(false);
  };

  const handleUnshare = async (routerId: string, targetUserId: string) => {
    const res = await fetch('/api/routers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unshare', routerId, targetUserId }) });
    if (res.ok) { toast.success('Akses dicabut'); mutate(); }
    else toast.error('Gagal mencabut akses');
  };

  const routers: RouterItem[] = data?.routers || [];
  const activeRouterId: string = data?.activeRouterId || '';
  const allUsers = usersData?.users || [];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Wifi className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Pilih Router</h1>
              <p className="text-sm text-muted-foreground">Pilih router yang ingin dikelola</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" />Tambah Router
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader><CardTitle className="text-base">Tambah Router Baru</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Label</Label><Input placeholder="Warnet Jaya" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} required /></div>
                  <div className="space-y-1"><Label>IP / Host</Label><Input placeholder="192.168.88.1" value={form.host} onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))} required /></div>
                  <div className="space-y-1"><Label>Port API</Label><Input type="number" value={form.port} onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Username</Label><Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required /></div>
                </div>
                <div className="space-y-1"><Label>Password Router</Label><Input type="password" placeholder="Kosongkan jika tidak ada" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} /></div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
                  <Button type="submit" disabled={saving}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menghubungkan...</> : 'Simpan Router'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {routers.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center py-12 text-muted-foreground"><Router className="mb-3 h-10 w-10 opacity-30" /><p>Belum ada router.</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {routers.map((r) => {
              const isOwner = r.userId === currentUserId || isAdmin;
              const sharedUsers = r.sharedWith || [];
              // Filter user yang belum punya akses dan bukan pemilik
              const availableToShare = allUsers.filter((u: { id: string }) => u.id !== r.userId && !sharedUsers.some((s) => s.userId === u.id));

              return (
                <Card key={r.id} className={activeRouterId === r.id ? 'border-primary' : ''}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${activeRouterId === r.id ? 'bg-primary' : 'bg-muted'}`}>
                          <Router className={`h-4 w-4 ${activeRouterId === r.id ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{r.label}</span>
                            {activeRouterId === r.id && <Badge variant="default" className="text-xs">Aktif</Badge>}
                            {r.isShared && <Badge variant="secondary" className="text-xs">Dibagikan ke Anda</Badge>}
                            {pingResults[r.id] && (
                              <Badge variant={pingResults[r.id].online ? 'default' : 'destructive'} className="text-xs">
                                {pingResults[r.id].online ? `Online ${pingResults[r.id].latency}ms` : 'Offline'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{r.host}:{r.port} · {r.username}</p>
                          {pingResults[r.id] && !pingResults[r.id].online && <p className="text-xs text-destructive">{pingResults[r.id].error}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => handlePing(r.id)} disabled={pinging === r.id} title="Ping">
                          {pinging === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Signal className="h-4 w-4" />}
                        </Button>
                        {isOwner && (
                          <Button size="sm" variant="outline" onClick={() => setSharingRouterId(sharingRouterId === r.id ? null : r.id)} title="Bagikan">
                            <Share2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant={activeRouterId === r.id ? 'default' : 'outline'} onClick={() => handleSelect(r.id)} disabled={selecting === r.id}>
                          {selecting === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : activeRouterId === r.id ? <><CheckCircle className="mr-1 h-4 w-4" />Terpilih</> : 'Pilih'}
                        </Button>
                        {isOwner && (
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(r.id)} disabled={deleting === r.id}>
                            {deleting === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Panel share */}
                    {sharingRouterId === r.id && (
                      <div className="border-t pt-3 space-y-2">
                        {/* User yang sudah punya akses */}
                        {sharedUsers.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-muted-foreground self-center">Akses:</span>
                            {sharedUsers.map((s) => (
                              <Badge key={s.id} variant="secondary" className="gap-1">
                                {s.user.username}
                                <button onClick={() => handleUnshare(r.id, s.userId)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        {/* Tambah akses baru */}
                        {availableToShare.length > 0 ? (
                          <div className="flex gap-2">
                            <Select value={shareTargetUserId} onValueChange={setShareTargetUserId}>
                              <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Pilih user..." /></SelectTrigger>
                              <SelectContent>
                                {availableToShare.map((u: { id: string; username: string }) => (
                                  <SelectItem key={u.id} value={u.id}>{u.username}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" onClick={() => handleShare(r.id)} disabled={sharing || !shareTargetUserId}>
                              {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Bagikan'}
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Semua user sudah punya akses.</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
