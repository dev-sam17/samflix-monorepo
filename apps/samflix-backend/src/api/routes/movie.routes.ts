import { movieController } from '../controllers/movie.controller';
import { createSmartCacheRouter } from '../middleware/cache-invalidation-middleware';
import { RequestHandler } from 'express';

// Create a router with caching for GET routes and automatic cache invalidation for POST/PUT/DELETE routes
const router = createSmartCacheRouter(
  // Cache options for GET routes
  { ttl: 3600 },
  // Invalidation options for data-modifying routes (simplified: clear all cache)
  {}
);

// Movie routes (caching is automatically applied to all GET routes)
// Note: The order matters for Express routes - more specific routes should come before generic ones
router.get('/genres/all', movieController.getAllGenres as RequestHandler);
router.get('/genre/:genre', movieController.getMoviesByGenre as RequestHandler);
router.get('/search/:query', movieController.searchMovies as RequestHandler);
router.get('/:id', movieController.getMovieById as RequestHandler);
router.get('/', movieController.getAllMovies as RequestHandler);

export default router;
