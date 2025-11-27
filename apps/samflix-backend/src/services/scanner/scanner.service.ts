import fs from 'fs';
import path from 'path';
import { prisma } from '../../app';
import { parserService } from '../parser/parser.service';
import { tmdbService } from '../tmdb/tmdb.service';
import { CacheInvalidationService } from '../../api/middleware/cache-invalidation';
import { ScannerConfig, TMDBMovieResult, TMDBTVResult } from '../../types/media.types';

// Define a type for progress callback
type ProgressCallback = (status: string, progress: number, details?: any) => void;

class ScannerService {
  private readonly supportedExtensions: string[] = ['.mp4', '.mkv', '.avi'];

  /**
   * Scans all configured media directories and cleans up orphaned entries
   * @param config The scanner configuration
   * @param progressCallback Optional callback function to report progress
   * @returns A summary of the scan results
   */
  async scanAll(config: ScannerConfig, progressCallback?: ProgressCallback) {
    try {
      const reportProgress = (status: string, progress: number, details?: any) => {
        console.log(`${status}: ${progress}%${details ? ` - ${JSON.stringify(details)}` : ''}`);
        if (progressCallback) {
          progressCallback(status, progress, details);
        }
      };

      reportProgress('Starting media scan', 0);

      // Count total paths to calculate progress
      const totalPaths = config.moviePaths.length + config.seriesPaths.length;
      let completedPaths = 0;

      // First scan all directories for new media
      for (let i = 0; i < config.moviePaths.length; i++) {
        const moviePath = config.moviePaths[i]!;
        reportProgress('Scanning movie directory', Math.floor((completedPaths / totalPaths) * 70), {
          path: moviePath,
          current: i + 1,
          total: config.moviePaths.length,
        });

        await this.scanMovieDirectory(moviePath);
        completedPaths++;
      }

      for (let i = 0; i < config.seriesPaths.length; i++) {
        const seriesPath = config.seriesPaths[i]!;
        reportProgress(
          'Scanning series directory',
          Math.floor((completedPaths / totalPaths) * 70),
          { path: seriesPath, current: i + 1, total: config.seriesPaths.length }
        );

        await this.scanSeriesDirectory(seriesPath);
        completedPaths++;
      }

      // Then check for and clean up orphaned entries
      reportProgress('Checking for orphaned media entries', 75);
      const cleanupResults = await this.cleanupOrphanedEntries(progressCallback);

      // Delete resolved conflicts after moving data to collections
      reportProgress('Cleaning up resolved conflicts', 95);
      await this.deleteResolvedConflicts();

      // Invalidate conflicts cache so new scan results are visible
      await CacheInvalidationService.clearPattern('cache:/api/scanner/conflicts*');
      console.log('Cleared conflicts cache after scan');

      reportProgress('Media scan and cleanup completed', 100, cleanupResults);
      return cleanupResults;
    } catch (error) {
      console.error('Error during media scan:', error);
      throw error;
    }
  }

  /**
   * Checks if a movie is already in the database
   * @param fileName The name of the movie file
   * @param filePath The path to the movie file
   * @param title The title of the movie
   * @param year The release year of the movie
   * @returns True if the movie is already in the database, false otherwise
   */
  private async isMovieInDatabase(
    fileName: string,
    filePath: string,
    title: string,
    year?: number
  ): Promise<boolean> {
    try {
      // First check by file path (most reliable)
      const existingByPath = await prisma.movie.findFirst({
        where: { filePath },
      });

      if (existingByPath) {
        return true;
      }

      // Then check by file name
      const existingByFileName = await prisma.movie.findFirst({
        where: { fileName },
      });

      if (existingByFileName) {
        return true;
      }

      // Finally check by title and year (escape special characters)
      const sanitizedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const titleQuery: any = {
        title: {
          contains: sanitizedTitle,
          mode: 'insensitive',
        },
      };

      if (year) {
        titleQuery.year = year;
      }

      const existingByTitle = await prisma.movie.findFirst({
        where: titleQuery,
      });

      return !!existingByTitle;
    } catch (error) {
      console.error('Error checking if movie exists in database:', error);
      console.error('Problematic values:', { fileName, filePath, title, year });
      return false;
    }
  }

