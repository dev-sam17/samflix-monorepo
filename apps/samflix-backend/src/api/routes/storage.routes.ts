import { createSmartCacheRouter } from '../middleware/cache-invalidation-middleware';
import { storageController } from "../controllers/storage.controller";
import { validateUpdateDiskSpace } from "../validators/storage.validator";

// Create a router with caching for GET routes and automatic cache invalidation for POST/PUT/DELETE routes
const router = createSmartCacheRouter(
  // Cache options for GET routes
  { ttl: 3600 }, // 1 hour cache for storage statistics (they don't change frequently)
  // Invalidation options for data-modifying routes (simplified: clear all cache)
  {}
);

/**
 * @route GET /api/storage/stats
 * @desc Get storage statistics including disk usage for raw media and HLS media
 * @returns {
 *   totalSpaceOccupied: string,
 *   spaceOccupiedByRawMedia: string,
 *   spaceOccupiedByHlsMedia: string,
 *   totalDiskSpace: string,
 *   lastScanTime: string | null,
 *   cached: boolean
 * }
 */
router.get('/stats', storageController.getStorageStats);

/**
 * @route POST /api/storage/update-disk-space
 * @desc Update the total disk space setting
 * @body { totalDiskSpace: string } - Format: "4TB", "500GB", "1.5TB", etc.
 * @returns { message: string, totalDiskSpace: string }
 */
router.post('/update-disk-space', validateUpdateDiskSpace, storageController.updateDiskSpace);

/**
 * @route POST /api/storage/force-scan
 * @desc Force a disk usage scan (useful for testing or manual refresh)
 * @returns { message: string, status: string }
 */
router.post('/force-scan', storageController.forceScan);

/**
 * @route GET /api/storage/scan-status
 * @desc Get the status of disk scanning operations
 * @returns {
 *   lastScanTime: string | null,
 *   isScanning: boolean
 * }
 */
router.get('/scan-status', storageController.getScanStatus);

export default router;
