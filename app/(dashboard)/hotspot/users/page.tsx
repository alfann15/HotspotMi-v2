'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Printer, Plus, Trash2, Users, Loader2, Copy, Check, Download, Pencil, Power, PowerOff, X } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  NEW: { label: 'Belum Dipakai', variant: 'secondary' },
  ACTIVE: { label: 'Aktif', variant: 'default' },
  EXPIRED: { label: 'Expired', variant: 'destructive' },
};

interface HotspotUser {
  id: string; username: string; password: string; profile: string; disabled: boolean;
  metadata: { isVoucher: boolean; prefix: string; status: string; createdAt: string; profileCode: string };
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-muted-foreground hover:text-foreground transition-colors ml-1">
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export default function HotspotUsersPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', prefix: '', profile: '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ password: '', profile: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: sessionData } = useSWR('/api/auth/session', fetcher);
  const ssid = sessionData?.activeRouter?.label || '';
  const qs = new URLSearchParams({ page: String(page), pageSize: '50', ...(filters.status && { status: filters.status }), ...(filters.prefix && { prefix: filters.prefix }), ...(filters.profile && { profile: filters.profile }) }).toString();
  const { data, isLoading, mutate } = useSWR(`/api/hotspot/users?${qs}`, fetcher, { refreshInterval: 30000 });
  const { data: profilesData } = useSWR('/api/hotspot/profiles', fetcher);

  const users: HotspotUser[] = data?.users || [];
  const allSelected = users.length > 0 && selected.size === users.length;

  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(users.map((u) => u.id)));

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/hotspot/users?id=${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('User dihapus'); mutate(); } else toast.error('Gagal menghapus');
    setDeleteId(null);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Hapus ${selected.size} user?`)) return;
    setBulkDeleting(true);
    const res = await fetch('/api/hotspot/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: Array.from(selected) }) });
    const d = await res.json();
    if (res.ok) { toast.success(`${d.deleted} user dihapus`); setSelected(new Set()); mutate(); }
    else toast.error('Gagal menghapus');
    setBulkDeleting(false);
  };

  const handleToggleDisable = async (user: HotspotUser) => {
    setTogglingId(user.id);
    const res = await fetch('/api/hotspot/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: user.id, action: 'toggle-disable', disabled: !user.disabled }) });
    if (res.ok) { toast.success(user.disabled ? 'User diaktifkan' : 'User dinonaktifkan'); mutate(); }
    else toast.error('Gagal');
    setTogglingId(null);
  };

  const handleEdit = async (id: string) => {
    if (!editForm.password && !editForm.profile) { toast.warning('Isi password atau profil'); return; }
    setSavingEdit(true);
    const res = await fetch('/api/hotspot/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...editForm }) });
    if (res.ok) { toast.success('User diperbarui'); setEditingId(null); setEditForm({ password: '', profile: '' }); mutate(); }
    else toast.error('Gagal memperbarui');
    setSavingEdit(false);
  };

  const handleExportCSV = () => {
    const rows = [['Username', 'Password', 'Profil', 'Prefix', 'Status', 'Dibuat']];
    users.forEach((u) => rows.push([u.username, u.password, u.profile, u.metadata.prefix || '', u.metadata.status || 'Manual', u.metadata.createdAt ? new Date(u.metadata.createdAt).toLocaleDateString('id-ID') : '']));
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `hotspot-users-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV berhasil diunduh');
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const res = await fetch(`/api/hotspot/users?pageSize=500&${new URLSearchParams({ ...(filters.status && { status: filters.status }), ...(filters.prefix && { prefix: filters.prefix }), ...(filters.profile && { profile: filters.profile }) }).toString()}`);
      const json = await res.json();
      if (!json.users?.length) { toast.warning('Tidak ada user untuk dicetak'); return; }
      const key = `vc_print_${Date.now()}`;
      sessionStorage.setItem(key, JSON.stringify(json.users.map((u: HotspotUser) => ({ username: u.username, password: u.password, profile: u.profile, profileCode: u.metadata?.profileCode || '' }))));
      const params = new URLSearchParams({ key, layout: '3x', source: 'users' });
      if (ssid) params.set('ssid', ssid);
      window.open(`/print/vouchers?${params.toString()}`, '_blank');
    } catch { toast.error('Gagal'); }
    finally { setIsPrinting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Manajemen User Hotspot</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kelola user hotspot MikroTik</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Hapus {selected.size}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="mr-2 h-4 w-4" />CSV</Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={isPrinting}><Printer className="mr-2 h-4 w-4" />Cetak</Button>
          <Button asChild size="sm"><Link href="/vouchers"><Plus className="mr-2 h-4 w-4" />Generate</Link></Button>
        </div>
      </div>

      {/* Summary */}
      {data?.summary && (
        <div className="flex gap-3 flex-wrap">
          {[{ label: 'Total', value: data.summary.total, variant: 'outline' as const }, { label: 'Belum Dipakai', value: data.summary.new, variant: 'secondary' as const }, { label: 'Aktif', value: data.summary.active, variant: 'default' as const }, { label: 'Expired', value: data.summary.expired, variant: 'destructive' as const }].map(({ label, value, variant }) => (
            <div key={label} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <Badge variant={variant}>{label}</Badge><strong>{value}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <Select value={filters.status || 'all'} onValueChange={(v) => { setFilters((f) => ({ ...f, status: v === 'all' ? '' : v })); setPage(1); setSelected(new Set()); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Semua Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="NEW">Belum Dipakai</SelectItem>
            <SelectItem value="ACTIVE">Aktif</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Input className="w-36" placeholder="Prefix..." value={filters.prefix} onChange={(e) => { setFilters((f) => ({ ...f, prefix: e.target.value })); setPage(1); setSelected(new Set()); }} />
        <Select value={filters.profile || 'all'} onValueChange={(v) => { setFilters((f) => ({ ...f, profile: v === 'all' ? '' : v })); setPage(1); setSelected(new Set()); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Semua Profil" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Profil</SelectItem>
            {profilesData?.profiles?.map((p: { name: string }) => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={() => { setFilters({ status: '', prefix: '', profile: '' }); setPage(1); setSelected(new Set()); }}>Reset</Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2.5 w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></th>
                  {['Username', 'Password', 'Profil', 'Prefix', 'Status', 'Dibuat', 'Aksi'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b"><td colSpan={8} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
                )) : users.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <Users className="mx-auto mb-3 h-10 w-10 opacity-30" /><p>Tidak ada user</p>
                  </td></tr>
                ) : users.map((user) => {
                  const statusInfo = STATUS_BADGE[user.metadata.status];
                  const isEditing = editingId === user.id;
                  return (
                    <React.Fragment key={user.id}>
                      <tr key={user.id} className={`border-b hover:bg-muted/30 ${selected.has(user.id) ? 'bg-accent/40' : ''} ${user.disabled ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}><Checkbox checked={selected.has(user.id)} onCheckedChange={() => toggle(user.id)} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <code className="font-semibold text-xs">{user.username}</code>
                            <CopyBtn text={user.username} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <code className="text-xs tracking-widest">{'•'.repeat(Math.min((user.password ?? '').length, 8)) || '—'}</code>
                            {user.password && <CopyBtn text={user.password} />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{user.profile}</td>
                        <td className="px-4 py-3">{user.metadata.isVoucher && user.metadata.prefix ? <Badge variant="outline" className="text-xs font-mono">{user.metadata.prefix}</Badge> : '—'}</td>
                        <td className="px-4 py-3">{user.metadata.isVoucher ? <Badge variant={statusInfo?.variant || 'outline'} className="text-xs">{statusInfo?.label || user.metadata.status}</Badge> : <Badge variant="outline" className="text-xs">Manual</Badge>}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{user.metadata.createdAt ? new Date(user.metadata.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => { setEditingId(isEditing ? null : user.id); setEditForm({ password: '', profile: user.profile }); }}>
                              {isEditing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title={user.disabled ? 'Aktifkan' : 'Nonaktifkan'} onClick={() => handleToggleDisable(user)} disabled={togglingId === user.id}>
                              {togglingId === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : user.disabled ? <Power className="h-3.5 w-3.5 text-emerald-500" /> : <PowerOff className="h-3.5 w-3.5 text-amber-500" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(user.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {isEditing && (
                        <tr key={`edit-${user.id}`} className="border-b bg-muted/20">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Password baru:</span>
                                <Input className="h-8 w-36 text-xs" placeholder="Kosongkan jika tidak diubah" value={editForm.password} onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))} />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Profil:</span>
                                <Select value={editForm.profile} onValueChange={(v) => setEditForm((f) => ({ ...f, profile: v }))}>
                                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>{profilesData?.profiles?.map((p: { name: string }) => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <Button size="sm" className="h-8" onClick={() => handleEdit(user.id)} disabled={savingEdit}>
                                {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="mr-1 h-3.5 w-3.5" />Simpan</>}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
        {data?.pagination && data.pagination.totalPages > 1 && (
          <CardFooter className="flex justify-between py-3">
            <span className="text-sm text-muted-foreground">{data.pagination.total} total · Hal {page}/{data.pagination.totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</Button>
              <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteId(null)}>
          <Card className="w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Konfirmasi Hapus</h3>
              <p className="text-sm text-muted-foreground">Yakin ingin menghapus user ini?</p>
            </CardContent>
            <CardFooter className="gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteId)}>Hapus</Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
