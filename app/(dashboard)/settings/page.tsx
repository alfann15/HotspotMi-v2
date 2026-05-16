'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Loader2, LogOut, Wifi, Server, Download } from 'lucide-react';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SettingsPage() {
  const { data: session } = useSWR('/api/auth/session', fetcher);
  const { data: resource } = useSWR('/api/system/resource', fetcher);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/system/resource');
      if (res.ok) setTestResult({ ok: true, msg: 'Koneksi ke router berhasil!' });
      else { const d = await res.json(); setTestResult({ ok: false, msg: d.message || 'Gagal terhubung' }); }
    } catch { setTestResult({ ok: false, msg: 'Tidak dapat menghubungi server' }); }
    finally { setTestLoading(false); }
  };

  const handleSetup = async () => {
    setSetupLoading(true);
    try {
      const res = await fetch('/api/system/setup', { method: 'POST' });
      const data = await res.json();
      if (res.ok) toast.success(data.message || 'Script berhasil di-install');
      else toast.error(data.message || 'Gagal install script');
    } catch { toast.error('Error saat install script'); }
    finally { setSetupLoading(false); }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const s = session;
  const activeRouter = session?.activeRouter;
  const r = resource;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground">Informasi koneksi dan konfigurasi router</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Connection Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Wifi className="h-4 w-4" />Koneksi Router</CardTitle>
              <Badge variant="default" className="bg-green-500">Terhubung</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'IP / Host', value: activeRouter?.host || '—' },
              { label: 'Port API', value: String(activeRouter?.port || '8728') },
              { label: 'Username Router', value: activeRouter?.username || '—' },
              { label: 'Label', value: activeRouter?.label || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-1 border-b last:border-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <code className="rounded bg-muted px-2 py-0.5 text-xs">{value}</code>
              </div>
            ))}
            <div className="pt-2 flex gap-2">
              <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={testLoading}>
                {testLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Test Koneksi
              </Button>
              {testResult && (
                <div className={`flex items-center gap-1 text-sm ${testResult.ok ? 'text-green-600' : 'text-destructive'}`}>
                  {testResult.ok ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {testResult.msg}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Router Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Server className="h-4 w-4" />Informasi Router</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Board', value: r?.boardName || '—' },
              { label: 'Platform', value: r?.platform || '—' },
              { label: 'RouterOS', value: r?.version ? `v${r.version}` : '—' },
              { label: 'Arsitektur', value: r?.architecture || '—' },
              { label: 'Uptime', value: r?.uptime || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-1 border-b last:border-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Setup Script */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Download className="h-4 w-4" />Install Script Otomatis</CardTitle>
          <CardDescription>
            Inject script on-login ke semua profil hotspot untuk mengaktifkan fitur auto-expire voucher.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSetup} disabled={setupLoading}>
            {setupLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Installing...</> : 'Install Script ke Router'}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Script akan di-inject ke field on-login setiap profil user. Aman untuk dijalankan berulang kali.
          </p>
        </CardContent>
      </Card>

      <Separator />

      {/* Logout */}
      <div className="flex justify-end">
        <Button variant="destructive" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />Keluar dari Dashboard
        </Button>
      </div>
    </div>
  );
}