  private async isEpisodeInDatabase(
    fileName: string,
    filePath: string,
    seriesName: string,
    seasonNumber: number,
    episodeNumber: number
  ): Promise<boolean> {
    try {
      // First check by file path (most reliable)
      const existingByPath = await prisma.episode.findFirst({
        where: { filePath },
      });

      if (existingByPath) {
        return true;
      }

      // Then check by file name
      const existingByFileName = await prisma.episode.findFirst({
        where: { fileName },
      });

      if (existingByFileName) {
        return true;
      }

      // Finally check by series name, season, and episode number
      const sanitizedSeriesName = seriesName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingByDetails = await prisma.episode.findFirst({
        where: {
          AND: [
            {
              series: {
                title: {
                  contains: sanitizedSeriesName,
                  mode: 'insensitive',
                },
              },
            },
            { seasonNumber },
            { episodeNumber },
          ],
        },
        include: {
          series: true,
        },
      });

      return !!existingByDetails;
    } catch (error) {
      console.error('Error checking if episode exists in database:', error);
      console.error('Problematic values:', {
        fileName,
        filePath,
        seriesName,
        seasonNumber,
        episodeNumber,
      });
      return false;
    }
  }

  private async scanMovieDirectory(directoryPath: string) {
    const files = await this.getMediaFiles(directoryPath);

    for (const file of files) {
      try {
        const parsedMovie = parserService.parseMovie(file);
        if (!parsedMovie) {
          console.warn(`Unable to parse movie file: ${file}`);
          // Create a conflict for unparseable files so user can manually resolve
          await this.createScanningConflict('movie', path.basename(file), file, []);
          continue;
        }

        if (
          await this.isMovieInDatabase(
            parsedMovie.fileName,
            parsedMovie.filePath,
            parsedMovie.title,
            parsedMovie.year
          )
        ) {
          continue;
        }

        // Search TMDB
        const searchResults = await tmdbService.searchMovie(parsedMovie.title, parsedMovie.year);

        if (searchResults.length === 0) {
          await this.createScanningConflict(
            'movie',
            parsedMovie.fileName,
            parsedMovie.filePath,
            []
          );
          continue;
        }

        if (searchResults.length > 1) {
          await this.createScanningConflict(
            'movie',
            parsedMovie.fileName,
            parsedMovie.filePath,
            searchResults
          );
          continue;
        }

        const movieDetails = await tmdbService.getMovieDetails(searchResults[0]!.id);

        // Create or update movie in database
        await prisma.movie.upsert({
          where: { tmdbId: movieDetails.id },
          create: {
            tmdbId: movieDetails.id,
            title: movieDetails.title,
            year: new Date(movieDetails.release_date).getFullYear(),
            overview: movieDetails.overview,
            posterPath: movieDetails.poster_path,
            backdropPath: movieDetails.backdrop_path,
            genres: movieDetails.genres.map((g) => g.name),
            runtime: movieDetails.runtime,
            rating: movieDetails.vote_average,
            filePath: parsedMovie.filePath,
            fileName: parsedMovie.fileName,
            resolution: parsedMovie.resolution,
            quality: parsedMovie.quality,
            rip: parsedMovie.rip,
            sound: parsedMovie.sound,
            provider: parsedMovie.provider,
            releaseDate: new Date(movieDetails.release_date),
          },
          update: {
            filePath: parsedMovie.filePath,
            fileName: parsedMovie.fileName,
            resolution: parsedMovie.resolution,
            quality: parsedMovie.quality,
            rip: parsedMovie.rip,
            sound: parsedMovie.sound,
            provider: parsedMovie.provider,
            releaseDate: new Date(movieDetails.release_date),
          },
        });
      } catch (error) {
        console.error(`Error processing movie file ${file}:`, error);
      }
    }
  }

