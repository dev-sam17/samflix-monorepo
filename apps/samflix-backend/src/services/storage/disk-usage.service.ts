import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import redisClient from '../redis.service';

const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);

export interface StorageStats {
  totalSpaceOccupied: string;
  spaceOccupiedByRawMedia: string;
  spaceOccupiedByHlsMedia: string;
  totalDiskSpace: string;
}

export interface StorageStatsBytes {
  totalSpaceOccupied: number;
  spaceOccupiedByRawMedia: number;
  spaceOccupiedByHlsMedia: number;
  totalDiskSpace: string;
}

/**
 * Service for calculating disk usage statistics for media content
 */
export class DiskUsageService {
  // Redis keys for caching storage statistics
  private static readonly REDIS_KEYS = {
    STORAGE_STATS: 'storage:stats',
    TOTAL_DISK_SPACE: 'storage:total_disk_space',
    LAST_SCAN_TIME: 'storage:last_scan_time'
  };

  // Raw media file extensions (not HLS compatible)
  private static readonly RAW_MEDIA_EXTENSIONS = [
    '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', 
    '.m4v', '.3gp', '.ogv', '.ts', '.m2ts', '.mts',
    '.m4a', '.mp3', '.flac', '.wav', '.aac', '.ogg', '.wma'
  ];

  // HLS-related file extensions and folder patterns
  private static readonly HLS_PATTERNS = {
    extensions: ['.m3u8', '.ts'],
    folderNames: ['hls', 'segments', 'playlist']
  };

  /**
   * Calculate total disk usage for all media content
   */
  static async calculateStorageStats(mediaPaths: string[]): Promise<StorageStatsBytes> {
    console.log('🔍 Starting disk usage calculation...');
    
    let totalRawMediaSize = 0;
    let totalHlsMediaSize = 0;

    for (const mediaPath of mediaPaths) {
      if (!fs.existsSync(mediaPath)) {
        console.warn(`⚠️  Media path does not exist: ${mediaPath}`);
        continue;
      }

      console.log(`📁 Scanning path: ${mediaPath}`);
      const pathStats = await this.scanDirectory(mediaPath);
      totalRawMediaSize += pathStats.rawMediaSize;
      totalHlsMediaSize += pathStats.hlsMediaSize;
    }

    // Get total disk space from Redis or use default
    const totalDiskSpace = await this.getTotalDiskSpace();

    const stats: StorageStatsBytes = {
      totalSpaceOccupied: totalRawMediaSize + totalHlsMediaSize,
      spaceOccupiedByRawMedia: totalRawMediaSize,
      spaceOccupiedByHlsMedia: totalHlsMediaSize,
      totalDiskSpace
    };

    console.log('✅ Disk usage calculation completed');
    return stats;
  }

  /**
   * Recursively scan a directory and calculate raw media and HLS media sizes
   */
  private static async scanDirectory(dirPath: string): Promise<{rawMediaSize: number, hlsMediaSize: number}> {
    let rawMediaSize = 0;
    let hlsMediaSize = 0;

    try {
      const entries = await readdir(dirPath);

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        
        try {
          const stats = await stat(fullPath);

          if (stats.isDirectory()) {
            // Check if this is an HLS folder
            const isHlsFolder = this.HLS_PATTERNS.folderNames.some(pattern => 
              entry.toLowerCase().includes(pattern)
            );

            if (isHlsFolder) {
              // If it's an HLS folder, count everything inside as HLS media
              const hlsSize = await this.calculateDirectorySize(fullPath);
              hlsMediaSize += hlsSize;
            } else {
              // Recursively scan subdirectory
              const subDirStats = await this.scanDirectory(fullPath);
              rawMediaSize += subDirStats.rawMediaSize;
              hlsMediaSize += subDirStats.hlsMediaSize;
            }
          } else if (stats.isFile()) {
            const fileSize = stats.size;
            const fileExt = path.extname(entry).toLowerCase();

            // Check if it's a raw media file
            if (this.RAW_MEDIA_EXTENSIONS.includes(fileExt)) {
              rawMediaSize += fileSize;
            }
            // Check if it's an HLS file
            else if (this.HLS_PATTERNS.extensions.includes(fileExt)) {
              hlsMediaSize += fileSize;
            }
          }
        } catch (error) {
          console.warn(`⚠️  Error processing ${fullPath}:`, error);
        }
      }
    } catch (error) {
      console.error(`❌ Error scanning directory ${dirPath}:`, error);
    }

