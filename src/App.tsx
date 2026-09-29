import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import type { Movie, HomeCatalogResponse } from './types/movie';
import { movieboxService } from './services/movieboxService';
import {
  Navbar,
  HeroBanner,
  MovieRow,
  ErrorBoundary,
  MovieRowSkeleton,
  HeroBillboardSkeleton,
  ProfileView,
  BottomNav,
  SplashScreen,
  DownloadsView,
  UpdateModal,
} from './components';
import { updateService, type UpdateInfo } from './services/updateService';
import { APP_VERSION, APP_BUILD_CODE } from './config/version';
import { Film } from 'lucide-react';
import { cacheService } from './services/cacheService';
import { AdultHomeView } from './components/AdultHomeView';
import { ADULT_HOME_CATALOG, isAdultContent } from './data/adultCatalog';
import { onesignalService } from './services/onesignalService';

import { SearchModal } from './components/SearchModal';
import type { UserProfile } from './components/ProfileView';

// Code-splitting for heavy modals, media player & Live TV to minimize initial bundle size and memory
const MovieDetailsModal = lazy(() => import('./components/MovieDetailsModal').then((m) => ({ default: m.MovieDetailsModal })));
const VideoPlayer = lazy(() => import('./components/VideoPlayer').then((m) => ({ default: m.VideoPlayer })));
const LiveTvView = lazy(() => import('./components/LiveTvView').then((m) => ({ default: m.LiveTvView })));

const DEFAULT_PROFILE: UserProfile = {
  name: 'Julian Vance',
  title: 'Patron of Cinema • Archive Fellow',
  memberId: '#CV-88292-2M',
  sinceYear: '2021',
};

