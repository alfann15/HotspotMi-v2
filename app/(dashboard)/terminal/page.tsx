'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Terminal as TerminalIcon, Send, Trash2 } from 'lucide-react';

interface TerminalEntry { id: number; type: 'command' | 'output' | 'error' | 'info'; content: string; }

const QUICK_COMMANDS = [
  { section: 'System', items: [{ label: 'Resource', cmd: '/system/resource/print' }, { label: 'Identity', cmd: '/system/identity/print' }, { label: 'Clock', cmd: '/system/clock/print' }] },
  { section: 'Hotspot', items: [{ label: 'Active', cmd: '/ip/hotspot/active/print' }, { label: 'Users', cmd: '/ip/hotspot/user/print' }, { label: 'Profiles', cmd: '/ip/hotspot/user/profile/print' }] },
  { section: 'Network', items: [{ label: 'IP Address', cmd: '/ip/address/print' }, { label: 'Routes', cmd: '/ip/route/print' }, { label: 'ARP', cmd: '/ip/arp/print' }] },
  { section: 'Interface', items: [{ label: 'All', cmd: '/interface/print' }, { label: 'Ethernet', cmd: '/interface/ethernet/print' }] },
];

let idCounter = 0;
function makeEntry(type: TerminalEntry['type'], content: string): TerminalEntry {
  return { id: ++idCounter, type, content };
}

export default function TerminalPage() {
  const [entries, setEntries] = useState<TerminalEntry[]>([makeEntry('info', 'RouterOS Terminal — HotspotMi')]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [pendingConfirm, setPendingConfirm] = useState<{ command: string; message: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [entries]);

  const runCommand = useCallback(async (cmd: string, force = false) => {
    if (!cmd.trim()) return;
    setLoading(true);
    setEntries((prev) => [...prev, makeEntry('command', cmd)]);
    setHistory((prev) => [cmd, ...prev.slice(0, 49)]);
    setHistoryIdx(-1);

    try {
      const res = await fetch('/api/terminal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: cmd, force }) });
      const data = await res.json();

      if (data.requireConfirm) {
        setPendingConfirm({ command: data.command, message: data.message });
        setEntries((prev) => [...prev, makeEntry('info', `⚠ ${data.message}`)]);
      } else if (data.success) {
        const output = Array.isArray(data.result) && data.result.length > 0
          ? data.result.map((row: Record<string, string>) => Object.entries(row).map(([k, v]) => `  ${k}: ${v}`).join('\n')).join('\n---\n')
          : '(no output)';
        setEntries((prev) => [...prev, makeEntry('output', output)]);
      } else {
        setEntries((prev) => [...prev, makeEntry('error', data.error || 'Command failed')]);
      }
    } catch {
      setEntries((prev) => [...prev, makeEntry('error', 'Network error')]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    runCommand(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(idx);
      setInput(history[idx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(idx);
      setInput(idx === -1 ? '' : history[idx] || '');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Terminal</h1>
        <p className="text-muted-foreground">Eksekusi perintah RouterOS langsung dari browser</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {/* Quick Commands */}
        <div className="space-y-3">
          {QUICK_COMMANDS.map(({ section, items }) => (
            <Card key={section}>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">{section}</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-1">
                {items.map(({ label, cmd }) => (
                  <Button key={cmd} variant="ghost" size="sm" className="w-full justify-start h-7 text-xs" onClick={() => { setInput(cmd); runCommand(cmd); }}>
                    {label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Terminal */}
        <div className="lg:col-span-3 space-y-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <TerminalIcon className="h-4 w-4" />
                <CardTitle className="text-sm">RouterOS Terminal</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEntries([makeEntry('info', 'Terminal cleared')])}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[400px] overflow-y-auto bg-black rounded-b-lg p-4 font-mono text-xs">
                {entries.map((entry) => (
                  <div key={entry.id} className={`mb-1 ${entry.type === 'command' ? 'text-green-400' : entry.type === 'error' ? 'text-red-400' : entry.type === 'info' ? 'text-yellow-400' : 'text-gray-300'}`}>
                    {entry.type === 'command' && <span className="text-green-600 mr-1">$</span>}
                    <pre className="whitespace-pre-wrap break-all inline">{entry.content}</pre>
                  </div>
                ))}
                {loading && <div className="text-yellow-400 animate-pulse">Executing...</div>}
                <div ref={bottomRef} />
              </div>
            </CardContent>
          </Card>

          {/* Confirm Dialog */}
          {pendingConfirm && (
            <Card className="border-destructive">
              <CardContent className="pt-4">
                <p className="text-sm text-destructive mb-3">{pendingConfirm.message}</p>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={() => { runCommand(pendingConfirm.command, true); setPendingConfirm(null); }}>Ya, Lanjutkan</Button>
                  <Button variant="outline" size="sm" onClick={() => setPendingConfirm(null)}>Batal</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="/ip/hotspot/active/print" disabled={loading}
              className="font-mono text-sm"
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">↑↓ untuk riwayat perintah</p>
        </div>
      </div>
    </div>
  );
}
