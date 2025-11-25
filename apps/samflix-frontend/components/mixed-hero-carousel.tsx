'use client';

import React, { useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Play, Star, Clock, Calendar } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { cn, runtimeFormat } from '@/lib/utils';
import type { Movie, TvSeries } from '@/lib/types';

interface MixedHeroCarouselProps {
  items: (Movie | TvSeries)[];
  loading?: boolean;
}

export function MixedHeroCarousel({ items, loading = false }: MixedHeroCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on('select', onSelect);
    onSelect();

    // Auto-scroll every 5 seconds
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);

    return () => {
      emblaApi.off('select', onSelect);
      clearInterval(interval);
    };
  }, [emblaApi]);

  const isMovie = (item: Movie | TvSeries): item is Movie => {
    return 'runtime' in item;
  };

  const getItemYear = (item: Movie | TvSeries): string => {
    if (isMovie(item)) {
      return item.year?.toString() || new Date(item.releaseDate).getFullYear().toString();
    } else {
      return new Date(item.firstAirDate || '').getFullYear().toString();
    }
  };

  const getItemLink = (item: Movie | TvSeries): string => {
    return isMovie(item) ? `/movies/${item.id}` : `/series/${item.id}`;
  };

  if (loading) {
    return (
      <div className="relative h-[50vh] md:h-[70vh] bg-gray-800 rounded-xl animate-pulse flex items-center justify-center">
        <div className="text-gray-400">Loading featured content...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="relative h-[50vh] md:h-[70vh] overflow-hidden rounded-md">
      <div ref={emblaRef} className="h-full overflow-hidden">
        <div className="flex h-full">
          {items.map((item, index) => (
            <div key={item.id} className="flex-[0_0_100%] min-w-0 relative h-full">
              <Image
                src={api.utils.getTmdbImageUrl(item.backdropPath || '', 'original')}
                alt={item.title}
                fill
                className="object-cover"
                priority={index === 0}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

              <div className="absolute bottom-0 left-0 p-6 pb-20 md:p-12 md:pb-12 max-w-3xl">
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-center gap-2 text-xs md:text-sm text-gray-300 flex-wrap">
                    <Badge variant="secondary" className="bg-red-600 text-white">
                      Featured
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                      {getItemYear(item)}
                    </div>
                    {isMovie(item) && item.runtime && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 md:w-4 md:h-4" />
                          {runtimeFormat(item.runtime)}
                        </div>
                      </>
                    )}
                    {isMovie(item) && item.rating && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 md:w-4 md:h-4 fill-yellow-400 text-yellow-400" />
                          {item.rating.toFixed(1)}
                        </div>
                      </>
                    )}
                  </div>

                  <h1 className="text-3xl md:text-5xl font-bold text-white line-clamp-2">
                    {item.title}
                  </h1>

                  <div className="flex gap-2 flex-wrap">
                    {item.genres.slice(0, 3).map((genre) => (
                      <Badge
                        key={genre}
                        variant="outline"
                        className="border-gray-500 text-gray-300 text-xs md:text-sm"
                      >
                        {genre}
                      </Badge>
                    ))}
                  </div>

                  <p className="text-gray-300 text-sm md:text-lg leading-relaxed line-clamp-2 md:line-clamp-3">
                    {item.overview}
                  </p>

                  <div className="flex gap-3 md:gap-4 pt-2">
                    <Link href={getItemLink(item)}>
                      <Button
                        size="lg"
                        className="bg-white text-black hover:bg-gray-200 h-10 md:h-12"
                      >
                        <Play className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                        Play Now
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows - Desktop only */}
      <Button
        variant="outline"
        size="icon"
        onClick={scrollPrev}
        className={cn(
          'absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 border-gray-600 text-white hover:bg-black/70',
          'hidden md:flex'
        )}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={scrollNext}
        className={cn(
          'absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 border-gray-600 text-white hover:bg-black/70',
          'hidden md:flex'
        )}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>

      {/* Dot Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              index === selectedIndex ? 'bg-red-500 w-6' : 'bg-gray-500 hover:bg-gray-400'
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
