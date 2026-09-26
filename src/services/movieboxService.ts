/**
 * CineVault MovieBox Direct Service
 * High-speed, lightweight client connecting to MovieBox endpoints.
 * Includes in-memory TTL caching, request deduplication, and zero-preloading stream resolution.
 */

import type { Movie, MovieShelf, HomeCatalogResponse, StreamResponse, StreamQuality, Season } from '../types/movie';

// Endpoint obfuscation: prevents plaintext domain and endpoint scraping in compiled production bundles
const _b64 = (s: string) => atob(s);
const MOVIEBOX_API_BASE = _b64('aHR0cHM6Ly9oNS1hcGkuYW9uZXJvb20uY29t');
const MOVIEBOX_DOMAIN = _b64('aHR0cHM6Ly9temZpLm1l');
const MOVIEBOX_ORIGIN = _b64('aHR0cHM6Ly9oNS5hb25lcm9vbS5jb20=');
const MOVIEBOX_IMG_HOST = _b64('aHR0cHM6Ly9tb3ZpZWJveC5waA==');

// In-memory TTL Cache
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data as T;
  }
  return null;
}

function setCached<T>(key: string, data: T, ttlMs: number = 300000) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function extractMediaUrl(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '[object Object]') return null;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('/')) return `${MOVIEBOX_IMG_HOST}${trimmed}`;
    return trimmed;
  }
  if (Array.isArray(val) && val.length > 0) {
    return extractMediaUrl(val[0]);
  }
  if (typeof val === 'object') {
    return extractMediaUrl(val.url || val.src || val.image || val.path || val.file || val.poster || val.cover || val.stills);
  }
  return null;
}

export function isTrailerOrClip(text?: string): boolean {
  if (!text) return false;
  return /\b(trailer|teaser|preview|clip|promo|featurette|behind[- ]the[- ]scenes|sample|extra)\b/i.test(text);
}

export function areTitlesSimilar(t1: string, t2: string): boolean {
  if (!t1 || !t2) return false;
  const clean1 = t1.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const clean2 = t2.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean1 === clean2 || clean1.includes(clean2) || clean2.includes(clean1)) return true;
  const words1 = clean1.split(' ').filter((w) => w.length > 2);
  const words2 = new Set(clean2.split(' ').filter((w) => w.length > 2));
  if (words1.length === 0 || words2.size === 0) return false;
  let matches = 0;
  for (const w of words1) {
    if (words2.has(w)) matches++;
  }
  return matches / Math.min(words1.length, words2.size) >= 0.5;
}

export class MovieBoxService {
  /**
   * Helper to execute requests across Web, Proxy, and Android Bridge
   */
  private async request(path: string, options: { method?: string; body?: any; timeoutMs?: number; signal?: AbortSignal } = {}): Promise<any> {
    const { method = 'GET', body, timeoutMs = 5000, signal } = options;

    if (signal?.aborted) return null;

    // 1. If running inside Android WebView with Native Device Bridge
    if (typeof window !== 'undefined' && (window as any).AndroidDevice?.fetchMovieBox) {
      try {
        const fullUrl = path.startsWith('http') ? path : `${MOVIEBOX_API_BASE}${path}`;
        const dev = (window as any).AndroidDevice;
        const resStr = dev.fetchMovieBox(fullUrl, body ? JSON.stringify(body) : '');
        if (resStr && !resStr.startsWith('{"error"')) {
          return JSON.parse(resStr);
        }
      } catch {
        // Fallback to fetch
      }
    }

    // 2. Determine URL: Prefer Vite dev proxy / local server if available, otherwise direct
    const headers: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'Origin': MOVIEBOX_ORIGIN,
      'Referer': `${MOVIEBOX_ORIGIN}/`,
    };

