import { PrismaClient } from './generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// Instantiate the Prisma adapter for better-sqlite3
const adapter = new PrismaBetterSqlite3({
  url: 'file:./dev.db'
});

// Create and export the Prisma Client instance
export const prisma = new PrismaClient({ adapter });

export default prisma;
