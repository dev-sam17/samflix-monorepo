import axios from 'axios';
import { TMDBMovieResult, TMDBTVResult, TMDBEpisodeResult } from '../../types/media.types';

class TMDBService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.TMDB_API_KEY || '';
    this.baseUrl = process.env.TMDB_API_URL || 'https://api.themoviedb.org/3';

    if (!this.apiKey) {
      throw new Error('TMDB API key is not configured');
    }
  }

  private async request<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params: {
          ...params,
          api_key: this.apiKey,
        },
      });
      return response.data;
    } catch (error) {
      console.error('TMDB API Error:', error);
      throw error;
    }
  }

  async searchMovie(query: string, year?: number): Promise<TMDBMovieResult[]> {
    const params: Record<string, any> = { query };
    if (year) {
      params.year = year;
    }
    const response = await this.request<{ results: TMDBMovieResult[] }>('/search/movie', params);
    return response.results;
  }

  async searchTV(query: string): Promise<TMDBTVResult[]> {
    const response = await this.request<{ results: TMDBTVResult[] }>('/search/tv', { query });
    return response.results;
  }

  async getMovieDetails(movieId: number): Promise<TMDBMovieResult> {
    return this.request<TMDBMovieResult>(`/movie/${movieId}`);
  }

  async getTVDetails(tvId: number): Promise<TMDBTVResult> {
    return this.request<TMDBTVResult>(`/tv/${tvId}`);
  }

  async getEpisodeDetails(tvId: number, seasonNumber: number, episodeNumber: number): Promise<TMDBEpisodeResult> {
    return this.request<TMDBEpisodeResult>(`/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}`);
  }
}

export const tmdbService = new TMDBService();
