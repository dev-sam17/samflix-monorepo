import redisClient from '../../services/redis.service';
import { Request } from 'express';

/**
 * Generate a cache key from the request
 * Duplicated from cache.middleware.ts since it's not exported there
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
 * CacheInvalidationService
 * 
 * A comprehensive service for invalidating Redis cache entries based on data changes.
 * This service provides methods to clear specific cache entries or patterns when
 * data is modified through POST, PUT, PATCH, or DELETE operations.
 */
export class CacheInvalidationService {
  /**
   * Clear a specific cache entry by its key
   * @param key The exact cache key to clear
   */
  static async clearKey(key: string): Promise<void> {
    try {
      const result = await redisClient.del(key);
      console.log(`Cache cleared for key: ${key} (${result} keys deleted)`);
    } catch (error) {
      console.error(`Error clearing cache for key ${key}:`, error);
    }
  }

  /**
   * Clear cache entries by pattern using Redis SCAN
   * @param pattern Pattern to match cache keys (e.g., "cache:api:movies:*")
   */
  static async clearPattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      let totalCleared = 0;
      console.log(`Starting pattern scan for: ${pattern}`);
      
      do {
        // Scan for keys matching the pattern
        const [nextCursor, keys] = await redisClient.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        
        cursor = nextCursor;
        
        // Delete found keys if any
        if (keys.length > 0) {
          console.log(`Found ${keys.length} keys matching pattern ${pattern}:`, keys);
          await redisClient.del(...keys);
          totalCleared += keys.length;
        }
      } while (cursor !== '0');
      
