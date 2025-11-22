import { Router } from "express";
import { cacheMiddleware, CacheOptions } from "./cache.middleware";

/**
 * Default TTL values for different types of routes (in seconds)
 */
export const DEFAULT_CACHE_TTL = {
  LIST: 3600, // 1 hour for list endpoints
  DETAIL: 3600, // 1 hour for detail endpoints
  SEARCH: 1800, // 30 minutes for search endpoints
  METADATA: 7200, // 2 hours for metadata endpoints
  STATIC: 86400, // 24 hours for static/rarely changing data
};

/**
 * Apply caching middleware to all GET routes in a router
 * @param router Express router to apply caching to
 * @param options Default cache options
 */
export function applyCacheToAllRoutes(
  router: Router,
  defaultOptions: CacheOptions = {}
): Router {
  // Store original router.get method
  const originalGet = router.get.bind(router);

  // Override router.get method to include caching middleware
  router.get = function (
    path: string | RegExp | Array<string | RegExp>,
    ...handlers: any[]
  ) {
    // Determine cache TTL based on path pattern
    let ttl = defaultOptions.ttl || DEFAULT_CACHE_TTL.LIST;

    // Apply different TTLs based on route patterns
    if (typeof path === "string") {
      if (path.includes("/search")) {
        ttl = DEFAULT_CACHE_TTL.SEARCH;
      } else if (path.match(/\/[a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+$/)) {
        ttl = DEFAULT_CACHE_TTL.DETAIL;
      } else if (path.includes("/all") || path.includes("/list")) {
        ttl = DEFAULT_CACHE_TTL.LIST;
      } else if (path.includes("/genres") || path.includes("/metadata")) {
        ttl = DEFAULT_CACHE_TTL.METADATA;
      } else {
        ttl = DEFAULT_CACHE_TTL.STATIC;
      }
    }

    // Create cache options for this route
    const cacheOpts = { ...defaultOptions, ttl };

    // Apply cache middleware before route handlers
    return originalGet.call(
      this,
      path,
      cacheMiddleware(cacheOpts),
      ...handlers
    );
  };

  return router;
}

/**
 * Create a new router with caching applied to all GET routes
 */
export function createCachedRouter(options: CacheOptions = {}): Router {
  const router = Router();
  return applyCacheToAllRoutes(router, options);
}
