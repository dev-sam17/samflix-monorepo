'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Play, Clock, MoreHorizontal, Trash2, Film, Tv } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { api, clientApi } from '@/lib/api';
import { useApiUrl } from '@/contexts/api-url-context';
import { useUser } from '@clerk/nextjs';
import { type Movie, type TvSeries, type Episode } from '@/lib/types';
import { toast } from 'sonner';
import { SwipeableCarousel } from '@/components/swipeable-carousel';
import { cn } from '@/lib/utils';

type MovieProgressItem = {
  tmdbId: string;
  currentTime: number;
  updatedAt: string;
  type: 'movie';
  movie: Movie;
};

type SeriesProgressItem = {
  seriesId: string;
  tmdbId: string;
  currentTime: number;
  updatedAt: string;
  episodeTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  type: 'series';
  series: TvSeries;
  episode?: Episode;
};

type ContinueWatchingItem = MovieProgressItem | SeriesProgressItem;

export function ContinueWatching() {
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isSignedIn } = useUser();
  const { apiBaseUrl } = useApiUrl();

  useEffect(() => {
    const fetchContinueWatching = async () => {
      if (!isSignedIn || !user || !apiBaseUrl) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch movie progress
        const movieProgress = await clientApi.progress
          .getAllProgress(apiBaseUrl, user.id)
          .catch((error) => {
            console.error('Error fetching movie progress:', error);
            return [];
          });

        // Try to fetch series progress (may not be implemented yet)
        let seriesProgress: any[] = [];
        try {
          if (clientApi.progress.getAllSeriesProgress) {
            seriesProgress = await clientApi.progress.getAllSeriesProgress(apiBaseUrl, user.id);
          }
        } catch (error) {
          console.error('Series progress API not available or failed:', error);
          seriesProgress = [];
        }

        // Ensure both are arrays
        const safeMovieProgress = Array.isArray(movieProgress) ? movieProgress : [];
        const safeSeriesProgress = Array.isArray(seriesProgress) ? seriesProgress : [];

        if (safeMovieProgress.length === 0 && safeSeriesProgress.length === 0) {
          setIsLoading(false);
          return;
        }

        // Process movie progress items
        const movieItems = await Promise.all(
          safeMovieProgress.map(async (item) => {
            try {
              const movie = await clientApi.movies.getById(item.tmdbId, apiBaseUrl);
              return {
                ...item,
                type: 'movie' as const,
                movie,
              } as MovieProgressItem;
            } catch (error) {
              console.error(`Error fetching movie ${item.tmdbId}:`, error);
              return null;
            }
          })
        );

        // Process series progress items
        const seriesItems = await Promise.all(
          safeSeriesProgress.map(async (item) => {
            try {
              const series = await clientApi.series.getById(item.seriesId, apiBaseUrl);
              // Find the episode in the series
              const episode = series.episodes.find((ep) => ep.id.toString() === item.tmdbId);

              return {
                ...item,
                type: 'series' as const,
                series,
                episode,
              } as SeriesProgressItem;
            } catch (error) {
              console.error(`Error fetching series ${item.seriesId}:`, error);
              return null;
            }
          })
        );

        // Combine and filter out null items, then sort by updatedAt (most recent first)
        const allItems = [...movieItems, ...seriesItems]
          .filter((item): item is ContinueWatchingItem => item !== null)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        setItems(allItems);
      } catch (error) {
        console.error('Error fetching continue watching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContinueWatching();
  }, [isSignedIn, user, apiBaseUrl]);

  const handleDeleteProgress = async (item: ContinueWatchingItem) => {
    if (!user || !apiBaseUrl) return;

    try {
      if (item.type === 'movie') {
        await clientApi.progress.deleteProgress(apiBaseUrl, user.id, item.tmdbId);
      } else {
        await clientApi.progress.deleteSeriesProgress(apiBaseUrl, user.id, item.seriesId);
      }

      // Remove the item from the local state
      setItems((prevItems) =>
        prevItems.filter((prevItem) => {
          if (item.type === 'movie' && prevItem.type === 'movie') {
            return prevItem.tmdbId !== item.tmdbId;
          } else if (item.type === 'series' && prevItem.type === 'series') {
            return prevItem.seriesId !== item.seriesId;
          }
          return true;
        })
      );

      toast.success('Progress deleted successfully');
    } catch (error) {
      console.error('Error deleting progress:', error);
      toast.error('Failed to delete progress');
    }
  };

  // Don't render anything if user is not signed in or there are no items
  if ((!isSignedIn || items.length === 0) && !isLoading) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl md:text-3xl font-bold">Continue Watching</h2>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] bg-gray-800 rounded-lg mb-4" />
              <div className="h-4 bg-gray-800 rounded mb-2" />
              <div className="h-3 bg-gray-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <SwipeableCarousel showArrows={true} showDots={false}>
          {items.map((item) => (
            <ContinueWatchingCard
              key={item.type === 'movie' ? item.tmdbId : `${item.seriesId}-${item.tmdbId}`}
              item={item}
              onDelete={() => handleDeleteProgress(item)}
              className="flex-[0_0_50%] sm:flex-[0_0_33.333%] md:flex-[0_0_25%] lg:flex-[0_0_16.666%] min-w-0"
            />
          ))}
        </SwipeableCarousel>
      )}
    </section>
  );
}

