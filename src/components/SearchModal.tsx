import React, { useState, useEffect, useRef, useCallback, memo, startTransition } from 'react';
import type { Movie } from '../types/movie';
import { movieboxService } from '../services/movieboxService';
import { isAdultContent, isAdultSearchTerm } from '../data/adultCatalog';
import { MovieCard } from './MovieCard';
import {
  Search,
  X,
  Loader2,
  Sparkles,
  TrendingUp,
  Compass,
  Film,
  ArrowLeft,
  ArrowUpRight,
  History,
  Clock,
} from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie: (movie: Movie) => void;
  initialMovies?: Movie[];
  isAdultMode?: boolean;
}

const POPULAR_TAGS = [
  'Bollywood',
  'Action',
  'Marvel',
  'Anime',
  'Horror',
  'Comedy',
  'Sci-Fi',
  'Web Series',
  'South Indian',
  'Romance',
  'Thriller',
  'Drama',
];

interface CachedSearchResult {
  movies: Movie[];
  relatedInfo: { query: string; isFallback: boolean } | null;
}

// In-memory LRU search cache for instant 0ms responses on repeated queries
const SEARCH_CACHE = new Map<string, CachedSearchResult>();
const MAX_CACHE_ENTRIES = 50;

function getCachedResult(query: string): CachedSearchResult | undefined {
  return SEARCH_CACHE.get(query.trim().toLowerCase());
}

function setCachedResult(query: string, data: CachedSearchResult) {
  const norm = query.trim().toLowerCase();
  if (SEARCH_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = SEARCH_CACHE.keys().next().value;
    if (oldestKey) SEARCH_CACHE.delete(oldestKey);
  }
  SEARCH_CACHE.set(norm, data);
}

