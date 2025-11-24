'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Star,
  Calendar,
  Clock,
  Film,
  Play,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import type { Movie } from '@/lib/types';
import { TranscodeStatus } from '@/lib/types';
import { useApiWithContext } from '@/hooks/use-api-with-context';
import { useState, useCallback } from 'react';
import { MovieHeader } from './MovieHeader';

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = 6;

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

  // Filter out the current movie, only show completed movies, and limit to 12 items
  const filteredMovies = (recommendedMovies?.data || [])
    .filter((m: Movie) => m.id !== movie.id && m.transcodeStatus === TranscodeStatus.COMPLETED)
    .slice(0, 12);

  const maxIndex = Math.max(0, filteredMovies.length - itemsPerPage);

  const nextSlide = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  if (filteredMovies.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold text-white">More Like This</h2>
        <div className="flex items-center gap-2">
          {filteredMovies.length > itemsPerPage && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={prevSlide}
                disabled={currentIndex === 0}
                className="border-gray-600 text-gray-300 hover:bg-white/10 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={nextSlide}
                disabled={currentIndex >= maxIndex}
                className="border-gray-600 text-gray-300 hover:bg-white/10 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-in-out gap-4"
          style={{
            transform: `translateX(-${(currentIndex / itemsPerPage) * 100}%)`,
          }}
        >
          {filteredMovies.map((recMovie: Movie) => (
            <Link
              key={recMovie.id}
              href={`/movies/${recMovie.id}`}
              className="flex-shrink-0 w-[calc(50%-8px)] md:w-[calc(25%-12px)] lg:w-[calc(16.666%-14px)] group"
            >
              <Card className="bg-gray-900/50 border-gray-800 hover:border-red-500/50 transition-all duration-300 group-hover:scale-105">
                <div className="relative aspect-[2/3] overflow-hidden rounded-t-lg">
                  <Image
                    src={api.utils.getTmdbImageUrl(recMovie.posterPath || '', 'w300')}
                    alt={recMovie.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16.666vw"
                  />

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors duration-300 flex items-center justify-center">
                    <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  <Badge className="absolute top-2 left-2 bg-black/70 text-white border-gray-600">
                    <Film className="w-3 h-3 mr-1" />
                    Movie
                  </Badge>

                  {recMovie.rating && recMovie.rating > 0 && (
                    <Badge className="absolute top-2 right-2 bg-black/70 text-yellow-400 border-yellow-400/50">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      {recMovie.rating.toFixed(1)}
                    </Badge>
                  )}
                </div>

                <CardContent className="p-3 space-y-2">
                  <h3 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-red-400 transition-colors">
                    {recMovie.title}
                  </h3>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {recMovie.year}
                    </div>

                    {recMovie.runtime && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.floor(recMovie.runtime / 60)}h {recMovie.runtime % 60}m
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1 flex-wrap">
                    {Array.isArray(recMovie.genres) &&
                      recMovie.genres.slice(0, 2).map((genre: string) => (
                        <Badge
                          key={genre}
                          variant="outline"
                          className="text-xs border-gray-600 text-gray-300 px-1 py-0"
                        >
                          {genre}
                        </Badge>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
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
