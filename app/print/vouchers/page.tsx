'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { PROFILE_LABELS } from '@/lib/parser';

interface VoucherData {
  username: string;
  password: string;
  profile: string;
  profileCode: string;
  samePass?: boolean;
}

function PrintContent() {
  const searchParams = useSearchParams();
  const key = searchParams.get('key');
  const ssid = searchParams.get('ssid') || '';
  const businessName = searchParams.get('name') || 'Hotspot WiFi';
  const serverProfile = searchParams.get('serverProfile') || '';
  const subtitle = searchParams.get('subtitle') || '';
  const layout = searchParams.get('layout') || '3x';
  const source = searchParams.get('source') || 'vouchers';

  const [vouchers, setVouchers] = useState<VoucherData[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let parsed: VoucherData[] = [];
    try {
      if (key) {
        const stored = sessionStorage.getItem(key);
        if (stored) parsed = JSON.parse(stored);
      }
    } catch { /* ignore */ }
    setVouchers(parsed);
    setLoaded(true);
  }, [key]);

  const cols = layout === '4x' ? 4 : layout === '2x' ? 2 : 3;
  const qrSize = cols >= 4 ? 44 : cols === 3 ? 52 : 64;
  const isUsersSource = source === 'users';

  if (!loaded) return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>Memuat data...</div>;

  if (vouchers.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <p style={{ color: '#ef4444', fontWeight: 600 }}>⚠️ Tidak ada data voucher.</p>
        <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.875rem' }}>Data mungkin sudah kadaluarsa. Silakan kembali dan coba cetak ulang.</p>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <a href="javascript:history.back()" style={{ display: 'inline-block', marginTop: '1rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', borderRadius: '0.5rem', textDecoration: 'none' }}>← Kembali</a>
      </div>
    );
  }

  return (
    <div className="print-page">
      {/* Controls (no-print) */}
      <div className="no-print print-controls">
        <div className="print-controls-inner">
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>{isUsersSource ? 'Preview Cetak Daftar User' : 'Preview Cetak Voucher'}</h2>
            <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.8125rem' }}>
              {vouchers.length} {isUsersSource ? 'user' : 'voucher'} · Layout: {cols} kolom
              {subtitle ? ` · ${subtitle}` : ''}{ssid ? ` · SSID: ${ssid}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Layout:</span>
            {(['2x', '3x', '4x'] as const).map((l) => (
              <button key={l} className={`btn btn-sm ${layout === l ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { const url = new URL(window.location.href); url.searchParams.set('layout', l); window.location.href = url.toString(); }}>
                {l}
              </button>
            ))}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <a href="javascript:history.back()" className="btn btn-secondary">← Kembali</a>
            <button className="btn btn-primary" onClick={() => window.print()}>🖨 Cetak / Simpan PDF</button>
          </div>
        </div>
      </div>

      {/* Voucher Grid */}
      <div className="vouchers-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {vouchers.map((v, i) => {
          const isSame = v.samePass || v.username === v.password;
          const duration = PROFILE_LABELS[v.profileCode] || v.profileCode;
          return (
            <div key={i} className="vc-card">
              <div className="vc-stripe" />
              <div className="vc-header">
                <span className="vc-biz">{businessName}</span>
                <span className="vc-tag">WiFi</span>
              </div>
              <div className="vc-body">
                <div className="vc-creds">
                  {isSame && !isUsersSource ? (
                    <div className="vc-field">
                      <span className="vc-label">Username / Password</span>
                      <span className="vc-value vc-value-lg">{v.username}</span>
                    </div>
                  ) : (
                    <>
                      <div className="vc-field"><span className="vc-label">Username</span><span className="vc-value">{v.username}</span></div>
                      <div className="vc-field"><span className="vc-label">Password</span><span className="vc-value">{v.password}</span></div>
                    </>
                  )}
                  <div className="vc-meta">
                    {duration && <span>⏱ {duration}</span>}
                    {ssid && <span>📶 {ssid}</span>}
                    {serverProfile && <span>🖥 {serverProfile}</span>}
                  </div>
                </div>
                {ssid && (
                  <div className="vc-qr">
                    <QRCodeSVG value={`WIFI:T:WPA;S:${ssid};P:${v.password};;`} size={qrSize} level="M" />
                  </div>
                )}
              </div>
              <div className="vc-footer">
                <span>{v.profile}</span>
                <span>#{String(i + 1).padStart(3, '0')}</span>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #f0f2f5; color: #111; }
        .print-controls { background: white; border-bottom: 1px solid #e5e7eb; padding: 0.75rem 1.5rem; position: sticky; top: 0; z-index: 10; }
        .print-controls-inner { max-width: 1300px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
        .btn { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.4rem 0.875rem; border-radius: 0.5rem; font-size: 0.8125rem; font-weight: 500; cursor: pointer; border: 1px solid transparent; text-decoration: none; transition: all 0.15s; }
        .btn-sm { padding: 0.3rem 0.625rem; font-size: 0.75rem; }
        .btn-primary { background: linear-gradient(135deg, #3b82f6, #7c3aed); color: white; border: none; }
        .btn-primary:hover { filter: brightness(1.1); }
        .btn-secondary { background: white; color: #374151; border-color: #d1d5db; }
        .btn-secondary:hover { background: #f9fafb; }
        .vouchers-grid { display: grid; gap: 4px; padding: 8px; max-width: 1300px; margin: 0 auto; }
        .vc-card { background: white; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; page-break-inside: avoid; break-inside: avoid; }
        .vc-stripe { height: 3px; background: linear-gradient(90deg, #3b82f6, #8b5cf6); }
        .vc-header { display: flex; justify-content: space-between; align-items: center; padding: 3px 7px; border-bottom: 1px dashed #e5e7eb; }
        .vc-biz { font-weight: 700; font-size: 0.7rem; color: #1e3a5f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%; }
        .vc-tag { font-size: 0.6rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; background: #f3f4f6; padding: 1px 5px; border-radius: 99px; flex-shrink: 0; }
        .vc-body { display: flex; gap: 5px; align-items: center; padding: 5px 7px; }
        .vc-creds { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .vc-field { display: flex; flex-direction: column; gap: 0; }
        .vc-label { font-size: 0.5rem; text-transform: uppercase; letter-spacing: 0.07em; color: #9ca3af; font-weight: 700; }
        .vc-value { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; font-weight: 600; color: #111; letter-spacing: 0.04em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .vc-value-lg { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; font-weight: 700; color: #1e3a5f; letter-spacing: 0.04em; }
        .vc-meta { display: flex; gap: 8px; margin-top: 2px; font-size: 0.55rem; color: #6b7280; }
        .vc-qr { flex-shrink: 0; }
        .vc-footer { display: flex; justify-content: space-between; padding: 2px 7px; border-top: 1px dashed #e5e7eb; font-size: 0.55rem; color: #9ca3af; }
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .vouchers-grid { padding: 0; gap: 3px; max-width: none; }
          .vc-card { border-color: #ccc; }
          @page { margin: 8mm 10mm; size: A4 portrait; }
        }
      `}</style>
    </div>
  );
}

export default function PrintVouchersPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
      <PrintContent />
    </Suspense>
  );
}
