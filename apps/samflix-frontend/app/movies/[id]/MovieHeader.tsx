'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HLSPlayer } from '@/components/hls-player';
import { Play, Star, Clock, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { api, clientApi } from '@/lib/api';
import { TranscodeStatus, type Movie } from '@/lib/types';
import { runtimeFormat } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { SignInButton, useUser } from '@clerk/nextjs';
import { useApiUrl } from '@/contexts/api-url-context';
import { toast } from 'sonner';

interface MovieHeaderProps {
  movie: Movie;
  onPlayerOpen?: () => void;
  onPlayerClose?: () => void;
  isPlayerOpen?: boolean;
}

export function MovieHeader({
  movie,
  onPlayerOpen,
  onPlayerClose,
  isPlayerOpen: externalIsPlayerOpen,
}: MovieHeaderProps) {
  const [internalIsPlayerOpen, setInternalIsPlayerOpen] = useState(false);
  const isPlayerOpen =
    externalIsPlayerOpen !== undefined ? externalIsPlayerOpen : internalIsPlayerOpen;
  const setIsPlayerOpen = (value: boolean | ((prev: boolean) => boolean)) => {
    const newValue = typeof value === 'function' ? value(isPlayerOpen) : value;
    if (newValue && onPlayerOpen) {
      onPlayerOpen();
    } else if (!newValue && onPlayerClose) {
      onPlayerClose();
    } else {
      setInternalIsPlayerOpen(newValue);
    }
  };
  const [playbackProgress, setPlaybackProgress] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const { user } = useUser();
  const { apiBaseUrl } = useApiUrl();

  // Fetch playback progress when component mounts
  useEffect(() => {
    const fetchProgress = async () => {
      if (!isAuthenticated || !user || !movie.tmdbId) return;
      if (!apiBaseUrl) {
        console.error('API base URL is not configured');
        return;
      }

      try {
        setIsLoading(true);
        // Fetch user's progress for this movie
        // Note: 404 responses are normal for unwatched movies and are handled gracefully
        const progress = await clientApi.progress.getProgress(
          apiBaseUrl,
          user.id,
          movie.id.toString()
        );
        if (progress && progress.currentTime > 0) {
          setPlaybackProgress(progress.currentTime);
        } else {
          setPlaybackProgress(0);
        }
      } catch (error) {
        // The getProgress function already handles 404s by returning null
        // This catch block should only handle unexpected errors
        console.error('Unexpected error fetching playback progress:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [isAuthenticated, user, movie.id, apiBaseUrl]);

  // Handle saving playback progress
  const handleTimeUpdate = useCallback(
    async (currentTime: number) => {
      if (!isAuthenticated || !user || !movie.id) return;

      try {
        if (!apiBaseUrl) {
          console.error('API base URL is not configured');
          return;
        }
        await clientApi.progress.saveProgress(
          apiBaseUrl,
          user.id,
          movie.id.toString(),
          currentTime
        );
      } catch (error) {
        // Suppress network errors - progress saves successfully despite false positives
      }
    },
    [isAuthenticated, user, movie.id, apiBaseUrl]
  );

  // Handle deleting playback progress
  const handleDeleteProgress = useCallback(async () => {
    if (!isAuthenticated || !user || !movie.id) return;

    try {
      if (!apiBaseUrl) {
        console.error('API base URL is not configured');
        return;
      }
      await clientApi.progress.deleteProgress(apiBaseUrl, user.id, movie.id.toString());
      setPlaybackProgress(null);
      toast.success('Playback progress reset');
    } catch (error) {
      console.error('Error deleting playback progress:', error);
      toast.error('Failed to reset playback progress');
    }
  }, [isAuthenticated, user, movie.id, apiBaseUrl]);

  // Handle resume playback
  const handleResume = useCallback(() => {
    setIsPlayerOpen(true);
  }, []);

  // Handle start over - reset progress and play from beginning
  const handleStartOver = useCallback(async () => {
    await handleDeleteProgress();
    setIsPlayerOpen(true);
  }, [handleDeleteProgress]);

  // Handle play from beginning
  const handlePlay = useCallback(() => {
    setIsPlayerOpen(true);
  }, []);

  return (
    <>
      {/* Video Player Section - Shows when playing */}
      {isPlayerOpen && (
        <div className="w-full bg-black">
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            <HLSPlayer
              src={apiBaseUrl ? new URL(apiBaseUrl + movie.playPath).toString() : ''}
              title={movie.title}
              poster={
                movie.backdropPath
                  ? api.utils.getTmdbImageUrl(movie.backdropPath, 'original')
                  : undefined
              }
              onBack={() => setIsPlayerOpen(false)}
              autoPlay={true}
              tmdbId={movie.id.toString()}
              clerkId={user?.id}
              initialTime={playbackProgress || 0}
              onTimeUpdate={handleTimeUpdate}
              audioTracks={[
                {
                  kind: 'audio',
                  label: 'English',
                  language: 'en',
                  default: true,
                },
                { kind: 'audio', label: 'Spanish', language: 'es' },
              ]}
              subtitleTracks={[
                {
                  kind: 'subtitles',
                  label: 'English',
                  language: 'en',
                  default: true,
                },
                { kind: 'subtitles', label: 'Spanish', language: 'es' },
              ]}
            />
          </div>
        </div>
      )}

      {/* Hero Section - Hidden when player is open */}
      {!isPlayerOpen && (
        <>
          <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
            {movie.backdropPath ? (
              <Image
                src={
                  api.utils.getTmdbImageUrl(movie.backdropPath, 'original') || '/placeholder.svg'
                }
                alt={movie.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gray-800" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          </div>

          <div className="container mx-auto px-4 -mt-20 md:-mt-32 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Poster - Hidden on mobile, visible on desktop */}
              <div className="hidden lg:block lg:col-span-1">
                <div className="aspect-[2/3] relative rounded-lg overflow-hidden shadow-2xl max-w-[300px] mx-auto">
                  <Image
                    src={
                      movie.posterPath
                        ? api.utils.getTmdbImageUrl(movie.posterPath, 'w300')
                        : '/placeholder.svg'
                    }
                    alt={movie.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              </div>

              {/* Movie Info - Full width on mobile, 3/4 width on desktop */}
              <div className="lg:col-span-3 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-red-600 text-white">
                      {movie.year}
                    </Badge>
                    {movie.rating && (
                      <Badge
                        variant="secondary"
                        className="bg-yellow-600 text-white flex items-center gap-1"
                      >
                        <Star className="w-3 h-3" />
                        {movie.rating}
                      </Badge>
                    )}
                    {movie.runtime && (
                      <Badge
                        variant="outline"
                        className="border-gray-600 text-gray-300 flex items-center gap-1"
                      >
                        <Clock className="w-3 h-3" />
                        {runtimeFormat(movie.runtime)}
                      </Badge>
                    )}
                  </div>

                  <h1 className="text-3xl md:text-4xl font-bold text-white">{movie.title}</h1>

                  <div className="flex flex-wrap gap-2">
                    {movie.genres?.map((genre: string) => (
                      <Badge
                        key={genre}
                        variant="outline"
                        className="border-gray-600 text-gray-300"
                      >
                        {genre}
                      </Badge>
                    ))}
                  </div>

                  {movie.overview && (
                    <p className="text-gray-300 text-base md:text-lg leading-relaxed">
                      {movie.overview}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 pt-4">
                    <>
                      {isAuthenticated ? (
                        playbackProgress !== null && playbackProgress > 0 ? (
                          <>
                            <Button
                              className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
                              onClick={handleResume}
                              disabled={isLoading}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              {isLoading ? 'Loading...' : 'Resume'}
                            </Button>
                            <Button
                              variant="outline"
                              className="text-gray-300 border-gray-700 hover:bg-gray-800 w-full sm:w-auto"
                              onClick={handleStartOver}
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Start Over
                            </Button>
                          </>
                        ) : (
                          <Button
                            className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
                            onClick={handlePlay}
                            disabled={isLoading}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            {isLoading ? 'Loading...' : 'Play'}
                          </Button>
                        )
                      ) : (
                        <SignInButton mode="modal" fallbackRedirectUrl={window.location.href}>
                          <Button className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto">
                            <Play className="w-4 h-4 mr-2" />
                            Play
                          </Button>
                        </SignInButton>
                      )}
                    </>
                    {(movie.transcodeStatus === TranscodeStatus.IN_PROGRESS ||
                      movie.transcodeStatus === TranscodeStatus.PENDING) && (
                      <Button
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => setIsPlayerOpen(true)}
                        disabled
                      >
                        <Play className="w-4 h-4 mr-2" />
                        UPLOADING
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
