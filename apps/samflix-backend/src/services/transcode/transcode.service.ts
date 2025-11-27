import { prisma } from '../../app';
import type { TranscodeStatusType } from '../../types/media.types';

class TranscodeService {
  /**
   * Update the transcode status of a movie
   * @param id The movie ID
   * @param status The new transcode status
   * @returns The updated movie
   */
  async updateMovieTranscodeStatus(id: string, status: TranscodeStatusType): Promise<any> {
    try {
      const movie = await prisma.movie.findUnique({
        where: { id },
      });

      if (!movie) {
        throw new Error(`Movie with ID ${id} not found`);
      }

      return await prisma.movie.update({
        where: { id },
        data: { transcodeStatus: status },
      });
    } catch (error) {
      console.error('Error updating movie transcode status:', error);
      throw error;
    }
  }

  /**
   * Update the transcode status of an episode
   * @param id The episode ID
   * @param status The new transcode status
   * @returns The updated episode
   */
  async updateEpisodeTranscodeStatus(id: string, status: TranscodeStatusType): Promise<any> {
    try {
      const episode = await prisma.episode.findUnique({
        where: { id },
      });

      if (!episode) {
        throw new Error(`Episode with ID ${id} not found`);
      }

      return await prisma.episode.update({
        where: { id },
        data: { transcodeStatus: status },
      });
    } catch (error) {
      console.error('Error updating episode transcode status:', error);
      throw error;
    }
  }

  /**
   * Update the transcode status of all episodes in a series and the series itself
   * @param seriesId The series ID
   * @param status The new transcode status
   * @returns Object containing updated series and episodes
   */
  async updateSeriesTranscodeStatus(seriesId: string, status: TranscodeStatusType): Promise<any> {
    try {
      // Use Prisma transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
        // First, verify the series exists and get episode count
        const series = await tx.tvSeries.findUnique({
          where: { id: seriesId },
          include: {
            episodes: {
              select: { id: true, title: true, transcodeStatus: true },
            },
          },
        });

        if (!series) {
          throw new Error(`Series with ID ${seriesId} not found`);
        }

        if (series.episodes.length === 0) {
          throw new Error(`No episodes found for series with ID ${seriesId}`);
        }

        // Update the TV series transcode status
        const updatedSeries = await tx.tvSeries.update({
          where: { id: seriesId },
          data: { transcodeStatus: status },
        });

        // Update all episodes in the series
        const updatedEpisodesResult = await tx.episode.updateMany({
          where: { seriesId },
          data: { transcodeStatus: status },
        });

        // Get the updated episodes with full details
        const updatedEpisodes = await tx.episode.findMany({
          where: { seriesId },
          include: {
            series: {
              select: { id: true, title: true, transcodeStatus: true },
            },
          },
        });

        return {
          series: updatedSeries,
          episodes: updatedEpisodes,
          episodeCount: updatedEpisodesResult.count,
        };
      });

      console.log(
        `Updated transcode status to ${status} for series "${result.series.title}" and ${result.episodeCount} episodes`
      );

