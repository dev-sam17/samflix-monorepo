'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import type { Movie } from '@/lib/types';
import { TranscodeStatus } from '@/lib/types';
import { useApiWithContext } from '@/hooks/use-api-with-context';
import { useState, useCallback } from 'react';
import { MovieHeader } from './MovieHeader';
import { SwipeableCarousel } from '@/components/swipeable-carousel';
import { MediaCard } from '@/components/media-card';

function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 -mt-20 md:-mt-32 relative z-10">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="hidden lg:block lg:col-span-1">
          <div className="aspect-[2/3] bg-gray-800 rounded-lg animate-pulse" />
        </div>
        <div className="lg:col-span-3 space-y-6">
          <div className="space-y-4">
            <div className="h-6 md:h-8 bg-gray-800 rounded w-3/4 animate-pulse" />
            <div className="h-8 md:h-12 bg-gray-800 rounded animate-pulse" />
            <div className="h-4 bg-gray-800 rounded w-1/2 animate-pulse" />
            <div className="space-y-2">
              <div className="h-3 md:h-4 bg-gray-800 rounded animate-pulse" />
              <div className="h-3 md:h-4 bg-gray-800 rounded w-5/6 animate-pulse" />
              <div className="h-3 md:h-4 bg-gray-800 rounded w-4/6 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecommendationCarousel({ movie }: { movie: Movie }) {
  // Get movies from the same genres
  const { data: recommendedMovies } = useApiWithContext(
    (baseUrl) => () => {
      if (!movie.genres || movie.genres.length === 0) {
        return Promise.resolve({
          data: [],
          meta: { page: 1, limit: 0, total: 0, totalPages: 0 },
        });
      }
      // Use the first genre to get recommendations
      const genre = movie.genres[0];
      return api.client.movies.getAll({
        baseUrl,
        limit: 20,
        genre,
        sortBy: 'rating',
        sortOrder: 'desc',
        status: 'COMPLETED',
      });
    },
    [movie.genres]
  );

  // Filter out the current movie, only show completed movies
  const filteredMovies = (recommendedMovies?.data || []).filter(
    (m: Movie) => m.id !== movie.id && m.transcodeStatus === TranscodeStatus.COMPLETED
  );

  if (filteredMovies.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl md:text-2xl font-bold text-white">More Like This</h2>
      <SwipeableCarousel>
        {filteredMovies.map((recMovie: Movie) => (
          <MediaCard key={recMovie.id} item={recMovie} type="movie" />
        ))}
      </SwipeableCarousel>
    </div>
  );
}

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: movie, loading: moviesLoading } = useApiWithContext(
    (baseUrl) => () => api.client.movies.getById(id, baseUrl),
    [id]
  );

  // All hooks must be called before any conditional returns
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const handlePlayerOpen = useCallback(() => {
    setIsPlayerOpen(true);
  }, []);

  const handlePlayerClose = useCallback(() => {
    setIsPlayerOpen(false);
  }, []);

  if (moviesLoading) {
    return <LoadingSkeleton />;
  }

  if (!movie) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Movie Not Found</h1>
          <p className="text-gray-400 mb-6">
            The movie you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link href="/movies">
            <Button className="bg-red-600 hover:bg-red-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Movies
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Back Button - Only show when player is NOT open */}
      {!isPlayerOpen && (
        <div className="absolute top-6 left-6 z-30">
          <Link href="/movies">
            <Button
              variant="outline"
              size="sm"
              className="bg-black/50 border-gray-600 text-white hover:bg-black/70 backdrop-blur-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Movies
            </Button>
          </Link>
        </div>
      )}

      {/* Movie Header with Play Functionality */}
      <MovieHeader
        movie={movie}
        onPlayerOpen={handlePlayerOpen}
        onPlayerClose={handlePlayerClose}
        isPlayerOpen={isPlayerOpen}
      />

      {/* Movie Stats Section - Hidden when player is open */}
      {!isPlayerOpen && (
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="grid grid-cols-3 gap-3 md:flex md:gap-4 mb-6 md:mb-8">
            {movie.quality && (
              <div className="bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 md:px-4 md:py-3 text-center hover:border-red-500/30 transition-colors">
                <div className="text-sm md:text-base font-semibold text-red-400">
                  {movie.quality}
                </div>
                <div className="text-xs text-gray-400">Quality</div>
              </div>
            )}
            {movie.rip && (
              <div className="bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 md:px-4 md:py-3 text-center hover:border-red-500/30 transition-colors">
                <div className="text-sm md:text-base font-semibold text-red-400">{movie.rip}</div>
                <div className="text-xs text-gray-400">Source</div>
              </div>
            )}
            {movie.sound && (
              <div className="bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 md:px-4 md:py-3 text-center hover:border-red-500/30 transition-colors">
                <div className="text-sm md:text-base font-semibold text-red-400">{movie.sound}</div>
                <div className="text-xs text-gray-400">Audio</div>
              </div>
            )}
          </div>

          {/* Recommendations Section */}
          <RecommendationCarousel movie={movie} />
        </div>
      )}
    </div>
  );
}