  private async scanSeriesDirectory(directoryPath: string) {
    const files = await this.getMediaFiles(directoryPath);

    // Track unparseable files by series folder to group them
    const unparseableFilesBySeries = new Map<string, string[]>();

    for (const file of files) {
      try {
        const parsedEpisode = parserService.parseEpisode(file);
        if (!parsedEpisode) {
          console.warn(`Unable to parse episode file: ${file}`);

          // Group unparseable files by their parent directory (series folder)
          const seriesFolder = path.dirname(file);
          if (!unparseableFilesBySeries.has(seriesFolder)) {
            unparseableFilesBySeries.set(seriesFolder, []);
          }
          unparseableFilesBySeries.get(seriesFolder)!.push(file);
          continue;
        }

        if (
          await this.isEpisodeInDatabase(
            parsedEpisode.fileName,
            parsedEpisode.filePath,
            parsedEpisode.seriesName,
            parsedEpisode.seasonNumber,
            parsedEpisode.episodeNumber
          )
        ) {
          continue;
        }

        // Search TMDB
        const searchResults = await tmdbService.searchTV(parsedEpisode.seriesName);

        if (searchResults.length === 0) {
          await this.createScanningConflict(
            'series',
            parsedEpisode.fileName,
            parsedEpisode.filePath,
            []
          );
          continue;
        }

        if (searchResults.length > 1) {
          await this.createScanningConflict(
            'series',
            parsedEpisode.fileName,
            parsedEpisode.filePath,
            searchResults
          );
          continue;
        }

        const seriesDetails = await tmdbService.getTVDetails(searchResults[0]!.id);

        // Try to get episode details, handle 404 if episode doesn't exist in TMDB
        let episodeDetails;
        try {
          episodeDetails = await tmdbService.getEpisodeDetails(
            searchResults[0]!.id,
            parsedEpisode.seasonNumber,
            parsedEpisode.episodeNumber
          );
        } catch (episodeError: any) {
          // If episode not found in TMDB (404), create a conflict
          if (episodeError.response?.status === 404 || episodeError.status === 404) {
            console.warn(
              `Episode not found in TMDB: ${parsedEpisode.seriesName} S${parsedEpisode.seasonNumber}E${parsedEpisode.episodeNumber} - Series found but episode doesn't exist in TMDB database`
            );
            // Create conflict with the series match but note that the specific episode wasn't found
            await this.createScanningConflict(
              'series',
              parsedEpisode.fileName,
              parsedEpisode.filePath,
              [] // Empty array since the series exists but episode doesn't
            );
            continue;
          }
          // Re-throw other errors
          throw episodeError;
        }

        // Create or update series
        const series = await prisma.tvSeries.upsert({
          where: { tmdbId: seriesDetails.id },
          create: {
            tmdbId: seriesDetails.id,
            title: seriesDetails.name,
            overview: seriesDetails.overview,
            posterPath: seriesDetails.poster_path,
            backdropPath: seriesDetails.backdrop_path,
            genres: seriesDetails.genres.map((g) => g.name),
            firstAirDate: new Date(seriesDetails.first_air_date),
            lastAirDate: new Date(seriesDetails.last_air_date),
            status: seriesDetails.status,
          },
          update: {},
        });

        // Create or update episode
        const episodeData = {
          tmdbId: episodeDetails.id,
          title: episodeDetails.name,
          overview: episodeDetails.overview,
          filePath: parsedEpisode.filePath,
          fileName: parsedEpisode.fileName,
          resolution: parsedEpisode.resolution,
          quality: parsedEpisode.quality,
          rip: parsedEpisode.rip,
          sound: parsedEpisode.sound,
          provider: parsedEpisode.provider,
          seasonNumber: episodeDetails.season_number,
          episodeNumber: episodeDetails.episode_number,
          airDate: episodeDetails.air_date ? new Date(episodeDetails.air_date) : null,
          seriesId: series.id,
        };

        // First try to find existing episode by the unique constraint
        const existingEpisode = await prisma.episode.findFirst({
          where: {
            tmdbId: episodeDetails.id,
            seasonNumber: episodeDetails.season_number,
            episodeNumber: episodeDetails.episode_number,
          },
        });

        if (existingEpisode) {
          // Update existing episode
          await prisma.episode.update({
            where: { id: existingEpisode.id },
            data: {
              filePath: parsedEpisode.filePath,
              fileName: parsedEpisode.fileName,
              resolution: parsedEpisode.resolution,
              quality: parsedEpisode.quality,
              rip: parsedEpisode.rip,
              sound: parsedEpisode.sound,
              provider: parsedEpisode.provider,
            },
          });
        } else {
          // Create new episode
          await prisma.episode.create({
            data: episodeData,
          });
        }
      } catch (error) {
        console.error(`Error processing episode file ${file}:`, error);
      }
    }

    // Create grouped conflicts for unparseable files with TMDB search
    for (const [seriesFolder, files] of unparseableFilesBySeries.entries()) {
      const seriesFolderName = path.basename(seriesFolder);
      console.log(
        `Creating conflict for ${files.length} unparseable files in series: ${seriesFolderName}`
      );

      // Extract series name from folder name using improved algorithm
      const extractedSeriesName = this.extractSeriesNameFromFolder(seriesFolderName);
      console.log(
        `Extracted series name: "${extractedSeriesName}" from folder: "${seriesFolderName}"`
      );

      // Search TMDB with the extracted name
      let searchResults: any[] = [];
      try {
        searchResults = await tmdbService.searchTV(extractedSeriesName);
        console.log(`Found ${searchResults.length} TMDB matches for: "${extractedSeriesName}"`);

        // If no results, try with cleaned name (remove year, quality info, etc.)
        if (searchResults.length === 0) {
          const cleanedName = this.cleanSeriesNameForSearch(extractedSeriesName);
          if (cleanedName !== extractedSeriesName) {
            console.log(`Retrying search with cleaned name: "${cleanedName}"`);
            searchResults = await tmdbService.searchTV(cleanedName);
            console.log(`Found ${searchResults.length} TMDB matches for cleaned name`);
          }
        }
      } catch (error) {
        console.error(`Error searching TMDB for series: ${extractedSeriesName}`, error);
      }

      // Create conflict with search results
      await this.createScanningConflict(
        'series',
        `${seriesFolderName} (${files.length} episodes)`,
        files[0]!, // Use first file as primary path
        searchResults
      );
    }
  }

