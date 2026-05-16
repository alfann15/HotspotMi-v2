import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'hotspot-manager-secret-key';

export interface JWTPayload {
  userId: string;
  username: string;
  role: 'ADMIN' | 'USER';
  activeRouterId?: string;
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h', algorithm: 'HS256' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JWTPayload;
  } catch {
    return null;
  }
}
