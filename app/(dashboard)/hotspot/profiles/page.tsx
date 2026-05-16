'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Profile {
  id: string; name: string; rateLimit: string;
  sharedUsers: string; sessionTimeout: string; idleTimeout: string;
}

export default function HotspotProfilesPage() {
  const { data, isLoading, mutate } = useSWR('/api/hotspot/profiles', fetcher);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', rateLimit: '1M/1M', sharedUsers: 1, sessionTimeout: '', idleTimeout: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/hotspot/profiles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) {
        toast.success('Profil berhasil ditambahkan');
        setShowModal(false);
        setForm({ name: '', rateLimit: '1M/1M', sharedUsers: 1, sessionTimeout: '', idleTimeout: '' });
        mutate();
      } else toast.error('Gagal menambah profil');
    } catch { toast.error('Error saat menambah profil'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profil Paket</h1>
          <p className="text-muted-foreground">Kelola profil bandwidth dan durasi sesi</p>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" />Tambah Profil
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {['Nama Profil', 'Rate Limit', 'Shared Users', 'Session Timeout', 'Idle Timeout'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}
                    </tr>
                  ))
                ) : data?.profiles?.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Belum ada profil</td></tr>
                ) : (
                  data?.profiles?.map((p: Profile) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{p.rateLimit || 'unlimited'}</code></td>
                      <td className="px-4 py-3">{p.sharedUsers}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.sessionTimeout || 'unlimited'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.idleTimeout || 'unlimited'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Profile Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 pb-4">
              <h3 className="font-semibold">Tambah Profil Baru</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowModal(false)}>✕</Button>
            </div>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-2">
                  <Label>Nama Profil <span className="text-destructive">*</span></Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="1h, 1d, 7d..." required />
                </div>
                <div className="space-y-2">
                  <Label>Rate Limit</Label>
                  <Input value={form.rateLimit} onChange={(e) => setForm((f) => ({ ...f, rateLimit: e.target.value }))} placeholder="1M/1M, 2M/512k..." />
                  <p className="text-xs text-muted-foreground">Format: upload/download. Kosongkan untuk unlimited.</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Shared Users</Label>
                    <Input type="number" value={form.sharedUsers} onChange={(e) => setForm((f) => ({ ...f, sharedUsers: parseInt(e.target.value) || 1 }))} min={1} />
                  </div>
                  <div className="space-y-2">
                    <Label>Session Timeout</Label>
                    <Input value={form.sessionTimeout} onChange={(e) => setForm((f) => ({ ...f, sessionTimeout: e.target.value }))} placeholder="1h, 1d..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Idle Timeout</Label>
                    <Input value={form.idleTimeout} onChange={(e) => setForm((f) => ({ ...f, idleTimeout: e.target.value }))} placeholder="5m, 30m..." />
                  </div>
                </div>
              </CardContent>
              <div className="flex justify-end gap-2 p-6 pt-0">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Batal</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : 'Simpan Profil'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
