import { Request, Response } from "express";
import { prisma } from "../../app";

type AsyncRequestHandler = (req: Request, res: Response) => Promise<void>;

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

class MovieController {
  getAllMovies: AsyncRequestHandler = async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const genre = req.query.genre as string;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const sortBy = (req.query.sortBy as string) || "title";
      const sortOrder = (req.query.sortOrder as "asc" | "desc") || "asc";

      const skip = (page - 1) * limit;

      // Build where clause based on filters
      const where: any = {};
      if (genre) {
        where.genres = { hasSome: [genre] };
      }
      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { overview: { contains: search, mode: "insensitive" } },
        ];
      }
      if (status) {
        where.transcodeStatus = status;
      }

      // Get total count for pagination
      const total = await prisma.movie.count({ where });

      // Get movies with pagination, filtering and sorting
      // Apply multiple sorting criteria with priority
      const movies = await prisma.movie.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { releaseDate: "desc" },
          { updatedAt: "desc" },
          { [sortBy]: sortOrder },
        ],
      });

      const totalPages = Math.ceil(total / limit);

      const response: PaginatedResponse<any> = {
        data: movies,
        meta: {
          total,
          page,
          limit,
          totalPages,
        },
      };

      res.json(response);
    } catch (error) {
      console.error("Error fetching movies:", error);
      res.status(500).json({ error: "Failed to fetch movies" });
    }
  };

  getMovieById: AsyncRequestHandler = async (req, res) => {
    const { id } = req.params;
    try {
      const movie = await prisma.movie.findUnique({
        where: { id },
      });

      if (!movie) {
        res.status(404).json({ error: "Movie not found" });
        return;
      }

      res.json(movie);
    } catch (error) {
      console.error("Error fetching movie:", error);
      res.status(500).json({ error: "Failed to fetch movie" });
    }
  };

  searchMovies: AsyncRequestHandler = async (req, res) => {
    try {
      const query = req.query.query as string;
      if (!query) {
        res.status(400).json({ error: "Query parameter is required" });
        return;
      }

      const movies = await prisma.movie.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { genres: { hasSome: [query] } },
          ],
        },
        orderBy: { title: "asc" },
      });
      res.json(movies);
    } catch (error) {
      console.error("Error searching movies:", error);
      res.status(500).json({ error: "Failed to search movies" });
    }
  };

  getMoviesByGenre: AsyncRequestHandler = async (req, res) => {
    try {
      const genre = req.params.genre as string;
      if (!genre) {
        res.status(400).json({ error: "Genre parameter is required" });
        return;
      }

      const movies = await prisma.movie.findMany({
        where: {
          genres: { hasSome: [genre] },
        },
        orderBy: { title: "asc" },
      });
      res.json(movies);
    } catch (error) {
      console.error("Error fetching movies by genre:", error);
      res.status(500).json({ error: "Failed to fetch movies by genre" });
    }
  };

  getAllGenres: AsyncRequestHandler = async (_req, res) => {
    try {
      const movies = await prisma.movie.findMany({
        select: { genres: true },
      });

      const genres = [
        ...new Set(
          movies.flatMap((movie: { genres: string[] }) => movie.genres)
        ),
      ].sort();
      res.json(genres);
    } catch (error) {
      console.error("Error fetching genres:", error);
      res.status(500).json({ error: "Failed to fetch genres" });
    }
  };
}

const movieController = new MovieController();

export { movieController };
