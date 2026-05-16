'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Loader2, Users, KeyRound, Check } from 'lucide-react';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
interface AppUser { id: string; username: string; role: 'ADMIN' | 'USER'; createdAt: string; _count: { routers: number }; }

export default function AdminUsersPage() {
  const { data, isLoading, mutate } = useSWR('/api/admin/users', fetcher);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ username: '', password: '', role: 'USER' });
  const [changingPwdId, setChangingPwdId] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json();
      if (res.ok) { toast.success('User berhasil dibuat'); setShowForm(false); setForm({ username: '', password: '', role: 'USER' }); mutate(); }
      else toast.error(d.error || 'Gagal membuat user');
    } catch { toast.error('Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Hapus user "${username}"?`)) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('User dihapus'); mutate(); }
    else { const d = await res.json(); toast.error(d.error || 'Gagal menghapus'); }
    setDeleting(null);
  };

  const handleChangePassword = async (id: string) => {
    if (!newPwd || newPwd.length < 6) { toast.warning('Password minimal 6 karakter'); return; }
    setSavingPwd(true);
    const res = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, password: newPwd }) });
    if (res.ok) { toast.success('Password berhasil diubah'); setChangingPwdId(null); setNewPwd(''); }
    else toast.error('Gagal mengubah password');
    setSavingPwd(false);
  };

  const users: AppUser[] = data?.users || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen User</h1>
          <p className="text-muted-foreground">Kelola akun admin dan user aplikasi</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />Tambah User
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Username</Label><Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required minLength={3} /></div>
                <div className="space-y-2"><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required minLength={6} /></div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="USER">User</SelectItem><SelectItem value="ADMIN">Admin</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
                <Button type="submit" disabled={saving}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : 'Buat User'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {['Username', 'Role', 'Router', 'Dibuat', 'Aksi'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b"><td colSpan={5} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
              )) : users.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  <Users className="mx-auto mb-2 h-8 w-8 opacity-30" /><p>Belum ada user</p>
                </td></tr>
              ) : users.map((u) => (
                <React.Fragment key={u.id}>
                  <tr key={u.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{u.username}</td>
                    <td className="px-4 py-3"><Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'}>{u.role}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{u._count.routers} router</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(u.createdAt).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Ganti Password"
                          onClick={() => { setChangingPwdId(changingPwdId === u.id ? null : u.id); setNewPwd(''); }}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(u.id, u.username)} disabled={deleting === u.id}>
                          {deleting === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {changingPwdId === u.id && (
                    <tr key={`pwd-${u.id}`} className="border-b bg-muted/20">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-32">Password baru untuk <strong>{u.username}</strong>:</span>
                          <Input type="password" className="h-8 w-48 text-sm" placeholder="Min. 6 karakter" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChangePassword(u.id)} />
                          <Button size="sm" onClick={() => handleChangePassword(u.id)} disabled={savingPwd}>
                            {savingPwd ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-1 h-4 w-4" />Simpan</>}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setChangingPwdId(null)}>Batal</Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
