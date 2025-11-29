import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

declare global {
  var __prisma: PrismaClient | undefined;
}

// Prevent multiple instances during development hot reload
const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// Handle graceful shutdown
async function gracefulShutdown() {
  logger.info('Disconnecting from database...');
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export { prisma };
export default prisma;