    let targetUrl = path;
    if (!path.startsWith('http') && !path.startsWith('/api')) {
      // Use Vite proxy prefix or direct
      targetUrl = `/api/moviebox${path}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const onAbort = () => controller.abort();
    if (signal) signal.addEventListener('abort', onAbort);

    try {
      let res = await fetch(targetUrl, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      // If proxied request failed and it wasn't direct, try direct API
      if (!res.ok && targetUrl.startsWith('/api/moviebox')) {
        const directUrl = `${MOVIEBOX_API_BASE}${path}`;
        res = await fetch(directUrl, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
      }

      if (!res.ok) return null;
      return await res.json();
    } catch {
      if (signal?.aborted) return null;
      // If error (e.g. CORS or abort), try direct endpoint if we haven't already
      if (targetUrl.startsWith('/api/moviebox')) {
        try {
          const directUrl = `${MOVIEBOX_API_BASE}${path}`;
          const directRes = await fetch(directUrl, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(timeoutMs),
          });
          if (directRes.ok) return await directRes.json();
        } catch {}
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onAbort);
    }
  }

  /**
   * Format raw MovieBox subject item into clean Movie model
   */
  formatMovie(raw: any): Movie {
    const subId = String(raw.subjectId || raw.id || '');
    const title = String(raw.title || raw.postTitle || 'Untitled');
    const detailPath = String(raw.detailPath || raw.detail_path || subId);

    const subType = raw.subjectType;
    const rawSeasonsList = raw.resource?.seasons || raw.seasons || [];
    const hasMultipleEpisodes = rawSeasonsList.some((s: any) => (s.maxEp || s.episode_count || 1) > 1) || rawSeasonsList.length > 1;
    // MovieBox: subjectType 1 = Movie, 2 = TV Series, 7 = Anime/Mini-Series
    const isTv = subType === 2 || subType === 7 || (subType !== 1 && hasMultipleEpisodes);

    const relDate = String(raw.releaseDate || raw.release_date || '');
    const yearMatch = relDate.match(/\b(19\d\d|20\d\d)\b/);
    const release_year = yearMatch ? parseInt(yearMatch[1], 10) : (raw.releaseYear || 2024);
    const rating = parseFloat(raw.imdbRatingValue || raw.rating || 7.8);

    const fallbackPoster = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80';
    const fallbackBackdrop = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80';

    const poster =
      extractMediaUrl(raw.posterUrl) ||
      extractMediaUrl(raw.poster_url) ||
      extractMediaUrl(raw.cover) ||
      extractMediaUrl(raw.poster) ||
      extractMediaUrl(raw.pic) ||
      fallbackPoster;

    const backdrop =
      extractMediaUrl(raw.backdropUrl) ||
      extractMediaUrl(raw.backdrop_url) ||
      extractMediaUrl(raw.backdrop) ||
      extractMediaUrl(raw.stills) ||
      extractMediaUrl(raw.banner) ||
      (poster !== fallbackPoster ? poster : fallbackBackdrop);

    const trailer_url = raw.trailer?.videoAddress?.url || raw.trailerUrl || raw.trailer_url || '';

    let genres: string[] = [];
    if (typeof raw.genre === 'string') {
      genres = raw.genre.split(',').map((g: string) => g.trim()).filter(Boolean);
    } else if (Array.isArray(raw.genres)) {
      genres = raw.genres;
    } else {
      genres = ['Cinema'];
    }

    const cleanTitle = title.replace(/moviebox/gi, 'CineVault');
    const rawOverview = raw.overview || raw.description || `Watch ${cleanTitle} online directly on CineVault with high-speed HD streaming.`;
    const cleanOverview = rawOverview.replace(/moviebox/gi, 'CineVault');

    const hasResource = raw.hasResource !== false;
    const isComingSoon = raw.hasResource === false || Boolean(raw.appointmentDate) || Boolean(raw.appointmentCnt && raw.appointmentCnt > 0);

    return {
      id: subId,
      title: cleanTitle,
      detailPath,
      overview: cleanOverview,
      poster,
      backdrop,
      release_year,
      rating,
      genres,
      duration: isTv ? 'TV Series' : (raw.duration || '2h 10m'),
      media_type: isTv ? 'series' : 'movie',
      trailer_url,
      has_resource: hasResource,
      is_coming_soon: isComingSoon,
      seasons: isTv
        ? rawSeasonsList.map((s: any) => {
            const sNum = s.se || s.season || s.season_number || 1;
            const maxEp = s.maxEp || s.episode_count || 1;
            return {
              season_number: sNum,
              name: s.name || `Season ${sNum}`,
              episode_count: maxEp,
              episodes: Array.from({ length: maxEp }, (_, i) => ({
                episode_number: i + 1,
                title: `Episode ${i + 1}`,
                overview: '',
              })),
            };
          })
        : [],
      cast: raw.cast || [],
    };
  }

  /**
   * Instant Cold-Start: Retrieve cached home catalog from localStorage
   */
  getStoredHomeCatalog(): HomeCatalogResponse | null {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('cinevault_home_catalog');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.rows && parsed.rows.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return null;
  }

  /**
   * Fetch Home Catalog (Featured Hero & Categorized Shelves)
   * Backed by 12-hour persistent localStorage cache to prevent repeated content re-downloading and conserve mobile data.
   */
  async getHomeCatalog(): Promise<HomeCatalogResponse> {
    const cacheKey = 'home_catalog';
    const cached = getCached<HomeCatalogResponse>(cacheKey);
    if (cached) return cached;

    const stored = this.getStoredHomeCatalog();
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    // Fast return: if stored catalog is available, return it immediately so app enters in 0ms!
    // If offline or cache is younger than 4 hours, no background refetch needed.
    let isRecent = false;
    try {
      const ts = parseInt(localStorage.getItem('cinevault_home_catalog_ts') || '0', 10);
      if (ts > 0 && Date.now() - ts < 4 * 60 * 60 * 1000 && stored && stored.rows && stored.rows.length >= 6) {
        isRecent = true;
      }
    } catch {}

    if (stored && (isOffline || isRecent)) {
      setCached(cacheKey, stored, 600000);
      return stored;
    }

    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey)!;
    }

    const fetchPromise = (async (): Promise<HomeCatalogResponse> => {
      // 1. Direct MovieBox H5 API call with snappy 3500ms timeout
      const res = await this.request('/wefeed-h5api-bff/home', { timeoutMs: 3500 });
      const homeData = res?.data || {};
      const operatingList = homeData.operatingList || [];

      const rows: MovieShelf[] = [];
      let featured: Movie | null = null;

      const badgeMap: Record<string, string> = {
        'trending': 'TRENDING',
        'cinema': 'CINEMA',
        'bollywood': 'BOLLYWOOD',
        'south indian': 'SOUTH INDIA',
        'hollywood': 'HOLLYWOOD',
        'series': 'SERIES',
        'anime': 'ANIME',
        'k-drama': 'K-DRAMA',
        'western': 'WESTERN',
        'short tv': 'SHORT TV',
        'free': 'FREE',
      };

      for (let i = 0; i < operatingList.length; i++) {
        const op = operatingList[i];
        const rawTitle = op.title || `Category ${i + 1}`;
        const subjects = op.subjectList || op.subjects || [];
        if (!subjects.length) continue;

        const lowerTitle = rawTitle.toLowerCase();
        // Remove empty, administrative, or external promo banners
        if (
          lowerTitle.includes('update') ||
          lowerTitle.includes('join us') ||
          lowerTitle.includes('telegram') ||
          lowerTitle.includes('whatsapp') ||
          lowerTitle.includes('football live') ||
          lowerTitle.includes('in banner') ||
          lowerTitle === 'banner' ||
          lowerTitle === 'categories'
        ) {
          continue;
        }

        const isComingSoon = lowerTitle.includes('coming soon');

        let badge = 'POPULAR';
        for (const [k, v] of Object.entries(badgeMap)) {
          if (lowerTitle.includes(k)) {
            badge = v;
            break;
          }
        }
        if (isComingSoon) badge = 'COMING SOON';

        // NOTE: Scope deduplication strictly PER SHELF so popular Bollywood, South Indian, Cinema,
        // and Hollywood titles are NOT eliminated from their genre categories!
        const shelfSeenIds = new Set<string>();
        const items: Movie[] = [];
        for (const s of subjects) {
          const m = this.formatMovie(s);
          if (isComingSoon) {
            m.is_coming_soon = true;
          }
          if (m.id && !shelfSeenIds.has(m.id)) {
            shelfSeenIds.add(m.id);
            items.push(m);
          }
        }

        if (items.length > 0) {
          if (!featured && items[0].backdrop && !isComingSoon && (lowerTitle.includes('trending') || lowerTitle.includes('cinema') || lowerTitle.includes('bollywood'))) {
            featured = items[0];
          }
          let cleanRowTitle = rawTitle.replace(/moviebox/gi, 'CineVault');
          if (lowerTitle.includes('hot short tv')) cleanRowTitle = '🔥 Trending Short TV';
          else if (lowerTitle.includes('free now')) cleanRowTitle = '🆓 Free Blockbusters';
          else if (lowerTitle.includes('coming soon')) cleanRowTitle = '⏳ Coming Soon';
          else if (lowerTitle.includes('cinema')) cleanRowTitle = '🎬 Cinema Hits';

          rows.push({
            id: `shelf_${i}`,
            title: cleanRowTitle,
            subtitle: `Curated ${cleanRowTitle}`,
            badge,
            items,
          });
        }
      }

      // If no featured found yet, take the first movie with a good backdrop
      if (!featured && rows.length > 0 && rows[0].items.length > 0) {
        featured = rows[0].items[0];
      }

      // 2. Resilient Fast Fallback: If /home payload dropped or empty, fetch trending in parallel
      if (rows.length === 0) {
        try {
          const [trendingAll, trendingMovies, trendingTv] = await Promise.all([
            this.getTrending('all', 1, 24),
            this.getTrending('movie', 1, 24),
            this.getTrending('series', 1, 24),
          ]);
          if (trendingAll.length > 0) {
            featured = trendingAll[0];
            rows.push({
              id: 'shelf_trending',
              title: '🔥 Trending on CineVault',
              subtitle: 'Top rated movies streaming live',
              badge: 'TRENDING',
              items: trendingAll,
            });
          }
          if (trendingMovies.length > 0) {
            rows.push({
              id: 'shelf_movies',
              title: '🎬 Feature Blockbusters',
              subtitle: 'Curated 4K master titles',
              badge: 'CINEMA',
              items: trendingMovies,
            });
          }
          if (trendingTv.length > 0) {
            rows.push({
              id: 'shelf_series',
              title: '📺 Archival TV & Series',
              subtitle: 'Binge-worthy premium series',
              badge: 'SERIES',
              items: trendingTv,
            });
          }
        } catch {}
      }

      // If network fetch failed to get any rows, gracefully fallback to previously stored catalog
      if (rows.length === 0 && stored) {
        setCached(cacheKey, stored, 600000);
        return stored;
      }

      const allUniqueIds = new Set<string>();
      rows.forEach((r) => r.items.forEach((it) => { if (it.id) allUniqueIds.add(it.id); }));

      const result: HomeCatalogResponse = {
        featured,
        rows,
        total_titles: allUniqueIds.size,
      };

      if (typeof window !== 'undefined' && rows.length > 0) {
        try {
          localStorage.setItem('cinevault_home_catalog', JSON.stringify(result));
          localStorage.setItem('cinevault_home_catalog_ts', String(Date.now()));
        } catch {}
      }

      setCached(cacheKey, result, 600000);
      return result;
    })();

    inFlightRequests.set(cacheKey, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  }

  /**
   * Fetch Trending Movies/Shows (Direct H5 API)
   */
  async getTrending(mediaType: string = 'all', page: number = 1, perPage: number = 24, signal?: AbortSignal): Promise<Movie[]> {
    const cacheKey = `trending_${mediaType}_${page}_${perPage}`;
    const cached = getCached<Movie[]>(cacheKey);
    if (cached) return cached;

    const res = await this.request(`/wefeed-h5api-bff/subject/trending?page=${page}&perPage=${perPage}`, { timeoutMs: 5000, signal });
    const list = res?.data?.subjectList || [];
    const movies = list.map((item: any) => this.formatMovie(item));
    const filtered = mediaType === 'all' ? movies : movies.filter((m: Movie) => m.media_type === mediaType);

    setCached(cacheKey, filtered, 300000);
    return filtered;
  }

  /**
   * Real-time search MovieBox (Optimized for instant mobile & web responses with request cancellation)
   */
  async searchMovies(query: string, page: number = 1, size: number = 24, signal?: AbortSignal): Promise<Movie[]> {
    const q = query.trim();
    if (!q || signal?.aborted) return [];

    const cacheKey = `search_${q.toLowerCase()}_${page}_${size}`;
    const cached = getCached<Movie[]>(cacheKey);
    if (cached) return cached;

    // Direct H5 search via Android Bridge or proxied API
    const body = {
      keyword: q,
      page,
      perPage: size,
      subjectType: 0,
    };

    const res = await this.request('/wefeed-h5api-bff/subject/search', {
      method: 'POST',
      body,
      timeoutMs: 4000,
      signal,
    });

    const items = res?.data?.items || res?.data?.list || [];
    const movies = items.map((item: any) => this.formatMovie(item));

    if (movies.length > 0) {
      setCached(cacheKey, movies, 180000);
    }
    return movies;
  }

  /**
   * Search alias
   */
  async search(query: string, page: number = 1, size: number = 24, signal?: AbortSignal): Promise<Movie[]> {
    return this.searchMovies(query, page, size, signal);
  }

  /**
   * Search suggestions / autocomplete with cancellation
   */
  async getSuggestions(query: string, signal?: AbortSignal): Promise<string[]> {
    const q = query.trim();
    if (!q || signal?.aborted) return [];

    const cacheKey = `sugg_${q.toLowerCase()}`;
    const cached = getCached<string[]>(cacheKey);
    if (cached) return cached;

    // Direct H5 search-suggest
    const res = await this.request('/wefeed-h5api-bff/subject/search-suggest', {
      method: 'POST',
      body: { keyword: q, perPage: 8 },
      timeoutMs: 2500,
      signal,
    });

    const items = res?.data?.items || [];
    const suggestions = items.map((i: any) => i.word).filter(Boolean);

    if (suggestions.length > 0) {
      setCached(cacheKey, suggestions, 120000);
    }
    return suggestions;
  }

  /**
   * Fetch related movies when search query yields 0 direct results
   */
  async getRelatedMovies(query: string, suggestions: string[] = [], signal?: AbortSignal): Promise<{ relatedQuery: string; movies: Movie[] }> {
    const q = query.trim();
    if (!q || signal?.aborted) return { relatedQuery: '', movies: [] };

    // 1. If suggestions exist, check only the top 1 suggestion with signal
    for (const sugg of suggestions.slice(0, 1)) {
      if (sugg.toLowerCase() !== q.toLowerCase()) {
        try {
          const suggResults = await this.searchMovies(sugg, 1, 8, signal);
          if (suggResults.length > 0) {
            return { relatedQuery: sugg, movies: suggResults };
          }
        } catch {}
      }
    }

    if (signal?.aborted) return { relatedQuery: '', movies: [] };

    // 2. Fallback: Return top trending titles as recommendations
    try {
      const trending = await this.getTrending('all', 1, 8, signal);
      return { relatedQuery: 'Trending Now', movies: trending };
    } catch {
      return { relatedQuery: '', movies: [] };
    }
  }


  /**
   * Fetch complete Movie Details (Seasons, Episodes, Cast, Full Synopsis)
   * Backed by persistent localStorage cache so each title's metadata & episodes are fetched only once.
   */
  async getDetails(id: string, detailPath?: string): Promise<Partial<Movie>> {
    const cacheKey = `details_${id}_${detailPath || ''}`;
    const cached = getCached<Partial<Movie>>(cacheKey);
    if (cached) return cached;

    // 1. Check persistent localStorage cache
    const storageKey = `cinevault_detail_${id}`;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.title || parsed.overview || (parsed.seasons && parsed.seasons.length > 0))) {
            setCached(cacheKey, parsed, 86400000); // 24h RAM cache
            return parsed;
          }
        }
      } catch {}
    }

    // If offline, don't attempt network fetch
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {};
    }

    // 2. Direct MovieBox H5 detail API
    try {
      const pathParam = detailPath || id;
      const isNumeric = /^\d+$/.test(pathParam);
      const queryParam = isNumeric ? `subjectId=${encodeURIComponent(pathParam)}` : `detailPath=${encodeURIComponent(pathParam)}`;
      const res = await this.request(`/wefeed-h5api-bff/detail?${queryParam}`);
      const subject = res?.data?.subject;
      if (subject) {
        const rawSeasons = res?.data?.resource?.seasons || res?.data?.seasons || [];
        const rawEpisodes = res?.data?.resource?.episodes || res?.data?.episodes || [];

        // Determine if this is truly a TV series or a feature movie
        // MovieBox: subjectType 1 = Movie, 2 = TV Series, 7 = Anime/Mini-Series
        const hasMultipleEpisodes = rawSeasons.some((s: any) => (s.maxEp || s.episode_count || 1) > 1) || rawSeasons.length > 1;
        const isSubjectTv = subject.subjectType === 2 || subject.subjectType === 7 || (subject.subjectType !== 1 && hasMultipleEpisodes);

        let seasons: Season[] = [];
        if (isSubjectTv) {
          seasons = rawSeasons.map((s: any) => {
            const sNum = s.se || s.season || s.season_number || 1;
            const maxEp = s.maxEp || s.episode_count || (rawEpisodes.filter((ep: any) => (ep.se || 1) === sNum).length) || 1;
            const sEps = (rawEpisodes || []).filter((ep: any) => (ep.se || 1) === sNum);
            const episodes = sEps.length > 0
              ? sEps.map((ep: any) => ({
                  episode_number: ep.ep || ep.episode || 1,
                  title: ep.title || `Episode ${ep.ep || ep.episode || 1}`,
                  overview: ep.description || '',
                  thumbnail: ep.cover?.url || subject.cover?.url,
                }))
              : Array.from({ length: maxEp }, (_, idx) => ({
                  episode_number: idx + 1,
                  title: `Episode ${idx + 1}`,
                  overview: '',
                  thumbnail: subject.cover?.url,
                }));

            return {
              season_number: sNum,
              name: s.name || `Season ${sNum}`,
              episode_count: maxEp,
              episodes,
            };
          });

          // Fallback for TV series if API returned no seasons array but subjectType === 2
          if (seasons.length === 0 && subject.subjectType === 2) {
            const fallbackCount = subject.episodeCount || 10;
            seasons = [{
              season_number: 1,
              name: 'Season 1',
              episode_count: fallbackCount,
              episodes: Array.from({ length: fallbackCount }, (_, idx) => ({
                episode_number: idx + 1,
                title: `Episode ${idx + 1}`,
                overview: '',
                thumbnail: subject.cover?.url,
              })),
            }];
          }
        }

        const resolvedSlug = subject.detailPath || (!isNumeric ? pathParam : '');
        const details: Partial<Movie> = {
          id: String(subject.subjectId || id),
          title: subject.title,
          detailPath: resolvedSlug || pathParam,
          overview: subject.description,
          poster: subject.cover?.url,
          backdrop: subject.stills?.url || subject.cover?.url,
          rating: parseFloat(subject.imdbRatingValue || subject.rating || 7.8),
          release_year: subject.releaseDate ? parseInt(subject.releaseDate, 10) : 2024,
          genres: subject.genre ? subject.genre.split(',').map((g: string) => g.trim()) : [],
          seasons,
          media_type: isSubjectTv ? 'series' : 'movie',
        };

        // Persist to localStorage to save user data on subsequent views
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(storageKey, JSON.stringify(details));
          } catch {}
        }

        setCached(cacheKey, details, 86400000);
        return details;
      }
    } catch {}

    return {};
  }

  /**
   * Fetch Stream URLs (Direct CDN MP4 Streams)
   */
  private cachedMzfiToken = '';
  private mzfiTokenExpiry = 0;

  async getMzfiToken(): Promise<string> {
    if (this.cachedMzfiToken && Date.now() < this.mzfiTokenExpiry) {
      return this.cachedMzfiToken;
    }
    // 1. Android Native Bridge fetch
    if (typeof window !== 'undefined' && (window as any).AndroidDevice?.fetchMovieBox) {
      try {
        const str = (window as any).AndroidDevice.fetchMovieBox(`${MOVIEBOX_DOMAIN}/wefeed-h5api-bff/subject/trending?page=1&perPage=1`, '');
        if (str && !str.startsWith('{"error"')) {
          const parsed = JSON.parse(str);
          const token = parsed._token || parsed.token || '';
          if (token) {
            this.cachedMzfiToken = token;
            this.mzfiTokenExpiry = Date.now() + 3600000;
            return token;
          }
        }
      } catch {}
    }
    // 2. Web fallback fetch
    try {
      const res = await fetch('/api/mzfi/wefeed-h5api-bff/subject/trending?page=1&perPage=1', {
        headers: {
          Origin: MOVIEBOX_DOMAIN,
          Referer: `${MOVIEBOX_DOMAIN}/`,
        },
      });
      const token = res.headers.get('token');
      const xUser = res.headers.get('x-user');
      let resolved = token || '';
      if (!resolved && xUser) {
        try {
          const parsed = JSON.parse(xUser);
          if (parsed.token) resolved = parsed.token;
        } catch {}
      }
      if (resolved) {
        this.cachedMzfiToken = resolved;
        this.mzfiTokenExpiry = Date.now() + 3600000;
        return resolved;
      }
    } catch {}
    return '';
  }

  /**
   * Determine startup quality: Defaults to lowest available quality (e.g. 360p or lowest resolution)
   * to guarantee instant, 0ms startup without initial buffering.
   * Users can manually select higher qualities (480p, 720p, 1080p) from controls.
   */
  getOptimalStartupQuality(qualities: StreamQuality[]): StreamQuality {
    if (!qualities || qualities.length === 0) {
      return { quality: 'Auto', resolution: 'Auto', url: '' };
    }

    // Sort by resolution ascending (lowest first: 360p -> 480p -> 720p -> 1080p)
    const sorted = [...qualities].sort((a, b) => {
      const resA = parseInt(String(a.resolution || a.quality).replace(/\D/g, ''), 10) || 720;
      const resB = parseInt(String(b.resolution || b.quality).replace(/\D/g, ''), 10) || 720;
      return resA - resB;
    });

    return sorted[0];
  }

  /**
   * Fetch Stream URLs (Direct CDN MP4 Streams)
   * ONLY INVOKED WHEN THE USER PRESSES "PLAY". Zero preloading!
   * Includes session-level caching & in-flight request deduplication.
   */
  async getStreams(
    id: string,
    detailPath: string,
    mediaType: string = 'movie',
    season: number = 1,
    episode: number = 1,
    title: string = '',
    forceRefresh: boolean = false
  ): Promise<StreamResponse> {
    const isTv = mediaType === 'series' || mediaType === 'tv';
    const reqSe = isTv ? Math.max(1, season) : 0;
    const reqEp = isTv ? Math.max(1, episode) : 0;

    // Cache key checked FIRST before any bridge or network calls
    const streamCacheKey = `mb_stream_${id}_${isTv ? 'tv' : 'movie'}_${reqSe}_${reqEp}`;
    if (!forceRefresh) {
      const cachedStream = getCached<StreamResponse>(streamCacheKey);
      if (cachedStream && cachedStream.streamUrl) return cachedStream;
    } else {
      inFlightRequests.delete(streamCacheKey);
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(`cache_${streamCacheKey}`);
          localStorage.removeItem(`cache_${streamCacheKey}`);
        }
      } catch {}
    }

    // In-flight deduplication: prevent duplicate concurrent requests for the same stream
    if (!forceRefresh && inFlightRequests.has(streamCacheKey)) {
      return await inFlightRequests.get(streamCacheKey);
    }

    const fetchPromise = (async () => {
      let resolvedPath = detailPath;

      // Fast resolve detailPath slug synchronously from localStorage/cache (0ms delay)
      if (!resolvedPath || /^\d+$/.test(resolvedPath)) {
        if (typeof window !== 'undefined') {
          try {
            const saved = localStorage.getItem(`cinevault_detail_${id}`);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed?.detailPath && !/^\d+$/.test(parsed.detailPath)) {
                resolvedPath = parsed.detailPath;
              }
            }
          } catch {}
        }
      }
      if (!resolvedPath) resolvedPath = id;

      const defaultWebPlayer = `${MOVIEBOX_DOMAIN}/spa/videoPlayPage/movies/${resolvedPath}?id=${id}&type=/movie/detail&detailSe=${reqSe}&detailEp=${reqEp}&lang=en`;

      // 1. Android Native Bridge with non-blocking async callback (Zero UI freeze, instant 60fps playback transition)
      const androidDevice = typeof window !== 'undefined' ? (window as any).AndroidDevice : null;
      if (androidDevice && (androidDevice.getMovieBoxStreamsAsync || androidDevice.getMovieBoxStreams)) {
        try {
          let resStr: string | null = null;

          if (typeof androidDevice.getMovieBoxStreamsAsync === 'function') {
            const cbId = `stream_${id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const asyncPromise = new Promise<string | null>((resolve) => {
              if (!(window as any).__cineVaultStreamCallbacks) {
                (window as any).__cineVaultStreamCallbacks = {};
              }
              (window as any).__cineVaultStreamCallbacks[cbId] = resolve;

              (window as any).resolveCineVaultStream = (callbackId: string, resultJson: string) => {
                const cb = (window as any).__cineVaultStreamCallbacks?.[callbackId];
                if (cb) {
                  delete (window as any).__cineVaultStreamCallbacks[callbackId];
                  cb(resultJson);
                }
              };

              try {
                androidDevice.getMovieBoxStreamsAsync(
                  id,
                  resolvedPath,
                  isTv ? 'tv' : 'movie',
                  season,
                  episode,
                  title,
                  cbId
                );
              } catch {
                delete (window as any).__cineVaultStreamCallbacks[cbId];
                resolve(null);
              }
            });

            const timeoutGuard = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000));
            resStr = await Promise.race([asyncPromise, timeoutGuard]);
          } else {
            // Fallback for older interface: yield execution micro-tick before synchronous call
            await new Promise((r) => setTimeout(r, 16));
            resStr = androidDevice.getMovieBoxStreams(
              id,
              resolvedPath,
              isTv ? 'tv' : 'movie',
              season,
              episode,
              title
            );
          }

          if (resStr && !resStr.startsWith('{"error"')) {
            const parsed = JSON.parse(resStr);
            if (parsed.success && Array.isArray(parsed.streams) && parsed.streams.length > 0) {
                const wrapAndroidProxyUrl = (urlStr: string): string => {
                  if (!urlStr) return '';
                  if (typeof window !== 'undefined' && (window as any).AndroidDevice?.getProxyVideoUrl) {
                    try {
                      return (window as any).AndroidDevice.getProxyVideoUrl(urlStr);
                    } catch {}
                  }
                  return urlStr;
                };

                const qualities: StreamQuality[] = parsed.streams.map((s: any) => ({
                  quality: s.quality || `${s.resolution || 720}p`,
                  resolution: s.resolution || `${s.resolutions || 720}p`,
                  url: wrapAndroidProxyUrl(s.url),
                  size_mb: s.size_mb,
                  isHls: typeof s.url === 'string' && s.url.includes('.m3u8'),
                }));

                const optimalQuality = this.getOptimalStartupQuality(qualities);
                const result: StreamResponse = {
                  streamUrl: optimalQuality.url,
                  qualities,
                  webPlayerUrl: parsed.webPlayerUrl || defaultWebPlayer,
                  isDirect: true,
                };

                setCached(streamCacheKey, result, 3600000);
                return result;
            }
          }
        } catch (err) {
          console.warn('Android native getMovieBoxStreams error:', err);
        }
      }

      // 2. Direct MovieBox H5 API with retry and token refresh
      const attempts = isTv
        ? (reqSe > 1 || reqEp > 1 ? [[reqSe, reqEp], [reqSe, 0], [1, 1], [0, 0]] : [[1, 1], [0, 0]])
        : [[0, 0], [1, 1]];
      const isAndroid = typeof window !== 'undefined' && Boolean((window as any).AndroidDevice);
      const pathCandidates = resolvedPath && resolvedPath !== id ? [resolvedPath, id] : [resolvedPath || id];

      for (let attemptRound = 0; attemptRound < 2; attemptRound++) {
        for (const curPath of pathCandidates) {
          for (const [attSe, attEp] of attempts) {
            try {
              const apiPath = `/wefeed-h5api-bff/subject/play?subjectId=${id}&se=${attSe}&ep=${attEp}&detailPath=${curPath}&streamSignType=0`;
              const playUrl = isAndroid ? `${MOVIEBOX_DOMAIN}${apiPath}` : `/api/mzfi${apiPath}`;
              let resJson: any = null;

              if (isAndroid && (window as any).AndroidDevice?.fetchMovieBox) {
                const resStr = (window as any).AndroidDevice.fetchMovieBox(playUrl, '');
                if (resStr && !resStr.startsWith('{"error"')) {
                  resJson = JSON.parse(resStr);
                }
              }

              if (!resJson || !resJson.data?.streams?.length) {
                let token = attemptRound > 0 ? '' : await this.getMzfiToken();
                if (!token || attemptRound > 0) {
                  this.cachedMzfiToken = '';
                  this.mzfiTokenExpiry = 0;
                  token = await this.getMzfiToken();
                }
                const reqHeaders: Record<string, string> = {
                  'Origin': MOVIEBOX_DOMAIN,
                  'Referer': `${MOVIEBOX_DOMAIN}/spa/videoPlayPage/movies/${curPath}?id=${id}&type=/movie/detail&detailSe=${attSe}&detailEp=${attEp}&lang=en`,
                };
                if (token) reqHeaders['token'] = token;

                const res = await fetch(playUrl, {
                  headers: reqHeaders,
                  signal: AbortSignal.timeout(6000),
                });
                if (res.ok) {
                  resJson = await res.json();
                }
              }

              const rawStreams = resJson?.data?.streams || [];
              if (Array.isArray(rawStreams) && rawStreams.length > 0) {
                const qualities: StreamQuality[] = rawStreams.map((s: any) => {
                  const rawUrl = s.url;
                  const playUrl = isAndroid
                    ? ((typeof window !== 'undefined' && (window as any).AndroidDevice?.getProxyVideoUrl)
                        ? (window as any).AndroidDevice.getProxyVideoUrl(rawUrl)
                        : rawUrl)
                    : `/api/proxy_video?url=${encodeURIComponent(rawUrl)}`;
                  return {
                    quality: `${s.resolutions || 720}p`,
                    resolution: `${s.resolutions || 720}p`,
                    url: playUrl,
                    size_mb: s.size ? Math.round(s.size / (1024 * 1024)) : undefined,
                    isHls: typeof playUrl === 'string' && playUrl.includes('.m3u8'),
                  };
                });

                const optimalQuality = this.getOptimalStartupQuality(qualities);
                const result: StreamResponse = {
                  streamUrl: optimalQuality.url,
                  qualities,
                  webPlayerUrl: defaultWebPlayer,
                  isDirect: true,
                };
                setCached(streamCacheKey, result, 3600000);
                return result;
              }
            } catch {}
          }
        }
        // If not found in first round, force-clear token and retry second round
        this.cachedMzfiToken = '';
        this.mzfiTokenExpiry = 0;
      }

      // 4. Sibling Auto-Discovery Fallback: If this specific subject/card has 0 streams,
      // search MovieBox for alternative releases/uploads of the EXACT SAME movie (strictly no trailers/clips)
      const searchTarget = (title || resolvedPath.replace(/-\w+$/, '').replace(/-/g, ' ')).replace(/\[.*?\]|\(.*?\)/g, '').trim();
      if (searchTarget && !isTrailerOrClip(searchTarget)) {
        try {
          const candidates = await this.searchMovies(searchTarget, 1, 4);
          for (const cand of candidates) {
            if (cand.id && cand.id !== id) {
              // Strictly reject trailers, teasers, and clips
              if (isTrailerOrClip(cand.title) || isTrailerOrClip(cand.detailPath)) {
                continue;
              }
              // Verify candidate title similarity to avoid wrong movie playback
              if (!areTitlesSimilar(searchTarget, cand.title)) {
                continue;
              }
              const candStream = await this.getStreams(cand.id, cand.detailPath, cand.media_type, season, episode, cand.title || searchTarget);
              if (candStream.qualities && candStream.qualities.length > 0 && candStream.streamUrl) {
                setCached(streamCacheKey, candStream, 3600000);
                return candStream;
              }
            }
          }
        } catch {}
      }

      // 5. Official Trailer Fallback: If no direct stream is available anywhere (e.g. unreleased title in Coming Soon),
      // provide official HD trailer so user can preview without seeing an error notice!
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem(`cinevault_detail_${id}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.trailer_url) {
              const trailerRes: StreamResponse = {
                streamUrl: parsed.trailer_url,
                qualities: [{ quality: 'Trailer HD', resolution: 'Trailer', url: parsed.trailer_url }],
                webPlayerUrl: defaultWebPlayer,
                isDirect: true,
                isTrailer: true,
              };
              return trailerRes;
            }
          }
        } catch {}
      }

      // 6. Clean empty response if no streams available anywhere
      return {
        streamUrl: '',
        qualities: [],
        webPlayerUrl: defaultWebPlayer,
        isDirect: false,
      };
    })();

    inFlightRequests.set(streamCacheKey, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      inFlightRequests.delete(streamCacheKey);
    }
  }

  /**
   * Refreshes streams by clearing stale CDN tokens and re-fetching fresh signed URLs.
   * Directly called on video playback errors / reconnect retries to eliminate "Playback Notice".
   */
  async refreshStreams(
    id: string,
    detailPath: string,
    mediaType: string = 'movie',
    season: number = 1,
    episode: number = 1,
    title: string = ''
  ): Promise<StreamResponse> {
    const isTv = mediaType === 'series' || mediaType === 'tv';
    const reqSe = isTv ? Math.max(1, season) : 0;
    const reqEp = isTv ? Math.max(1, episode) : 0;
    const streamCacheKey = `mb_stream_${id}_${isTv ? 'tv' : 'movie'}_${reqSe}_${reqEp}`;

    // Clear JavaScript in-memory cache
    inFlightRequests.delete(streamCacheKey);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(`cache_${streamCacheKey}`);
        localStorage.removeItem(`cache_${streamCacheKey}`);
      }
    } catch {}

    // Clear Android native stream cache if available
    try {
      if (typeof window !== 'undefined' && (window as any).AndroidDevice?.clearStreamCache) {
        (window as any).AndroidDevice.clearStreamCache(id);
      }
    } catch {}

    return this.getStreams(id, detailPath, mediaType, season, episode, title, true);
  }

  /**
   * Helper: extract clean base title without language tags, season tags, or punctuation
   */
  getBaseTitle(title: string): string {
    return (title || '')
      .replace(/\[.*?\]|\(.*?\)/g, '')
      .replace(/S\d+.*$/i, '')
      .replace(/Season\s*\d+.*$/i, '')
      .replace(/[-:_|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Helper: detect language from title and detailPath
   */
  detectLanguage(title: string, detailPath: string = ''): string {
    const combined = `${title} ${detailPath}`.toLowerCase();
    if (/\[hindi\]|hindi/i.test(combined)) return 'Hindi';
    if (/\[tamil\]|tamil/i.test(combined)) return 'Tamil';
    if (/\[telugu\]|telugu/i.test(combined)) return 'Telugu';
    if (/\[korean\]|korean/i.test(combined)) return 'Korean';
    if (/\[spanish\]|español|espanol/i.test(combined)) return 'Spanish';
    return 'English / Original';
  }

  /**
   * Discover available language variants for a given movie/series
   * e.g. Hindi, English / Original, Tamil, Telugu
   */
  async getLanguageVariants(movie: Movie): Promise<{ language: string; movie: Movie }[]> {
    if (!movie || !movie.title) return [];

    const rawTitle = movie.title || '';
    const currentLang = this.detectLanguage(rawTitle, movie.detailPath);

    const variants: { language: string; movie: Movie }[] = [
      { language: currentLang, movie }
    ];

    const baseTitle = this.getBaseTitle(rawTitle);
    if (!baseTitle || baseTitle.length < 2) return variants;

    try {
      // Parallel targeted searches for Original, Hindi, Tamil, Telugu
      const searchQueries = [
        baseTitle,
        `${baseTitle} Hindi`,
        `${baseTitle} Tamil`,
        `${baseTitle} Telugu`,
      ];

      const searchPromises = searchQueries.map((q) =>
        this.searchMovies(q, 1, 6).catch(() => [] as Movie[])
      );

      const results = await Promise.all(searchPromises);
      const allCandidates = results.flat();
      const cleanBase = baseTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

      for (const cand of allCandidates) {
        if (!cand.id || cand.id === movie.id || isTrailerOrClip(cand.title)) continue;
        const candBase = this.getBaseTitle(cand.title).toLowerCase().replace(/[^a-z0-9]/g, '');

        // Ensure candidate belongs to the same title franchise/show
        if (candBase === cleanBase || candBase.includes(cleanBase) || cleanBase.includes(candBase)) {
          const candLang = this.detectLanguage(cand.title, cand.detailPath);
          if (!variants.some((v) => v.language === candLang)) {
            variants.push({ language: candLang, movie: cand });
          }
        }
      }
    } catch {}

    return variants;
  }

  /**
   * Find a specific language variant on demand
   * e.g. targetLang = 'Hindi', 'Tamil', 'Telugu', 'English / Original'
   */
  async findLanguageVariant(movie: Movie, targetLang: string, season?: number): Promise<Movie | null> {
    if (!movie || !movie.title) return null;
    const currentLang = this.detectLanguage(movie.title, movie.detailPath);
    if (currentLang === targetLang) return movie;

    const baseTitle = this.getBaseTitle(movie.title);
    if (!baseTitle) return null;

    const cacheKey = `lang_var_${movie.id}_${targetLang}_${season || 1}`;
    const cached = getCached<Movie>(cacheKey);
    if (cached) return cached;

    try {
      const isTargetEnglish = targetLang.toLowerCase().includes('english') || targetLang.toLowerCase().includes('original');
      const searchQuery = isTargetEnglish ? baseTitle : `${baseTitle} ${targetLang}`;
      const candidates = await this.searchMovies(searchQuery, 1, 8);
      const cleanBase = baseTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

      const matched = candidates.filter((cand) => {
        if (!cand.id || isTrailerOrClip(cand.title)) return false;
        const candBase = this.getBaseTitle(cand.title).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (candBase !== cleanBase && !candBase.includes(cleanBase) && !cleanBase.includes(candBase)) {
          return false;
        }
        const candLang = this.detectLanguage(cand.title, cand.detailPath);
        return candLang === targetLang;
      });

      if (matched.length > 0) {
        if (season) {
          const seasonMatch = matched.find((cand) => {
            const titleLower = cand.title.toLowerCase();
            return (
              titleLower.includes(`s${season}`) ||
              titleLower.includes(`season ${season}`) ||
              titleLower.includes(`s0${season}`)
            );
          });
          if (seasonMatch) {
            setCached(cacheKey, seasonMatch, 86400000);
            return seasonMatch;
          }
        }

        const best = matched[0];
        setCached(cacheKey, best, 86400000);
        return best;
      }
    } catch {}

    return null;
  }

  /**
   * Return Hindi version of movie if available, otherwise original
   * Backed by in-memory cache for 0ms overhead
   */
  async getOptimalLanguageMovie(movie: Movie): Promise<Movie> {
    if (!movie || !movie.id) return movie;
    const raw = (movie.title || '') + ' ' + (movie.detailPath || '');
    if (/\[Hindi\]|hindi/i.test(raw)) {
      return movie;
    }

    const cacheKey = `optimal_lang_${movie.id}`;
    const cached = getCached<Movie>(cacheKey);
    if (cached) return cached;

    try {
      const variants = await this.getLanguageVariants(movie);
      const hindiVariant = variants.find((v) => v.language === 'Hindi');
      if (hindiVariant?.movie) {
        setCached(cacheKey, hindiVariant.movie, 86400000);
        return hindiVariant.movie;
      }
    } catch {}

    setCached(cacheKey, movie, 86400000);
    return movie;
  }
}

export const movieboxService = new MovieBoxService();

export function getStoredHomeCatalog(): HomeCatalogResponse | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('cinevault_home_catalog');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.rows && parsed.rows.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return null;
}
