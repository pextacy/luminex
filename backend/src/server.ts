import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config, validateConfig } from './config/index.js';
import { prisma } from './db/prisma.js';
import { redis } from './db/redis.js';
import { logger, apiLogger } from './utils/logger.js';
import { errorHandler } from './utils/errors.js';
import { blockchainService } from './services/blockchain.js';
import { sdsListener } from './services/sds-listener.js';
import { wsHandler } from './services/websocket.js';

// Import routes
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import campaignRoutes from './routes/campaigns.js';
import donationRoutes from './routes/donations.js';
import categoryRoutes from './routes/categories.js';
import organizationRoutes from './routes/organizations.js';
import analyticsRoutes from './routes/analytics.js';
import adminRoutes from './routes/admin.js';

// ==========================================
// INITIALIZE EXPRESS APP
// ==========================================
const app: Express = express();
const server = createServer(app);

// ==========================================
// MIDDLEWARE
// ==========================================

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    apiLogger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
    });
  });
  
  next();
});

// ==========================================
// ROUTES
// ==========================================

// Health check routes (no /api prefix)
app.use('/', healthRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// Error handler
app.use(errorHandler);

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Received shutdown signal');

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Shutdown services
  try {
    wsHandler.shutdown();
    await sdsListener.disconnect();
    await blockchainService.stopEventListener();
    await redis.disconnect();
    await prisma.$disconnect();
    
    logger.info('All services disconnected');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
}

// ==========================================
// STARTUP
// ==========================================
async function startServer(): Promise<void> {
  try {
    // Validate configuration
    validateConfig();
    logger.info('Configuration validated');

    // Connect to Redis
    await redis.connect();
    logger.info('Connected to Redis');

    // Verify database connection
    await prisma.$connect();
    logger.info('Connected to database');

    // Initialize blockchain service
    await blockchainService.initialize();
    await blockchainService.startEventListener();
    logger.info('Blockchain service initialized');

    // Initialize WebSocket handler
    wsHandler.initialize(server);
    logger.info('WebSocket handler initialized');

    // Connect to SDS and subscribe to streams
    try {
      await sdsListener.connect();
      await sdsListener.subscribeToAllCampaigns();
      logger.info('Connected to SDS');
    } catch (error) {
      logger.warn({ error }, 'Failed to connect to SDS - will retry');
    }

    // Start reconciliation loop
    blockchainService.startReconciliationLoop();
    logger.info('Reconciliation loop started');

    // Start HTTP server
    server.listen(config.port, config.host, () => {
      logger.info({
        host: config.host,
        port: config.port,
        env: config.env,
      }, `🚀 Luminex backend server running`);
    });

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Start the server
startServer();

export { app, server };
