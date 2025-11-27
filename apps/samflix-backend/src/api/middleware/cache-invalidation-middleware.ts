import { Request, Response, NextFunction } from 'express';
import express from 'express';
import { CacheInvalidationService } from './cache-invalidation';
import { createCachedRouter } from './cache-routes';

/**
 * Interface for cache invalidation options
 * Simplified: Just clear all cache for non-GET requests
 */
export interface CacheInvalidationOptions {
  /**
   * Custom invalidation function for special cases
   * If not provided, all cache will be cleared
   */
  customInvalidation?: (req: Request, res: Response) => Promise<void>;
}

/**
 * Middleware to invalidate cache after successful data modifications
 * @param options Cache invalidation options
 */
export const invalidateCache = (options: CacheInvalidationOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store the original end method
    const originalEnd = res.end;

    // Override the end method to perform cache invalidation after response is sent
    const endOverride: any = function (
      this: Response,
      chunk?: any,
      encoding?: any,
      callback?: any
    ) {
      // Call the original end method first
      const result = originalEnd.call(this, chunk, encoding, callback);

      // Only invalidate cache for successful responses (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Execute cache invalidation synchronously after response is sent
        performCacheInvalidation(req, res, options)
          .then(() => {
            console.log('Cache invalidation completed for:', req.originalUrl);
          })
          .catch((error) => {
            console.error('Error during cache invalidation:', error);
          });
      }

      return result;
    };
    res.end = endOverride;

    next();
  };
};

/**
 * Perform cache invalidation based on options and request context
 * Simplified approach: Clear all cache for non-GET requests
 */
async function performCacheInvalidation(
  req: Request,
  res: Response,
  options: CacheInvalidationOptions
): Promise<void> {
  console.log(`Starting simplified cache invalidation for ${req.method} ${req.originalUrl}`);

  // For non-GET requests, simply clear all cache to ensure no stale data
  console.log(`Clearing all cache entries to prevent stale data`);
  await CacheInvalidationService.clearAllCache();

  // Execute custom invalidation if provided (for special cases)
  if (options.customInvalidation) {
    console.log(`Executing custom invalidation function`);
    await options.customInvalidation(req, res);
  }
}

/**
 * Create a router with automatic cache invalidation for data-modifying routes
 * @param options Default cache invalidation options
 */
export function createCacheInvalidatingRouter(options: CacheInvalidationOptions = {}) {
  const router = express.Router();

  // Store original methods
  const originalPost = router.post.bind(router);
  const originalPut = router.put.bind(router);
  const originalPatch = router.patch.bind(router);
  const originalDelete = router.delete.bind(router);

  // Override POST method to include cache invalidation
  router.post = function (path: string | RegExp | Array<string | RegExp>, ...handlers: any[]) {
    // Apply cache invalidation middleware before the route handlers
    return (originalPost as any)(path, invalidateCache(options), ...handlers);
  };

  // Override PUT method to include cache invalidation
  router.put = function (path: string | RegExp | Array<string | RegExp>, ...handlers: any[]) {
    // Apply cache invalidation middleware before the route handlers
    return (originalPut as any)(path, invalidateCache(options), ...handlers);
  };

  // Override PATCH method to include cache invalidation
  router.patch = function (path: string | RegExp | Array<string | RegExp>, ...handlers: any[]) {
    // Apply cache invalidation middleware before the route handlers
    return (originalPatch as any)(path, invalidateCache(options), ...handlers);
  };

  // Override DELETE method to include cache invalidation
  router.delete = function (path: string | RegExp | Array<string | RegExp>, ...handlers: any[]) {
    // Apply cache invalidation middleware before the route handlers
    return (originalDelete as any)(path, invalidateCache(options), ...handlers);
  };

  return router;
}

/**
 * Create a router with both caching for GET routes and cache invalidation for data-modifying routes
 */
export function createSmartCacheRouter(
  cacheOptions: any = {},
  invalidationOptions: CacheInvalidationOptions = {}
) {
  // First create a router with GET caching
  const router = createCachedRouter(cacheOptions);

  // Store original methods for data-modifying routes
  const originalPost = router.post.bind(router);
  const originalPut = router.put.bind(router);
  const originalPatch = router.patch.bind(router);
  const originalDelete = router.delete.bind(router);

  // Override POST method to include cache invalidation
  router.post = function (path: string | RegExp | Array<string | RegExp>, ...handlers: any[]) {
    // Apply cache invalidation middleware before the route handlers
    return (originalPost as any)(path, invalidateCache(invalidationOptions), ...handlers);
  };

  // Override PUT method to include cache invalidation
  router.put = function (path: string | RegExp | Array<string | RegExp>, ...handlers: any[]) {
    // Apply cache invalidation middleware before the route handlers
    return (originalPut as any)(path, invalidateCache(invalidationOptions), ...handlers);
  };

  // Override PATCH method to include cache invalidation
  router.patch = function (path: string | RegExp | Array<string | RegExp>, ...handlers: any[]) {
    // Apply cache invalidation middleware before the route handlers
    return (originalPatch as any)(path, invalidateCache(invalidationOptions), ...handlers);
  };

  // Override DELETE method to include cache invalidation
  router.delete = function (path: string | RegExp | Array<string | RegExp>, ...handlers: any[]) {
    // Apply cache invalidation middleware before the route handlers
    return (originalDelete as any)(path, invalidateCache(invalidationOptions), ...handlers);
  };

  return router;
}
