import { Request, Response, NextFunction } from 'express';
import redisClient from '../../services/redis.service';

/**
 * Configuration options for the cache middleware
 */
export interface CacheOptions {
  /** Time-to-live in seconds (default: 1 hour) */
  ttl?: number;
  /** Custom key generator function */
  keyGenerator?: (req: Request) => string;
  /** Whether to include query parameters in the cache key */
  includeQueryParams?: boolean;
}

/**
 * Default cache TTL (1 hour in seconds)
 */
const DEFAULT_CACHE_TTL = 60 * 60; // 1 hour

/**
 * Generate a cache key from the request
 */
const generateCacheKey = (req: Request, includeQueryParams = true): string => {
  const baseUrl = `${req.baseUrl}${req.path}`;

  if (includeQueryParams && Object.keys(req.query).length > 0) {
    const queryParams = new URLSearchParams(req.query as Record<string, string>).toString();
    return `cache:${baseUrl}?${queryParams}`;
  }

  return `cache:${baseUrl}`;
};

/**
 * Middleware to cache GET responses in Redis
 */
export const cacheMiddleware = (
  options: CacheOptions = {}
): ((req: Request, res: Response, next: NextFunction) => Promise<void | Response>) => {
  const ttl = options.ttl || DEFAULT_CACHE_TTL;
  const includeQueryParams = options.includeQueryParams !== false;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey = options.keyGenerator
      ? options.keyGenerator(req)
      : generateCacheKey(req, includeQueryParams);

    try {
      // Check if data exists in cache
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        // Cache hit
        console.log(`Cache hit for: ${cacheKey}`);
        const parsedData = JSON.parse(cachedData);
        return res.json(parsedData);
      }

      // Cache miss - store original res.json function
      const originalJson = res.json;

      // Override res.json method to cache the response before sending
      res.json = function (body: any) {
        // Restore original res.json function
        res.json = originalJson;

        // Cache the response data
        redisClient
          .setex(cacheKey, ttl, JSON.stringify(body))
          .catch((err) => console.error(`Error setting cache: ${err}`));

        console.log(`Cache miss for: ${cacheKey}, storing in cache for ${ttl} seconds`);

        // Call the original json method
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error(`Cache middleware error: ${error}`);
      next();
    }
  };
};

/**
 * Clear cache for a specific route pattern
 */
export const clearCache = async (pattern: string): Promise<number> => {
  try {
    const keys = await redisClient.keys(`cache:${pattern}*`);

    if (keys.length > 0) {
      const deleted = await redisClient.del(keys);
      console.log(`Cleared ${deleted} cache entries matching pattern: ${pattern}`);
      return deleted;
    }

    return 0;
  } catch (error) {
    console.error(`Error clearing cache: ${error}`);
    return 0;
  }
};
