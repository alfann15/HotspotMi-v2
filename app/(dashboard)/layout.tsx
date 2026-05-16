import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) redirect('/login');

  const session = verifyToken(token);
  if (!session) redirect('/login');

  let activeRouter = null;
  if (session.activeRouterId) {
    activeRouter = await prisma.router.findUnique({
      where: { id: session.activeRouterId },
      select: { id: true, label: true, host: true },
    });
  }

  return (
    <SidebarProvider>
      <AppSidebar session={{ username: session.username, role: session.role, activeRouter }} />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="text-sm font-medium text-muted-foreground">
              {activeRouter ? activeRouter.label : 'Belum ada router aktif'}
            </span>
          </div>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 flex-col p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
