export interface Episode {
  episode_number: number;
  title: string;
  overview?: string;
  thumbnail?: string;
}

export interface Season {
  season_number: number;
  name: string;
  episode_count: number;
  episodes: Episode[];
}

export interface CastMember {
  name: string;
  character?: string;
  avatar?: string;
}

export interface Movie {
  id: string;
  title: string;
  detailPath: string;
  overview: string;
  poster: string;
  backdrop: string;
  release_year: number;
  releaseDate?: string;
  rating: number;
  genres: string[];
  duration?: string;
  media_type: 'movie' | 'tv' | 'series';
  trailer_url?: string;
  streamUrl?: string;
  has_resource?: boolean;
  is_coming_soon?: boolean;
  seasons?: Season[];
  cast?: (string | CastMember)[];
}

export interface MovieShelf {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  items: Movie[];
}

export interface HomeCatalogResponse {
  featured: Movie | null;
  rows: MovieShelf[];
  total_titles: number;
}

export interface StreamQuality {
  quality: string;
  resolution: string;
  url: string;
  size_mb?: number;
  isHls?: boolean;
}

export interface CaptionTrack {
  id: string;
  language: string;
  label: string;
  url?: string;
  format?: 'vtt' | 'srt' | 'ass';
  isDefault?: boolean;
}

export interface StreamResponse {
  streamUrl: string;
  qualities: StreamQuality[];
  webPlayerUrl: string;
  isDirect: boolean;
  isTrailer?: boolean;
  captions?: CaptionTrack[];
}

export interface DownloadItem {
  id: string;
  movieId: string;
  title: string;
  poster: string;
  backdrop?: string;
  detailPath: string;
  mediaType: 'movie' | 'tv' | 'series';
  season?: number;
  episode?: number;
  quality: string;
  streamUrl: string;
  localPath?: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';
  progress: number; // 0 - 100
  downloadedBytes?: number;
  totalBytes?: number;
  createdAt: number;
  nativeDownloadId?: number;
  movie: Movie;
  sizeFormatted?: string;
}

export interface CachedMovie {
  movie: Movie;
  lastWatchedAt: number;
  lastSeason?: number;
  lastEpisode?: number;
  progressSeconds: number;
  durationSeconds: number;
  progressPercent: number;
  streamUrl?: string;
  timestamp?: number;
  season?: number;
  episode?: number;
  savedPosition?: number;
  duration?: number;
}

