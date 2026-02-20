import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "./env";

/**
 * Create PostgreSQL connection pool
 */
const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

/**
 * Prisma PostgreSQL Adapter
 */
const adapter = new PrismaPg(pool);

/**
 * Prisma Client Singleton
 */
const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
