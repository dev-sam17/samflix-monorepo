'use client';

import type React from 'react';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Film, Star, Tv, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { TranscodeStatus, type Movie, type TvSeries } from '@/lib/types';
import { useApiWithContext } from '@/hooks/use-api-with-context';
import { useApiUrl } from '@/contexts/api-url-context';
import { ContinueWatching } from '@/components/continue-watching';
import { FeaturedCarousel } from '@/components/featured-carousel';
import { MixedHeroCarousel } from '@/components/mixed-hero-carousel';
import { MediaCard } from '@/components/media-card';
import { useUser } from '@clerk/nextjs';

function SearchSection({ onSearch }: { onSearch: (query: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <form onSubmit={handleSearch} className="relative mb-8">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
      <Input
        placeholder="Search movies and TV series..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10 h-12 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-400 focus:border-red-500"
      />
    </form>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[2/3] bg-gray-800 rounded-lg mb-4" />
          <div className="h-4 bg-gray-800 rounded mb-2" />
          <div className="h-3 bg-gray-800 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<(Movie | TvSeries)[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { apiBaseUrl } = useApiUrl();

  // Fetch featured movies (latest 20)
  const {
    data: moviesData,
    loading: moviesLoading,
    error: moviesError,
  } = useApiWithContext(
    (baseUrl) => () =>
      api.client.movies.getAll({
        baseUrl,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    []
  );

  // Fetch featured series (latest 20)
  const {
    data: seriesData,
    loading: seriesLoading,
    error: seriesError,
  } = useApiWithContext(
    (baseUrl) => () =>
      api.client.series.getAll({
        baseUrl,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    []
  );

  // Get system stats
  const { data: healthData } = useApiWithContext(
    (baseUrl) => () => api.client.system.healthCheck(baseUrl),
    []
  );

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const [movieResults, seriesResults] = await Promise.all([
        api.client.movies.getAll({ baseUrl: apiBaseUrl!, search: query }),
        api.client.series.getAll({ baseUrl: apiBaseUrl!, search: query }),
      ]);
      const movieData = Array.isArray(movieResults.data) ? movieResults.data : [];
      const seriesData = Array.isArray(seriesResults.data) ? seriesResults.data : [];
      setSearchResults([...movieData, ...seriesData]);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const movies = Array.isArray(moviesData?.data)
    ? moviesData.data.filter((movie) => movie.transcodeStatus === TranscodeStatus.COMPLETED)
    : [];

  const series = Array.isArray(seriesData?.data)
    ? seriesData.data.filter(
        (series) =>
          series.transcodeStatus === TranscodeStatus.COMPLETED ||
          series.transcodeStatus === TranscodeStatus.IN_PROGRESS
      )
    : [];

  const featuredMovies = movies || [];
  const featuredSeries = series || [];

  // Mix movies and series for hero carousel, randomly pick 20
  const mixedItems = [...featuredMovies, ...featuredSeries]
    .sort(() => Math.random() - 0.5)
    .slice(0, 20);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-3 md:py-8 space-y-8 md:space-y-12">
        {/* Mixed Hero Carousel */}
        <MixedHeroCarousel items={mixedItems} loading={moviesLoading || seriesLoading} />
        <SearchSection onSearch={handleSearch} />
        {isSearching && (
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">Searching...</h2>
            <LoadingGrid />
          </section>
        )}

        {searchResults.length > 0 && (
          <section className="space-y-4 md:space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold">Search Results</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              {searchResults.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  type={'episodes' in item ? 'series' : 'movie'}
                />
              ))}
            </div>
          </section>
        )}

        {/* Continue Watching (only for authenticated users) */}
        <ContinueWatching />

        {/* Featured Movies Carousel */}
        <FeaturedCarousel
          items={featuredMovies}
          title="Latest Movies"
          type="movies"
          viewAllLink="/movies"
          loading={moviesLoading}
          error={moviesError?.message || null}
        />

        {/* Featured Series Carousel */}
        <FeaturedCarousel
          items={featuredSeries}
          title="Latest TV Series"
          type="series"
          viewAllLink="/series"
          loading={seriesLoading}
          error={seriesError?.message || null}
        />

        {/* Quick Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-red-600/20 to-red-800/20 border-red-500/30">
            <CardContent className="p-6 text-center">
              <Film className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{moviesData?.meta?.total || 0}</div>
              <div className="text-sm text-gray-400">Movies</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
            <CardContent className="p-6 text-center">
              <Tv className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{seriesData?.meta?.total || 0}</div>
              <div className="text-sm text-gray-400">TV Series</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30">
            <CardContent className="p-6 text-center">
              <Calendar className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                {healthData ? 'Online' : 'Offline'}
              </div>
              <div className="text-sm text-gray-400">System Status</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30">
            <CardContent className="p-6 text-center">
              <Star className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                {featuredMovies.length > 0
                  ? (
                      featuredMovies.reduce((sum, m) => sum + (m.rating || 0), 0) /
                      featuredMovies.length
                    ).toFixed(1)
                  : '0.0'}
              </div>
              <div className="text-sm text-gray-400">Avg Rating</div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