export const App: React.FC = () => {
  // Splash Screen State
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // 18+ Vault Mode (Secretly toggled by clicking the logo at the top left)
  const [isAdultMode, setIsAdultMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cinevault_adult_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Instant 0ms Cold-Start: Hydrate immediately from stored cache if present
  const [catalog, setCatalog] = useState<HomeCatalogResponse | null>(() => {
    return movieboxService.getStoredHomeCatalog();
  });
  const [loading, setLoading] = useState<boolean>(() => {
    return !movieboxService.getStoredHomeCatalog();
  });
  const [activeView, setActiveViewRaw] = useState<'home' | 'livetv' | 'downloads' | 'profile'>('home');
  const mainRef = useRef<HTMLElement>(null);

  // Scroll to top + push history on view change
  const setActiveView = useCallback((view: typeof activeView) => {
    setActiveViewRaw((prev) => {
      if (prev !== view) {
        // Scroll main content to top
        mainRef.current?.scrollTo({ top: 0 });
        window.scrollTo({ top: 0 });
        // Push history entry for proper Android back navigation
        try {
          window.history.pushState({ view }, '', '');
        } catch {}
      }
      return view;
    });
  }, []);

  const toggleAdultMode = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate(12);
    setIsAdultMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cinevault_adult_mode', String(next));
      } catch {}
      return next;
    });
    setActiveView('home');
  }, [setActiveView]);
  const [isStartingPlay, setIsStartingPlay] = useState<boolean>(false);
  const [downloadCount, setDownloadCount] = useState<number>(() => {
    try {
      return cacheService.getDownloads().length;
    } catch {
      return 0;
    }
  });

  // Keep download count updated (15s interval — downloads are long operations, 15s is sufficient)
  useEffect(() => {
    const updateCount = () => {
      try {
        setDownloadCount(cacheService.getDownloads().length);
      } catch {}
    };
    updateCount();
    const interval = setInterval(updateCount, 15000);

    // Initialize OneSignal Push Notifications on device
    onesignalService.init().catch(() => {});

    return () => clearInterval(interval);
  }, []);

  // In-App Update State - instantly initialized from persistent cache if an update was detected
  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(() => {
    return updateService.getCachedPendingUpdate();
  });
  const [isMandatoryUpdate, setIsMandatoryUpdate] = useState<boolean>(() => {
    const cached = updateService.getCachedPendingUpdate();
    return Boolean(cached?.forceUpdate);
  });

  // Real-time remote update detection (Immediate startup + 20s background polling + Resume/Focus/Online triggers)
  useEffect(() => {
    let isMounted = true;

    const checkAppUpdate = async (force = false) => {
      try {
        const result = await updateService.checkForUpdate(force);
        if (isMounted) {
          if (result.hasUpdate && result.updateInfo) {
            setAvailableUpdate(result.updateInfo);
            setIsMandatoryUpdate(result.isMandatory);
            setShowSplash(false);
            if (result.isMandatory) {
              setPlayingMovie(null);
            }
          } else {
            // App is up to date, clear any stale cached update
            updateService.clearCachedUpdate();
            setAvailableUpdate(null);
          }
        }
      } catch (err) {
        console.warn('[CineVault] Remote update check:', err);
      }
    };

    // Expose global bridge for native onResume call
    (window as any).checkCineVaultUpdate = (force = true) => checkAppUpdate(force);

    // Initial check (bypassing cache for instant response)
    checkAppUpdate(true);

    // Periodic background update check every 2 minutes (120s) instead of aggressive 20s to conserve CPU & memory
    const pollInterval = setInterval(() => {
      checkAppUpdate(false);
    }, 120000);

    // Immediate check whenever user switches back to app / resumes / reconnects online
    const handleActiveResume = () => {
      if (document.visibilityState === 'visible') {
        checkAppUpdate(false);
      }
    };

    document.addEventListener('visibilitychange', handleActiveResume);
    window.addEventListener('focus', handleActiveResume);
    window.addEventListener('online', handleActiveResume);

    return () => {
      isMounted = false;
      delete (window as any).checkCineVaultUpdate;
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleActiveResume);
      window.removeEventListener('focus', handleActiveResume);
      window.removeEventListener('online', handleActiveResume);
    };
  }, []);

  // Pre-warm VideoPlayer & DetailsModal chunks during idle time (deferred to 4s to guarantee buttery 0ms cold-start)
  // (We do NOT preload LiveTvView on startup as it is 655KB and should only load on user navigation)
  useEffect(() => {
    const idlePreload = () => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          import('./components/MovieDetailsModal').catch(() => {});
          import('./components/VideoPlayer').catch(() => {});
        });
      } else {
        import('./components/MovieDetailsModal').catch(() => {});
        import('./components/VideoPlayer').catch(() => {});
      }
    };
    const timer = setTimeout(idlePreload, 4000);
    return () => clearTimeout(timer);
  }, []);

  // User Profile State (Persisted in localStorage)
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('cinevault_user_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PROFILE;
  });

  const handleUpdateProfile = useCallback((newProfile: UserProfile) => {
    setUserProfile(newProfile);
    try {
      localStorage.setItem('cinevault_user_profile', JSON.stringify(newProfile));
    } catch {}
  }, []);

  const userInitials = useMemo(() => {
    const parts = (userProfile.name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'CV';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [userProfile.name]);

  // Modal / Navigation States
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [playingMovie, setPlayingMovie] = useState<{
    movie: Movie;
    season?: number;
    episode?: number;
  } | null>(null);
  const [isPlayerMinimized, setIsPlayerMinimized] = useState<boolean>(false);

  // Watchlist (Stored in localStorage)
  const [watchlist, setWatchlist] = useState<Movie[]>(() => {
    try {
      const saved = localStorage.getItem('cinevault_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const watchlistIds = useMemo(() => {
    return new Set(watchlist.map((m) => m.id));
  }, [watchlist]);

  const toggleWatchlist = useCallback((movie: Movie) => {
    setWatchlist((prev) => {
      const exists = prev.some((m) => m.id === movie.id);
      const next = exists ? prev.filter((m) => m.id !== movie.id) : [movie, ...prev];
      try {
        localStorage.setItem('cinevault_watchlist', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Fetch MovieBox Home Catalog (Background refresh with smooth cache transition)
  useEffect(() => {
    let isMounted = true;

    movieboxService
      .getHomeCatalog()
      .then((data) => {
        if (isMounted && data) {
          setCatalog(data);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Safe catalog: filters out ALL adult/18+ content from main home page
  const safeCatalog = useMemo(() => {
    if (!catalog) return null;
    const safeFeatured = catalog.featured && !isAdultContent(catalog.featured) ? catalog.featured : null;
    const safeRows = catalog.rows
      .map((shelf) => ({
        ...shelf,
        items: shelf.items.filter((m) => !isAdultContent(m)),
      }))
      .filter((shelf) => shelf.items.length > 0);
    return { ...catalog, featured: safeFeatured, rows: safeRows };
  }, [catalog]);

  // Curate trending hero movies & series for the interactive swipeable top carousel
  const trendingHeroMovies = useMemo(() => {
    if (!safeCatalog) return [];
    const list: Movie[] = [];
    if (safeCatalog.featured) {
      list.push(safeCatalog.featured);
    }
    if (safeCatalog.rows && safeCatalog.rows.length > 0) {
      for (const shelf of safeCatalog.rows.slice(0, 3)) {
        for (const item of shelf.items.slice(0, 4)) {
          if (!list.some((m) => m.id === item.id) && (item.backdrop || item.poster)) {
            list.push(item);
          }
        }
      }
    }
    return list.slice(0, 8);
  }, [safeCatalog]);

  // Progressive Shelf Rendering for Low-End Devices:
  // Render top 6 shelves immediately (0ms first paint), then progressively reveal the rest in batches of 4
  const [renderedShelfCount, setRenderedShelfCount] = useState<number>(6);

  useEffect(() => {
    if (!safeCatalog?.rows || safeCatalog.rows.length <= 6) return;
    let timer: ReturnType<typeof setTimeout>;
    if (renderedShelfCount < safeCatalog.rows.length) {
      timer = setTimeout(() => {
        setRenderedShelfCount((prev) => Math.min(prev + 4, safeCatalog.rows.length));
      }, 50);
    }
    return () => clearTimeout(timer);
  }, [safeCatalog?.rows?.length, renderedShelfCount]);

  // Global Keyboard Shortcuts (Esc to close/minimize, Ctrl+K for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (isSearchOpen) {
          setIsSearchOpen(false);
        } else if (selectedMovie) {
          setSelectedMovie(null);
        } else if (playingMovie && !isPlayerMinimized) {
          setIsPlayerMinimized(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, selectedMovie, playingMovie, isPlayerMinimized]);

  // Android Hardware & Browser Back Button Handling
  useEffect(() => {
    const handlePopState = () => {
      if (playingMovie && !isPlayerMinimized) {
        setIsPlayerMinimized(true);
      } else if (isSearchOpen) {
        setIsSearchOpen(false);
      } else if (selectedMovie) {
        setSelectedMovie(null);
      } else if (playingMovie && isPlayerMinimized) {
        setPlayingMovie(null);
        setIsPlayerMinimized(false);
      } else if (activeView === 'livetv' || activeView === 'downloads' || activeView === 'profile') {
        setActiveView('home');
      }
    };

    const handleNativeBack = () => {
      if (isSearchOpen) {
        setIsSearchOpen(false);
        return true;
      }
      if (selectedMovie) {
        setSelectedMovie(null);
        return true;
      }
      if (playingMovie && !isPlayerMinimized) {
        setIsPlayerMinimized(true);
        return true;
      }
      if (playingMovie && isPlayerMinimized) {
        setPlayingMovie(null);
        setIsPlayerMinimized(false);
        return true;
      }
      if (activeView === 'livetv' || activeView === 'downloads' || activeView === 'profile') {
        setActiveView('home');
        return true;
      }
      return false;
    };

    (window as any).handleAndroidBackFallback = handleNativeBack;
    if (!(window as any).handleAndroidBack) {
      (window as any).handleAndroidBack = handleNativeBack;
    }

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if ((window as any).handleAndroidBack === handleNativeBack) {
        delete (window as any).handleAndroidBack;
      }
    };
  }, [playingMovie, isPlayerMinimized, isSearchOpen, selectedMovie, activeView]);

  // Handlers
  const handleOpenSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  const handleSelectMovie = useCallback((movie: Movie) => {
    setSelectedMovie(movie);
    // Pre-warm stream in background after modal renders so tap response is instantaneous
    if (movie?.id) {
      setTimeout(() => {
        movieboxService
          .getStreams(
            movie.id,
            movie.detailPath,
            movie.media_type,
            movie.media_type === 'tv' ? 1 : undefined,
            movie.media_type === 'tv' ? 1 : undefined,
            movie.title
          )
          .catch(() => {});
      }, 350);
    }
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedMovie(null);
  }, []);

  const handlePlayMovie = useCallback((movie: Movie, season?: number, episode?: number) => {
    if (availableUpdate) return; // Streaming blocked when update is required
    if (isStartingPlay) return;
    setIsStartingPlay(true);
    setSelectedMovie(null); // Close details modal when playback starts
    setPlayingMovie({ movie, season, episode });
    setIsPlayerMinimized(false);
    setTimeout(() => {
      setIsStartingPlay(false);
    }, 150);
  }, [availableUpdate, isStartingPlay]);

  const handleBackFromPlayer = useCallback(() => {
    setPlayingMovie(null);
    setIsPlayerMinimized(false);
  }, []);

  const handleMinimizePlayer = useCallback(() => {
    setIsPlayerMinimized(true);
  }, []);

  const handleRestorePlayer = useCallback(() => {
    setIsPlayerMinimized(false);
  }, []);

  const handleEpisodeChange = useCallback((s: number, ep: number) => {
    setPlayingMovie((prev) => (prev ? { ...prev, season: s, episode: ep } : null));
  }, []);

  const handleMovieChange = useCallback((m: Movie) => {
    setPlayingMovie((prev) => (prev ? { ...prev, movie: m } : null));
  }, []);

  // When an update is detected, directly show the update screen with zero delay (no home screen flash)
  if (availableUpdate) {
    const isMandatory = Boolean(isMandatoryUpdate || availableUpdate.forceUpdate || availableUpdate.mandatory);
    return (
      <ErrorBoundary>
        <UpdateModal
          updateInfo={availableUpdate}
          currentVersion={APP_VERSION}
          currentVersionCode={APP_BUILD_CODE}
          isMandatory={isMandatory}
          onClose={isMandatory ? undefined : () => setAvailableUpdate(null)}
          onLater={
            isMandatory
              ? undefined
              : () => {
                  updateService.dismissForSession(availableUpdate.latestVersionCode);
                  setAvailableUpdate(null);
                }
          }
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {/* Startup Splash Screen with Uncropped Logo */}
      {showSplash && (
        <SplashScreen
          onComplete={() => setShowSplash(false)}
          isReady={Boolean(catalog || !loading)}
        />
      )}

      <div className="min-h-screen bg-[#050A18] text-[#F5F7FF] flex flex-col">
        {/* Navigation Bar */}
        {!playingMovie || isPlayerMinimized ? (
          <Navbar
            onOpenSearch={handleOpenSearch}
            activeView={activeView}
            onNavigate={(view) => setActiveView(view)}
            userName={userProfile.name}
            userInitials={userInitials}
            isAdultMode={isAdultMode}
            onToggleAdultMode={toggleAdultMode}
          />
        ) : null}

        {/* Main Content Area */}
        <main
          ref={mainRef}
          className="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-12"
          style={playingMovie && !isPlayerMinimized ? { display: 'none' } : undefined}
        >
          {activeView === 'home' && (
            isAdultMode ? (
              <AdultHomeView
                onPlayMovie={handlePlayMovie}
                onSelectMovie={handleSelectMovie}
                onExitAdultMode={() => {
                  setIsAdultMode(false);
                  try {
                    localStorage.setItem('cinevault_adult_mode', 'false');
                  } catch {}
                }}
              />
            ) : (
              <div className="view-transition-enter">
                {/* Featured Hero Banner */}
                {loading ? (
                  <HeroBillboardSkeleton />
                ) : (
                  <HeroBanner
                    movies={trendingHeroMovies}
                    movie={safeCatalog?.featured || null}
                    onPlayMovie={(m) => handlePlayMovie(m)}
                    onSelectMovie={(m) => handleSelectMovie(m)}
                  />
                )}

                {/* Categorized Shelves (Progressively revealed) — adult content filtered out */}
                <div className="mt-4 sm:mt-6 space-y-2">
                  {loading ? (
                    <>
                      <MovieRowSkeleton count={6} />
                      <MovieRowSkeleton count={6} />
                      <MovieRowSkeleton count={6} />
                    </>
                  ) : safeCatalog?.rows && safeCatalog.rows.length > 0 ? (
                    safeCatalog.rows.slice(0, renderedShelfCount).map((shelf, idx) => (
                      <MovieRow
                        key={shelf.id}
                        shelf={shelf}
                        onSelectMovie={handleSelectMovie}
                        priorityRow={idx < 2}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                      <div className="w-16 h-16 rounded-2xl bg-[#0E172B] border border-white/[0.08] flex items-center justify-center mb-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
                        <Film className="w-8 h-8 text-[#8D9AB5]" />
                      </div>
                      <h3 className="text-lg font-bold text-[#F5F7FF] font-headline tracking-wide">No Content Available</h3>
                      <p className="text-sm text-[#8D9AB5] mt-2 max-w-xs leading-relaxed">
                        Unable to reach stream catalog. Check your connection and try again.
                      </p>
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white font-bold text-sm cursor-pointer press-feedback shadow-[0_4px_20px_rgba(23,107,255,0.45)] hover:shadow-[0_4px_28px_rgba(23,107,255,0.65)] transition-all min-h-[48px]"
                      >
                        Reload App
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {activeView === 'livetv' && (
            /* Dedicated Live TV Section - Auto-plays live streams with instant channel swapping */
            <div className="view-transition-enter">
              <Suspense
                fallback={
                  <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-10 h-10 rounded-full border-2 border-[#176BFF] border-t-transparent animate-spin mb-3" />
                    <p className="text-sm font-semibold text-[#35A7FF]">Connecting to Live TV Network...</p>
                  </div>
                }
              >
                <LiveTvView />
              </Suspense>
            </div>
          )}

          {activeView === 'downloads' && (
            /* Offline Downloads & Storage Vault */
            <div className="view-transition-enter">
              <DownloadsView
                onPlayMovie={handlePlayMovie}
                onExploreMovies={() => setActiveView('home')}
              />
            </div>
          )}

          {activeView === 'profile' && (
            /* VIP Patron Profile View */
            <div className="view-transition-enter">
              <ProfileView
                watchlist={watchlist}
                profile={userProfile}
                onUpdateProfile={handleUpdateProfile}
                onPlayMovie={(m) => handlePlayMovie(m)}
                onSelectMovie={handleSelectMovie}
                onRemoveFromWatchlist={toggleWatchlist}
                onNavigateHome={() => setActiveView('home')}
                onShowUpdateModal={(info) => {
                  setAvailableUpdate(info);
                  setIsMandatoryUpdate(false);
                }}
              />
            </div>
          )}
        </main>

        {/* Mobile Navigation Dock */}
        {!playingMovie || isPlayerMinimized ? (
          <BottomNav
            activeView={activeView}
            onNavigate={(v) => setActiveView(v)}
            onOpenSearch={handleOpenSearch}
            downloadCount={downloadCount}
          />
        ) : null}

        {/* Search Modal (Instant zero-lag render with pre-loaded initial catalog) */}
        {isSearchOpen && (
          <SearchModal
            isOpen={isSearchOpen}
            onClose={handleCloseSearch}
            onSelectMovie={handleSelectMovie}
            isAdultMode={isAdultMode}
            initialMovies={
              isAdultMode
                ? (ADULT_HOME_CATALOG.rows[0]?.items || [])
                : (safeCatalog?.rows?.[0]?.items || [])
            }
          />
        )}

        {/* Movie Details Modal */}
        {selectedMovie && (
          <Suspense fallback={null}>
            <MovieDetailsModal
              movie={selectedMovie}
              onClose={handleCloseDetails}
              onPlay={handlePlayMovie}
              isWatchlisted={watchlistIds.has(selectedMovie.id)}
              onToggleWatchlist={toggleWatchlist}
            />
          </Suspense>
        )}

        {/* Video Player Modal/Screen & Floating Mini-Player */}
        {playingMovie && (
          <Suspense fallback={null}>
            <VideoPlayer
              movie={playingMovie.movie}
              season={playingMovie.season}
              episode={playingMovie.episode}
              isMinimized={isPlayerMinimized}
              onMinimize={handleMinimizePlayer}
              onRestore={handleRestorePlayer}
              onBack={handleBackFromPlayer}
              onEpisodeChange={handleEpisodeChange}
              onMovieChange={handleMovieChange}
            />
          </Suspense>
        )}


      </div>
    </ErrorBoundary>
  );
};

export default App;