      return result;
    } catch (error) {
      console.error('Error updating series transcode status:', error);
      throw error;
    }
  }

  /**
   * Get all items with a specific transcode status
   * @param status The transcode status to filter by
   * @returns Object containing movies and episodes with the specified status
   */
  async getItemsByTranscodeStatus(status: TranscodeStatusType): Promise<any> {
    try {
      const movies = await prisma.movie.findMany({
        where: { transcodeStatus: status },
      });

      const episodes = await prisma.episode.findMany({
        where: { transcodeStatus: status },
        include: { series: true },
      });

      return { movies, episodes };
    } catch (error) {
      console.error('Error getting items by transcode status:', error);
      throw error;
    }
  }

  /**
   * Get movies with a specific transcode status
   * @param status The transcode status to filter by
   * @returns Array of movies with the specified status
   */
  async getMoviesByTranscodeStatus(status: TranscodeStatusType): Promise<any[]> {
    try {
      const movies = await prisma.movie.findMany({
        where: { transcodeStatus: status },
      });

      return movies;
    } catch (error) {
      console.error('Error getting movies by transcode status:', error);
      throw error;
    }
  }

  /**
   * Get episodes with a specific transcode status
   * @param status The transcode status to filter by
   * @returns Array of episodes with the specified status
   */
  async getEpisodesByTranscodeStatus(status: TranscodeStatusType): Promise<any[]> {
    try {
      const episodes = await prisma.episode.findMany({
        where: { transcodeStatus: status },
      });

      return episodes;
    } catch (error) {
      console.error('Error getting episodes by transcode status:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive transcode statistics for all media
   * @returns Object containing counts for each transcode status
   */
  async getTranscodeStats(): Promise<any> {
    try {
      // Use Prisma transaction to ensure consistent data
      const stats = await prisma.$transaction(async (tx) => {
        // Get movie counts by status
        const movieStats = await tx.movie.groupBy({
          by: ['transcodeStatus'],
          _count: {
            transcodeStatus: true,
          },
        });

        // Get episode counts by status
        const episodeStats = await tx.episode.groupBy({
          by: ['transcodeStatus'],
          _count: {
            transcodeStatus: true,
          },
        });

        // Get series counts by status
        const seriesStats = await tx.tvSeries.groupBy({
          by: ['transcodeStatus'],
          _count: {
            transcodeStatus: true,
          },
        });

        // Get total counts
        const totalMovies = await tx.movie.count();
        const totalEpisodes = await tx.episode.count();
        const totalSeries = await tx.tvSeries.count();

        return {
          movieStats,
          episodeStats,
          seriesStats,
          totalMovies,
          totalEpisodes,
          totalSeries,
        };
      });

      // Initialize counters for each status
      const statusCounts = {
        PENDING: 0,
        IN_PROGRESS: 0,
        QUEUED: 0,
        COMPLETED: 0,
        FAILED: 0,
      };

      const movieCounts = { ...statusCounts };
      const episodeCounts = { ...statusCounts };
      const seriesCounts = { ...statusCounts };

      // Process movie statistics
      stats.movieStats.forEach((stat) => {
        movieCounts[stat.transcodeStatus] = stat._count.transcodeStatus;
        statusCounts[stat.transcodeStatus] += stat._count.transcodeStatus;
      });

      // Process episode statistics
      stats.episodeStats.forEach((stat) => {
        episodeCounts[stat.transcodeStatus] = stat._count.transcodeStatus;
        statusCounts[stat.transcodeStatus] += stat._count.transcodeStatus;
      });

      // Process series statistics
      stats.seriesStats.forEach((stat) => {
        seriesCounts[stat.transcodeStatus] = stat._count.transcodeStatus;
        statusCounts[stat.transcodeStatus] += stat._count.transcodeStatus;
      });

      // Calculate totals
      const totalItems = stats.totalMovies + stats.totalEpisodes + stats.totalSeries;

      // Calculate percentages
      const calculatePercentage = (count: number, total: number): number =>
        total > 0 ? Math.round((count / total) * 100 * 100) / 100 : 0;

      return {
        // Overall statistics
        pending: statusCounts.PENDING,
        inProgress: statusCounts.IN_PROGRESS,
        queued: statusCounts.QUEUED,
        completed: statusCounts.COMPLETED,
        failed: statusCounts.FAILED,
        total: totalItems,

        // Breakdown by media type
        movies: {
          pending: movieCounts.PENDING,
          inProgress: movieCounts.IN_PROGRESS,
          queued: movieCounts.QUEUED,
          completed: movieCounts.COMPLETED,
          failed: movieCounts.FAILED,
          total: stats.totalMovies,
        },
        episodes: {
          pending: episodeCounts.PENDING,
          inProgress: episodeCounts.IN_PROGRESS,
          queued: episodeCounts.QUEUED,
          completed: episodeCounts.COMPLETED,
          failed: episodeCounts.FAILED,
          total: stats.totalEpisodes,
        },
        series: {
          pending: seriesCounts.PENDING,
          inProgress: seriesCounts.IN_PROGRESS,
          queued: seriesCounts.QUEUED,
          completed: seriesCounts.COMPLETED,
          failed: seriesCounts.FAILED,
          total: stats.totalSeries,
        },

        // Percentages
        percentages: {
          pending: calculatePercentage(statusCounts.PENDING, totalItems),
          inProgress: calculatePercentage(statusCounts.IN_PROGRESS, totalItems),
          queued: calculatePercentage(statusCounts.QUEUED, totalItems),
          completed: calculatePercentage(statusCounts.COMPLETED, totalItems),
          failed: calculatePercentage(statusCounts.FAILED, totalItems),
        },

        // Additional metadata
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting transcode statistics:', error);
      throw error;
    }
  }
}

export const transcodeService = new TranscodeService();
