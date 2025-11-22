import { prisma } from "../../app";
import { DiskUsageService } from "./disk-usage.service";

/**
 * Service for handling scheduled disk usage scans
 */
export class DiskScannerService {
  /**
   * Executes a scheduled disk usage scan
   * This function is designed to be called by cron jobs every 24 hours
   */
  static async executeScheduledDiskScan(): Promise<void> {
    console.log("💾 Starting scheduled disk usage scan...");
    
    try {
      // Get active media folders from database
      const folders = await prisma.mediaFolder.findMany({
        select: { id: true, path: true, type: true, active: true },
        where: { active: true },
      });

      // Extract all media paths
      const mediaPaths = folders.map(folder => folder.path);

      // Check if there are any configured paths
      if (mediaPaths.length === 0) {
        console.log("⚠️  No active media folders configured. Skipping disk scan.");
        return;
      }

      console.log(`📁 Scanning ${mediaPaths.length} media folders for disk usage`);
      console.log("Media paths:", mediaPaths);

      // Calculate storage statistics
      const storageStats = await DiskUsageService.calculateStorageStats(mediaPaths);
      
      // Cache the results in Redis
      await DiskUsageService.cacheStorageStats(storageStats);

      // Format stats for logging
      const formattedStats = DiskUsageService.formatStorageStats(storageStats);
      
      console.log("✅ Scheduled disk usage scan completed successfully!");
      console.log("📊 Storage Statistics:", {
        totalSpaceOccupied: formattedStats.totalSpaceOccupied,
        spaceOccupiedByRawMedia: formattedStats.spaceOccupiedByRawMedia,
        spaceOccupiedByHlsMedia: formattedStats.spaceOccupiedByHlsMedia,
        totalDiskSpace: formattedStats.totalDiskSpace
      });

    } catch (error) {
      console.error("❌ Error during scheduled disk usage scan:", error);
      
      // Log additional error details for debugging
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack trace
        });
      }
    }
  }

  /**
   * Force a disk usage scan (can be called manually via API)
   */
  static async forceDiskScan(): Promise<void> {
    console.log("🔄 Force disk usage scan initiated...");
    await this.executeScheduledDiskScan();
  }

  /**
   * Get scan status and last scan time
   */
  static async getScanStatus(): Promise<{
    lastScanTime: string | null;
    isScanning: boolean;
  }> {
    try {
      const lastScanTime = await DiskUsageService.getLastScanTime();
      
      return {
        lastScanTime,
        isScanning: false // In a real implementation, you might track this in Redis
      };
    } catch (error) {
      console.error("❌ Error getting scan status:", error);
      return {
        lastScanTime: null,
        isScanning: false
      };
    }
  }
}
