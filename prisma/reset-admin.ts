import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, username: true, role: true } });
  console.log('Users di DB:', users);

  const hashed = await bcrypt.hash('admin123', 10);
  const result = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { password: hashed, role: 'ADMIN' },
    create: { username: 'admin', password: hashed, role: 'ADMIN' },
  });
  console.log('Password admin direset:', result.username, '/ admin123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