function ContinueWatchingCard({
  item,
  onDelete,
  className,
}: {
  item: ContinueWatchingItem;
  onDelete: () => void;
  className?: string;
}) {
  // Format time as hours and minutes
  const formatTime = (seconds: number) => {
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete();
  };

  // Get common properties based on item type
  const getItemData = () => {
    if (item.type === 'movie') {
      const runtime = item.movie.runtime || 120;
      const progressPercent = Math.min(Math.round((item.currentTime / (runtime * 60)) * 100), 100);

      return {
        title: item.movie.title,
        posterPath: item.movie.posterPath,
        href: `/movies/${item.movie.id}`,
        progressPercent,
        subtitle: `${Math.round(progressPercent)}% watched`,
        badge: { icon: Film, text: 'Movie' },
      };
    } else {
      // For series, we don't have episode runtime, so we'll estimate progress differently
      // Assume 45 minutes per episode as default
      const estimatedEpisodeRuntime = 45 * 60; // 45 minutes in seconds
      const progressPercent = Math.min(
        Math.round((item.currentTime / estimatedEpisodeRuntime) * 100),
        100
      );

      return {
        title: item.series.title,
        posterPath: item.series.posterPath,
        href: `/series/${item.series.id}`,
        progressPercent,
        subtitle: item.episode
          ? `S${item.seasonNumber}E${item.episodeNumber}: ${item.episodeTitle || item.episode.title}`
          : `${Math.round(progressPercent)}% watched`,
        badge: { icon: Tv, text: 'Series' },
      };
    }
  };

  const itemData = getItemData();

  return (
    <div className={cn('relative group', className)}>
      <Link href={itemData.href}>
        <Card className="overflow-hidden bg-gray-900 border-gray-800 transition-all hover:scale-105 hover:border-gray-700">
          <div className="relative aspect-[2/3]">
            <Image
              src={api.utils.getTmdbImageUrl(itemData.posterPath || '', 'w500')}
              alt={itemData.title}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

            {/* Type badge */}
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="bg-black/70 text-white text-xs">
                <itemData.badge.icon className="w-3 h-3 mr-1" />
                {itemData.badge.text}
              </Badge>
            </div>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
              <div
                className="h-full bg-red-600"
                style={{ width: `${itemData.progressPercent}%` }}
              />
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="flex items-center gap-2">
                <Button size="sm" className="bg-red-600 hover:bg-red-700 rounded-full w-8 h-8 p-0">
                  <Play className="w-4 h-4" />
                </Button>
                <div className="text-xs text-gray-300 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(item.currentTime)}
                </div>
              </div>
            </div>
          </div>
          <CardContent className="p-3">
            <h3 className="font-medium text-sm truncate">{itemData.title}</h3>
            <p className="text-xs text-gray-400 line-clamp-2">{itemData.subtitle}</p>
          </CardContent>
        </Card>
      </Link>

      {/* Three dots dropdown menu */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 rounded-full"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <MoreHorizontal className="h-4 w-4 text-white" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
            <DropdownMenuItem
              onClick={handleDeleteClick}
              className="text-red-400 hover:text-red-300 hover:bg-gray-800 cursor-pointer"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
