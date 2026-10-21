import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client/extension";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set to connect to PostgreSQL.");
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}