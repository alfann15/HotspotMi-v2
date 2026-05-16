import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, username: true, role: true } });
  console.log('Users:', users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
