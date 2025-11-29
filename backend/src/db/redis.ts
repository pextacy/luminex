import Redis from 'ioredis';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('redis');

class RedisClient {
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  
  async connect(): Promise<void> {
    try {
      this.client = new Redis(config.redis.url, {
        password: config.redis.password,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 10) {
            logger.error('Max Redis reconnection attempts reached');
            return null;
          }
          return Math.min(times * 100, 3000);
        },
      });

      this.client.on('connect', () => {
        logger.info('Connected to Redis');
      });

      this.client.on('error', (err) => {
        logger.error({ error: err.message }, 'Redis error');
      });

      // Create separate connection for pub/sub
      this.subscriber = this.client.duplicate();

      await this.client.ping();
      logger.info('Redis connection verified');
    } catch (error) {
      logger.error({ error }, 'Failed to connect to Redis');
      throw error;
    }
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client not initialized. Call connect() first.');
    }
    return this.client;
  }

  getSubscriber(): Redis {
    if (!this.subscriber) {
      throw new Error('Redis subscriber not initialized. Call connect() first.');
    }
    return this.subscriber;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
    logger.info('Disconnected from Redis');
  }

  // ==========================================
  // CACHING METHODS
  // ==========================================

  async get<T>(key: string): Promise<T | null> {
    const data = await this.getClient().get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const client = this.getClient();
    const serialized = JSON.stringify(value);
    
    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, serialized);
    } else {
      await client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.getClient().del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const client = this.getClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  }

  // ==========================================
  // LEADERBOARD METHODS (Sorted Sets)
  // ==========================================

  async updateLeaderboard(
    key: string,
    member: string,
    score: number
  ): Promise<void> {
    await this.getClient().zadd(key, score, member);
  }

  async incrementLeaderboard(
    key: string,
    member: string,
    increment: number
  ): Promise<number> {
    return await this.getClient().zincrby(key, increment, member);
  }

  async getLeaderboard(
    key: string,
    start: number = 0,
    end: number = 9
  ): Promise<Array<{ member: string; score: number }>> {
    const results = await this.getClient().zrevrange(key, start, end, 'WITHSCORES');
    const entries: Array<{ member: string; score: number }> = [];
    
    for (let i = 0; i < results.length; i += 2) {
      entries.push({
        member: results[i],
        score: parseFloat(results[i + 1]),
      });
    }
    
    return entries;
  }

  async getRank(key: string, member: string): Promise<number | null> {
    const rank = await this.getClient().zrevrank(key, member);
    return rank !== null ? rank + 1 : null;
  }

  // ==========================================
  // REAL-TIME FEED METHODS (Lists)
  // ==========================================

  async pushToFeed(key: string, data: unknown, maxLength: number = 100): Promise<void> {
    const client = this.getClient();
    await client.lpush(key, JSON.stringify(data));
    await client.ltrim(key, 0, maxLength - 1);
  }

  async getRecentFeed<T>(key: string, count: number = 20): Promise<T[]> {
    const items = await this.getClient().lrange(key, 0, count - 1);
    return items.map(item => JSON.parse(item));
  }

  // ==========================================
  // PUB/SUB METHODS
  // ==========================================

  async publish(channel: string, message: unknown): Promise<void> {
    await this.getClient().publish(channel, JSON.stringify(message));
  }

  async subscribe(
    channel: string,
    callback: (message: unknown) => void
  ): Promise<void> {
    const subscriber = this.getSubscriber();
    
    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          callback(JSON.parse(message));
        } catch (error) {
          logger.error({ error, channel }, 'Error parsing pubsub message');
        }
      }
    });

    await subscriber.subscribe(channel);
  }

  // ==========================================
  // METRICS METHODS
  // ==========================================

  async incrementCounter(key: string, amount: number = 1): Promise<number> {
    return await this.getClient().incrby(key, amount);
  }

  async getCounter(key: string): Promise<number> {
    const value = await this.getClient().get(key);
    return value ? parseInt(value, 10) : 0;
  }
}

export const redis = new RedisClient();
export default redis;

// Cache key generators
export const CacheKeys = {
  campaign: (id: string) => `campaign:${id}`,
  campaignList: (category?: string) => category ? `campaigns:${category}` : 'campaigns:all',
  campaignStats: (id: string) => `campaign:${id}:stats`,
  
  leaderboard: {
    global: () => 'leaderboard:global',
    campaign: (id: string) => `leaderboard:campaign:${id}`,
    daily: (date: string) => `leaderboard:daily:${date}`,
  },
  
  recentDonations: {
    global: () => 'donations:recent:global',
    campaign: (id: string) => `donations:recent:${id}`,
  },
  
  donor: (address: string) => `donor:${address}`,
  
  analytics: {
    global: () => 'analytics:global',
    campaign: (id: string) => `analytics:campaign:${id}`,
  },
} as const;

// Cache TTLs (in seconds)
export const CacheTTL = {
  campaign: 300, // 5 minutes
  campaignList: 60, // 1 minute
  leaderboard: 30, // 30 seconds
  recentDonations: 10, // 10 seconds (frequently updated)
  analytics: 60, // 1 minute
  donor: 300, // 5 minutes
} as const;
