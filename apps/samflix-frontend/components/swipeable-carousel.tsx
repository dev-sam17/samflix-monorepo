'use client';

import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableCarouselProps {
  children: React.ReactNode;
  className?: string;
  showArrows?: boolean;
  showDots?: boolean;
  gap?: string;
}

export function SwipeableCarousel({
  children,
  className,
  showArrows = true,
  showDots = true,
  gap = 'gap-3 md:gap-4',
}: SwipeableCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
    slidesToScroll: 1,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className={cn('relative', className)}>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className={cn('flex', gap)}>{children}</div>
      </div>

      {/* Navigation Arrows */}
      {showArrows && (
        <>
          <Button
            variant="outline"
            size="icon"
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            className={cn(
              'absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/70 border-gray-600 text-white hover:bg-black/90 disabled:opacity-0 transition-opacity',
              'hidden md:flex'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={scrollNext}
            disabled={!canScrollNext}
            className={cn(
              'absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/70 border-gray-600 text-white hover:bg-black/90 disabled:opacity-0 transition-opacity',
              'hidden md:flex'
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </>
      )}

      {/* Dot Indicators */}
      {showDots && scrollSnaps.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                index === selectedIndex ? 'bg-red-500' : 'bg-gray-600 hover:bg-gray-500'
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
