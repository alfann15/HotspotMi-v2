import { cookies } from 'next/headers';
import { verifyToken, JWTPayload } from './jwt';
import { prisma } from './prisma';
import { decrypt } from './crypto';
import { createMikrotikClient, MikrotikClient } from './mikrotik';

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getAccessibleRouterIds(session: JWTPayload): Promise<string[]> {
  const own = await prisma.router.findMany({
    where: session.role === 'ADMIN' ? {} : { userId: session.userId },
    select: { id: true },
  });
  const shared = session.role === 'USER' ? await prisma.routerAccess.findMany({
    where: { userId: session.userId },
    select: { routerId: true },
  }) : [];
  return [...own.map((r) => r.id), ...shared.map((a) => a.routerId)];
}

export async function getActiveRouter(session: JWTPayload): Promise<{
  client: MikrotikClient;
  router: { id: string; label: string; host: string; port: number; username: string };
} | null> {
  if (!session.activeRouterId) return null;

  const router = await prisma.router.findFirst({
    where: {
      id: session.activeRouterId,
      ...(session.role === 'USER' ? {
        OR: [
          { userId: session.userId },
          { sharedWith: { some: { userId: session.userId } } },
        ],
      } : {}),
    },
  });

  if (!router) return null;

  const password = decrypt(router.passwordEncrypted);
  const client = createMikrotikClient({ host: router.host, port: router.port, user: router.username, password });
  return { client, router };
}