      console.log(`Cleared ${totalCleared} total cache entries matching pattern: ${pattern}`);
    } catch (error) {
      console.error(`Error clearing cache for pattern ${pattern}:`, error);
    }
  }

  /**
   * Clear cache based on a request object
   * @param req Express request object
   * @param includeQueryParams Whether to include query parameters in the cache key
   */
  static async clearForRequest(req: Request, includeQueryParams = false): Promise<void> {
    const cacheKey = generateCacheKey(req, includeQueryParams);
    await this.clearKey(cacheKey);
  }

  /**
   * Clear all cache entries with a specific prefix
   * @param prefix The prefix to match (e.g., "cache:api:movies")
   */
  static async clearByPrefix(prefix: string): Promise<void> {
    await this.clearPattern(`${prefix}*`);
  }

  /**
   * Clear all cache entries related to movies
   */
  static async clearMoviesCache(): Promise<void> {
    await this.clearByPrefix('cache:/api/movies');
  }

  /**
   * Clear cache for a specific movie
   * @param movieId The ID of the movie
   */
  static async clearMovieCache(movieId: string): Promise<void> {
    // Clear the specific movie detail cache
    await this.clearKey(`cache:/api/movies/${movieId}`);
    
    // Also clear list caches that might include this movie
    await this.clearMoviesListCache();
  }

  /**
   * Clear all movie list caches (for when a movie is added, updated, or deleted)
   */
  static async clearMoviesListCache(): Promise<void> {
    // Clear the main list endpoint
    await this.clearKey('cache:/api/movies');
    
    // Clear genre-specific lists
    await this.clearPattern('cache:/api/movies/genre/*');
    
    // Clear search results that might include this movie
    await this.clearPattern('cache:/api/movies/search/*');
  }

  // Note: clearSeriesCache is implemented below with optional parameter

  /**
   * Clear cache for a specific series
   * @param seriesId The ID of the series
   */
  static async clearSeriesCache(seriesId?: string): Promise<void> {
    if (seriesId) {
      // Clear the specific series detail cache
      await this.clearKey(`cache:/api/series/${seriesId}`);
      
      // Also clear list caches that might include this series
      await this.clearSeriesListCache();
    } else {
      // Clear all series caches
      await this.clearByPrefix('cache:/api/series');
    }
  }

  /**
   * Clear all series list caches (for when a series is added, updated, or deleted)
   */
  static async clearSeriesListCache(): Promise<void> {
    // Clear the main list endpoint
    await this.clearKey('cache:/api/series');
    
    // Clear genre-specific lists
    await this.clearPattern('cache:/api/series/genre/*');
    
    // Clear search results that might include this series
    await this.clearPattern('cache:/api/series/search/*');
  }

  /**
   * Clear cache for a specific episode
   * @param seriesId The ID of the series
   * @param seasonNumber The season number
   * @param episodeNumber The episode number (optional)
   */
  static async clearEpisodeCache(
    seriesId: string, 
    seasonNumber: number, 
    episodeNumber?: number
  ): Promise<void> {
    // Clear specific episode if provided
    if (episodeNumber) {
      await this.clearKey(
        `cache:/api/series/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}`
      );
    }
    
    // Clear season cache
    await this.clearKey(`cache:/api/series/${seriesId}/season/${seasonNumber}`);
    
    // Clear series detail as it might include episode info
    await this.clearKey(`cache:/api/series/${seriesId}`);
    
    // Also clear series list as episode counts might be included
    await this.clearSeriesListCache();
  }

  /**
   * Clear all transcode-related caches
   */
  static async clearTranscodeCache(): Promise<void> {
    await this.clearByPrefix('cache:/api/transcode');
  }

  /**
   * Clear cache for a specific transcode status
   * @param status The transcode status
   */
  static async clearTranscodeStatusCache(status: string): Promise<void> {
    await this.clearKey(`cache:/api/transcode/status/${status}`);
    await this.clearKey(`cache:/api/transcode/movies/status/${status}`);
    await this.clearKey(`cache:/api/transcode/episodes/status/${status}`);
  }

  /**
   * Clear cache when movie transcode status is updated
   * @param movieId The ID of the movie
   */
  static async clearMovieTranscodeCache(movieId: string): Promise<void> {
    // Clear movie-specific caches
    await this.clearMovieCache(movieId);
    
    // Clear transcode status caches
    await this.clearTranscodeCache();
    
    // Clear streaming caches for this movie
    await this.clearPattern(`cache:/api/movies/${movieId}/hls*`);
  }

  /**
   * Clear cache when episode transcode status is updated
   * @param episodeId The ID of the episode
   * @param seriesId The ID of the series
   * @param seasonNumber The season number
   * @param episodeNumber The episode number
   */
  static async clearEpisodeTranscodeCache(
    episodeId: string,
    seriesId: string,
    seasonNumber: number,
    episodeNumber: number
  ): Promise<void> {
    // Clear episode-specific caches
    await this.clearEpisodeCache(seriesId, seasonNumber, episodeNumber);
    
    // Clear transcode status caches
    await this.clearTranscodeCache();
    
    // Clear streaming caches for this episode
    await this.clearPattern(`cache:/api/episodes/${episodeId}/hls*`);
  }

  /**
   * Clear all scanner-related caches
   */
  static async clearScannerCache(): Promise<void> {
    await this.clearByPrefix('cache:/api/scanner');
  }

  /**
   * Clear cache for media folders
   */
  static async clearMediaFoldersCache(): Promise<void> {
    await this.clearKey('cache:/api/scanner/folders');
  }

  /**
   * Clear cache for scanning conflicts
   */
  static async clearConflictsCache(): Promise<void> {
    await this.clearKey('cache:/api/scanner/conflicts');
  }

  /**
   * Clear progress-related caches
   * @param clerkId User ID (optional)
   * @param tmdbId Media ID (optional)
   */
  static async clearProgressCache(clerkId?: string, tmdbId?: string): Promise<void> {
    if (clerkId && tmdbId) {
      // Clear specific progress entry
      await this.clearKey(`cache:/api/progress/${clerkId}/${tmdbId}`);
    } else if (clerkId) {
      // Clear all progress for a user
      await this.clearKey(`cache:/api/progress/${clerkId}`);
    } else {
      // Clear all progress caches
      await this.clearByPrefix('cache:/api/progress');
    }
  }

  /**
   * Clear all caches in the system
   * Use with caution!
   */
  static async clearAllCache(): Promise<void> {
    try {
      // Find all cache keys
      const keys = await this.getAllCacheKeys();
      
      if (keys.length > 0) {
        // Delete all found keys
        await redisClient.del(...keys);
        console.log(`Cleared all ${keys.length} cache entries`);
      }
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  /**
   * Get all cache keys in the system
   * @returns Array of all cache keys
   */
  private static async getAllCacheKeys(): Promise<string[]> {
    const allKeys: string[] = [];
    let cursor = '0';
    
    do {
      // Scan for all keys with the cache prefix
      const [nextCursor, keys] = await redisClient.scan(
        cursor,
        'MATCH',
        'cache:*',
        'COUNT',
        100
      );
      
      cursor = nextCursor;
      allKeys.push(...keys);
    } while (cursor !== '0');
    
    return allKeys;
  }
}

// Export a singleton instance for easy access
export const cacheInvalidation = CacheInvalidationService;
