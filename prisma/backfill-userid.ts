import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  // Ambil semua history yang userId masih null tapi punya routerId
  const records = await prisma.voucherHistory.findMany({
    where: { userId: null, routerId: { not: null } },
    include: { router: { select: { userId: true } } },
  });

  console.log(`Backfill ${records.length} records...`);

  for (const rec of records) {
    if (rec.router?.userId) {
      await prisma.voucherHistory.update({
        where: { id: rec.id },
        data: { userId: rec.router.userId },
      });
    }
  }

  console.log('Done.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
