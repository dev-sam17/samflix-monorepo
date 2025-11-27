import { Request, Response } from 'express';
import { prisma } from '../../app';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next?: () => void
) => Promise<Response | void> | void;

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

class SeriesController {
  getAllSeries: AsyncRequestHandler = async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const genre = req.query.genre as string;
      const search = req.query.search as string;
      const sortBy = (req.query.sortBy as string) || 'title';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'asc';

      const skip = (page - 1) * limit;

      // Build where clause based on filters
      const where: any = {};
      if (genre) {
        where.genres = { hasSome: [genre] };
      }
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { overview: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Get total count for pagination
      const total = await prisma.tvSeries.count({ where });

      // Get series with pagination, filtering and sorting, including episodes
      const series = await prisma.tvSeries.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          episodes: {
            orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }],
          },
        },
      });

      const totalPages = Math.ceil(total / limit);

      const response: PaginatedResponse<any> = {
        data: series.map((s: any) => ({
          ...s,
          seasons: this.groupEpisodesIntoSeasons(s.episodes),
        })),
        meta: {
          total,
          page,
          limit,
          totalPages,
        },
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching series:', error);
      res.status(500).json({ error: 'Failed to fetch series' });
    }
  };

  getSeriesById: AsyncRequestHandler = async (req, res) => {
    try {
      const { id } = req.params;
      const series = await prisma.tvSeries.findUnique({
        where: { id },
        include: {
          episodes: {
            orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }],
          },
        },
      });

      if (!series) {
        res.status(404).json({ error: 'Series not found' });
        return;
      }

      // Transform the data to group episodes by season
      const seriesWithSeasons = {
        ...series,
        seasons: this.groupEpisodesIntoSeasons(series.episodes),
      };

      res.json(seriesWithSeasons);
      return;
    } catch (error) {
      console.error('Error fetching series:', error);
      res.status(500).json({ error: 'Failed to fetch series' });
    }
  };

  searchSeries: AsyncRequestHandler = async (req, res) => {
    try {
      const query = req.query.query as string;
      if (!query) {
        res.status(400).json({ error: 'Query parameter is required' });
        return;
      }

      const series = await prisma.tvSeries.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { genres: { hasSome: [query] } },
          ],
        },
        orderBy: { title: 'asc' },
        include: {
          episodes: {
            orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }],
          },
        },
      });
      res.json(series);
    } catch (error) {
      console.error('Error searching series:', error);
      res.status(500).json({ error: 'Failed to search series' });
    }
  };

  getEpisodesBySeason: AsyncRequestHandler = async (req, res) => {
    try {
      const { seriesId, seasonNumber } = req.params;
      const seasonNum = parseInt(seasonNumber!);

      if (isNaN(seasonNum)) {
        res.status(400).json({ error: 'Invalid season number' });
        return;
      }

      const episodes = await prisma.episode.findMany({
        where: {
          seriesId,
          seasonNumber: seasonNum,
        },
        orderBy: { episodeNumber: 'asc' },
      });

      if (!episodes.length) {
        res.status(404).json({ error: 'No episodes found for this season' });
        return;
      }

      res.json(episodes);
      return;
    } catch (error) {
      console.error('Error fetching episodes:', error);
      res.status(500).json({ error: 'Failed to fetch episodes' });
    }
  };

  getSeriesByGenre: AsyncRequestHandler = async (req, res) => {
    try {
      const genre = req.params.genre as string;
      if (!genre) {
        res.status(400).json({ error: 'Genre parameter is required' });
        return;
      }

      const series = await prisma.tvSeries.findMany({
        where: {
          genres: { hasSome: [genre] },
        },
        orderBy: { title: 'asc' },
        include: {
          episodes: {
            orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }],
          },
        },
      });
      res.json(series);
    } catch (error) {
      console.error('Error fetching series by genre:', error);
      res.status(500).json({ error: 'Failed to fetch series by genre' });
    }
  };

  getEpisode: AsyncRequestHandler = async (req, res) => {
    try {
      const { seriesId, seasonNumber, episodeNumber } = req.params;
      const seasonNum = parseInt(seasonNumber!);
      const episodeNum = parseInt(episodeNumber!);

      if (isNaN(seasonNum) || isNaN(episodeNum)) {
        res.status(400).json({ error: 'Invalid season or episode number' });
        return;
      }

      const episode = await prisma.episode.findFirst({
        where: {
          seriesId,
          seasonNumber: seasonNum,
          episodeNumber: episodeNum,
        },
      });

      if (!episode) {
        res.status(404).json({ error: 'Episode not found' });
        return;
      }

      res.json(episode);
    } catch (error) {
      console.error('Error fetching episode:', error);
      res.status(500).json({ error: 'Failed to fetch episode' });
    }
  };

  getAllGenres: AsyncRequestHandler = async (_req, res) => {
    try {
      const series = await prisma.tvSeries.findMany({
        select: { genres: true },
      });

      const genres = Array.from(new Set(series.flatMap((s: any) => s.genres))).sort();
      res.json(genres);
    } catch (error) {
      console.error('Error fetching genres:', error);
      res.status(500).json({ error: 'Failed to fetch genres' });
    }
  };

  // Helper method to group episodes into seasons
  private groupEpisodesIntoSeasons(episodes: any[]) {
    const seasonsMap = new Map<number, any>();

    episodes.forEach((episode) => {
      if (!seasonsMap.has(episode.seasonNumber)) {
        seasonsMap.set(episode.seasonNumber, {
          seasonNumber: episode.seasonNumber,
          episodes: [],
        });
      }
      seasonsMap.get(episode.seasonNumber).episodes.push(episode);
    });

    return Array.from(seasonsMap.values()).sort((a, b) => a.seasonNumber - b.seasonNumber);
  }
}

export const seriesController = new SeriesController();
