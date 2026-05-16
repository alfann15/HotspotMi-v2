import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  const existing = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (existing) { console.log('Admin sudah ada, skip.'); return; }

  const hashed = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.create({ data: { username: 'admin', password: hashed, role: 'ADMIN' } });
  console.log('Admin dibuat:', user.username, '/ password: admin123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
