import { seriesController } from "../controllers/series.controller";
import { createSmartCacheRouter } from "../middleware/cache-invalidation-middleware";
import { RequestHandler } from "express";

// Create a router with caching for GET routes and automatic cache invalidation for POST/PUT/DELETE routes
const router = createSmartCacheRouter(
  // Cache options for GET routes
  { ttl: 3600 },
  // Invalidation options for data-modifying routes (simplified: clear all cache)
  {}
);

// Series routes (caching is automatically applied to all GET routes)
// Note: The order matters for Express routes - more specific routes should come before generic ones
router.get("/genres/all", seriesController.getAllGenres as RequestHandler);
router.get(
  "/genre/:genre",
  seriesController.getSeriesByGenre as RequestHandler
);
router.get("/search/:query", seriesController.searchSeries as RequestHandler);
router.get(
  "/:seriesId/season/:seasonNumber/episode/:episodeNumber",
  seriesController.getEpisode as RequestHandler
);
router.get(
  "/:seriesId/season/:seasonNumber",
  seriesController.getEpisodesBySeason as RequestHandler
);
router.get("/:id", seriesController.getSeriesById as RequestHandler);
router.get("/", seriesController.getAllSeries as RequestHandler);

export default router;
