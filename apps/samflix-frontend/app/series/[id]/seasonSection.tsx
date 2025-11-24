'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Season } from '@/lib/types';
import { ChevronDown, ChevronRight, ChevronLeft, Play } from 'lucide-react';
import { EpisodeCard } from './EpisodeCard';
import { cn } from '@/lib/utils';

export default function SeasonSection({
  season,
  onPlayClick,
}: {
  season: Season;
  onPlayClick?: (episode: any) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const episodesPerPage = 4; // Show 4 episodes at a time
  const totalPages = Math.ceil(season.episodes.length / episodesPerPage);

  const nextPage = () => {
    setCurrentIndex((prev) => (prev + 1) % totalPages);
  };

  const prevPage = () => {
    setCurrentIndex((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const currentEpisodes = season.episodes.slice(
    currentIndex * episodesPerPage,
    (currentIndex + 1) * episodesPerPage
  );

  // Update content height when episodes change or when opened
  useEffect(() => {
    if (contentRef.current && isOpen) {
      setContentHeight(contentRef.current.scrollHeight);
    } else {
      setContentHeight(0);
    }
  }, [isOpen, currentIndex, currentEpisodes]);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <Card className="bg-gradient-to-r from-gray-900/80 to-gray-800/60 border-gray-700 hover:border-red-500/30 transition-all duration-300 overflow-hidden">
      {/* Season Header - Clickable Trigger */}
      <CardContent className="p-6 cursor-pointer" onClick={toggleOpen}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center shadow-lg">
              <span className="font-bold text-white text-lg">S{season.seasonNumber}</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Season {season.seasonNumber}</h3>
              <p className="text-gray-400 flex items-center gap-2 text-sm">
                <Play className="w-3 h-3" />
                {season.episodes.length} episodes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="border-red-500/30 text-red-400 bg-red-500/10 px-3 py-1 text-xs"
            >
              {season.episodes.length} Episodes
            </Badge>
            <ChevronDown
              className={cn(
                'w-5 h-5 text-gray-400 transition-transform duration-300 ease-in-out',
                isOpen ? 'rotate-180' : 'rotate-90'
              )}
            />
          </div>
        </div>
      </CardContent>

      {/* Episodes Carousel - Animated Collapsible Content */}
      <div
        className="transition-all duration-500 ease-in-out overflow-hidden"
        style={{ height: contentHeight }}
      >
        <div ref={contentRef}>
          <CardContent className="px-6 pb-6 pt-0">
            <div className="border-t border-gray-700 pt-4">
              {/* Carousel Navigation */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mb-4 animate-in fade-in duration-300">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      prevPage();
                    }}
                    disabled={currentIndex === 0}
                    className="border-gray-600 text-gray-300 hover:border-red-500 hover:text-red-400 disabled:opacity-50 transition-all duration-200"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-gray-400">
                    Page {currentIndex + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      nextPage();
                    }}
                    disabled={currentIndex === totalPages - 1}
                    className="border-gray-600 text-gray-300 hover:border-red-500 hover:text-red-400 disabled:opacity-50 transition-all duration-200"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}

              {/* Episodes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {currentEpisodes.map((episode: any, index) => (
                  <div
                    key={episode.episodeNumber}
                    className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <EpisodeCard episode={episode} onPlayClick={onPlayClick} />
                  </div>
                ))}
              </div>

              {/* Pagination Dots */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-4 gap-2 animate-in fade-in duration-300">
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex(index);
                      }}
                      className={cn(
                        'w-2 h-2 rounded-full transition-all duration-300 hover:scale-110',
                        index === currentIndex
                          ? 'bg-red-500 scale-125 shadow-lg shadow-red-500/50'
                          : 'bg-gray-600 hover:bg-gray-500'
                      )}
                      aria-label={`Go to page ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
