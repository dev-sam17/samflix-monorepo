import { Request, Response } from "express";
import redisClient, { RESUME_PROGRESS_TTL } from "../../services/redis.service";
import { cacheInvalidation, CacheInvalidationService } from "../middleware/cache-invalidation";

/**
 * Progress controller for managing video resume playback
 */
export const progressController = {
  /**
   * Save or update progress for a specific user and video
   * @route POST /api/progress
   */
  saveProgress: async (req: Request, res: Response): Promise<void> => {
    try {
      const { clerkId, tmdbId, currentTime } = req.body;

      // Validate required fields
      if (!clerkId || !tmdbId || currentTime === undefined) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      // Create Redis key
      const key = `resume:${clerkId}:${tmdbId}`;

      // Create value object with current timestamp
      const value = JSON.stringify({
        currentTime,
        updatedAt: new Date().toISOString(),
      });

      // Save to Redis with TTL
      await redisClient.set(key, value, "EX", RESUME_PROGRESS_TTL);

      res.status(204).send();
    } catch (error) {
      console.error("Error saving progress:", error);
      res.status(500).json({ error: "Failed to save progress" });
    }
  },

  /**
   * Get progress for a specific user and video
   * @route GET /api/progress/:clerkId/:tmdbId
   */
  getProgress: async (req: Request, res: Response): Promise<void> => {
    try {
      const { clerkId, tmdbId } = req.params;

      // Create Redis key
      const key = `resume:${clerkId}:${tmdbId}`;

      // Get from Redis
      const result = await redisClient.get(key);

      if (!result) {
        res.status(404).json({ error: "Progress not found" });
        return;
      }

      // Parse the JSON string
      const progress = JSON.parse(result);

      res.status(200).json(progress);
    } catch (error) {
      console.error("Error getting progress:", error);
      res.status(500).json({ error: "Failed to get progress" });
    }
  },

  /**
   * Get all progress entries for a specific user
   * @route GET /api/progress/:clerkId
   */
  getAllProgress: async (req: Request, res: Response): Promise<void> => {
    try {
      const { clerkId } = req.params;

      // Create Redis key pattern for scanning
      const pattern = `resume:${clerkId}:*`;

      // Use Redis SCAN to get all matching keys
      const keys: string[] = [];
      let cursor = "0";

      do {
        // Use scan to get keys in batches
        const result: [string, string[]] = await redisClient.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          "100"
        );

        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== "0");

      if (keys.length === 0) {
        res.status(200).json([]);
        return;
      }

      // Get all values for the found keys
      const values = await Promise.all(
        keys.map(async (key) => {
          const value = await redisClient.get(key);
          if (!value) return null;

          // Extract tmdbId from the key
          const tmdbId = key.split(":")[2];

          // Parse the stored JSON
          const progress = JSON.parse(value);

          return {
            tmdbId,
            ...progress,
          };
        })
      );

      // Filter out any null values (in case a key was deleted between scan and get)
      const validValues = values.filter(Boolean);

      res.status(200).json(validValues);
    } catch (error) {
      console.error("Error getting all progress:", error);
      res.status(500).json({ error: "Failed to get all progress" });
    }
  },

  /**
   * Delete progress for a specific user and video
   * @route DELETE /api/progress/:clerkId/:tmdbId
   */
  deleteProgress: async (req: Request, res: Response): Promise<void> => {
    try {
      const { clerkId, tmdbId } = req.params;

      // Create Redis key
      const key = `resume:${clerkId}:${tmdbId}`;

      // Delete from Redis
      const result = await redisClient.del(key);

      if (result === 0) {
        res.status(404).json({ error: "Progress not found" });
        return;
      }

      cacheInvalidation.clearProgressCache(clerkId, tmdbId);

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting progress:", error);
      res.status(500).json({ error: "Failed to delete progress" });
    }
  },

  /**
   * Save or update series progress for a specific user and episode
   * Invalidates any previous progress for the same series
   * @route POST /api/progress/series
   */
  saveSeriesProgress: async (req: Request, res: Response): Promise<void> => {
    try {
      const { clerkId, seriesId, tmdbId, currentTime } = req.body;

      // Validate required fields
      if (!clerkId || !seriesId || !tmdbId || currentTime === undefined) {
        res.status(400).json({ 
          error: "Missing required fields: clerkId, seriesId, tmdbId, and currentTime are required" 
        });
        return;
      }

      // First, find and delete any existing progress for this series
      const seriesPattern = `series_resume:${clerkId}:${seriesId}:*`;
      const keys: string[] = [];
      let cursor = "0";

      do {
        // Use scan to get keys in batches
        const result: [string, string[]] = await redisClient.scan(
          cursor,
          "MATCH",
          seriesPattern,
          "COUNT",
          "100"
        );

        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== "0");

      // Delete all existing progress for this series
      if (keys.length > 0) {
        await redisClient.del(...keys);
        console.log(`Invalidated ${keys.length} previous progress entries for series ${seriesId}`);
      }

      // Create new Redis key for series progress
      const key = `series_resume:${clerkId}:${seriesId}:${tmdbId}`;

      // Create value object with current timestamp
      const value = JSON.stringify({
        currentTime,
        seriesId,
        tmdbId,
        updatedAt: new Date().toISOString(),
      });

      // Save to Redis with TTL
      await redisClient.set(key, value, "EX", RESUME_PROGRESS_TTL);

      res.status(204).send();
    } catch (error) {
      console.error("Error saving series progress:", error);
      res.status(500).json({ error: "Failed to save series progress" });
    }
  },

  /**
   * Get series progress for a specific user and episode
   * @route GET /api/progress/series/:clerkId/:seriesId/:tmdbId
   */
  getSeriesProgress: async (req: Request, res: Response): Promise<void> => {
    try {
      const { clerkId, seriesId, tmdbId } = req.params;

      // Create Redis key
      const key = `series_resume:${clerkId}:${seriesId}:${tmdbId}`;

      // Get from Redis
      const result = await redisClient.get(key);

      if (!result) {
        res.status(404).json({ error: "Series progress not found" });
        return;
      }

      // Parse the JSON string
      const progress = JSON.parse(result);

      res.status(200).json(progress);
    } catch (error) {
      console.error("Error getting series progress:", error);
      res.status(500).json({ error: "Failed to get series progress" });
    }
  },

  /**
   * Get current series progress for a specific user and series (latest episode)
   * @route GET /api/progress/series/:clerkId/:seriesId
   */
  getCurrentSeriesProgress: async (req: Request, res: Response): Promise<void> => {
    try {
      const { clerkId, seriesId } = req.params;

      // Create Redis key pattern for scanning
      const pattern = `series_resume:${clerkId}:${seriesId}:*`;

      // Use Redis SCAN to get all matching keys
      const keys: string[] = [];
      let cursor = "0";

      do {
        // Use scan to get keys in batches
        const result: [string, string[]] = await redisClient.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          "100"
        );

        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== "0");

      if (keys.length === 0) {
        res.status(404).json({ error: "No series progress found" });
        return;
      }

      // Get all values for the found keys and find the most recent one
      const progressEntries = await Promise.all(
        keys.map(async (key) => {
          const value = await redisClient.get(key);
          if (!value) return null;

          // Parse the stored JSON
          const progress = JSON.parse(value);
          return progress;
        })
      );

      // Filter out any null values and find the most recent entry
      const validEntries = progressEntries.filter(Boolean);
      
      if (validEntries.length === 0) {
        res.status(404).json({ error: "No valid series progress found" });
        return;
      }

      // Sort by updatedAt and get the most recent
      const latestProgress = validEntries.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];

      res.status(200).json(latestProgress);
    } catch (error) {
      console.error("Error getting current series progress:", error);
      res.status(500).json({ error: "Failed to get current series progress" });
    }
  },

  /**
   * Get all series progress entries for a specific user
   * @route GET /api/progress/series/:clerkId
   */
  getAllSeriesProgress: async (req: Request, res: Response): Promise<void> => {
    try {
      const { clerkId } = req.params;

      // Create Redis key pattern for scanning
      const pattern = `series_resume:${clerkId}:*`;

      // Use Redis SCAN to get all matching keys
      const keys: string[] = [];
      let cursor = "0";

      do {
        // Use scan to get keys in batches
        const result: [string, string[]] = await redisClient.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          "100"
        );

        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== "0");

      if (keys.length === 0) {
        res.status(200).json([]);
        return;
      }

      // Get all values for the found keys
      const values = await Promise.all(
        keys.map(async (key) => {
          const value = await redisClient.get(key);
          if (!value) return null;

          // Parse the stored JSON
          const progress = JSON.parse(value);
          return progress;
        })
      );

      // Filter out any null values and group by series
      const validValues = values.filter(Boolean);
      
      // Group by seriesId and keep only the most recent progress for each series
      const seriesProgressMap = new Map();
      
      validValues.forEach((progress) => {
        const existing = seriesProgressMap.get(progress.seriesId);
        if (!existing || new Date(progress.updatedAt) > new Date(existing.updatedAt)) {
          seriesProgressMap.set(progress.seriesId, progress);
        }
      });

      // Convert map to array and sort by updatedAt (most recent first)
      const result = Array.from(seriesProgressMap.values()).sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      res.status(200).json(result);
    } catch (error) {
      console.error("Error getting all series progress:", error);
      res.status(500).json({ error: "Failed to get all series progress" });
    }
  },

  /**
   * Delete series progress for a specific user and series
   * @route DELETE /api/progress/series/:clerkId/:seriesId
   */
  deleteSeriesProgress: async (req: Request, res: Response): Promise<void> => {
    try {
      const { clerkId, seriesId } = req.params;

      // Create Redis key pattern for scanning
      const pattern = `series_resume:${clerkId}:${seriesId}:*`;

      // Use Redis SCAN to get all matching keys
      const keys: string[] = [];
      let cursor = "0";

      do {
        // Use scan to get keys in batches
        const result: [string, string[]] = await redisClient.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          "100"
        );

        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== "0");

      if (keys.length === 0) {
        res.status(404).json({ error: "Series progress not found" });
        return;
      }

      // Delete all keys for this series
      const result = await redisClient.del(...keys);

      console.log(`Deleted ${result} series progress entries for series ${seriesId}`);

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting series progress:", error);
      res.status(500).json({ error: "Failed to delete series progress" });
    }
  },

  /**
   * Invalidate all cache entries in the system
   * @route POST /api/progress/invalidate-cache
   */
  invalidateAllCache: async (_req: Request, res: Response): Promise<void> => {
    try {
      console.log("Manual cache invalidation requested");
      
      // Clear all cache entries
      await CacheInvalidationService.clearAllCache();
      
      res.status(200).json({
        success: true,
        message: "All cache entries have been invalidated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error invalidating all cache:", error);
      res.status(500).json({ 
        error: "Failed to invalidate cache",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
