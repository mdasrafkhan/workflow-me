import { Injectable, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

export interface LockOptions {
  ttl?: number; // Time to live in milliseconds
  retryDelay?: number; // Delay between retry attempts in milliseconds
  maxRetries?: number; // Maximum number of retry attempts
}

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);
  private readonly redis: RedisClientType;

  constructor() {
    this.redis = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      password: process.env.REDIS_PASSWORD,
      database: parseInt(process.env.REDIS_DB || '0'),
    });

    this.redis.connect().catch(error => {
      this.logger.error(`Failed to connect to Redis: ${error.message}`);
    });
  }

  /**
   * Acquire a distributed lock
   * @param key - Lock key
   * @param options - Lock options
   * @returns Promise<boolean> - True if lock acquired, false otherwise
   */
  async acquireLock(key: string, options: LockOptions = {}): Promise<boolean> {
    const {
      ttl = 30000, // 30 seconds default
      retryDelay = 100, // 100ms default
      maxRetries = 10 // 10 retries default
    } = options;

    const lockValue = `${Date.now()}-${Math.random()}`;
    const lockKey = `lock:${key}`;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Try to set the lock with NX (only if not exists) and EX (expiration)
        const result = await this.redis.set(lockKey, lockValue, {
          PX: ttl,
          NX: true
        });

        if (result) {
          this.logger.log(`Lock acquired for key: ${key}`);
          return true;
        }

        // If we couldn't acquire the lock, wait and retry
        if (attempt < maxRetries - 1) {
          await this.sleep(retryDelay);
        }
      } catch (error) {
        this.logger.error(`Error acquiring lock for key ${key}: ${error.message}`);
        if (attempt === maxRetries - 1) {
          return false;
        }
        await this.sleep(retryDelay);
      }
    }

    this.logger.warn(`Failed to acquire lock for key: ${key} after ${maxRetries} attempts`);
    return false;
  }

  /**
   * Release a distributed lock
   * @param key - Lock key
   * @returns Promise<boolean> - True if lock released, false otherwise
   */
  async releaseLock(key: string): Promise<boolean> {
    const lockKey = `lock:${key}`;

    try {
      // Use Lua script to atomically check and delete the lock
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(luaScript, {
        keys: [lockKey],
        arguments: ['']
      }) as number;

      if (result === 1) {
        this.logger.log(`Lock released for key: ${key}`);
        return true;
      } else {
        this.logger.warn(`Lock not released for key: ${key} (may have expired or been released by another process)`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error releasing lock for key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if a lock exists
   * @param key - Lock key
   * @returns Promise<boolean> - True if lock exists, false otherwise
   */
  async isLocked(key: string): Promise<boolean> {
    const lockKey = `lock:${key}`;

    try {
      const result = await this.redis.exists(lockKey);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking lock for key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Extend a lock's TTL
   * @param key - Lock key
   * @param ttl - New TTL in milliseconds
   * @returns Promise<boolean> - True if lock extended, false otherwise
   */
  async extendLock(key: string, ttl: number): Promise<boolean> {
    const lockKey = `lock:${key}`;

    try {
      const result = await this.redis.expire(lockKey, Math.ceil(ttl / 1000));
      return result;
    } catch (error) {
      this.logger.error(`Error extending lock for key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Execute a function with a distributed lock
   * @param key - Lock key
   * @param fn - Function to execute
   * @param options - Lock options
   * @returns Promise<T> - Function result
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T> {
    const acquired = await this.acquireLock(key, options);

    if (!acquired) {
      throw new Error(`Failed to acquire lock for key: ${key}`);
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(key);
    }
  }

  /**
   * Get lock information
   * @param key - Lock key
   * @returns Promise<{ exists: boolean; ttl: number; value: string } | null>
   */
  async getLockInfo(key: string): Promise<{ exists: boolean; ttl: number; value: string } | null> {
    const lockKey = `lock:${key}`;

    try {
      const [exists, ttl, value] = await Promise.all([
        this.redis.exists(lockKey),
        this.redis.ttl(lockKey),
        this.redis.get(lockKey)
      ]);

      if (exists === 0) {
        return null;
      }

      return {
        exists: true,
        ttl: ttl * 1000, // Convert to milliseconds
        value: value || ''
      };
    } catch (error) {
      this.logger.error(`Error getting lock info for key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup method
   */
  async onModuleDestroy() {
    await this.redis.disconnect();
  }
}
