import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) return NextResponse.next();

  const token = request.cookies.get('auth_token')?.value;
  const session = token ? verifyToken(token) : null;

  if (!session) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (session.role !== 'ADMIN') {
      if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Belum pilih router → redirect ke /routers
  const skipRouterCheck = ['/routers', '/admin', '/api/routers', '/api/auth', '/api/admin'].some((p) => pathname.startsWith(p)) || pathname === '/';
  if (!session.activeRouterId && !skipRouterCheck) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Pilih router terlebih dahulu' }, { status: 400 });
    return NextResponse.redirect(new URL('/routers', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|print).*)'],
};