    return { rawMediaSize, hlsMediaSize };
  }

  /**
   * Calculate total size of a directory (used for HLS folders)
   */
  private static async calculateDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    try {
      const entries = await readdir(dirPath);

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        
        try {
          const stats = await stat(fullPath);

          if (stats.isDirectory()) {
            totalSize += await this.calculateDirectorySize(fullPath);
          } else if (stats.isFile()) {
            totalSize += stats.size;
          }
        } catch (error) {
          console.warn(`⚠️  Error processing ${fullPath}:`, error);
        }
      }
    } catch (error) {
      console.error(`❌ Error calculating directory size for ${dirPath}:`, error);
    }

    return totalSize;
  }

  /**
   * Convert bytes to human-readable format
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Convert StorageStatsBytes to StorageStats with formatted strings
   */
  static formatStorageStats(stats: StorageStatsBytes): StorageStats {
    return {
      totalSpaceOccupied: this.formatBytes(stats.totalSpaceOccupied),
      spaceOccupiedByRawMedia: this.formatBytes(stats.spaceOccupiedByRawMedia),
      spaceOccupiedByHlsMedia: this.formatBytes(stats.spaceOccupiedByHlsMedia),
      totalDiskSpace: stats.totalDiskSpace
    };
  }

  /**
   * Cache storage statistics in Redis
   */
  static async cacheStorageStats(stats: StorageStatsBytes): Promise<void> {
    try {
      await redisClient.setex(
        this.REDIS_KEYS.STORAGE_STATS,
        3600, // Cache for 1 hour
        JSON.stringify(stats)
      );
      
      await redisClient.set(
        this.REDIS_KEYS.LAST_SCAN_TIME,
        new Date().toISOString()
      );

      console.log('✅ Storage statistics cached successfully');
    } catch (error) {
      console.error('❌ Error caching storage statistics:', error);
    }
  }

  /**
   * Get cached storage statistics from Redis
   */
  static async getCachedStorageStats(): Promise<StorageStatsBytes | null> {
    try {
      const cachedStats = await redisClient.get(this.REDIS_KEYS.STORAGE_STATS);
      
      if (cachedStats) {
        return JSON.parse(cachedStats);
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error retrieving cached storage statistics:', error);
      return null;
    }
  }

  /**
   * Get total disk space setting
   */
  static async getTotalDiskSpace(): Promise<string> {
    try {
      const totalDiskSpace = await redisClient.get(this.REDIS_KEYS.TOTAL_DISK_SPACE);
      return totalDiskSpace || '4TB'; // Default value
    } catch (error) {
      console.error('❌ Error retrieving total disk space:', error);
      return '4TB'; // Default fallback
    }
  }

  /**
   * Update total disk space setting
   */
  static async updateTotalDiskSpace(diskSpace: string): Promise<void> {
    try {
      await redisClient.set(this.REDIS_KEYS.TOTAL_DISK_SPACE, diskSpace);
      console.log(`✅ Total disk space updated to: ${diskSpace}`);
    } catch (error) {
      console.error('❌ Error updating total disk space:', error);
      throw error;
    }
  }

  /**
   * Get last scan time
   */
  static async getLastScanTime(): Promise<string | null> {
    try {
      return await redisClient.get(this.REDIS_KEYS.LAST_SCAN_TIME);
    } catch (error) {
      console.error('❌ Error retrieving last scan time:', error);
      return null;
    }
  }

  /**
   * Clear cached storage statistics
   */
  static async clearCache(): Promise<void> {
    try {
      await redisClient.del(this.REDIS_KEYS.STORAGE_STATS);
      console.log('✅ Storage statistics cache cleared');
    } catch (error) {
      console.error('❌ Error clearing storage statistics cache:', error);
    }
  }
}
