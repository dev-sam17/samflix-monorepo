'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { HLSPlayer } from '@/components/hls-player';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Play, RotateCcw } from 'lucide-react';
import { clientApi } from '@/lib/api';
import type { TvSeries, Episode } from '@/lib/types';
import { TranscodeStatus } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { SignInButton, useUser } from '@clerk/nextjs';
import { useApiUrl } from '@/contexts/api-url-context';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface SeriesProgressButtonProps {
  series: TvSeries;
  onPlayerOpen?: (episode: Episode) => void;
  isPlayerOpen?: boolean;
}

interface SeriesPlayerProps {
  series: TvSeries;
  episode: Episode | null;
  onBack: () => void;
  initialTime?: number;
  onTimeUpdate?: (currentTime: number) => void;
  nextEpisode?: Episode | null;
  onPlayNext?: () => void;
}

export function SeriesPlayer({
  series,
  episode,
  onBack,
  initialTime = 0,
  onTimeUpdate,
  nextEpisode,
  onPlayNext,
}: SeriesPlayerProps) {
  const { user } = useUser();
  const { apiBaseUrl } = useApiUrl();

  if (!episode) return null;

  return (
    <div className="w-full bg-black">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <HLSPlayer
          src={
            apiBaseUrl && episode.playPath ? new URL(apiBaseUrl + episode.playPath).toString() : ''
          }
          title={`${episode.title} - S${episode.seasonNumber}E${episode.episodeNumber}`}
          poster={
            series.backdropPath
              ? api.utils.getTmdbImageUrl(series.backdropPath, 'original')
              : undefined
          }
          onBack={onBack}
          autoPlay={true}
          tmdbId={episode.id?.toString()}
          clerkId={user?.id}
          initialTime={initialTime}
          onTimeUpdate={onTimeUpdate}
          nextEpisode={
            nextEpisode
              ? {
                  title: `${nextEpisode.title} - S${nextEpisode.seasonNumber}E${nextEpisode.episodeNumber}`,
                  onPlay: onPlayNext,
                }
              : undefined
          }
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
  );
}

