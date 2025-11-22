import { TranscodeStatus } from "@dev-sam17/prisma-client-for-samflix/prisma/generated";

export type TranscodeStatusType = TranscodeStatus;
export interface MediaFile {
  fileName: string;
  filePath: string;
  resolution?: string;
  quality?: string;
  rip?: string;
  sound?: string;
  provider?: string;
}

export interface ParsedMovie extends MediaFile {
  title: string;
  year: number;
}

export interface ParsedEpisode extends MediaFile {
  seriesName: string;
  seasonNumber: number;
  episodeNumber: number;
}

export interface TMDBMovieResult {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: Array<{ id: number; name: string }>;
  runtime: number;
  vote_average: number;
}

export interface TMDBTVResult {
  id: number;
  name: string;
  overview: string;
  first_air_date: string;
  last_air_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: Array<{ id: number; name: string }>;
  status: string;
}

export interface TMDBEpisodeResult {
  id: number;
  name: string;
  overview: string;
  air_date: string;
  episode_number: number;
  season_number: number;
}

export interface ScannerConfig {
  moviePaths: string[];
  seriesPaths: string[];
  fileExtensions: string[];
}