  private async getMediaFiles(directoryPath: string): Promise<string[]> {
    const files: string[] = [];

    const items = await fs.promises.readdir(directoryPath, {
      withFileTypes: true,
    });

    for (const item of items) {
      const fullPath = path.join(directoryPath, item.name);

      if (item.isDirectory()) {
        files.push(...(await this.getMediaFiles(fullPath)));
      } else if (
        item.isFile() &&
        this.supportedExtensions.includes(path.extname(item.name).toLowerCase())
      ) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private async createScanningConflict(
    mediaType: 'movie' | 'series',
    fileName: string,
    filePath: string,
    possibleMatches: (TMDBMovieResult | TMDBTVResult)[]
  ) {
    // Convert matches to a plain object array for Prisma JSON compatibility
    const matchesForDb = possibleMatches.map((match) => ({ ...match }));
    try {
      // First try to find if there's an existing conflict with the same filePath
      const existingConflict = await prisma.scanningConflict.findFirst({
        where: { filePath },
      });

      if (existingConflict) {
        // Update existing conflict (reset to unresolved and update matches)
        console.log(`Updating existing conflict for: ${fileName}`);
        await prisma.scanningConflict.update({
          where: { id: existingConflict.id },
          data: {
            fileName, // Update fileName in case it changed
            possibleMatches: matchesForDb || [],
            resolved: false, // Reset to unresolved
          },
        });
      } else {
        // Create new conflict (this handles manually deleted conflicts)
        console.log(`Creating new conflict for: ${fileName}`);
        await prisma.scanningConflict.create({
          data: {
            fileName,
            filePath,
            mediaType,
            possibleMatches: matchesForDb || [],
            resolved: false,
          },
        });
      }
    } catch (error) {
      console.error('Error creating/updating scanning conflict:', error);
      throw error;
    }
  }

  /**
   * Resolves a scanning conflict by adding the selected media to the database
   * @param conflictId The ID of the conflict to resolve
   * @param selectedId The TMDB ID of the selected media
   * @returns The updated conflict
   */
  async resolveConflict(conflictId: string, selectedId: number) {
    try {
      // Get the conflict details first
      const conflictDetails = await prisma.scanningConflict.findUnique({
        where: { id: conflictId },
      });

      if (!conflictDetails) {
        throw new Error('Conflict not found');
      }

      // Update the conflict as resolved
      const conflict = await prisma.scanningConflict.update({
        where: { id: conflictId },
        data: {
          resolved: true,
          selectedId,
        },
      });

      // Add the media to the database based on the conflict type
      if (conflictDetails.mediaType === 'movie') {
        // Get movie details from TMDB
        const movieDetails = await tmdbService.getMovieDetails(selectedId);

        // Parse the file to get quality information
        const parsedMovie = parserService.parseMovie(conflictDetails.filePath);

        if (parsedMovie && movieDetails) {
          // Add the movie to the database
          await prisma.movie.upsert({
            where: { tmdbId: movieDetails.id },
            create: {
              tmdbId: movieDetails.id,
              title: movieDetails.title,
              year: new Date(movieDetails.release_date).getFullYear(),
              overview: movieDetails.overview,
              posterPath: movieDetails.poster_path,
              backdropPath: movieDetails.backdrop_path,
              genres: movieDetails.genres.map((g) => g.name),
              runtime: movieDetails.runtime,
              rating: movieDetails.vote_average,
              filePath: parsedMovie.filePath,
              fileName: parsedMovie.fileName,
              resolution: parsedMovie.resolution,
              quality: parsedMovie.quality,
              rip: parsedMovie.rip,
              sound: parsedMovie.sound,
              provider: parsedMovie.provider,
              releaseDate: new Date(movieDetails.release_date),
            },
            update: {
              filePath: parsedMovie.filePath,
              fileName: parsedMovie.fileName,
              resolution: parsedMovie.resolution,
              quality: parsedMovie.quality,
              rip: parsedMovie.rip,
              sound: parsedMovie.sound,
              provider: parsedMovie.provider,
              releaseDate: new Date(movieDetails.release_date),
            },
          });
        }
      } else if (conflictDetails.mediaType === 'series') {
        // Get series details from TMDB
        const seriesDetails = await tmdbService.getTVDetails(selectedId);

        // Parse the file to get episode information
        const parsedEpisode = parserService.parseEpisode(conflictDetails.filePath);

        if (parsedEpisode && seriesDetails) {
          // Get episode details
          const episodeDetails = await tmdbService.getEpisodeDetails(
            selectedId,
            parsedEpisode.seasonNumber,
            parsedEpisode.episodeNumber
          );

          // Add the series to the database
          const series = await prisma.tvSeries.upsert({
            where: { tmdbId: seriesDetails.id },
            create: {
              tmdbId: seriesDetails.id,
              title: seriesDetails.name,
              overview: seriesDetails.overview,
              posterPath: seriesDetails.poster_path,
              backdropPath: seriesDetails.backdrop_path,
              genres: seriesDetails.genres.map((g) => g.name),
              firstAirDate: new Date(seriesDetails.first_air_date),
              lastAirDate: new Date(seriesDetails.last_air_date),
              status: seriesDetails.status,
            },
            update: {},
          });

          // Add the episode to the database
          if (episodeDetails) {
            const episodeData = {
              tmdbId: episodeDetails.id,
              title: episodeDetails.name,
              overview: episodeDetails.overview,
              filePath: parsedEpisode.filePath,
              fileName: parsedEpisode.fileName,
              resolution: parsedEpisode.resolution,
              quality: parsedEpisode.quality,
              rip: parsedEpisode.rip,
              sound: parsedEpisode.sound,
              provider: parsedEpisode.provider,
              seasonNumber: episodeDetails.season_number,
              episodeNumber: episodeDetails.episode_number,
              airDate: episodeDetails.air_date ? new Date(episodeDetails.air_date) : null,
              seriesId: series.id,
            };

            // Check if episode already exists
            const existingEpisode = await prisma.episode.findFirst({
              where: {
                tmdbId: episodeDetails.id,
                seasonNumber: episodeDetails.season_number,
                episodeNumber: episodeDetails.episode_number,
              },
            });

            if (existingEpisode) {
              // Update existing episode
              await prisma.episode.update({
                where: { id: existingEpisode.id },
                data: {
                  filePath: parsedEpisode.filePath,
                  fileName: parsedEpisode.fileName,
                  resolution: parsedEpisode.resolution,
                  quality: parsedEpisode.quality,
                  rip: parsedEpisode.rip,
                  sound: parsedEpisode.sound,
                  provider: parsedEpisode.provider,
                },
              });
            } else {
              // Create new episode
              await prisma.episode.create({
                data: episodeData,
              });
            }
          }
        }
      }

      return conflict;
    } catch (error) {
      console.error('Error resolving conflict:', error);
      throw error;
    }
  }

  /**
   * Deletes a scanning conflict from the database
   * @param conflictId The ID of the conflict to delete
   * @returns A success message
   */
  async deleteConflict(conflictId: string) {
    try {
      // Check if the conflict exists
      const conflict = await prisma.scanningConflict.findUnique({
        where: { id: conflictId },
      });

      if (!conflict) {
        throw new Error('Conflict not found');
      }

      // Delete the conflict
      await prisma.scanningConflict.delete({
        where: { id: conflictId },
      });

      return { message: 'Conflict deleted successfully' };
    } catch (error) {
      console.error('Error deleting conflict:', error);
      throw error;
    }
  }

  /**
   * Deletes all unresolved scanning conflicts from the database
   * @returns A success message with the count of deleted conflicts
   */
  async deleteAllConflicts() {
    try {
      // Delete all unresolved conflicts
      const result = await prisma.scanningConflict.deleteMany({
        where: { resolved: false },
      });

      return {
        message: 'All conflicts deleted successfully',
        count: result.count,
      };
    } catch (error) {
      console.error('Error deleting all conflicts:', error);
      throw error;
    }
  }

  /**
   * Deletes all resolved scanning conflicts from the database
   * This is called after scanning to clean up conflicts that have been resolved
   * @returns A success message with the count of deleted conflicts
   */
  private async deleteResolvedConflicts() {
    try {
      // Delete all resolved conflicts
      const result = await prisma.scanningConflict.deleteMany({
        where: { resolved: true },
      });

      console.log(`Deleted ${result.count} resolved conflicts`);
      return {
        message: 'Resolved conflicts deleted successfully',
        count: result.count,
      };
    } catch (error) {
      console.error('Error deleting resolved conflicts:', error);
      throw error;
    }
  }

  /**
   * Checks for and removes all orphaned media entries from the database
   * (entries that exist in the database but the files no longer exist on disk)
   * @param progressCallback Optional callback function to report progress
   */
  private async cleanupOrphanedEntries(progressCallback?: ProgressCallback) {
    try {
      const reportProgress = (status: string, progress: number, details?: any) => {
        console.log(`${status}: ${progress}%${details ? ` - ${JSON.stringify(details)}` : ''}`);
        if (progressCallback) {
          progressCallback(status, progress, details);
        }
      };

      // Check for deleted movies
      reportProgress('Checking for deleted movies', 80);
      const missingMovies = await this.checkForDeletedMovies();
      console.log(`Found ${missingMovies.length} missing movie files`);

      // Remove each missing movie
      for (let i = 0; i < missingMovies.length; i++) {
        const movie = missingMovies[i]!;
        try {
          reportProgress(
            'Removing orphaned movies',
            80 + Math.floor((i / missingMovies.length) * 5),
            { current: i + 1, total: missingMovies.length, title: movie.title }
          );

          await this.removeDeletedMovie(movie.id);
          console.log(`Removed orphaned movie: ${movie.title} (${movie.year})`);
        } catch (error) {
          console.error(`Failed to remove orphaned movie ${movie.id}:`, error);
        }
      }

      // Check for deleted episodes
      reportProgress('Checking for deleted episodes', 85);
      const missingEpisodes = await this.checkForDeletedEpisodes();
      console.log(`Found ${missingEpisodes.length} missing episode files`);

      // Remove each missing episode
      for (let i = 0; i < missingEpisodes.length; i++) {
        const episode = missingEpisodes[i]!;
        try {
          reportProgress(
            'Removing orphaned episodes',
            85 + Math.floor((i / missingEpisodes.length) * 5),
            {
              current: i + 1,
              total: missingEpisodes.length,
              title: episode.title,
            }
          );

          await this.removeDeletedEpisode(episode.id);
          console.log(
            `Removed orphaned episode: ${episode.title} (S${episode.seasonNumber}E${episode.episodeNumber})`
          );
        } catch (error) {
          console.error(`Failed to remove orphaned episode ${episode.id}:`, error);
        }
      }

      // Check for TV series with no episodes
      reportProgress('Checking for empty TV series', 90);
      const emptySeries = await prisma.tvSeries.findMany({
        where: {
          episodes: {
            none: {},
          },
        },
        select: {
          id: true,
          title: true,
        },
      });

      // Remove each empty series
      for (let i = 0; i < emptySeries.length; i++) {
        const series = emptySeries[i]!;
        try {
          reportProgress(
            'Removing empty TV series',
            90 + Math.floor((i / emptySeries.length) * 5),
            { current: i + 1, total: emptySeries.length, title: series.title }
          );

          await prisma.tvSeries.delete({
            where: { id: series.id },
          });
          console.log(`Removed empty TV series: ${series.title}`);
        } catch (error) {
          console.error(`Failed to remove empty TV series ${series.id}:`, error);
        }
      }

      reportProgress('Cleanup completed', 95);

      return {
        removedMovies: missingMovies.length,
        removedEpisodes: missingEpisodes.length,
        removedSeries: emptySeries.length,
      };
    } catch (error) {
      console.error('Error cleaning up orphaned entries:', error);
      throw error;
    }
  }

  /**
   * Checks if a movie file exists on disk
   * @param filePath The path to the movie file
   * @returns True if the file exists, false otherwise
   */
  private async isFileExistsOnDisk(filePath: string): Promise<boolean> {
    try {
      return fs.existsSync(filePath);
    } catch (error) {
      console.error(`Error checking if file exists: ${filePath}`, error);
      return false;
    }
  }

  /**
   * Checks for movies that are in the database but no longer exist on disk
   * @returns An array of movies that are missing from disk
   */
  private async checkForDeletedMovies() {
    try {
      // Get all movies from the database
      const movies = await prisma.movie.findMany({
        select: {
          id: true,
          title: true,
          year: true,
          filePath: true,
          fileName: true,
        },
      });

      const missingMovies = [];

      // Check each movie to see if the file still exists
      for (const movie of movies) {
        if (movie.filePath && !(await this.isFileExistsOnDisk(movie.filePath))) {
          missingMovies.push(movie);
        }
      }

      return missingMovies;
    } catch (error) {
      console.error('Error checking for deleted movies:', error);
      throw error;
    }
  }

  /**
   * Checks for episodes that are in the database but no longer exist on disk
   * @returns An array of episodes that are missing from disk
   */
  private async checkForDeletedEpisodes() {
    try {
      // Get all episodes from the database
      const episodes = await prisma.episode.findMany({
        select: {
          id: true,
          title: true,
          seasonNumber: true,
          episodeNumber: true,
          filePath: true,
          fileName: true,
          series: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      const missingEpisodes = [];

      // Check each episode to see if the file still exists
      for (const episode of episodes) {
        if (episode.filePath && !(await this.isFileExistsOnDisk(episode.filePath))) {
          missingEpisodes.push(episode);
        }
      }

      return missingEpisodes;
    } catch (error) {
      console.error('Error checking for deleted episodes:', error);
      throw error;
    }
  }

  /**
   * Removes a movie from the database if it no longer exists on disk
   * @param movieId The ID of the movie to remove
   * @returns A success message
   */
  private async removeDeletedMovie(movieId: string) {
    try {
      const movie = await prisma.movie.findUnique({
        where: { id: movieId },
      });

      if (!movie) {
        throw new Error('Movie not found');
      }

      // Check if the file exists
      if (movie.filePath && (await this.isFileExistsOnDisk(movie.filePath))) {
        throw new Error('Movie file still exists on disk');
      }

      // Delete the movie from the database
      await prisma.movie.delete({
        where: { id: movieId },
      });

      return { message: 'Movie removed successfully' };
    } catch (error) {
      console.error('Error removing deleted movie:', error);
      throw error;
    }
  }

  /**
   * Removes an episode from the database if it no longer exists on disk
   * @param episodeId The ID of the episode to remove
   * @returns A success message
   */
  private async removeDeletedEpisode(episodeId: string) {
    try {
      const episode = await prisma.episode.findUnique({
        where: { id: episodeId },
      });

      if (!episode) {
        throw new Error('Episode not found');
      }

      // Check if the file exists
      if (episode.filePath && (await this.isFileExistsOnDisk(episode.filePath))) {
        throw new Error('Episode file still exists on disk');
      }

      // Delete the episode from the database
      await prisma.episode.delete({
        where: { id: episodeId },
      });

      return { message: 'Episode removed successfully' };
    } catch (error) {
      console.error('Error removing deleted episode:', error);
      throw error;
    }
  }

  /**
   * Extract series name from folder name with improved algorithm
   * Handles various naming patterns and removes quality/year info
   */
  private extractSeriesNameFromFolder(folderName: string): string {
    // Remove file extension if present
    let name = folderName.replace(/\.(mkv|mp4|avi)$/i, '');

    // Remove season indicators (S01, S02, etc.) and everything after
    name = name.replace(/[\s.\-_]+[Ss]\d{1,2}.*$/i, '');

    // Remove year in parentheses and everything after: (2025) Hindi 1080p...
    name = name.replace(/\s*\(\d{4}\).*$/i, '');

    // Remove year without parentheses: 2025 Hindi 1080p...
    name = name.replace(/\s+\d{4}\s+.*$/i, '');

    // Remove common quality indicators and everything after
    name = name.replace(
      /\s+(1080p|720p|480p|2160p|4K|WEBRip|WEB-DL|BluRay|BRRip|HDRip|DVDRip).*$/i,
      ''
    );

    // Clean up separators
    name = name.replace(/[._]/g, ' ');
    name = name.replace(/\s+/g, ' ');
    name = name.trim();

    return name;
  }

  /**
   * Clean series name for better TMDB search results
   * Removes common words that might interfere with search
   */
  private cleanSeriesNameForSearch(seriesName: string): string {
    let cleaned = seriesName;

    // Remove language indicators
    cleaned = cleaned.replace(
      /\s+(Hindi|English|Tamil|Telugu|Malayalam|Kannada|Bengali)\s*/gi,
      ' '
    );

    // Remove "The" from the beginning if it exists (TMDB sometimes doesn't include it)
    cleaned = cleaned.replace(/^The\s+/i, '');

    // Remove common suffixes
    cleaned = cleaned.replace(/\s+(Series|Show|Season)$/i, '');

    // Clean up extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }
}

export const scannerService = new ScannerService();
