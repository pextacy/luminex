import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { redis } from '../db/redis.js';
import { blockchainService } from '../services/blockchain.js';
import { sdsListener } from '../services/sds-listener.js';
import { successResponse } from '../utils/response.js';

const router = Router();

// ==========================================
// HEALTH CHECK
// ==========================================
router.get('/health', async (req: Request, res: Response) => {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: 'unknown',
      redis: 'unknown',
      blockchain: 'unknown',
      sds: 'unknown',
    },
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.services.database = 'healthy';
  } catch (error) {
    checks.services.database = 'unhealthy';
    checks.status = 'degraded';
  }

  // Check Redis
  try {
    await redis.getClient().ping();
    checks.services.redis = 'healthy';
  } catch (error) {
    checks.services.redis = 'unhealthy';
    checks.status = 'degraded';
  }

  // Check blockchain connection
  try {
    await blockchainService.getCurrentBlock();
    checks.services.blockchain = 'healthy';
  } catch (error) {
    checks.services.blockchain = 'unhealthy';
    checks.status = 'degraded';
  }

  // Check SDS connection
  const sdsState = sdsListener.getState();
  checks.services.sds = sdsState.connected ? 'healthy' : 'unhealthy';
  if (!sdsState.connected) {
    checks.status = 'degraded';
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(checks);
});

// ==========================================
// LIVENESS PROBE
// ==========================================
router.get('/live', (req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

// ==========================================
// READINESS PROBE
// ==========================================
router.get('/ready', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready' });
  }
});

// ==========================================
// METRICS ENDPOINT
// ==========================================
router.get('/metrics', async (req: Request, res: Response) => {
  const sdsState = sdsListener.getState();

  const metrics = {
    timestamp: new Date().toISOString(),
    
    // Donation metrics
    donations: {
      pending: await prisma.donation.count({ where: { status: 'PENDING' } }),
      confirmed: await prisma.donation.count({ where: { status: 'CONFIRMED' } }),
      failed: await prisma.donation.count({ where: { status: 'FAILED' } }),
      orphaned: await prisma.donation.count({ where: { status: 'ORPHANED' } }),
    },
    
    // Campaign metrics
    campaigns: {
      active: await prisma.campaign.count({ where: { status: 'ACTIVE' } }),
      completed: await prisma.campaign.count({ where: { status: 'COMPLETED' } }),
      total: await prisma.campaign.count(),
    },
    
    // SDS metrics
    sds: {
      connected: sdsState.connected,
      reconnectAttempts: sdsState.reconnectAttempts,
      subscribedStreams: sdsState.subscribedStreams.length,
      lastConnectedAt: sdsState.lastConnectedAt,
    },
    
    // Process metrics
    process: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    },
  };

  res.json(successResponse(metrics));
});

export default router;
