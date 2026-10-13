import { PrismaClient } from '@prisma/client';

// One shared client per process. Each PrismaClient opens its own connection
// pool, so creating one per route file multiplies database connections on
// every Cloud Run instance. Pool size is set via `connection_limit` in
// DATABASE_URL (see DEPLOYMENT.md).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
