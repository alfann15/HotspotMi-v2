'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarGroup,
  SidebarGroupLabel, SidebarGroupContent,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard, Wifi, Users, Settings2, BarChart3,
  Ticket, Monitor, Terminal, Settings, LogOut, ChevronDown,
  Loader2, Router, Database, ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    title: 'Hotspot', icon: Wifi,
    children: [
      { title: 'Sesi Aktif', href: '/hotspot/active' },
      { title: 'Manajemen User', href: '/hotspot/users' },
      { title: 'Profil User', href: '/hotspot/profiles' },
    ],
  },
  { title: 'Voucher', href: '/vouchers', icon: Ticket },
  { title: 'Monitoring', href: '/monitoring', icon: Monitor },
  { title: 'Laporan', href: '/reports', icon: BarChart3 },
  { title: 'Migrasi Expired', href: '/migrate', icon: Database },
  { title: 'Terminal', href: '/terminal', icon: Terminal },
  { title: 'Pengaturan', href: '/settings', icon: Settings },
];

const adminItems = [
  { title: 'Manajemen User', href: '/admin/users', icon: Users },
  { title: 'History Data', href: '/admin/history', icon: Database },
];

interface SessionInfo {
  username: string;
  role: 'ADMIN' | 'USER';
  activeRouter?: { id: string; label: string; host: string } | null;
}

export function AppSidebar({ session }: { session?: SessionInfo }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({ Hotspot: true });

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <Link href="/dashboard">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Wifi className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold">HotspotMi</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                    {session?.activeRouter?.label || 'Pilih Router'}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {/* Router switcher */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className={cn('text-xs', !session?.activeRouter && 'text-muted-foreground')}>
              <Link href="/routers">
                <Router className="h-3.5 w-3.5" />
                <span className="truncate">{session?.activeRouter ? session.activeRouter.host : 'Ganti Router'}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigasi</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                if (item.children) {
                  const isGroupActive = item.children.some((c) => pathname.startsWith(c.href));
                  const isOpen = openGroups[item.title] ?? isGroupActive;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton onClick={() => setOpenGroups((p) => ({ ...p, [item.title]: !isOpen }))} className={cn(isGroupActive && 'bg-accent text-accent-foreground')}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        <ChevronDown className={cn('ml-auto h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                      </SidebarMenuButton>
                      {isOpen && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item.children.map((child) => (
                            <SidebarMenuButton key={child.href} asChild className={cn('h-8 text-sm', pathname === child.href && 'bg-accent text-accent-foreground font-medium')}>
                              <Link href={child.href}>{child.title}</Link>
                            </SidebarMenuButton>
                          ))}
                        </div>
                      )}
                    </SidebarMenuItem>
                  );
                }
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild className={cn(pathname === item.href && 'bg-accent text-accent-foreground font-medium')}>
                      <Link href={item.href!}><item.icon className="h-4 w-4" /><span>{item.title}</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {session?.role === 'ADMIN' && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" />Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild className={cn(pathname === item.href && 'bg-accent text-accent-foreground font-medium')}>
                      <Link href={item.href}><item.icon className="h-4 w-4" /><span>{item.title}</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {(session?.username || 'A')[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-sm font-medium">{session?.username || 'User'}</span>
                    <span className="text-xs text-muted-foreground">{session?.role === 'ADMIN' ? 'Administrator' : 'User'}</span>
                  </div>
                  <ChevronDown className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/settings"><Settings2 className="mr-2 h-4 w-4" />Pengaturan</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/routers"><Router className="mr-2 h-4 w-4" />Ganti Router</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} disabled={loggingOut} className="text-destructive focus:text-destructive">
                  {loggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
