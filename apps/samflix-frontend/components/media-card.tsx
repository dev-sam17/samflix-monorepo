'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Star, Calendar, Clock, Film, Tv } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, runtimeFormat } from '@/lib/utils';
import type { Movie, TvSeries } from '@/lib/types';

interface MediaCardProps {
  item: Movie | TvSeries;
  type: 'movie' | 'series';
  className?: string;
  showPlayOverlay?: boolean;
}

export function MediaCard({ item, type, className, showPlayOverlay = true }: MediaCardProps) {
  const isMovie = type === 'movie';
  const movie = item as Movie;
  const series = item as TvSeries;

  const getItemYear = (): string => {
    if (isMovie) {
      return movie.releaseDate
        ? new Date(movie.releaseDate).getFullYear().toString()
        : movie.year?.toString() || 'N/A';
    } else {
      return series.firstAirDate ? new Date(series.firstAirDate).getFullYear().toString() : 'N/A';
    }
  };

  const getItemLink = (): string => {
    return `/${type === 'movie' ? 'movies' : 'series'}/${item.id}`;
  };

  return (
    <Link href={getItemLink()} className={cn('block', className)}>
      <Card className="group bg-gray-900/50 border-gray-800 hover:border-red-500/50 transition-all duration-300 hover:scale-105 h-full flex flex-col">
        {/* Poster Image - Fixed aspect ratio */}
        <div className="relative aspect-[2/3] overflow-hidden rounded-t-lg flex-shrink-0">
          <Image
            src={api.utils.getTmdbImageUrl(item.posterPath || '', 'w500')}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16.666vw"
          />

          {/* Play Overlay */}
          {showPlayOverlay && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors duration-300 flex items-center justify-center">
              <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          )}

          {/* Type Badge */}
          <Badge className="absolute top-2 left-2 bg-black/70 text-white border-gray-600">
            {isMovie ? (
              <>
                <Film className="w-3 h-3 mr-1" />
                Movie
              </>
            ) : (
              <>
                <Tv className="w-3 h-3 mr-1" />
                Series
              </>
            )}
          </Badge>

          {/* Rating Badge */}
          {isMovie && movie.rating && movie.rating > 0 && (
            <Badge className="absolute top-2 right-2 bg-black/70 text-yellow-400 border-yellow-400/50">
              <Star className="w-3 h-3 mr-1 fill-current" />
              {movie.rating.toFixed(1)}
            </Badge>
          )}
        </div>

        {/* Content */}
        <CardContent className="p-3 flex-1 flex flex-col space-y-2">
          <h3 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-red-400 transition-colors min-h-[40px]">
            {item.title}
          </h3>

          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{getItemYear()}</span>
            </div>

            {isMovie && movie.runtime && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Clock className="w-3 h-3" />
                {runtimeFormat(movie.runtime)}
              </div>
            )}
          </div>

          {/* Genres */}
          <div className="flex gap-1 flex-wrap mt-auto">
            {item.genres.slice(0, 2).map((genre: string) => (
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
  );
}