export function SeriesProgressButton({
  series,
  onPlayerOpen,
  isPlayerOpen: externalIsPlayerOpen,
}: SeriesProgressButtonProps) {
  const [internalIsPlayerOpen, setInternalIsPlayerOpen] = useState(false);
  const isPlayerOpen =
    externalIsPlayerOpen !== undefined ? externalIsPlayerOpen : internalIsPlayerOpen;
  const setIsPlayerOpen = onPlayerOpen
    ? (open: boolean) => {
        if (!open) setInternalIsPlayerOpen(false);
      }
    : setInternalIsPlayerOpen;
  const [seriesProgress, setSeriesProgress] = useState<{
    tmdbId: string;
    currentTime: number;
    updatedAt: string;
    episodeTitle?: string;
    seasonNumber?: number;
    episodeNumber?: number;
  } | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [isResumeDialogOpen, setIsResumeDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { isAuthenticated } = useAuth();
  const { user } = useUser();
  const { apiBaseUrl } = useApiUrl();

  // Find the latest completed episode
  const getLatestEpisode = useCallback(() => {
    const completedEpisodes = series.episodes
      .filter((ep) => ep.transcodeStatus === TranscodeStatus.COMPLETED)
      .sort((a, b) => {
        if (a.seasonNumber !== b.seasonNumber) {
          return a.seasonNumber - b.seasonNumber;
        }
        return a.episodeNumber - b.episodeNumber;
      });

    return completedEpisodes[completedEpisodes.length - 1] || null;
  }, [series.episodes]);

  // Fetch series progress when component mounts
  useEffect(() => {
    const fetchProgress = async () => {
      if (!isAuthenticated || !user || !series.id) return;

      try {
        setIsLoading(true);
        if (!apiBaseUrl) {
          console.error('API base URL is not configured');
          return;
        }

        const progress = await clientApi.progress.getSeriesProgress(apiBaseUrl, user.id, series.id);

        if (progress) {
          setSeriesProgress(progress);
          // Find the episode that matches the progress
          const episode = series.episodes.find((ep) => ep.id.toString() === progress.tmdbId);
          setCurrentEpisode(episode || null);
        }
      } catch (error) {
        console.error('Error fetching series progress:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [isAuthenticated, user, series.id, apiBaseUrl, series.episodes]);

  // Handle saving series progress
  const handleTimeUpdate = useCallback(
    async (currentTime: number) => {
      if (!isAuthenticated || !user || !currentEpisode || !series.id) return;

      try {
        if (!apiBaseUrl) {
          console.error('API base URL is not configured');
          return;
        }
        await clientApi.progress.saveSeriesProgress(
          apiBaseUrl,
          user.id,
          series.id,
          currentEpisode.id.toString(),
          currentTime
        );
      } catch (error) {
        console.error('Error saving series progress:', error);
      }
    },
    [isAuthenticated, user, currentEpisode, series.id, apiBaseUrl]
  );

  // Handle deleting series progress
  const handleDeleteProgress = useCallback(async () => {
    if (!isAuthenticated || !user || !series.id) return;

    try {
      if (!apiBaseUrl) {
        console.error('API base URL is not configured');
        return;
      }
      await clientApi.progress.deleteSeriesProgress(apiBaseUrl, user.id, series.id);
      setSeriesProgress(null);
      setCurrentEpisode(null);
      toast.success('Series progress reset');
    } catch (error) {
      console.error('Error deleting series progress:', error);
      toast.error('Failed to reset series progress');
    }
  }, [isAuthenticated, user, series.id, apiBaseUrl]);

  // Handle play button click
  const handlePlayClick = useCallback(() => {
    if (seriesProgress && seriesProgress.currentTime > 0 && currentEpisode) {
      setIsResumeDialogOpen(true);
    } else {
      // Play latest episode
      const latestEpisode = getLatestEpisode();
      if (latestEpisode) {
        setCurrentEpisode(latestEpisode);
        if (onPlayerOpen) {
          onPlayerOpen(latestEpisode);
        } else {
          setIsPlayerOpen(true);
        }
      }
    }
  }, [seriesProgress, currentEpisode, getLatestEpisode, onPlayerOpen]);

  const handleResumePlay = () => {
    setIsResumeDialogOpen(false);
    setIsPlayerOpen(true);
  };

  const handleStartOver = () => {
    setIsResumeDialogOpen(false);
    handleDeleteProgress();
    const latestEpisode = getLatestEpisode();
    if (latestEpisode) {
      setCurrentEpisode(latestEpisode);
      setIsPlayerOpen(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <SignInButton mode="modal">
        <Button size="lg" className="bg-red-600 hover:bg-red-700 w-full sm:w-auto">
          <Play className="w-5 h-5 mr-2" />
          Play Latest
        </Button>
      </SignInButton>
    );
  }

  const latestEpisode = getLatestEpisode();
  if (!latestEpisode) {
    return (
      <Button
        size="lg"
        className="bg-gray-600 text-gray-300 cursor-not-allowed w-full sm:w-auto"
        disabled
      >
        <Play className="w-5 h-5 mr-2" />
        No Episodes Available
      </Button>
    );
  }

  return (
    <>
      <div className="flex gap-4 flex-wrap">
        <Button
          size="lg"
          className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
          onClick={handlePlayClick}
          disabled={isLoading}
        >
          <Play className="w-5 h-5 mr-2" />
          {isLoading ? 'Loading...' : seriesProgress ? 'Continue Watching' : 'Play Latest'}
        </Button>

        {seriesProgress && seriesProgress.currentTime > 0 && (
          <Button
            variant="outline"
            size="lg"
            className="text-gray-300 border-gray-700 hover:bg-gray-800 w-full sm:w-auto"
            onClick={handleDeleteProgress}
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Reset Progress
          </Button>
        )}
      </div>

      {/* Progress Info */}
      {seriesProgress && currentEpisode && (
        <div className="text-sm text-gray-400 mt-2">
          Continue watching S{currentEpisode.seasonNumber}E{currentEpisode.episodeNumber}:{' '}
          {currentEpisode.title}
          {seriesProgress.currentTime > 0 && (
            <span className="ml-2">
              ({Math.floor(seriesProgress.currentTime / 60)}m{' '}
              {Math.floor(seriesProgress.currentTime % 60)}s)
            </span>
          )}
        </div>
      )}

      {/* Resume Playback Dialog */}
      <AlertDialog open={isResumeDialogOpen} onOpenChange={setIsResumeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume Watching</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to continue watching "{currentEpisode?.title}" from where you left off
              {seriesProgress?.currentTime
                ? ` (${Math.floor(seriesProgress.currentTime / 60)}m ${Math.floor(seriesProgress.currentTime % 60)}s)`
                : ''}
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStartOver}>Start Over</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResumePlay}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Resume
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
