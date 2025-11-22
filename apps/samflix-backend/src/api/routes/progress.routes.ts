import { createSmartCacheRouter } from '../middleware/cache-invalidation-middleware';
import { progressController } from "../controllers/progress.controller";
import {
  validateSaveProgress,
  validateProgressParams,
  validateClerkIdParam,
  validateSaveSeriesProgress,
  validateSeriesProgressParams,
  validateSeriesParams,
} from "../validators/progress.validator";

// Create a router with caching for GET routes and automatic cache invalidation for POST/PUT/DELETE routes
const router = createSmartCacheRouter(
  // Cache options for GET routes
  { ttl: 1800 }, // 30 minutes cache for progress data
  // Invalidation options for data-modifying routes (simplified: clear all cache)
  {}
);

/**
 * @route POST /api/progress
 * @desc Save or update progress for a specific user and video
 * @body { clerkId: string, tmdbId: string, currentTime: number }
 * @returns 204 No Content
 */
router.post('/', validateSaveProgress, progressController.saveProgress);

/**
 * @route GET /api/progress/:clerkId/:tmdbId
 * @desc Get progress for a specific user and video
 * @returns { currentTime: number, updatedAt: string }
 */
router.get('/:clerkId/:tmdbId', validateProgressParams, progressController.getProgress);

// Note: More specific routes must come BEFORE generic routes to avoid conflicts

/**
 * @route DELETE /api/progress/:clerkId/:tmdbId
 * @desc Delete progress for a specific user and video
 * @returns 204 No Content
 */
router.delete('/:clerkId/:tmdbId', validateProgressParams, progressController.deleteProgress);

// Series Progress Routes

/**
 * @route POST /api/progress/series
 * @desc Save or update series progress for a specific user and episode (invalidates previous progress for same series)
 * @body { clerkId: string, seriesId: string, tmdbId: string, currentTime: number }
 * @returns 204 No Content
 */
router.post('/series', validateSaveSeriesProgress, progressController.saveSeriesProgress);

/**
 * @route GET /api/progress/series/:clerkId/:seriesId/:tmdbId
 * @desc Get series progress for a specific user, series, and episode
 * @returns { currentTime: number, seriesId: string, tmdbId: string, updatedAt: string }
 */
router.get('/series/:clerkId/:seriesId/:tmdbId', validateSeriesProgressParams, progressController.getSeriesProgress);

/**
 * @route GET /api/progress/series/:clerkId/:seriesId
 * @desc Get current series progress for a specific user and series (latest episode)
 * @returns { currentTime: number, seriesId: string, tmdbId: string, updatedAt: string }
 */
router.get('/series/:clerkId/:seriesId', validateSeriesParams, progressController.getCurrentSeriesProgress);

/**
 * @route GET /api/progress/series/:clerkId
 * @desc Get all series progress entries for a specific user (most recent per series)
 * @returns Array of { currentTime: number, seriesId: string, tmdbId: string, updatedAt: string }
 */
router.get('/series/:clerkId', validateClerkIdParam, progressController.getAllSeriesProgress);

/**
 * @route DELETE /api/progress/series/:clerkId/:seriesId
 * @desc Delete all series progress for a specific user and series
 * @returns 204 No Content
 */
router.delete('/series/:clerkId/:seriesId', validateSeriesParams, progressController.deleteSeriesProgress);

// Movie Progress Routes (must come AFTER series routes to avoid conflicts)

/**
 * @route GET /api/progress/:clerkId
 * @desc Get all movie progress entries for a specific user
 * @returns Array of { tmdbId: string, currentTime: number, updatedAt: string }
 */
router.get('/:clerkId', validateClerkIdParam, progressController.getAllProgress);

// Cache Management Routes

/**
 * @route POST /api/progress/invalidate-cache
 * @desc Invalidate all cache entries in the system
 * @returns { success: boolean, message: string, timestamp: string }
 */
router.post('/invalidate-cache', progressController.invalidateAllCache);

export default router;