export const SearchModal: React.FC<SearchModalProps> = memo(({
  isOpen,
  onClose,
  onSelectMovie,
  initialMovies = [],
  isAdultMode = false,
}) => {
  const [query, setQuery] = useState('');
  // Mode: 'idle' (blank) | 'suggestions' (typing, showing movie title suggestions only) | 'results' (user confirmed title, showing content cards)
  const [searchMode, setSearchMode] = useState<'idle' | 'suggestions' | 'results'>('idle');
  const [results, setResults] = useState<Movie[]>([]);
  const [relatedInfo, setRelatedInfo] = useState<{ query: string; isFallback: boolean } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>(() => initialMovies.slice(0, 12));
  const [loading, setLoading] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Filter helper: strips 18+ content in standard mode, passes everything in 18+ mode
  const filterAdult = useCallback((movies: Movie[]): Movie[] => {
    if (isAdultMode) return movies;
    return movies.filter((m) => !isAdultContent(m));
  }, [isAdultMode]);

  // Recent searches saved in localStorage
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cinevault_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSearchIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const saveRecentSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
      try {
        localStorage.setItem('cinevault_recent_searches', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('cinevault_recent_searches');
    } catch {}
  }, []);

  const displayRecentSearches = React.useMemo(() => {
    if (isAdultMode) return recentSearches;
    return recentSearches.filter((s) => !isAdultSearchTerm(s));
  }, [recentSearches, isAdultMode]);

  // Sync initialMovies if provided
  useEffect(() => {
    if (initialMovies.length > 0 && trendingMovies.length === 0) {
      setTrendingMovies(initialMovies.slice(0, 12));
    }
  }, [initialMovies, trendingMovies.length]);

  // Lock body scroll, focus input, load trending
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });

      if (trendingMovies.length === 0) {
        movieboxService.getTrending('all', 1, 12).then((movies) => {
          if (movies && movies.length > 0) {
            setTrendingMovies(filterAdult(movies));
          }
        });
      }
    } else {
      document.body.style.overflow = '';
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setQuery('');
      setSearchMode('idle');
      setResults([]);
      setRelatedInfo(null);
      setSuggestions([]);
    }
    return () => {
      document.body.style.overflow = '';
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isOpen, trendingMovies.length]);

  // Keyboard shortcut listener for Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch Suggestions exclusively while user is typing
  const fetchSuggestions = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    // On standard first page, immediately block any pornography/adult query suggestions
    if (!isAdultMode && isAdultSearchTerm(q)) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    const qLower = q.toLowerCase();

    // 1. Instant local suggestions from initial movies & popular topics
    const safeInitial = isAdultMode ? initialMovies : initialMovies.filter((m) => !isAdultContent(m));
    const safeTrending = isAdultMode ? trendingMovies : trendingMovies.filter((m) => !isAdultContent(m));

    const localMatches = safeInitial
      .filter((m) => m.title.toLowerCase().includes(qLower))
      .slice(0, 5)
      .map((m) => m.title);

    const trendingMatches = safeTrending
      .filter((m) => m.title.toLowerCase().includes(qLower))
      .slice(0, 4)
      .map((m) => m.title);

    const tagMatches = POPULAR_TAGS.filter((t) => t.toLowerCase().includes(qLower)).slice(0, 3);
    const instantSuggs = Array.from(new Set([...localMatches, ...trendingMatches, ...tagMatches]));
    const filteredInstant = isAdultMode ? instantSuggs : instantSuggs.filter((s) => !isAdultSearchTerm(s));

    if (filteredInstant.length > 0) {
      setSuggestions(filteredInstant);
    }

    setLoadingSuggestions(true);
    try {
      const serverSuggs = await movieboxService.getSuggestions(q);
      const combined = Array.from(new Set([...(serverSuggs || []), ...filteredInstant]));
      
      // CRITICAL: When isAdultMode === false, strictly eliminate all pornography & 18+ suggestions
      const finalSuggs = isAdultMode
        ? combined.slice(0, 10)
        : combined.filter((s) => !isAdultSearchTerm(s)).slice(0, 10);

      setSuggestions(finalSuggs);
    } catch {
      // Keep local suggestions on network error
    } finally {
      setLoadingSuggestions(false);
    }
  }, [initialMovies, trendingMovies, isAdultMode]);

  // Execute Full Search for Content (Only called when user confirms search / clicks a suggestion)
  const executeSearch = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q) return;

    // On standard first page, do not return pornography content
    if (!isAdultMode && isAdultSearchTerm(q)) {
      setResults([]);
      setRelatedInfo(null);
      setLoading(false);
      setSearchMode('results');
      return;
    }

    saveRecentSearch(q);
    setSearchMode('results');

    // 1. Instant cache check (still apply adult filter in case mode changed since caching)
    const cached = getCachedResult(q);
    if (cached) {
      setResults(filterAdult(cached.movies));
      setRelatedInfo(cached.relatedInfo);
      setLoading(false);
      return;
    }

    // 2. Abort prior search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const currentSearchId = ++activeSearchIdRef.current;
    setLoading(true);

    try {
      const movies = await movieboxService.searchMovies(q, 1, 24, signal);
      if (activeSearchIdRef.current !== currentSearchId || signal.aborted) return;

      if (movies.length > 0) {
        const filtered = filterAdult(movies);
        setResults(filtered);
        setRelatedInfo(null);
        setCachedResult(q, { movies: filtered, relatedInfo: null });
      } else {
        // Fallback: Related movies if no exact matches
        const related = await movieboxService.getRelatedMovies(q, suggestions, signal);
        if (activeSearchIdRef.current !== currentSearchId || signal.aborted) return;

        if (related.movies.length > 0) {
          const info = { query: related.relatedQuery, isFallback: true };
          const filtered = filterAdult(related.movies);
          setResults(filtered);
          setRelatedInfo(info);
          setCachedResult(q, { movies: filtered, relatedInfo: info });
        } else {
          setResults([]);
          setRelatedInfo(null);
          setCachedResult(q, { movies: [], relatedInfo: null });
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || signal.aborted) return;
      if (activeSearchIdRef.current === currentSearchId) {
        setResults([]);
        setRelatedInfo(null);
      }
    } finally {
      if (activeSearchIdRef.current === currentSearchId) {
        setLoading(false);
      }
    }
  }, [saveRecentSearch, suggestions]);

  // Handle typing in search input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val); // Keep input always synchronous for smooth typing

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    const q = val.trim();
    if (!q) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Batch non-urgent resets inside startTransition to not block keystroke
      startTransition(() => {
        setSearchMode('idle');
        setResults([]);
        setRelatedInfo(null);
        setSuggestions([]);
        setLoading(false);
      });
      return;
    }

    // As requested: When typing, enter 'suggestions' mode — do NOT show content cards yet!
    startTransition(() => {
      setSearchMode('suggestions');
    });

    // Debounced suggestion fetch (180ms for swift autocompletion without overloading)
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 180);
  };

  // User taps a movie title suggestion
  const handleSelectSuggestion = (selectedTitle: string) => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    setQuery(selectedTitle);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    executeSearch(selectedTitle);
  };

  // User taps a category tag or recent search
  const handleTagClick = (tag: string) => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    setQuery(tag);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    executeSearch(tag);
  };

  // User submits the search form via Enter / Virtual keyboard Search key
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    executeSearch(query);
  };

  const handleClose = () => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050A18] overflow-hidden animate-slide-in-bottom">
      {/* Top Search Header */}
      <div className="w-full border-b border-white/[0.08] bg-[#0B1224] px-3 sm:px-6 md:px-8 pt-safe pb-3 shrink-0 shadow-lg">
        <form onSubmit={handleFormSubmit} className="max-w-3xl mx-auto flex items-center gap-2 sm:gap-3 pt-2">
          {/* Back button */}
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-[#8D9AB5] hover:text-[#F5F7FF] hover:bg-[#16223D] active:bg-[#050A18] cursor-pointer transition-colors press-feedback touch-target-sm shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Search Input Box */}
          <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2 sm:py-2.5 rounded-xl bg-[#0E172B] border border-white/[0.1] focus-within:border-[#176BFF] focus-within:ring-2 focus-within:ring-[#176BFF]/25 transition-all min-h-[44px]">
            <Search className="w-4 h-4 text-[#35A7FF] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => {
                // Return to suggestions if user re-focuses while typing
                if (query.trim() && searchMode === 'results') {
                  setSearchMode('suggestions');
                }
              }}
              placeholder="Type movie or series name..."
              className="w-full bg-transparent text-[#F5F7FF] text-sm sm:text-base focus:outline-none placeholder-[#8D9AB5] font-medium"
              enterKeyHint="search"
            />

            {(loading || loadingSuggestions) && (
              <Loader2 className="w-4 h-4 text-[#35A7FF] animate-spin shrink-0" />
            )}

            {query && !loading && !loadingSuggestions && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSearchMode('idle');
                  setResults([]);
                  setRelatedInfo(null);
                  setSuggestions([]);
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-full text-[#8D9AB5] hover:text-[#F5F7FF] hover:bg-[#16223D] cursor-pointer transition-colors shrink-0"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Action Button */}
          <button
            type="submit"
            disabled={!query.trim()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#176BFF] to-[#35A7FF] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 text-white font-bold text-xs sm:text-sm cursor-pointer transition-all shadow-[0_2px_12px_rgba(23,107,255,0.4)] press-feedback min-h-[44px] shrink-0"
          >
            Search
          </button>
        </form>
      </div>

      {/* Main Content View */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
        {/* STAGE 1: SUGGESTIONS MODE (When user is typing: ONLY show movie name suggestions, NO content cards) */}
        {searchMode === 'suggestions' && query.trim() && (
          <div className="space-y-2 animate-fade-in max-w-2xl mx-auto">
            <div className="flex items-center justify-between px-2 pb-1 border-b border-white/[0.08] text-xs font-mono uppercase tracking-wider text-[#8D9AB5]">
              <span>Suggestions for "{query}"</span>
              <span className="text-[10px] text-[#35A7FF]">Tap to view content</span>
            </div>

            {/* Direct match search action */}
            <button
              type="button"
              onClick={() => executeSearch(query)}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-[#0E172B] hover:bg-[#16223D] active:bg-[#176BFF]/15 border border-white/[0.08] text-left transition-all cursor-pointer group shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#176BFF]/15 border border-[#35A7FF]/30 flex items-center justify-center text-[#35A7FF] shrink-0">
                  <Search className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="text-xs text-[#8D9AB5]">Search all titles for </span>
                  <span className="text-sm font-bold text-[#F5F7FF]">"{query}"</span>
                </div>
              </div>
              <span className="text-xs font-semibold text-[#35A7FF] flex items-center gap-1 shrink-0 group-hover:translate-x-0.5 transition-transform">
                <span>View</span>
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </button>

            {/* Movie Title Suggestions List */}
            {suggestions.length > 0 ? (
              <div className="bg-[#0E172B]/90 border border-white/[0.08] rounded-2xl overflow-hidden divide-y divide-white/[0.06] shadow-xl">
                {suggestions.map((title, idx) => (
                  <button
                    key={`${title}_${idx}`}
                    type="button"
                    onClick={() => handleSelectSuggestion(title)}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#16223D] active:bg-[#176BFF]/15 text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Film className="w-4 h-4 text-[#8D9AB5] group-hover:text-[#35A7FF] shrink-0 transition-colors" />
                      <span className="text-sm font-medium text-[#F5F7FF] group-hover:text-[#35A7FF] truncate transition-colors">
                        {title}
                      </span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#8D9AB5] group-hover:text-[#35A7FF] shrink-0 opacity-60 group-hover:opacity-100 transition-all" />
                  </button>
                ))}
              </div>
            ) : !loadingSuggestions ? (
              <div className="text-center py-8 text-[#8D9AB5] text-xs">
                Press Enter or tap "Search" above to find titles for "{query}"
              </div>
            ) : null}
          </div>
        )}

        {/* STAGE 2: RESULTS MODE (Visible ONLY after user confirms or taps a suggestion) */}
        {searchMode === 'results' && (
          <div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Loader2 className="w-8 h-8 text-[#35A7FF] animate-spin mb-3" />
                <p className="text-sm text-[#8D9AB5]">Searching titles for "{query}"...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="animate-fade-in">
                {relatedInfo?.isFallback && (
                  <div className="mb-4 sm:mb-6 p-3.5 sm:p-4 rounded-xl bg-[#176BFF]/10 border border-[#35A7FF]/30 flex items-center justify-between gap-3 text-xs sm:text-sm animate-fade-in">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Sparkles className="w-4 h-4 text-[#35A7FF] shrink-0" />
                      <span className="text-[#8D9AB5] truncate">
                        No direct match for "<span className="text-[#F5F7FF] font-semibold">{query}</span>". Showing related titles for{' '}
                        <span className="text-[#35A7FF] font-semibold">"{relatedInfo.query}"</span>:
                      </span>
                    </div>
                  </div>
                )}

                {/* Results count header & switch back to suggestions hint */}
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/[0.08]">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#8D9AB5]">
                    {results.length} {results.length === 1 ? 'title found' : 'titles found'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchMode('suggestions');
                      inputRef.current?.focus();
                    }}
                    className="text-xs text-[#35A7FF] hover:underline cursor-pointer"
                  >
                    Edit Search
                  </button>
                </div>

                {/* Content Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {results.map((movie) => (
                    <div key={movie.id} className="flex justify-center">
                      <MovieCard
                        movie={movie}
                        onSelect={(m) => {
                          onClose();
                          onSelectMovie(m);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* No results state */
              <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-[#0E172B] border border-white/[0.08] flex items-center justify-center mb-4">
                  <Film className="w-8 h-8 text-[#8D9AB5]" />
                </div>
                <p className="text-[#F5F7FF] text-base font-semibold font-headline">
                  No movies found for "<span className="text-[#35A7FF]">{query}</span>"
                </p>
                <p className="text-xs text-[#8D9AB5] mt-1.5 max-w-sm font-body">
                  Try one of our popular categories below or tap a suggestion
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-5 max-w-md">
                  {POPULAR_TAGS.slice(0, 6).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagClick(tag)}
                      className="px-3.5 py-1.5 rounded-full bg-[#0E172B] hover:bg-[#176BFF]/15 active:bg-[#176BFF]/25 border border-white/[0.08] hover:border-[#35A7FF]/40 text-xs text-[#8D9AB5] hover:text-[#35A7FF] cursor-pointer transition-colors press-feedback"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STAGE 0: IDLE MODE (When search query is empty) */}
        {searchMode === 'idle' && (
          <div className="space-y-6 sm:space-y-8 animate-fade-in">
            {/* Recent Searches (if available) */}
            {displayRecentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#35A7FF]" />
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#8D9AB5] font-mono">
                      Recent Searches
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={clearRecentSearches}
                    className="text-[11px] text-[#8D9AB5] hover:text-[#F5F7FF] cursor-pointer transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {displayRecentSearches.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleTagClick(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0E172B] hover:bg-[#16223D] active:bg-[#176BFF]/15 border border-white/[0.08] text-xs text-[#F5F7FF] hover:text-[#35A7FF] transition-colors cursor-pointer"
                    >
                      <Clock className="w-3 h-3 text-[#8D9AB5]" />
                      <span>{item}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Explore Categories */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Compass className="w-4 h-4 text-[#35A7FF]" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#8D9AB5] font-mono">
                  Popular Categories & Topics
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagClick(tag)}
                    className="px-3.5 py-2 rounded-full bg-[#0E172B] hover:bg-gradient-to-r hover:from-[#176BFF] hover:to-[#35A7FF] hover:text-white active:scale-95 border border-white/[0.08] hover:border-transparent text-xs font-semibold text-[#F5F7FF] shadow-sm hover:shadow-[0_2px_12px_rgba(23,107,255,0.45)] transition-all cursor-pointer press-feedback min-h-[36px]"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Trending on CineVault */}
            {trendingMovies.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-[#35A7FF]" />
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#8D9AB5] font-mono">
                    Trending Right Now
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {trendingMovies.map((movie) => (
                    <div key={movie.id} className="flex justify-center">
                      <MovieCard
                        movie={movie}
                        onSelect={(m) => {
                          onClose();
                          onSelectMovie(m);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

SearchModal.displayName = 'SearchModal';
