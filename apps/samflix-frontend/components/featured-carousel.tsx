'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Movie, TvSeries } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SwipeableCarousel } from '@/components/swipeable-carousel';
import { MediaCard } from '@/components/media-card';

interface FeaturedCarouselProps {
  items: (Movie | TvSeries)[];
  title: string;
  type: 'movies' | 'series';
  viewAllLink: string;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

export function FeaturedCarousel({
  items,
  title,
  type,
  viewAllLink,
  loading = false,
  error = null,
  className,
}: FeaturedCarouselProps) {
  // Loading skeleton
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] bg-gray-800 rounded-lg mb-3" />
              <div className="h-4 bg-gray-800 rounded mb-2" />
              <div className="h-3 bg-gray-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('space-y-4', className)}>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <div className="text-red-400 text-center py-8">{error}</div>
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <div className="text-gray-400 text-center py-8">No {type} available</div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
        <Link href={viewAllLink}>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300 hover:bg-white/10"
          >
            View All
          </Button>
        </Link>
      </div>

      {/* Swipeable Carousel */}
      <SwipeableCarousel showArrows={true} showDots={false}>
        {items.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            type={type === 'movies' ? 'movie' : 'series'}
            className="flex-[0_0_50%] sm:flex-[0_0_33.333%] md:flex-[0_0_25%] lg:flex-[0_0_16.666%] min-w-0"
          />
        ))}
      </SwipeableCarousel>
    </div>
  );
}
