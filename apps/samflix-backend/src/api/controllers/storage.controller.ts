import { Request, Response } from 'express';
import { DiskUsageService, StorageStats } from '../../services/storage/disk-usage.service';
import { DiskScannerService } from '../../services/storage/disk-scanner.service';
import { prisma } from '../../app';

export const storageController = {
  /**
   * GET /api/storage/stats
   * Get storage statistics including disk usage for raw media and HLS media
   */
  getStorageStats: async (_req: Request, res: Response): Promise<void> => {
    try {
      console.log('📊 Fetching storage statistics...');

      // Try to get cached statistics first
      let storageStats = await DiskUsageService.getCachedStorageStats();

      if (!storageStats) {
        console.log('📊 No cached statistics found, calculating fresh statistics...');

        // Get active media folders from database
        const folders = await prisma.mediaFolder.findMany({
          select: { path: true },
          where: { active: true },
        });

        const mediaPaths = folders.map((folder: { path: string }) => folder.path);

        if (mediaPaths.length === 0) {
          res.status(200).json({
            totalSpaceOccupied: '0 B',
            spaceOccupiedByRawMedia: '0 B',
            spaceOccupiedByHlsMedia: '0 B',
            totalDiskSpace: await DiskUsageService.getTotalDiskSpace(),
            message: 'No active media folders configured',
          });
          return;
        }

        // Calculate fresh statistics
        storageStats = await DiskUsageService.calculateStorageStats(mediaPaths);

        // Cache the results
        await DiskUsageService.cacheStorageStats(storageStats);
      }

      // Format the statistics for response
      const formattedStats: StorageStats = DiskUsageService.formatStorageStats(storageStats);

      // Get additional metadata
      const lastScanTime = await DiskUsageService.getLastScanTime();

      res.status(200).json({
        ...formattedStats,
        lastScanTime,
        cached: !!storageStats,
      });
    } catch (error) {
      console.error('❌ Error fetching storage statistics:', error);
      res.status(500).json({
        error: 'Failed to fetch storage statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  /**
   * POST /api/storage/update-disk-space
   * Update the total disk space setting
   */
  updateDiskSpace: async (req: Request, res: Response): Promise<void> => {
    try {
      const { totalDiskSpace } = req.body;

      if (!totalDiskSpace || typeof totalDiskSpace !== 'string') {
        res.status(400).json({
          error: "Invalid request body. 'totalDiskSpace' is required and must be a string.",
        });
        return;
      }

      // Validate disk space format (basic validation)
      const diskSpaceRegex = /^\d+(\.\d+)?\s*(B|KB|MB|GB|TB|PB)$/i;
      if (!diskSpaceRegex.test(totalDiskSpace.trim())) {
        res.status(400).json({
          error: "Invalid disk space format. Use format like '4TB', '500GB', '1.5TB', etc.",
        });
        return;
      }

      // Update the total disk space
      await DiskUsageService.updateTotalDiskSpace(totalDiskSpace.trim());

      // Clear cached statistics since total disk space changed
      await DiskUsageService.clearCache();

      console.log(`✅ Total disk space updated to: ${totalDiskSpace}`);

      res.status(200).json({
        message: 'Total disk space updated successfully',
        totalDiskSpace: totalDiskSpace.trim(),
      });
    } catch (error) {
      console.error('❌ Error updating disk space:', error);
      res.status(500).json({
        error: 'Failed to update disk space',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  /**
   * POST /api/storage/force-scan
   * Force a disk usage scan (useful for testing or manual refresh)
   */
  forceScan: async (_req: Request, res: Response): Promise<void> => {
    try {
      console.log('🔄 Force disk scan requested...');

      // Clear existing cache
      await DiskUsageService.clearCache();

      // Trigger a force scan (runs asynchronously)
      DiskScannerService.forceDiskScan().catch((error) => {
        console.error('❌ Error in force disk scan:', error);
      });

      res.status(202).json({
        message: 'Disk scan initiated successfully. Results will be available shortly.',
        status: 'scanning',
      });
    } catch (error) {
      console.error('❌ Error initiating force scan:', error);
      res.status(500).json({
        error: 'Failed to initiate disk scan',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  /**
   * GET /api/storage/scan-status
   * Get the status of disk scanning operations
   */
  getScanStatus: async (_req: Request, res: Response): Promise<void> => {
    try {
      const scanStatus = await DiskScannerService.getScanStatus();

      res.status(200).json(scanStatus);
    } catch (error) {
      console.error('❌ Error fetching scan status:', error);
      res.status(500).json({
        error: 'Failed to fetch scan status',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
};
