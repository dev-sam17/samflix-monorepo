import { prisma } from '../../app';

/**
 * Service for handling scheduled media scans
 */
export class MediaScanSchedulerService {
  /**
   * Executes a scheduled media scan
   * This function is designed to be called by cron jobs
   */
  static async executeScheduledScan(): Promise<void> {
    console.log('🔍 Starting scheduled media scan...');

    try {
      // Import scanner service
      const { scannerService } = await import('../scanner/scanner.service');

      // Get active media folders from database
      const folders = await prisma.mediaFolder.findMany({
        select: { id: true, path: true, type: true, active: true },
        where: { active: true },
      });

      // Build scanner configuration
      const config = {
        moviePaths: folders.filter((f) => f.type === 'movies').map((f) => f.path),
        seriesPaths: folders.filter((f) => f.type === 'series').map((f) => f.path),
        fileExtensions: ['.mp4', '.mkv', '.avi'],
      };

      // Check if there are any configured paths
      if (config.moviePaths.length === 0 && config.seriesPaths.length === 0) {
        console.log('⚠️  No active media folders configured. Skipping scan.');
        return;
      }

      console.log(
        `📁 Scanning ${config.moviePaths.length} movie folders and ${config.seriesPaths.length} series folders`
      );

      // Define progress callback for logging
      const progressCallback = (status: string, progress: number, details?: any): void => {
        console.log(`📊 ${status}: ${progress}%${details ? ` - ${JSON.stringify(details)}` : ''}`);
      };

      // Start the scan
      const results = await scannerService.scanAll(config, progressCallback);

      console.log('✅ Scheduled media scan completed successfully!');
      console.log('📈 Scan Results:', {
        removedMovies: results.removedMovies || 0,
        removedEpisodes: results.removedEpisodes || 0,
        removedSeries: results.removedSeries || 0,
      });
    } catch (error) {
      console.error('❌ Error during scheduled media scan:', error);

      // Log additional error details for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines of stack trace
        });
      }
    }
  }
}
