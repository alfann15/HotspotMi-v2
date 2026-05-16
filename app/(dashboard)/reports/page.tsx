'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, TrendingUp, Ticket, ShoppingCart, Package, X } from 'lucide-react';
import { useChartColors } from '@/hooks/use-chart-colors';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

function formatRupiah(n: number) {
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1) + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}
function formatRupiahFull(n: number) { return 'Rp ' + n.toLocaleString('id-ID'); }

interface MonthData { month: number; monthName: string; total: number; new: number; active: number; expired: number; revenue: number; }
interface ReportData { year: number; yearly: { total: number; revenue: number; new: number; active: number; expired: number }; months: MonthData[]; }
interface MonthDetail { year: number; month: number; monthName: string; summary: { total: number; new: number; active: number; expired: number; revenue: number }; byPrefix: { prefix: string; total: number; revenue: number }[]; byProfile: { profile: string; sold: number; revenue: number }[]; }

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-xs space-y-1">
      <p className="font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-muted-foreground">
          {p.name === 'voucher' ? 'Voucher' : 'Pendapatan'}: <span className="font-medium text-foreground">
            {p.name === 'revenue' ? formatRupiahFull(p.value) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
};

export default function ReportsPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<'voucher' | 'revenue'>('voucher');
  const c = useChartColors();

  const { data, isLoading } = useSWR<ReportData>(`/api/reports/monthly?year=${year}`, fetcher);
  const { data: detail, isLoading: detailLoading } = useSWR<MonthDetail>(
    selectedMonth ? `/api/reports/monthly-detail?year=${year}&month=${selectedMonth}` : null, fetcher
  );

  const chartData = data?.months?.map((m) => ({
    name: MONTH_NAMES[m.month - 1],
    voucher: m.total,
    revenue: m.revenue,
    month: m.month,
  })) ?? [];

  const maxVal = Math.max(...chartData.map((d) => chartMode === 'voucher' ? d.voucher : d.revenue), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Laporan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Statistik penjualan voucher</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button variant={year > 2020 ? 'ghost' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => { setYear((y) => y - 1); setSelectedMonth(null); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold w-12 text-center">{year}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setYear((y) => y + 1); setSelectedMonth(null); }} disabled={year >= new Date().getFullYear()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Yearly summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Voucher', value: data?.yearly?.total ?? '—', icon: Ticket, sub: 'semua status' },
          { label: 'Terjual', value: data?.yearly ? data.yearly.active + data.yearly.expired : '—', icon: ShoppingCart, sub: 'aktif + expired' },
          { label: 'Stok Baru', value: data?.yearly?.new ?? '—', icon: Package, sub: 'belum dipakai' },
          { label: 'Pendapatan', value: data?.yearly ? formatRupiahFull(data.yearly.revenue) : '—', icon: TrendingUp, sub: 'total tahun ini' },
        ].map(({ label, value, icon: Icon, sub }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-2xl font-semibold mt-1 tracking-tight">{isLoading ? <Skeleton className="h-7 w-20" /> : value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Grafik Bulanan</CardTitle>
              <CardDescription className="text-xs">Klik bar untuk detail bulan</CardDescription>
            </div>
            <div className="flex rounded-lg border p-0.5 gap-0.5">
              <button onClick={() => setChartMode('voucher')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${chartMode === 'voucher' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                Voucher
              </button>
              <button onClick={() => setChartMode('revenue')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${chartMode === 'revenue' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                Pendapatan
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-[220px] w-full" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: chartMode === 'revenue' ? 10 : -15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: c.mutedForeground }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: c.mutedForeground }} axisLine={false} tickLine={false}
                  tickFormatter={chartMode === 'revenue' ? (v) => formatRupiah(v) : undefined} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', radius: 4 }} />
                <Bar dataKey={chartMode} radius={[4, 4, 0, 0]} maxBarSize={40}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={(d: any) => { if (d?.month) setSelectedMonth(selectedMonth === d.month ? null : d.month); }}
                  className="cursor-pointer">
                  {chartData.map((entry) => (
                    <Cell key={entry.month}
                      fill={selectedMonth === entry.month ? c.primary : entry[chartMode] === maxVal ? `${c.primary}cc` : `${c.primary}55`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Detail bulan yang dipilih */}
      {selectedMonth && (
        <Card className="border-primary/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Detail — {detail?.monthName || MONTH_NAMES[selectedMonth - 1]} {year}
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedMonth(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {detailLoading ? <Skeleton className="h-32 w-full" /> : detail ? (
              <div className="space-y-4">
                {/* Summary row */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Total', value: detail.summary.total },
                    { label: 'Aktif', value: detail.summary.active },
                    { label: 'Expired', value: detail.summary.expired },
                    { label: 'Pendapatan', value: formatRupiahFull(detail.summary.revenue) },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-base font-semibold mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {detail.byPrefix?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Per Prefix</p>
                      <div className="space-y-1.5">
                        {detail.byPrefix.map((p) => (
                          <div key={p.prefix} className="flex items-center justify-between py-1.5 border-b last:border-0">
                            <Badge variant="outline" className="font-mono text-xs">{p.prefix}</Badge>
                            <div className="text-right text-xs">
                              <span className="font-medium">{p.total}</span>
                              {p.revenue > 0 && <span className="text-muted-foreground ml-2">{formatRupiahFull(p.revenue)}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {detail.byProfile?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Per Profil</p>
                      <div className="space-y-1.5">
                        {detail.byProfile.map((p) => (
                          <div key={p.profile} className="flex items-center justify-between py-1.5 border-b last:border-0">
                            <span className="text-sm">{p.profile}</span>
                            <div className="text-right text-xs">
                              <span className="font-medium">{p.sold} terjual</span>
                              {p.revenue > 0 && <span className="text-muted-foreground ml-2">{formatRupiahFull(p.revenue)}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Monthly table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Ringkasan Bulanan {year}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {['Bulan', 'Total', 'Baru', 'Aktif', 'Expired', 'Pendapatan'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? Array.from({ length: 12 }).map((_, i) => (
                  <tr key={i} className="border-b"><td colSpan={6} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
                )) : data?.months?.map((m) => (
                  <tr key={m.month}
                    className={`border-b last:border-0 cursor-pointer transition-colors ${selectedMonth === m.month ? 'bg-accent' : 'hover:bg-muted/40'}`}
                    onClick={() => setSelectedMonth(selectedMonth === m.month ? null : m.month)}>
                    <td className="px-4 py-3 font-medium">{m.monthName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.total || '—'}</td>
                    <td className="px-4 py-3"><span className="text-blue-600 dark:text-blue-400 font-medium">{m.new || '—'}</span></td>
                    <td className="px-4 py-3"><span className="text-emerald-600 dark:text-emerald-400 font-medium">{m.active || '—'}</span></td>
                    <td className="px-4 py-3"><span className="text-red-600 dark:text-red-400 font-medium">{m.expired || '—'}</span></td>
                    <td className="px-4 py-3 font-medium">{m.revenue > 0 ? formatRupiahFull(m.revenue) : '—'}</td>
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
