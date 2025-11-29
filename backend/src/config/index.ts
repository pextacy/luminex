import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || '',
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
  },
  
  // Blockchain
  blockchain: {
    rpcUrl: process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network',
    chainId: parseInt(process.env.SOMNIA_CHAIN_ID || '50311', 10),
    explorerUrl: process.env.SOMNIA_EXPLORER_URL || 'https://somnia-devnet.socialscan.io',
    vaultAddress: process.env.LUMINEX_VAULT_ADDRESS || '',
  },
  
  // SDS (Somnia Data Streams)
  sds: {
    endpoint: process.env.SDS_ENDPOINT || 'wss://sds.somnia.network',
    apiKey: process.env.SDS_API_KEY || '',
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
  },
  
  // Authentication
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'development-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    adminApiKey: process.env.API_KEY_ADMIN || '',
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  
  // Monitoring
  monitoring: {
    logLevel: process.env.LOG_LEVEL || 'info',
    metricsEnabled: process.env.METRICS_ENABLED === 'true',
  },
  
  // CORS
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  },
  
  // Reconciliation settings
  reconciliation: {
    // How long to wait before marking an SDS event as orphaned (no on-chain match)
    orphanTimeoutMs: 300000, // 5 minutes
    // How often to run reconciliation checks
    checkIntervalMs: 30000, // 30 seconds
    // Block confirmations required
    confirmations: 1, // Somnia has sub-second finality
  },
} as const;

// Validation
export function validateConfig(): void {
  const required = [
    ['DATABASE_URL', config.databaseUrl],
    ['JWT_SECRET', config.auth.jwtSecret],
  ];
  
  const missing = required.filter(([_, value]) => !value);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.map(([key]) => key).join(', ')}`
    );
  }
  
  // Warn about development defaults
  if (config.env === 'production') {
    if (config.auth.jwtSecret === 'development-secret-change-in-production') {
      throw new Error('JWT_SECRET must be changed in production');
    }
  }
}

export type Config = typeof config;
