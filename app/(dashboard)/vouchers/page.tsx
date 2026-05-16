'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Printer, Ticket, Copy, Check, Plus, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { PROFILE_DURATIONS, PROFILE_LABELS } from '@/lib/parser';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const PROFILE_CODES = Object.keys(PROFILE_DURATIONS);

interface GeneratedVoucher { username: string; password: string; comment: string; }

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export default function VouchersPage() {
  const { data: profilesData } = useSWR('/api/hotspot/profiles', fetcher);
  const { data: sessionData } = useSWR('/api/auth/session', fetcher);
  const ssid = sessionData?.activeRouter?.label || '';

  const [tab, setTab] = useState<'bulk' | 'manual'>('bulk');

  // Bulk state
  const [form, setForm] = useState({ count: 10, profile: '', profileCode: '1d', prefix: 'WARNET', price: 0, sameAsUsername: false, usernameLength: 8, passwordLength: 8, format: 'alphanumeric' });
  const [generating, setGenerating] = useState(false);
  const [vouchers, setVouchers] = useState<GeneratedVoucher[]>([]);

  // Manual state
  const [manual, setManual] = useState({ username: '', password: '', profile: '', profileCode: '1d', price: 0, samePass: true });
  const [manualLoading, setManualLoading] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ username: string; password: string } | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.profile) { toast.warning('Pilih profil paket'); return; }
    setGenerating(true); setVouchers([]);
    try {
      const res = await fetch('/api/voucher/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Gagal generate'); return; }
      setVouchers(data.vouchers || []);
      toast.success(`${data.generated} voucher berhasil dibuat!`);
    } catch { toast.error('Error'); }
    finally { setGenerating(false); }
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manual.profile || !manual.username) { toast.warning('Username dan profil wajib diisi'); return; }
    setManualLoading(true);
    try {
      const res = await fetch('/api/hotspot/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: manual.username, password: manual.samePass ? manual.username : manual.password, profile: manual.profile, profileCode: manual.profileCode, price: manual.price }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Gagal membuat user'); return; }
      setLastCreated({ username: data.username, password: data.password });
      toast.success(`User ${data.username} berhasil dibuat`);
      setManual((f) => ({ ...f, username: '', password: '' }));
    } catch { toast.error('Error'); }
    finally { setManualLoading(false); }
  };

  const handlePrint = () => {
    const key = `vc_print_${Date.now()}`;
    sessionStorage.setItem(key, JSON.stringify(vouchers.map((v) => ({ username: v.username, password: v.password, profile: form.profile, profileCode: form.profileCode }))));
    const params = new URLSearchParams({ key, layout: '3x' });
    if (ssid) params.set('ssid', ssid);
    window.open(`/print/vouchers?${params.toString()}`, '_blank');
  };

  const handleCopyAll = () => {
    const text = vouchers.map((v) => `${v.username}\t${v.password}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Semua voucher disalin ke clipboard');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Voucher</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Generate dan kelola voucher hotspot</p>
      </div>

      {/* Tab */}
      <div className="flex rounded-lg border p-1 w-fit gap-1">
        {(['bulk', 'manual'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors font-medium ${tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {t === 'bulk' ? 'Generate Massal' : 'Buat Manual'}
          </button>
        ))}
      </div>

      {tab === 'bulk' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Form bulk */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium">Konfigurasi</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Jumlah</Label>
                    <Input type="number" min={1} max={500} value={form.count} onChange={(e) => setForm((f) => ({ ...f, count: parseInt(e.target.value) || 1 }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Prefix</Label>
                    <Input value={form.prefix} onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value.toUpperCase() }))} placeholder="WARNET" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Profil Paket <span className="text-destructive">*</span></Label>
                    <Select value={form.profile} onValueChange={(v) => setForm((f) => ({ ...f, profile: v }))}>
                      <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>{profilesData?.profiles?.map((p: { name: string }) => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Durasi</Label>
                    <Select value={form.profileCode} onValueChange={(v) => setForm((f) => ({ ...f, profileCode: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PROFILE_CODES.map((c) => <SelectItem key={c} value={c}>{PROFILE_LABELS[c] || c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Harga (Rp)</Label>
                    <Input type="number" min={0} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Format</Label>
                    <Select value={form.format} onValueChange={(v) => setForm((f) => ({ ...f, format: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alphanumeric">Alphanumeric</SelectItem>
                        <SelectItem value="numeric">Numerik</SelectItem>
                        <SelectItem value="alpha">Huruf</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Panjang Username</Label>
                    <Input type="number" min={4} max={16} value={form.usernameLength} onChange={(e) => setForm((f) => ({ ...f, usernameLength: parseInt(e.target.value) || 8 }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Panjang Password</Label>
                    <Input type="number" min={4} max={16} value={form.passwordLength} onChange={(e) => setForm((f) => ({ ...f, passwordLength: parseInt(e.target.value) || 8 }))} disabled={form.sameAsUsername} />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.sameAsUsername} onChange={(e) => setForm((f) => ({ ...f, sameAsUsername: e.target.checked }))} className="h-4 w-4 rounded" />
                  <span className="text-sm">Password = Username</span>
                </label>
                <Button type="submit" className="w-full" disabled={generating}>
                  {generating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Ticket className="mr-2 h-4 w-4" />Generate {form.count} Voucher</>}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Result */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">Hasil</CardTitle>
                  <CardDescription className="text-xs">{vouchers.length > 0 ? `${vouchers.length} voucher` : 'Belum ada'}</CardDescription>
                </div>
                {vouchers.length > 0 && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleCopyAll}>
                      <Copy className="mr-2 h-4 w-4" />Copy All
                    </Button>
                    <Button size="sm" variant="outline" onClick={handlePrint}>
                      <Printer className="mr-2 h-4 w-4" />Cetak
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {vouchers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Ticket className="mb-3 h-10 w-10 opacity-30" />
                  <p className="text-sm">Voucher muncul setelah generate</p>
                </div>
              ) : (
                <div className="max-h-[420px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card border-b">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground w-10">#</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Username</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Password</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vouchers.map((v, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/30 group">
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center">
                              <code className="font-semibold text-xs">{v.username}</code>
                              <CopyButton text={v.username} />
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center">
                              <code className="text-xs">{v.password}</code>
                              <CopyButton text={v.password} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Manual tab */
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium">Buat User Manual</CardTitle>
              <CardDescription className="text-xs">Tambah satu user hotspot secara manual</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Username <span className="text-destructive">*</span></Label>
                  <Input value={manual.username} onChange={(e) => setManual((f) => ({ ...f, username: e.target.value }))} placeholder="username" required />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={manual.samePass} onChange={(e) => setManual((f) => ({ ...f, samePass: e.target.checked }))} className="h-4 w-4 rounded" />
                  <span className="text-sm">Password = Username</span>
                </label>
                {!manual.samePass && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Password</Label>
                    <Input value={manual.password} onChange={(e) => setManual((f) => ({ ...f, password: e.target.value }))} placeholder="password" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Profil <span className="text-destructive">*</span></Label>
                    <Select value={manual.profile} onValueChange={(v) => setManual((f) => ({ ...f, profile: v }))}>
                      <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>{profilesData?.profiles?.map((p: { name: string }) => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Durasi</Label>
                    <Select value={manual.profileCode} onValueChange={(v) => setManual((f) => ({ ...f, profileCode: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PROFILE_CODES.map((c) => <SelectItem key={c} value={c}>{PROFILE_LABELS[c] || c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Harga (Rp)</Label>
                  <Input type="number" min={0} value={manual.price} onChange={(e) => setManual((f) => ({ ...f, price: parseInt(e.target.value) || 0 }))} />
                </div>
                <Button type="submit" className="w-full" disabled={manualLoading}>
                  {manualLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Membuat...</> : <><Plus className="mr-2 h-4 w-4" />Buat User</>}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Last created */}
          <div className="space-y-4">
            {lastCreated && (
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">User berhasil dibuat</p>
                  </div>
                  <div className="space-y-2">
                    {[{ label: 'Username', value: lastCreated.username }, { label: 'Password', value: lastCreated.password }].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between rounded-lg bg-background border px-3 py-2">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <div className="flex items-center gap-1">
                          <code className="text-sm font-semibold">{value}</code>
                          <CopyButton text={value} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => {
                    const key = `vc_print_${Date.now()}`;
                    sessionStorage.setItem(key, JSON.stringify([{ username: lastCreated.username, password: lastCreated.password, profile: manual.profile, profileCode: manual.profileCode }]));
                    window.open(`/print/vouchers?key=${key}&layout=2x${ssid ? `&ssid=${ssid}` : ''}`, '_blank');
                  }}>
                    <Eye className="mr-2 h-4 w-4" />Preview Cetak
                  </Button>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardContent className="p-5 text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">Tips</p>
                <ul className="space-y-1 text-xs list-disc list-inside">
                  <li>Username harus unik di router</li>
                  <li>Durasi digunakan untuk auto-expire via script</li>
                  <li>Harga dicatat untuk laporan pendapatan</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
