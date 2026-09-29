import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import type { Movie, StreamResponse, Season } from '../types/movie';
import { movieboxService } from '../services/movieboxService';
import { cacheService } from '../services/cacheService';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Maximize2,
  ChevronDown,
  Sliders,
  RotateCcw,
  RotateCw,
  Loader2,
  AlertCircle,
  Check,
  X,
  Gauge,
  ListOrdered,
  Languages,
  SkipForward,
  Sun,
  SunMedium,
  SunDim,
  Volume1,
  Scan,
  Lock,
  Unlock,
} from 'lucide-react';

// Format Time (hh:mm:ss or mm:ss)
const formatTime = (secs: number) => {
  if (isNaN(secs) || secs < 0) return '00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

interface PlaybackProgressProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  triggerShowControls: () => void;
  commitSeek: (target: number) => void;
}

export const PlaybackProgress: React.FC<PlaybackProgressProps> = memo(({
  videoRef,
  triggerShowControls,
  commitSeek,
}) => {
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [bufferedPercent, setBufferedPercent] = useState<number>(0);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const isScrubbingRef = useRef<boolean>(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let lastSec = -1;

    const onTimeUpdate = () => {
      if (isScrubbingRef.current) return;
      const cur = video.currentTime;
      const curSec = Math.floor(cur);
      if (curSec !== lastSec) {
        lastSec = curSec;
        setCurrentTime(cur);
      }
    };

    const onDuration = () => {
      if (video.duration && !isNaN(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
    };

    const onProgress = () => {
      const buf = video.buffered;
      if (buf.length > 0 && video.duration > 0) {
        let relevantEnd = buf.end(buf.length - 1);
        for (let i = 0; i < buf.length; i++) {
          if (video.currentTime >= buf.start(i) && video.currentTime <= buf.end(i)) {
            relevantEnd = buf.end(i);
            break;
          }
        }
        const newPct = (relevantEnd / video.duration) * 100;
        setBufferedPercent((prev) => (Math.abs(newPct - prev) >= 2 ? newPct : prev));
      }
    };

    video.addEventListener('timeupdate', onTimeUpdate, { passive: true });
    video.addEventListener('loadedmetadata', onDuration, { passive: true });
    video.addEventListener('durationchange', onDuration, { passive: true });
    video.addEventListener('progress', onProgress, { passive: true });
    video.addEventListener('seeked', onTimeUpdate, { passive: true });

    if (video.duration) setDuration(video.duration);
    if (video.currentTime) setCurrentTime(video.currentTime);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onDuration);
      video.removeEventListener('durationchange', onDuration);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('seeked', onTimeUpdate);
    };
  }, [videoRef]);

  const activeTime = scrubTime !== null ? scrubTime : currentTime;
  const progressPercent = duration > 0 ? (activeTime / duration) * 100 : 0;

  const handlePointerDown = () => {
    isScrubbingRef.current = true;
    triggerShowControls();
  };

  const handleSeekChange = (val: number) => {
    setScrubTime(val);
    triggerShowControls();
  };

  const handlePointerUp = (val: number) => {
    isScrubbingRef.current = false;
    setScrubTime(null);
    setCurrentTime(val);
    commitSeek(val);
  };

  return (
    <div className="relative w-full h-8 flex items-center select-none cursor-pointer">
      <div className="relative w-full h-1.5 sm:h-2 bg-white/20 rounded-full overflow-hidden pointer-events-none">
        {/* Buffered Lookahead Bar */}
        <div
          className="absolute h-full bg-white/35 rounded-full"
          style={{ width: `${bufferedPercent}%` }}
        />
        {/* Active Progress Bar */}
        <div
          className="absolute h-full bg-gradient-to-r from-[#176BFF] to-[#35A7FF] rounded-full shadow-[0_0_8px_rgba(53,167,255,0.6)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Native Scrub Range Input */}
      <input
        type="range"
        min={0}
        max={duration || 100}
        step={0.1}
        value={activeTime}
        onPointerDown={handlePointerDown}
        onChange={(e) => handleSeekChange(parseFloat(e.target.value))}
        onPointerUp={(e) => handlePointerUp(parseFloat(e.currentTarget.value))}
        onPointerCancel={() => {
          isScrubbingRef.current = false;
          setScrubTime(null);
          commitSeek(videoRef.current?.currentTime || 0);
        }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 touch-none"
      />
    </div>
  );
});

PlaybackProgress.displayName = 'PlaybackProgress';

interface PlaybackTimeProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export const PlaybackTime: React.FC<PlaybackTimeProps> = memo(({ videoRef }) => {
  const [time, setTime] = useState({ current: 0, duration: 0 });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let lastSec = -1;

    const onUpdate = () => {
      const cur = Math.floor(video.currentTime);
      const dur = Math.floor(video.duration || 0);
      if (cur !== lastSec || dur !== Math.floor(time.duration)) {
        lastSec = cur;
        setTime({ current: video.currentTime, duration: video.duration || 0 });
      }
    };

    video.addEventListener('timeupdate', onUpdate, { passive: true });
    video.addEventListener('loadedmetadata', onUpdate, { passive: true });
    video.addEventListener('durationchange', onUpdate, { passive: true });
    video.addEventListener('seeked', onUpdate, { passive: true });

    onUpdate();

    return () => {
      video.removeEventListener('timeupdate', onUpdate);
      video.removeEventListener('loadedmetadata', onUpdate);
      video.removeEventListener('durationchange', onUpdate);
      video.removeEventListener('seeked', onUpdate);
    };
  }, [videoRef]);

  return (
    <span className="font-mono text-[11px] sm:text-xs text-gray-300 select-none">
      {formatTime(time.current)} / {formatTime(time.duration)}
    </span>
  );
});

PlaybackTime.displayName = 'PlaybackTime';

export const MiniPlaybackProgress: React.FC<{ videoRef: React.RefObject<HTMLVideoElement | null> }> = memo(({ videoRef }) => {
  const [percent, setPercent] = useState<number>(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let lastSec = -1;

    const onUpdate = () => {
      const cur = Math.floor(video.currentTime);
      if (cur !== lastSec && video.duration > 0) {
        lastSec = cur;
        setPercent((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener('timeupdate', onUpdate, { passive: true });
    video.addEventListener('loadedmetadata', onUpdate, { passive: true });
    onUpdate();

    return () => {
      video.removeEventListener('timeupdate', onUpdate);
      video.removeEventListener('loadedmetadata', onUpdate);
    };
  }, [videoRef]);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/[0.08] overflow-hidden">
      <div className="h-full bg-gradient-to-r from-[#176BFF] to-[#35A7FF] shadow-[0_0_8px_rgba(53,167,255,0.6)] transition-all" style={{ width: `${percent}%` }} />
    </div>
  );
});

MiniPlaybackProgress.displayName = 'MiniPlaybackProgress';

interface VideoPlayerProps {
  movie: Movie;
  season?: number;
  episode?: number;
  isMinimized?: boolean;
  onMinimize?: () => void;
  onRestore?: () => void;
  onBack: () => void;
  onEpisodeChange?: (season: number, episode: number) => void;
  onMovieChange?: (movie: Movie) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = memo(({
  movie,
  season = 1,
  episode = 1,
  isMinimized = false,
  onMinimize,
  onRestore,
  onBack,
  onEpisodeChange,
  onMovieChange,
}) => {
  // Movie and Language Switching State
  const [currentMovie, setCurrentMovie] = useState<Movie>(movie);
  const [languageVariants, setLanguageVariants] = useState<{ language: string; movie: Movie }[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState<boolean>(false);
  const [isSwitchingLanguage, setIsSwitchingLanguage] = useState<boolean>(false);
  const hasUserSelectedLanguageRef = useRef<boolean>(false);

  // Prop trackers to prevent internal state (season/episode/language) from being reverted by React renders
  const prevPropMovieIdRef = useRef<string>(movie.id);
  const prevPropSeasonRef = useRef<number>(season);
  const prevPropEpisodeRef = useRef<number>(episode);

  // Episode & Series Navigation State
  const [currentSeason, setCurrentSeason] = useState<number>(season);
  const [currentEpisode, setCurrentEpisode] = useState<number>(episode);
  const [allSeasons, setAllSeasons] = useState<Season[]>(movie.seasons || []);
  const [browsingSeason, setBrowsingSeason] = useState<number>(season);
  const [isEpisodesMenuOpen, setIsEpisodesMenuOpen] = useState<boolean>(false);

  // Stream & Playback State
  const [streamInfo, setStreamInfo] = useState<StreamResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [selectedQuality, setSelectedQuality] = useState<string>(() => {
    try {
      return localStorage.getItem('cinevault_preferred_quality') || 'Auto';
    } catch {
      return 'Auto';
    }
  });
  const [isQualityMenuOpen, setIsQualityMenuOpen] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  // Screen Brightness, Fit Mode & Gesture Navigation State
  const [brightness, setBrightness] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cinevault_player_brightness');
      return saved ? Math.max(0.1, Math.min(1.0, parseFloat(saved))) : 1.0;
    } catch {
      return 1.0;
    }
  });
  const [fitMode, setFitMode] = useState<'contain' | 'cover' | 'fill'>(() => {
    try {
      const saved = localStorage.getItem('cinevault_player_fit');
      if (saved === 'contain' || saved === 'cover' || saved === 'fill') return saved;
      return 'cover';
    } catch {
      return 'cover';
    }
  });
  const [activeGesture, setActiveGesture] = useState<'brightness' | 'volume' | null>(null);
  const [gestureValue, setGestureValue] = useState<number>(100);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [showUnlockPrompt, setShowUnlockPrompt] = useState<boolean>(false);
  const unlockPromptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Core Refs for Atomic Playback & Seeking Lifecycle
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const wasPlayingBeforeSeekRef = useRef<boolean>(false);
  const isSeekingRef = useRef<boolean>(false);
  const pendingSeekTimeRef = useRef<number | null>(null);
  const seekWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSkipTargetRef = useRef<number | null>(null);
  const autoRetryCountRef = useRef<number>(0);
  const lastSecondRef = useRef<number>(-1);
  const savedPositionRef = useRef<number>(0);
  const resolvedSessionRef = useRef<string>('');
  const waitingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamStartTimeRef = useRef<number>(Date.now());
  const touchStartPosRef = useRef<{
    startX: number;
    startY: number;
    side: 'left' | 'right' | 'center';
    initialVal: number;
    hasMoved: boolean;
  } | null>(null);
  const lastTapRef = useRef<number>(0);

  const isTv = useMemo(() => {
    if (currentMovie.media_type === 'movie') return false;
    if (currentMovie.media_type === 'series' || currentMovie.media_type === 'tv') return true;
    if (allSeasons && allSeasons.length > 1) return true;
    if (currentMovie.seasons && currentMovie.seasons.length > 1) return true;
    const firstSeason = (allSeasons && allSeasons[0]) || (currentMovie.seasons && currentMovie.seasons[0]);
    if (firstSeason && ((firstSeason.episode_count && firstSeason.episode_count > 1) || (firstSeason.episodes && firstSeason.episodes.length > 1))) {
      return true;
    }
    return false;
  }, [currentMovie.media_type, currentMovie.seasons, allSeasons]);

  // Sync props only if movie, season or episode changes from outside
  useEffect(() => {
    if (movie.id && movie.id !== prevPropMovieIdRef.current) {
      prevPropMovieIdRef.current = movie.id;
      setCurrentMovie(movie);
      hasUserSelectedLanguageRef.current = false;
      setSelectedLanguage(movieboxService.detectLanguage(movie.title, movie.detailPath));
      setLanguageVariants([]);
      if (movie.seasons && movie.seasons.length > 0) {
        setAllSeasons(movie.seasons);
      }
    }
  }, [movie]);

  useEffect(() => {
    if (season !== prevPropSeasonRef.current) {
      prevPropSeasonRef.current = season;
      setCurrentSeason(season);
      setBrowsingSeason(season);
    }
    if (episode !== prevPropEpisodeRef.current) {
      prevPropEpisodeRef.current = episode;
      setCurrentEpisode(episode);
    }
  }, [season, episode]);

  // Load complete Seasons & Episodes metadata — DEFERRED by 2s to prioritize instant stream playback
  useEffect(() => {
    let isMounted = true;
    const isOfflineTitle = Boolean(
      currentMovie.streamUrl?.includes('local_media') ||
      currentMovie.streamUrl?.includes('127.0.0.1') ||
      currentMovie.streamUrl?.startsWith('blob:') ||
      currentMovie.streamUrl?.startsWith('file:') ||
      (typeof navigator !== 'undefined' && !navigator.onLine)
    );
    if (isOfflineTitle) return;

    // Defer metadata fetch to not compete with stream resolution for CPU/network (deferred to 6s)
    const deferTimer = setTimeout(() => {
      if (!isMounted || !currentMovie.id) return;
      movieboxService.getDetails(currentMovie.id, currentMovie.detailPath).then((d) => {
        if (!isMounted || !d) return;
        if (d.seasons && d.seasons.length > 0) {
          setAllSeasons(d.seasons);
          setBrowsingSeason((prev) => {
            const exists = d.seasons?.some((s) => s.season_number === prev);
            return exists ? prev : (d.seasons?.[0]?.season_number || 1);
          });
        }
        if (d.media_type && d.media_type !== currentMovie.media_type) {
          const mType = d.media_type;
          setCurrentMovie((prev) => {
            if (prev.media_type === mType) return prev;
            return {
              ...prev,
              media_type: mType,
              seasons: d.seasons || prev.seasons,
            };
          });
        }
      });
    }, 6000);

    return () => {
      isMounted = false;
      clearTimeout(deferTimer);
    };
  }, [currentMovie.id, currentMovie.detailPath, currentMovie.streamUrl]);

  // Toast dispatcher
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2500);
  }, []);

  // Controls Visibility Timer (Auto-hides after 3.5s when playing)
  const triggerShowControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused && !isQualityMenuOpen && !isSpeedMenuOpen && !isEpisodesMenuOpen && !isLanguageMenuOpen) {
        setShowControls(false);
      }
    }, 3500);
  }, [isQualityMenuOpen, isSpeedMenuOpen, isEpisodesMenuOpen, isLanguageMenuOpen]);

  // Dynamic Language Discovery (Lazy loaded on demand or after steady playback to preserve instant 0ms start)
  useEffect(() => {
    let isMounted = true;
    const initialLang = movieboxService.detectLanguage(movie.title, movie.detailPath);
    if (!selectedLanguage) {
      setSelectedLanguage(initialLang);
    }

    const isOfflineTitle = Boolean(
      movie.streamUrl?.includes('local_media') ||
      movie.streamUrl?.includes('127.0.0.1') ||
      movie.streamUrl?.startsWith('blob:') ||
      movie.streamUrl?.startsWith('file:') ||
      (typeof navigator !== 'undefined' && !navigator.onLine)
    );
    if (isOfflineTitle) return;

    // Only fetch alternate language variants when user opens language menu or well after stream has started
    if (!isLanguageMenuOpen && languageVariants.length > 0) return;

    // Defer language discovery by 8s to not compete with primary stream fetch on cold start
    const timer = setTimeout(() => {
      movieboxService.getLanguageVariants(movie).then((variants) => {
        if (!isMounted || !variants || variants.length === 0) return;
        setLanguageVariants(variants);
      }).catch(() => {});
    }, isLanguageMenuOpen ? 0 : 8000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [movie, selectedLanguage, isLanguageMenuOpen, languageVariants.length]);

  // Pre-configured & Discovered Language Options
  const availableLanguageOptions = useMemo(() => {
    const standard = ['Hindi', 'English / Original', 'Tamil', 'Telugu'];
    const discovered = languageVariants.map((v) => v.language);
    return Array.from(new Set([...standard, ...discovered]));
  }, [languageVariants]);

  // Language Switch Handler (Preserves playback timestamp)
  const handleSelectLanguage = useCallback(async (targetLang: string, variantMovie?: Movie) => {
    if (selectedLanguage.toLowerCase() === targetLang.toLowerCase() && (!variantMovie || variantMovie.id === currentMovie.id)) {
      setIsLanguageMenuOpen(false);
      return;
    }
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    hasUserSelectedLanguageRef.current = true;

    // Preserve exact playback timestamp
    const video = videoRef.current;
    if (video && video.currentTime > 0) {
      savedPositionRef.current = video.currentTime;
    }

    let nextMovie: Movie | null = variantMovie || null;
    if (!nextMovie) {
      const matchInList = languageVariants.find((v) => v.language.toLowerCase() === targetLang.toLowerCase());
      if (matchInList?.movie) {
        nextMovie = matchInList.movie;
      }
    }

    if (!nextMovie) {
      setIsSwitchingLanguage(true);
      showToast(`Searching ${targetLang} audio...`);
      try {
        const found = await movieboxService.findLanguageVariant(currentMovie, targetLang, currentSeason);
        if (found) {
          nextMovie = found;
          setLanguageVariants((prev) => {
            if (prev.some((v) => v.language.toLowerCase() === targetLang.toLowerCase())) return prev;
            return [...prev, { language: targetLang, movie: found }];
          });
        }
      } catch {}
      setIsSwitchingLanguage(false);
    }

    if (!nextMovie) {
      showToast(`${targetLang} audio is not available for this title`);
      setIsLanguageMenuOpen(false);
      return;
    }

    prevPropMovieIdRef.current = nextMovie.id;
    resolvedSessionRef.current = '';
    setStreamInfo(null);
    setLoading(true);
    setCurrentMovie(nextMovie);
    setSelectedLanguage(targetLang);
    setIsLanguageMenuOpen(false);
    showToast(`Audio changed to ${targetLang}`);
    onMovieChange?.(nextMovie);
  }, [selectedLanguage, currentMovie, currentSeason, languageVariants, showToast, onMovieChange]);

  // Fullscreen & Android Landscape Orientation Handlers
  const enterLandscape = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && (window as any).AndroidDevice?.setOrientation) {
        (window as any).AndroidDevice.setOrientation('landscape');
        (window as any).AndroidDevice.setFullscreen(true);
      }
      const screenOrientation = window.screen?.orientation as any;
      if (screenOrientation && typeof screenOrientation.lock === 'function') {
        screenOrientation.lock('landscape').catch(() => {});
      }
      if (containerRef.current && typeof containerRef.current.requestFullscreen === 'function') {
        containerRef.current.requestFullscreen().catch(() => {});
      }
    } catch {}
  }, []);

  const exitLandscape = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && (window as any).AndroidDevice?.setOrientation) {
        (window as any).AndroidDevice.setOrientation('portrait');
        (window as any).AndroidDevice.setFullscreen(false);
      }
      const screenOrientation = window.screen?.orientation as any;
      if (screenOrientation && typeof screenOrientation.unlock === 'function') {
        screenOrientation.unlock();
      }
      if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
        document.exitFullscreen().catch(() => {});
      }
    } catch {}
  }, []);

  const toggleFullscreen = useCallback(() => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    setIsFullscreen((prev) => {
      const next = !prev;
      if (next) {
        enterLandscape();
      } else {
        exitLandscape();
      }
      return next;
    });
  }, [enterLandscape, exitLandscape]);

  // Synchronize orientation state from window/screen events
  useEffect(() => {
    const handleOrientation = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      setIsFullscreen(isLandscape);
      if (isLandscape && !isMinimized) {
        if (typeof window !== 'undefined' && (window as any).AndroidDevice?.setFullscreen) {
          (window as any).AndroidDevice.setFullscreen(true);
        }
      }
    };
    handleOrientation();
    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);
    return () => {
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, [isMinimized]);

  // Intercept Android hardware Back button when in VideoPlayer
  useEffect(() => {
    if (isMinimized) return;

    const handlePlayerBack = () => {
      if (isFullscreen) {
        // First exit fullscreen landscape back to portrait
        setIsFullscreen(false);
        setFitMode('contain');
        exitLandscape();
        return true;
      }
      if (onMinimize) {
        onMinimize();
        return true;
      }
      onBack();
      return true;
    };

    (window as any).handleAndroidBack = handlePlayerBack;
    return () => {
      if ((window as any).handleAndroidBack === handlePlayerBack) {
        delete (window as any).handleAndroidBack;
      }
    };
  }, [isFullscreen, isMinimized, exitLandscape, onMinimize, onBack]);

  // Handle Background Scroll Locking
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    const origTouch = document.body.style.touchAction;
    if (!isMinimized) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = origOverflow;
      document.body.style.touchAction = origTouch;
    }
    return () => {
      document.body.style.overflow = origOverflow;
      document.body.style.touchAction = origTouch;
      exitLandscape();
    };
  }, [isMinimized, exitLandscape]);

  // Clean player release on unmount
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video) {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch {}
      }
      exitLandscape();
    };
  }, [exitLandscape]);

  // Stream Resolution: Strict, Authentic Content Only
  const sessionKey = `${currentMovie.id}_${currentMovie.detailPath}_${currentSeason}_${currentEpisode}_${retryCount}`;

  useEffect(() => {
    if (resolvedSessionRef.current === sessionKey) return;

    let isMounted = true;
    setError(null);

    // 1. Offline Download Check (instant, synchronous)
    let directOfflineUrl: string | null = null;
    try {
      const dls = cacheService.getDownloads();
      const found = dls.find(
        (d) =>
          d.movieId === currentMovie.id &&
          (d.season === undefined || d.season === currentSeason) &&
          (d.episode === undefined || d.episode === currentEpisode) &&
          d.status === 'completed'
      );
      if (found?.localPath) {
        if (typeof window !== 'undefined' && (window as any).AndroidDevice?.getProxyVideoUrl) {
          try {
            directOfflineUrl = (window as any).AndroidDevice.getProxyVideoUrl(found.localPath);
          } catch {
            const port = (window as any).AndroidDevice?.getLocalProxyPort?.() || 8888;
            directOfflineUrl = `http://127.0.0.1:${port}/local_media?path=${encodeURIComponent(found.localPath)}`;
          }
        } else {
          const port = typeof window !== 'undefined' && (window as any).AndroidDevice?.getLocalProxyPort?.() ? (window as any).AndroidDevice.getLocalProxyPort() : 8888;
          directOfflineUrl = `http://127.0.0.1:${port}/local_media?path=${encodeURIComponent(found.localPath)}`;
        }
      }
    } catch {}

    if (!directOfflineUrl && currentMovie.streamUrl) {
      const isLocal =
        currentMovie.streamUrl.includes('cinevault.local') ||
        currentMovie.streamUrl.includes('localhost') ||
        currentMovie.streamUrl.includes('127.0.0.1') ||
        currentMovie.streamUrl.startsWith('file:') ||
        currentMovie.streamUrl.startsWith('blob:');
      if (isLocal) directOfflineUrl = currentMovie.streamUrl;
    }

    if (directOfflineUrl) {
      resolvedSessionRef.current = sessionKey;
      streamStartTimeRef.current = Date.now();
      setStreamInfo({
        streamUrl: directOfflineUrl,
        qualities: [{ quality: 'Offline HD', resolution: 'Original', url: directOfflineUrl }],
        webPlayerUrl: directOfflineUrl,
        isDirect: true,
      });
      setSelectedQuality('Offline HD');
      setLoading(false);
      setError(null);
      return;
    }

    // 2. Online Stream Fetch
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('You are offline. Connect to the internet or play downloaded titles from Downloads.');
      setLoading(false);
      return;
    }

    // Set loading AFTER offline checks pass — avoids showing spinner for cached/offline content
    setLoading(true);

    const timeout = setTimeout(() => {
      if (isMounted) {
        setError('Stream connection timed out. Tap Retry to reconnect.');
        setLoading(false);
      }
    }, 12000);

    const queryMediaType = isTv ? 'series' : 'movie';
    const querySeason = isTv ? Math.max(1, currentSeason) : 0;
    const queryEpisode = isTv ? Math.max(1, currentEpisode) : 0;

    movieboxService
      .getStreams(currentMovie.id, currentMovie.detailPath, queryMediaType, querySeason, queryEpisode, currentMovie.title)
      .then((res) => {
        clearTimeout(timeout);
        if (!isMounted) return;
        resolvedSessionRef.current = sessionKey;
        streamStartTimeRef.current = Date.now();
        setStreamInfo(res);
        if (!res?.streamUrl) {
          if (currentMovie.is_coming_soon || currentMovie.has_resource === false) {
            setError('This title is upcoming / not yet released for full streaming. Check back soon for the official release.');
          } else {
            setError('Direct stream unavailable for this title. Tap Retry to reconnect.');
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        clearTimeout(timeout);
        if (!isMounted) return;
        setError(err?.message || 'Failed to load stream.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [sessionKey, isTv, currentMovie.id, currentMovie.detailPath, currentMovie.media_type, currentMovie.streamUrl, currentMovie.title, currentSeason, currentEpisode, retryCount]);

  // Compute Active Stream URL from Quality Selection
  const activeStreamUrl = useMemo(() => {
    if (!streamInfo) return '';
    if (streamInfo.isDirect && streamInfo.streamUrl) {
      return streamInfo.streamUrl;
    }
    if (streamInfo.qualities && streamInfo.qualities.length > 0) {
      if (selectedQuality === 'Auto') {
        const optimal = movieboxService.getOptimalStartupQuality(streamInfo.qualities);
        return optimal?.url || streamInfo.streamUrl || streamInfo.qualities[0].url || '';
      }
      const matched = streamInfo.qualities.find((q) =>
        q.quality.toLowerCase().includes(selectedQuality.toLowerCase())
      );
      return matched?.url || streamInfo.streamUrl || streamInfo.qualities[0].url;
    }
    return streamInfo.streamUrl || '';
  }, [streamInfo, selectedQuality]);

  // ATOMIC PLAY & PAUSE STATE MACHINE (Prevents Promise race conditions & freezes)
  const safePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    // Immediately reset any pending/stuck seek and buffering states on explicit user Play action
    if (!video.seeking) {
      isSeekingRef.current = false;
      setIsBuffering(false);
    }
    pendingSeekTimeRef.current = null;
    if (seekWatchdogRef.current) {
      clearTimeout(seekWatchdogRef.current);
      seekWatchdogRef.current = null;
    }

    if (!video.paused) {
      setIsPlaying(true);
      setIsBuffering(false);
      return;
    }

    try {
      // Only initialize source if video element has no active src attribute at all
      if (!video.src && activeStreamUrl) {
        video.src = activeStreamUrl;
      }
      const p = video.play();
      playPromiseRef.current = p;
      await p;
      setIsPlaying(true);
      setIsBuffering(false);
    } catch (err: any) {
      // AbortError is expected when rapid pause occurs
      if (err?.name !== 'AbortError') {
        console.warn('Playback play() promise rejected:', err);
      }
      setIsPlaying(!video.paused);
      setIsBuffering(false);
    } finally {
      playPromiseRef.current = null;
    }
  }, [activeStreamUrl]);

  const safePause = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    // If play() promise is actively resolving, wait for it before calling pause() to prevent DOMException
    if (playPromiseRef.current) {
      try {
        await playPromiseRef.current;
      } catch {}
    }

    video.pause();
    setIsPlaying(false);
  }, []);

  const togglePlayPause = useCallback(() => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      safePlay();
    } else {
      safePause();
    }
    triggerShowControls();
  }, [safePlay, safePause, triggerShowControls]);

  const commitSeek = useCallback((targetTime: number) => {
    const video = videoRef.current;
    if (!video) return;

    const maxDuration = (video.duration && !isNaN(video.duration) && video.duration > 0) ? video.duration : targetTime;
    const validTarget = Math.max(0, Math.min(maxDuration, targetTime));

    if (seekWatchdogRef.current) clearTimeout(seekWatchdogRef.current);

    isSeekingRef.current = true;
    setIsBuffering(true);

    const wasPlaying = wasPlayingBeforeSeekRef.current || !video.paused;
    wasPlayingBeforeSeekRef.current = wasPlaying;

    try {
      video.currentTime = validTarget;
    } catch {
      try {
        video.currentTime = validTarget;
      } catch {}
    }

    // Seek Watchdog: 4-second safety timeout to recover if seek event takes longer on mobile network
    seekWatchdogRef.current = setTimeout(() => {
      if (isSeekingRef.current && videoRef.current) {
        isSeekingRef.current = false;
        setIsBuffering(false);
        const v = videoRef.current;
        if (v && wasPlayingBeforeSeekRef.current && v.paused) {
          safePlay();
        }
      }
    }, 4000);
  }, [safePlay]);

  const handleSeeked = useCallback(() => {
    if (seekWatchdogRef.current) {
      clearTimeout(seekWatchdogRef.current);
      seekWatchdogRef.current = null;
    }

    const video = videoRef.current;
    if (!video) return;

    // If a subsequent seek was queued while this one was resolving, jump to latest target
    if (pendingSeekTimeRef.current !== null) {
      const nextTarget = pendingSeekTimeRef.current;
      pendingSeekTimeRef.current = null;
      try {
        video.currentTime = nextTarget;
      } catch {}
      return;
    }

    isSeekingRef.current = false;
    setIsBuffering(false);

    // Automatically resume playback if it was playing prior to seek
    if (wasPlayingBeforeSeekRef.current) {
      if (video.paused) {
        safePlay();
      } else {
        setIsPlaying(true);
      }
    }
  }, [safePlay]);

  // Skip ±10 Seconds (Fast, seamless jump without pausing)
  const handleSkip = useCallback((seconds: number) => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    const video = videoRef.current;
    if (!video) return;

    triggerShowControls();
    const dur = video.duration || 0;
    const baseTime = pendingSkipTargetRef.current !== null
      ? pendingSkipTargetRef.current
      : video.currentTime;
    const target = Math.max(0, Math.min(dur, baseTime + seconds));

    pendingSkipTargetRef.current = target;
    wasPlayingBeforeSeekRef.current = !video.paused;

    if (skipDebounceTimerRef.current) {
      clearTimeout(skipDebounceTimerRef.current);
    }

    // Debounce rapid skip button taps by 120ms so multiple taps (+10s, +20s, +30s) coalesce into a single seek
    skipDebounceTimerRef.current = setTimeout(() => {
      const finalTarget = pendingSkipTargetRef.current;
      pendingSkipTargetRef.current = null;
      skipDebounceTimerRef.current = null;
      if (finalTarget !== null) {
        commitSeek(finalTarget);
      }
    }, 120);
  }, [commitSeek, triggerShowControls]);
  // Video Element Native Event Handlers
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    // While seek is in progress, ignore premature timeupdate events from position jump
    if (isSeekingRef.current || video.seeking) {
      return;
    }

    const curr = video.currentTime;
    const currSec = Math.floor(curr);

    if (isBuffering && !video.paused) {
      setIsBuffering(false);
    }

    // Throttled watch progress save to local storage (0 React re-renders during playback)
    if (currSec !== lastSecondRef.current) {
      lastSecondRef.current = currSec;

      // Save watch progress to local storage every 15 seconds to prevent I/O micro-stutters
      // (Suppress during initial 5 seconds of stream startup to avoid main-thread disk write lag)
      if (currSec > 5 && currSec % 15 === 0 && video.duration > 0) {
        cacheService.saveWatchedProgress(
          currentMovie,
          curr,
          video.duration,
          isTv ? currentSeason : undefined,
          isTv ? currentEpisode : undefined
        );
      }
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    setIsBuffering(false);

    // Restore position if quality or language was changed or reconnecting
    if (savedPositionRef.current > 0) {
      const pos = savedPositionRef.current;
      savedPositionRef.current = 0;
      try {
        video.currentTime = pos;
      } catch {}
    }

    // Apply speed setting
    video.playbackRate = playbackSpeed;

    // Only invoke safePlay if video is paused (prevents Chromium decoder restart lag on autoPlay)
    if (video.paused) {
      safePlay();
    }
  };

  const handleWaiting = () => {
    const video = videoRef.current;
    if (waitingTimerRef.current) clearTimeout(waitingTimerRef.current);
    // Suppress buffering spinner during initial 3 seconds of stream handshake / decoder negotiation
    if (Date.now() - streamStartTimeRef.current < 3000) {
      return;
    }
    // Debounce buffering spinner by 400ms — longer debounce prevents false spinner flashes from decoder hiccups
    // and micro-stalls during initial stream negotiation on mobile networks
    waitingTimerRef.current = setTimeout(() => {
      if (video && !video.paused && !isSeekingRef.current) {
        setIsBuffering(true);
      }
    }, 400);
  };

  const handleCanPlay = () => {
    if (waitingTimerRef.current) {
      clearTimeout(waitingTimerRef.current);
      waitingTimerRef.current = null;
    }
    setIsBuffering(false);
    if (isSeekingRef.current) {
      isSeekingRef.current = false;
      if (wasPlayingBeforeSeekRef.current) {
        if (videoRef.current?.paused) {
          safePlay();
        } else {
          setIsPlaying(true);
        }
      }
    }
  };

  const handleSeeking = () => {
    isSeekingRef.current = true;
    // NOTE: Do NOT set isBuffering here — let the debounced handleWaiting control the spinner.
    // Setting it unconditionally causes a React re-render flash that feels like lag on seek/forward.
  };

  const handleStalled = () => {
    // Stalled in Chromium/Android WebView indicates the buffer has temporarily fulfilled its quota.
    // We intentionally do NOT trigger an intrusive buffering spinner here, preventing false buffering on local downloads.
  };

  const handlePlaying = () => {
    if (waitingTimerRef.current) {
      clearTimeout(waitingTimerRef.current);
      waitingTimerRef.current = null;
    }
    setIsPlaying(true);
    setIsBuffering(false);
    isSeekingRef.current = false;
  };

  const handlePause = () => {
    const video = videoRef.current;
    // CRITICAL: Ignore browser internal pause events while seeking or jumping timestamps!
    if (isSeekingRef.current || video?.seeking || pendingSkipTargetRef.current !== null) {
      return;
    }

    setIsPlaying(false);
    setIsBuffering(false);
    setShowControls(true);

    if (video && video.duration > 0) {
      cacheService.saveWatchedProgress(
        currentMovie,
        video.currentTime,
        video.duration,
        isTv ? currentSeason : undefined,
        isTv ? currentEpisode : undefined
      );
    }
  };

  const handleVideoError = async () => {
    const video = videoRef.current;
    const err = video?.error;
    if (err && err.code === 1) return; // MEDIA_ERR_ABORTED during seeking is expected

    // During active seeking, previous range cancellations are expected; do not trigger error screen
    if (isSeekingRef.current || video?.seeking) {
      return;
    }

    // Auto-fallback: if local offline file is missing/unreadable, fall back to online stream seamlessly
    if (selectedQuality === 'Offline HD' || activeStreamUrl?.includes('local_media')) {
      setSelectedQuality('Auto');
      resolvedSessionRef.current = '';
      setStreamInfo(null);
      setLoading(true);
      return;
    }

    // Auto-Recovery: retry with refreshed stream tokens (signed CDN URLs)
    if (autoRetryCountRef.current < 3) {
      autoRetryCountRef.current += 1;
      savedPositionRef.current = (video && video.currentTime > 0) ? video.currentTime : savedPositionRef.current;
      setIsBuffering(true);

      try {
        const refreshed = await movieboxService.refreshStreams(
          currentMovie.id,
          currentMovie.detailPath,
          currentMovie.media_type,
          currentSeason,
          currentEpisode,
          currentMovie.title
        );
        if (refreshed && refreshed.streamUrl) {
          resolvedSessionRef.current = '';
          setStreamInfo(refreshed);
          setIsBuffering(false);
          return;
        }
      } catch {}
    }

    setIsBuffering(false);
    isSeekingRef.current = false;
    setError('Playback connection interrupted. Tap Retry to reconnect.');
  };

  // Quality Switching
  const handleSelectQuality = (qualityName: string) => {
    if (videoRef.current && videoRef.current.currentTime > 0) {
      savedPositionRef.current = videoRef.current.currentTime;
    }
    try {
      localStorage.setItem('cinevault_preferred_quality', qualityName);
    } catch {}
    setSelectedQuality(qualityName);
    setIsQualityMenuOpen(false);
    showToast(`Quality: ${qualityName.replace(/ Direct.*/i, '')}`);
  };

  // Playback Speed
  const handleSelectSpeed = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setPlaybackSpeed(speed);
    setIsSpeedMenuOpen(false);
    showToast(`Speed: ${speed === 1 ? 'Normal' : `${speed}x`}`);
  };

  // Volume & Mute Toggle
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    video.muted = nextMuted;
    if (!nextMuted && volume === 0) {
      setVolume(1);
      video.volume = 1;
    }
  };

  // Retry Callback
  const handleRetry = () => {
    setError(null);
    setLoading(true);
    autoRetryCountRef.current = 0;
    resolvedSessionRef.current = '';
    movieboxService.refreshStreams(
      currentMovie.id,
      currentMovie.detailPath,
      currentMovie.media_type,
      currentSeason,
      currentEpisode,
      currentMovie.title
    ).catch(() => {});
    setRetryCount((prev) => prev + 1);
  };

  // Background Surface Click (Toggles controls visibility ONLY — NEVER pauses playback)
  const handleSurfaceClick = (e: React.MouseEvent) => {
    if (touchStartPosRef.current?.hasMoved) {
      return;
    }
    if ((e.target as HTMLElement).closest('button, input, [role="button"], a, select')) {
      return;
    }
    if (isMinimized) {
      onRestore?.();
      return;
    }
    if (isLocked) {
      queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(6); });
      setShowUnlockPrompt(true);
      if (unlockPromptTimerRef.current) clearTimeout(unlockPromptTimerRef.current);
      unlockPromptTimerRef.current = setTimeout(() => {
        setShowUnlockPrompt(false);
      }, 3000);
      showToast('Screen is Locked • Tap Unlock to restore');
      return;
    }
    if (isQualityMenuOpen || isSpeedMenuOpen || isEpisodesMenuOpen || isLanguageMenuOpen) {
      setIsQualityMenuOpen(false);
      setIsSpeedMenuOpen(false);
      setIsEpisodesMenuOpen(false);
      setIsLanguageMenuOpen(false);
      return;
    }

    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      lastTapRef.current = 0;
      cycleFitMode();
      return;
    }
    lastTapRef.current = now;

    if (showControls) {
      setShowControls(false);
    } else {
      triggerShowControls();
    }
  };



  // Active episodes list for TV series based on browsingSeason
  const activeSeasonObj = allSeasons.find((s) => s.season_number === browsingSeason) || allSeasons.find((s) => s.season_number === currentSeason) || allSeasons[0];
  const activeEpisodeCount = activeSeasonObj?.episode_count || activeSeasonObj?.episodes?.length || 1;
  const activeEpisodesList = activeSeasonObj?.episodes && activeSeasonObj.episodes.length > 0
    ? activeSeasonObj.episodes
    : Array.from({ length: Math.max(1, activeEpisodeCount) }, (_, i) => ({
        episode_number: i + 1,
        title: `Episode ${i + 1}`,
      }));

  // Switch Season & Episode
  const handleSelectSeasonAndEpisode = useCallback((seasonNum: number, epNum: number) => {
    if (seasonNum === currentSeason && epNum === currentEpisode) {
      setIsEpisodesMenuOpen(false);
      return;
    }
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });

    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
        video.currentTime = 0;
      } catch {}
    }

    // Reset position to 0 so the new episode starts from the beginning
    savedPositionRef.current = 0;
    setStreamInfo(null);
    setLoading(true);
    setError(null);
    resolvedSessionRef.current = '';

    prevPropSeasonRef.current = seasonNum;
    prevPropEpisodeRef.current = epNum;
    setCurrentSeason(seasonNum);
    setCurrentEpisode(epNum);
    setBrowsingSeason(seasonNum);
    setIsEpisodesMenuOpen(false);
    showToast(`Playing Season ${seasonNum} • Episode ${epNum}`);
    onEpisodeChange?.(seasonNum, epNum);
  }, [currentSeason, currentEpisode, showToast, onEpisodeChange]);

  // Next Episode Quick Switch
  const handleNextEpisode = useCallback(() => {
    if (!isTv) return;
    const currSeasonObj = allSeasons.find((s) => s.season_number === currentSeason) || allSeasons[0];
    const maxEpInCurrentSeason = currSeasonObj?.episode_count || currSeasonObj?.episodes?.length || 1;

    if (currentEpisode < maxEpInCurrentSeason) {
      handleSelectSeasonAndEpisode(currentSeason, currentEpisode + 1);
    } else {
      const currentSeasonIndex = allSeasons.findIndex((s) => s.season_number === currentSeason);
      if (currentSeasonIndex >= 0 && currentSeasonIndex < allSeasons.length - 1) {
        const nextSeason = allSeasons[currentSeasonIndex + 1];
        handleSelectSeasonAndEpisode(nextSeason.season_number, 1);
      } else {
        showToast('You have reached the final episode!');
      }
    }
  }, [isTv, allSeasons, currentSeason, currentEpisode, handleSelectSeasonAndEpisode, showToast]);

  // Aspect Ratio Fit Mode Cycler (Fit Screen -> Full Screen -> Fill Screen)
  const cycleFitMode = useCallback(() => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    setFitMode((prev) => {
      let next: 'contain' | 'cover' | 'fill' = 'contain';
      let label = '';
      if (prev === 'contain') {
        next = 'cover';
        label = 'Full Screen';
      } else if (prev === 'cover') {
        next = 'fill';
        label = 'Fill Screen';
      } else {
        next = 'contain';
        label = 'Fit Screen';
      }
      try {
        localStorage.setItem('cinevault_player_fit', next);
      } catch {}
      showToast(label);
      return next;
    });
  }, [showToast]);

  // Touch Gesture Handlers for Brightness (Left half) and Volume (Right half)
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (isMinimized || isLocked || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = touch.clientX - rect.left;

    let side: 'left' | 'right' | 'center' = 'center';
    let initialVal = 1;
    if (x < rect.width * 0.45) {
      side = 'left';
      initialVal = brightness;
    } else if (x > rect.width * 0.55) {
      side = 'right';
      const v = videoRef.current ? videoRef.current.volume : volume;
      initialVal = isMuted ? 0 : v;
    }

    touchStartPosRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      side,
      initialVal,
      hasMoved: false,
    };
  }, [isMinimized, isLocked, brightness, volume, isMuted]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (isLocked || !touchStartPosRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const { startX, startY, side, initialVal } = touchStartPosRef.current;
    if (side === 'center') return;

    const deltaY = startY - touch.clientY; // Swiping up increases value
    const deltaX = Math.abs(touch.clientX - startX);

    if (!touchStartPosRef.current.hasMoved) {
      if (Math.abs(deltaY) < 8) return;
      if (deltaX > Math.abs(deltaY)) {
        touchStartPosRef.current.side = 'center';
        return;
      }
      touchStartPosRef.current.hasMoved = true;
    }

    const sensitivity = window.innerHeight * 0.65;
    const change = deltaY / sensitivity;

    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
    }
    // Watchdog timer: automatically fades out gesture HUD after 1.2s of inactivity
    gestureTimeoutRef.current = setTimeout(() => {
      setActiveGesture(null);
    }, 1200);

    if (side === 'left') {
      // Clamp brightness between 10% (0.1) and 100% (1.0)
      const nextBrightness = Math.max(0.1, Math.min(1.0, initialVal + change));
      setBrightness(nextBrightness);
      try {
        localStorage.setItem('cinevault_player_brightness', nextBrightness.toFixed(2));
      } catch {}
      setActiveGesture('brightness');
      setGestureValue(Math.round(nextBrightness * 100));
    } else if (side === 'right') {
      // Clamp volume between 0% (0) and 100% (1.0)
      const nextVol = Math.max(0, Math.min(1.0, initialVal + change));
      if (videoRef.current) {
        videoRef.current.volume = nextVol;
        if (nextVol > 0 && videoRef.current.muted) {
          videoRef.current.muted = false;
          setIsMuted(false);
        }
      }
      setVolume(nextVol);
      if (nextVol === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
      }
      setActiveGesture('volume');
      setGestureValue(Math.round(nextVol * 100));
    }
  }, [isMuted]);

  const handleTouchEnd = useCallback(() => {
    if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
    gestureTimeoutRef.current = setTimeout(() => {
      setActiveGesture(null);
    }, 700);
    setTimeout(() => {
      touchStartPosRef.current = null;
    }, 50);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={triggerShowControls}
      onClick={handleSurfaceClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onPointerUp={handleTouchEnd}
      className={
        isMinimized
          ? 'fixed bottom-16 sm:bottom-4 left-2 right-2 sm:left-auto sm:right-6 sm:w-[420px] h-16 sm:h-[68px] z-50 bg-[#0B1224]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_12px_40px_rgba(5,10,24,0.85)] flex items-center p-1.5 sm:p-2 select-none overflow-hidden group cursor-pointer animate-fade-in'
          : `fixed inset-0 z-50 w-full h-full bg-black flex items-center justify-center select-none overflow-hidden touch-none${isFullscreen ? ' player-fullscreen-mode' : ''}`
      }
      style={undefined}
    >
      {/* Toast Notification */}
      {!isMinimized && toastMessage && (
        <div className="absolute top-16 z-50 px-4 py-2 rounded-xl bg-[#176BFF] text-white font-bold text-xs sm:text-sm shadow-[0_4px_20px_rgba(23,107,255,0.45)] animate-fade-in pointer-events-none">
          {toastMessage}
        </div>
      )}

      {/* Persistent HTML5 Video Element */}
      <div
        className={
          isMinimized
            ? 'w-24 sm:w-28 h-full rounded-xl overflow-hidden bg-black flex-shrink-0 relative flex items-center justify-center'
            : 'absolute inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center'
        }
      >
        <video
          ref={videoRef}
          src={activeStreamUrl || undefined}
          preload="metadata"
          playsInline
          autoPlay
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onWaiting={handleWaiting}
          onCanPlay={handleCanPlay}
          onCanPlayThrough={handleCanPlay}
          onSeeking={handleSeeking}
          onStalled={handleStalled}
          onPlaying={handlePlaying}
          onPause={handlePause}
          onSeeked={handleSeeked}
          onError={handleVideoError}
          poster={movie.backdrop || movie.poster || undefined}
          data-fit={fitMode}
          style={{ objectFit: fitMode, transform: 'translateZ(0)', willChange: 'transform' }}
          className={`w-full h-full transition-[object-fit] duration-150 ${
            fitMode === 'cover'
              ? 'object-cover'
              : fitMode === 'fill'
              ? 'object-fill'
              : 'object-contain'
          }`}
        />

        {/* Hardware-accelerated Software Brightness Scrim */}
        {!isMinimized && (
          <div
            className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-100"
            style={{
              backgroundColor: '#000000',
              opacity: Math.max(0, 1 - brightness),
            }}
          />
        )}

        {/* Sleek Top Percentage Indicator when scrolling Volume or Brightness */}
        {!isMinimized && activeGesture && (
          <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#0B1224]/95 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.85)] pointer-events-none animate-fade-in">
            {activeGesture === 'volume' ? (
              gestureValue === 0 || isMuted ? (
                <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0" />
              ) : gestureValue < 50 ? (
                <Volume1 className="w-4 h-4 sm:w-5 sm:h-5 text-[#35A7FF] flex-shrink-0" />
              ) : (
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#35A7FF] flex-shrink-0" />
              )
            ) : gestureValue > 60 ? (
              <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-[#35A7FF] flex-shrink-0" />
            ) : gestureValue > 30 ? (
              <SunMedium className="w-4 h-4 sm:w-5 sm:h-5 text-[#35A7FF] flex-shrink-0" />
            ) : (
              <SunDim className="w-4 h-4 sm:w-5 sm:h-5 text-[#35A7FF] flex-shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-bold font-mono text-white tracking-wider">
              {activeGesture === 'volume' ? `Volume ${gestureValue}%` : `Brightness ${gestureValue}%`}
            </span>
          </div>
        )}

        {/* Left Edge: Slim Brightness Scrollbar sticking with video player */}
        {!isMinimized && activeGesture === 'brightness' && (
          <div className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center pointer-events-none animate-fade-in">
            <div className="relative w-1.5 sm:w-2 h-36 sm:h-48 bg-black/60 backdrop-blur-md rounded-full overflow-hidden p-0.5 border border-white/20 shadow-[0_0_12px_rgba(0,0,0,0.7)] flex flex-col justify-end">
              <div
                className="w-full bg-gradient-to-t from-[#176BFF] to-[#35A7FF] rounded-full transition-all duration-75 shadow-[0_0_8px_rgba(53,167,255,0.7)]"
                style={{ height: `${gestureValue}%` }}
              />
            </div>
          </div>
        )}

        {/* Right Edge: Slim Volume Scrollbar sticking with video player */}
        {!isMinimized && activeGesture === 'volume' && (
          <div className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center pointer-events-none animate-fade-in">
            <div className="relative w-1.5 sm:w-2 h-36 sm:h-48 bg-black/60 backdrop-blur-md rounded-full overflow-hidden p-0.5 border border-white/20 shadow-[0_0_12px_rgba(0,0,0,0.7)] flex flex-col justify-end">
              <div
                className="w-full bg-gradient-to-t from-[#176BFF] to-[#35A7FF] rounded-full transition-all duration-75 shadow-[0_0_8px_rgba(53,167,255,0.7)]"
                style={{ height: `${gestureValue}%` }}
              />
            </div>
          </div>
        )}

        {/* Minimized Buffering Spinner */}
        {isMinimized && (isBuffering || loading) && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
            <Loader2 className="w-5 h-5 text-[#35A7FF] animate-spin" />
          </div>
        )}
      </div>

      {/* MINIMIZED DOCKED MINI-PLAYER UI */}
      {isMinimized && (
        <>
          <div
            className="flex-1 min-w-0 px-3 py-1 cursor-pointer flex flex-col justify-center"
            onClick={onRestore}
          >
            <span className="text-xs sm:text-sm font-semibold text-[#F5F7FF] truncate drop-shadow">
              {movie.title}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-[11px] text-[#8D9AB5]">
              <span className="text-[#35A7FF] font-medium truncate">
                {isTv ? `S${currentSeason}:E${currentEpisode}` : movie.release_year || 'Movie'}
              </span>
              <span>•</span>
              <span className="font-mono text-zinc-400">
                {selectedQuality.replace(/ Direct.*/i, '')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 pr-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
              className="w-9 h-9 rounded-full bg-[#0E172B] hover:bg-[#16223D] border border-white/[0.08] text-[#35A7FF] flex items-center justify-center cursor-pointer active:scale-95 transition-all"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRestore?.();
              }}
              className="w-9 h-9 rounded-full bg-[#0E172B] hover:bg-[#16223D] border border-white/[0.08] text-[#8D9AB5] hover:text-[#35A7FF] flex items-center justify-center cursor-pointer active:scale-95 transition-all"
              title="Expand Player"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBack();
              }}
              className="w-9 h-9 rounded-full bg-[#0E172B] hover:bg-red-500/20 hover:text-red-400 border border-white/[0.08] text-[#8D9AB5] flex items-center justify-center cursor-pointer active:scale-95 transition-all"
              title="Close Video"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <MiniPlaybackProgress videoRef={videoRef} />
        </>
      )}

      {/* SINGLE UNIFIED BUFFERING / LOADING SPINNER */}
      {!isMinimized && (isBuffering || loading) && !error && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/40 pointer-events-none animate-fade-in">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#0B1224]/85 border border-white/15 backdrop-blur-xl flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.85)]">
            <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-[#35A7FF] animate-spin" />
          </div>
          {loading && (
            <p className="mt-3 text-xs sm:text-sm font-semibold text-[#F5F7FF] tracking-wide drop-shadow">
              Loading stream...
            </p>
          )}
        </div>
      )}

      {/* PLAYBACK ERROR CARD */}
      {!isMinimized && !loading && error && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/90 p-4 pointer-events-auto">
          <div className="flex flex-col items-center gap-4 text-center p-6 max-w-md bg-[#0B1224] rounded-2xl border border-white/[0.08] shadow-2xl animate-scale-in">
            <AlertCircle className={`w-12 h-12 ${(currentMovie.is_coming_soon || currentMovie.has_resource === false) ? 'text-[#35A7FF]' : 'text-red-400'}`} />
            <div>
              <h3 className="text-lg font-bold text-white font-headline">
                {(currentMovie.is_coming_soon || currentMovie.has_resource === false) ? 'Coming Soon' : 'Playback Notice'}
              </h3>
              <p className="text-xs text-[#8D9AB5] mt-1.5 leading-relaxed font-body">{error}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
              {!(currentMovie.is_coming_soon || currentMovie.has_resource === false) && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white font-bold text-xs hover:brightness-110 transition-all cursor-pointer shadow-[0_4px_16px_rgba(23,107,255,0.4)] min-h-[44px] press-feedback"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>Retry Playback</span>
                </button>
              )}
              {currentMovie.trailer_url && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStreamInfo({
                      streamUrl: currentMovie.trailer_url!,
                      qualities: [{ quality: 'Trailer HD', resolution: 'Trailer', url: currentMovie.trailer_url! }],
                      webPlayerUrl: currentMovie.trailer_url!,
                      isDirect: true,
                      isTrailer: true,
                    });
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white font-bold text-xs hover:brightness-110 transition-all cursor-pointer shadow-[0_4px_16px_rgba(23,107,255,0.4)] min-h-[44px] press-feedback"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Watch Trailer</span>
                </button>
              )}
              <button
                type="button"
                onClick={onBack}
                className="px-5 py-2.5 rounded-xl bg-[#0E172B] hover:bg-[#16223D] text-white font-medium text-xs transition-colors cursor-pointer border border-white/[0.08] min-h-[44px] press-feedback"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Screen Lock Button (when controls are visible & unlocked) */}
      {!isMinimized && activeStreamUrl && !error && !isLocked && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 z-40 transition-opacity duration-200 ${
            showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            left: 'max(16px, env(safe-area-inset-left, 16px))',
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(12); });
              setIsLocked(true);
              setShowControls(false);
              setShowUnlockPrompt(true);
              if (unlockPromptTimerRef.current) clearTimeout(unlockPromptTimerRef.current);
              unlockPromptTimerRef.current = setTimeout(() => setShowUnlockPrompt(false), 2500);
              showToast('Screen Locked');
            }}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0B1224]/85 hover:bg-[#16223D] active:scale-95 border border-white/20 text-white flex items-center justify-center cursor-pointer shadow-[0_6px_24px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all press-feedback"
            title="Lock Screen"
            aria-label="Lock Screen"
          >
            <Lock className="w-5 h-5 text-white/90" />
          </button>
        </div>
      )}

      {/* Floating Unlock Button (when screen is locked) */}
      {!isMinimized && activeStreamUrl && !error && isLocked && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 z-50 transition-all duration-300 pointer-events-auto ${
            showUnlockPrompt ? 'opacity-100 scale-100' : 'opacity-40 hover:opacity-100 scale-95 hover:scale-100'
          }`}
          style={{
            left: 'max(16px, env(safe-area-inset-left, 16px))',
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(12); });
              setIsLocked(false);
              setShowControls(true);
              setShowUnlockPrompt(false);
              showToast('Screen Unlocked');
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#0B1224]/95 hover:bg-[#16223D] active:scale-95 border border-[#35A7FF]/50 text-[#35A7FF] shadow-[0_8px_32px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-all cursor-pointer press-feedback"
            title="Unlock Screen"
            aria-label="Unlock Screen"
          >
            <Unlock className="w-5 h-5 text-[#35A7FF]" />
            <span className="text-xs font-bold font-mono text-white tracking-wider pr-1">Unlock</span>
          </button>
        </div>
      )}

      {/* FULLSCREEN OVERLAY CONTROLS (Standard, Familiar Streaming UI) */}
      {!isMinimized && activeStreamUrl && !error && !isLocked && (
        <div
          className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-200 pointer-events-none z-30 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Top Bar: Spans 100% full width with device safe-area insets */}
          <div
            className="w-full flex items-center justify-between pointer-events-auto bg-gradient-to-b from-black/95 via-black/60 to-transparent pt-3 pb-6 px-4 sm:px-8 gap-3"
            style={{
              paddingTop: 'max(12px, env(safe-area-inset-top, 12px))',
              paddingLeft: 'max(16px, env(safe-area-inset-left, 16px))',
              paddingRight: 'max(16px, env(safe-area-inset-right, 16px))',
            }}
          >
            {/* Left: Back / Minimize & Title */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onMinimize) onMinimize();
                  else onBack();
                }}
                className="w-10 h-10 rounded-full bg-[#0B1224]/80 hover:bg-[#16223D] active:bg-[#050A18] border border-white/[0.08] text-white flex items-center justify-center cursor-pointer transition-colors press-feedback flex-shrink-0"
                title="Minimize player"
                aria-label="Minimize"
              >
                <ChevronDown className="w-5 h-5 text-[#35A7FF]" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs sm:text-sm md:text-base font-bold text-[#F5F7FF] truncate font-headline">
                    {currentMovie.title}
                  </h2>
                  {selectedQuality === 'Offline HD' && (
                    <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded shrink-0">
                      OFFLINE
                    </span>
                  )}
                  {streamInfo?.isTrailer && (
                    <span className="text-[9px] font-mono font-bold bg-[#176BFF]/15 text-[#35A7FF] border border-[#35A7FF]/30 px-1.5 py-0.5 rounded shrink-0 uppercase">
                      Trailer
                    </span>
                  )}
                </div>
                {isTv ? (
                  <p className="text-[10px] sm:text-xs text-[#35A7FF] font-semibold font-mono truncate">
                    Season {currentSeason} • Episode {currentEpisode}
                  </p>
                ) : (
                  currentMovie.release_year ? (
                    <p className="text-[10px] sm:text-xs text-[#8D9AB5] font-mono truncate">
                      {currentMovie.release_year} {currentMovie.duration ? `• ${currentMovie.duration}` : ''}
                    </p>
                  ) : null
                )}
              </div>
            </div>

            {/* Right: Audio Language (Always) + Speed & Quality (Landscape) */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Playback Speed Menu - Landscape / Fullscreen Only */}
              {isFullscreen && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSpeedMenuOpen((prev) => !prev);
                      setIsQualityMenuOpen(false);
                      setIsLanguageMenuOpen(false);
                      setIsEpisodesMenuOpen(false);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0B1224]/90 hover:bg-[#16223D] border border-white/[0.08] text-xs font-semibold text-[#F5F7FF] cursor-pointer transition-colors min-h-[36px]"
                    title="Playback Speed"
                  >
                    <Gauge className="w-3.5 h-3.5 text-[#35A7FF]" />
                    <span className="font-mono text-[11px]">{playbackSpeed}x</span>
                  </button>

                  {isSpeedMenuOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-2 w-32 bg-[#0B1224] border border-white/[0.08] rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 animate-fade-in"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#8D9AB5] px-2 py-1 font-mono">
                        Speed
                      </div>
                      {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleSelectSpeed(s)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                            playbackSpeed === s
                              ? 'bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white font-bold shadow-[0_2px_8px_rgba(23,107,255,0.35)]'
                              : 'text-gray-300 hover:bg-[#16223D]'
                          }`}
                        >
                          <span>{s === 1 ? 'Normal' : `${s}x`}</span>
                          {playbackSpeed === s && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Language Menu (Always available on player) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLanguageMenuOpen((prev) => !prev);
                    setIsQualityMenuOpen(false);
                    setIsSpeedMenuOpen(false);
                    setIsEpisodesMenuOpen(false);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0B1224]/90 hover:bg-[#16223D] border border-white/[0.08] text-xs font-semibold text-[#F5F7FF] cursor-pointer transition-colors min-h-[36px]"
                  title="Audio Language"
                >
                  <Languages className="w-3.5 h-3.5 text-[#35A7FF]" />
                  <span className="font-mono text-[11px] truncate max-w-[70px] sm:max-w-[90px]">
                    {selectedLanguage || 'Audio'}
                  </span>
                </button>

                {isLanguageMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-2 w-48 bg-[#0B1224] border border-white/[0.08] rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 animate-fade-in"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8D9AB5] px-2 py-1 font-mono flex items-center justify-between">
                      <span>Audio / Language</span>
                      {isSwitchingLanguage && <Loader2 className="w-3 h-3 text-[#35A7FF] animate-spin" />}
                    </div>
                    {availableLanguageOptions.map((lang, idx) => {
                      const isSelected =
                        selectedLanguage.toLowerCase() === lang.toLowerCase() ||
                        (selectedLanguage.includes('Original') && lang.includes('Original'));
                      const isLoadedVariant = languageVariants.some(
                        (v) => v.language.toLowerCase() === lang.toLowerCase()
                      );

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isSwitchingLanguage}
                          onClick={() => handleSelectLanguage(lang)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white font-bold shadow-[0_2px_8px_rgba(23,107,255,0.35)]'
                              : 'text-gray-300 hover:bg-[#16223D] disabled:opacity-50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="truncate">{lang}</span>
                            {!isSelected && isLoadedVariant && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-[#176BFF]/15 text-[#35A7FF] font-mono border border-[#35A7FF]/30">
                                Ready
                              </span>
                            )}
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quality Menu - Landscape / Fullscreen Only */}
              {isFullscreen && streamInfo?.qualities && streamInfo.qualities.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsQualityMenuOpen((prev) => !prev);
                      setIsSpeedMenuOpen(false);
                      setIsLanguageMenuOpen(false);
                      setIsEpisodesMenuOpen(false);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0B1224]/90 hover:bg-[#16223D] border border-white/[0.08] text-xs font-semibold text-[#F5F7FF] cursor-pointer transition-colors min-h-[36px]"
                    title="Video Quality"
                  >
                    <Sliders className="w-3.5 h-3.5 text-[#35A7FF]" />
                    <span className="font-mono text-[11px]">{selectedQuality.replace(/ Direct.*/i, '')}</span>
                  </button>

                  {isQualityMenuOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-2 w-40 bg-[#0B1224] border border-white/[0.08] rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 animate-fade-in"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#8D9AB5] px-2 py-1 font-mono">
                        Quality
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectQuality('Auto')}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          selectedQuality === 'Auto'
                            ? 'bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white font-bold shadow-[0_2px_8px_rgba(23,107,255,0.35)]'
                            : 'text-gray-300 hover:bg-[#16223D]'
                        }`}
                      >
                        <span>Auto (Adaptive)</span>
                        {selectedQuality === 'Auto' && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                      </button>

                      {streamInfo.qualities.map((q, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectQuality(q.quality)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                            selectedQuality === q.quality
                              ? 'bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white font-bold shadow-[0_2px_8px_rgba(23,107,255,0.35)]'
                              : 'text-gray-300 hover:bg-[#16223D]'
                          }`}
                        >
                          <span>{q.quality.replace(/ Direct.*/i, '')}</span>
                          {selectedQuality === q.quality && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center Play/Pause & Quick Skip Controls */}
          <div
            className={`my-auto pointer-events-auto flex items-center justify-center gap-8 sm:gap-14 transition-opacity duration-200 ${
              (loading || isBuffering) ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSkip(-10);
              }}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 border border-white/15 text-white/90 hover:text-[#35A7FF] flex items-center justify-center cursor-pointer transition-all backdrop-blur-md press-feedback"
              title="Rewind 10 seconds"
              aria-label="Rewind 10 seconds"
            >
              <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-[#35A7FF]" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlayPause();
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-[#176BFF] to-[#35A7FF] hover:brightness-110 active:scale-95 text-white flex items-center justify-center cursor-pointer transition-all shadow-[0_8px_30px_rgba(23,107,255,0.45)] press-feedback"
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 sm:w-9 sm:h-9 fill-current" />
              ) : (
                <Play className="w-7 h-7 sm:w-9 sm:h-9 fill-current ml-1" />
              )}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSkip(10);
              }}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 border border-white/15 text-white/90 hover:text-[#35A7FF] flex items-center justify-center cursor-pointer transition-all backdrop-blur-md press-feedback"
              title="Forward 10 seconds"
              aria-label="Forward 10 seconds"
            >
              <RotateCw className="w-5 h-5 sm:w-6 sm:h-6 text-[#35A7FF]" />
            </button>
          </div>

          {/* Bottom Bar: Full edge-to-edge width with device safe-area insets */}
          <div
            className="w-full flex flex-col gap-2.5 pointer-events-auto bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-6 pb-3 px-4 sm:px-8"
            style={{
              paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
              paddingLeft: 'max(16px, env(safe-area-inset-left, 16px))',
              paddingRight: 'max(16px, env(safe-area-inset-right, 16px))',
            }}
          >
            {/* Timeline Scrub Bar (Atomic isolated sub-component: 0Hz parent re-renders) */}
            <PlaybackProgress
              videoRef={videoRef}
              triggerShowControls={triggerShowControls}
              commitSeek={commitSeek}
            />

            {/* Bottom Controls Row */}
            <div className="flex items-center justify-between text-white text-xs sm:text-sm">
              {/* Left Controls: Play/Pause, ±10s Skip, Time, Volume */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Duplicate Play/Pause & ±10s Skips - Landscape / Fullscreen Only */}
                {isFullscreen && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlayPause();
                      }}
                      className="w-10 h-10 rounded-xl text-white hover:text-[#35A7FF] active:bg-white/10 flex items-center justify-center cursor-pointer transition-colors press-feedback"
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSkip(-10);
                      }}
                      className="w-9 h-9 rounded-xl text-gray-300 hover:text-white active:bg-white/10 flex items-center justify-center cursor-pointer transition-colors press-feedback"
                      title="Rewind 10 seconds"
                      aria-label="Rewind 10 seconds"
                    >
                      <RotateCcw className="w-4 h-4 text-[#35A7FF]" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSkip(10);
                      }}
                      className="w-9 h-9 rounded-xl text-gray-300 hover:text-white active:bg-white/10 flex items-center justify-center cursor-pointer transition-colors press-feedback"
                      title="Forward 10 seconds"
                      aria-label="Forward 10 seconds"
                    >
                      <RotateCw className="w-4 h-4 text-[#35A7FF]" />
                    </button>
                  </>
                )}

                {/* Time Display (Atomic isolated sub-component) */}
                <PlaybackTime videoRef={videoRef} />

                {/* Volume & Mute - Landscape Only */}
                {isFullscreen && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute();
                    }}
                    className="w-9 h-9 rounded-xl text-gray-300 hover:text-white active:bg-white/10 flex items-center justify-center cursor-pointer transition-colors press-feedback ml-1"
                    title={isMuted ? 'Unmute' : 'Mute'}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                )}

                {/* Landscape On-Screen Brightness Slider */}
                {isFullscreen && (
                  <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md ml-2">
                    <Sun className="w-3.5 h-3.5 text-[#35A7FF]" />
                    <input
                      type="range"
                      min={0.1}
                      max={1.0}
                      step={0.02}
                      value={brightness}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setBrightness(val);
                        try {
                          localStorage.setItem('cinevault_player_brightness', val.toFixed(2));
                        } catch {}
                        setActiveGesture('brightness');
                        setGestureValue(Math.round(val * 100));
                        if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
                        gestureTimeoutRef.current = setTimeout(() => setActiveGesture(null), 1000);
                      }}
                      className="w-16 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#176BFF]"
                      title="Screen Brightness"
                    />
                    <span className="font-mono text-[10px] text-gray-300 w-7 text-right">{Math.round(brightness * 100)}%</span>
                  </div>
                )}

                {/* Landscape On-Screen Volume Slider */}
                {isFullscreen && (
                  <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md">
                    <Volume2 className="w-3.5 h-3.5 text-[#35A7FF]" />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (videoRef.current) {
                          videoRef.current.volume = val;
                          if (val > 0 && videoRef.current.muted) {
                            videoRef.current.muted = false;
                            setIsMuted(false);
                          }
                        }
                        setVolume(val);
                        if (val === 0) setIsMuted(true);
                        else if (isMuted) setIsMuted(false);
                        setActiveGesture('volume');
                        setGestureValue(Math.round(val * 100));
                        if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
                        gestureTimeoutRef.current = setTimeout(() => setActiveGesture(null), 1000);
                      }}
                      className="w-16 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#176BFF]"
                      title="Audio Volume"
                    />
                    <span className="font-mono text-[10px] text-gray-300 w-7 text-right">{isMuted ? '0%' : `${Math.round(volume * 100)}%`}</span>
                  </div>
                )}
              </div>

              {/* Right Controls: Screen Fit (Landscape only), TV Episodes Switcher & Fullscreen */}
              <div className="flex items-center gap-2">
                {/* Screen Aspect Ratio Fit Toggle - Available in ALL orientations */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cycleFitMode();
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0E1726]/90 hover:bg-[#16223D] active:bg-[#060911] border border-white/10 text-xs font-semibold text-[#F5F7FF] cursor-pointer transition-colors min-h-[36px]"
                  title={`Screen Fit: ${fitMode === 'contain' ? 'Fit Screen' : fitMode === 'cover' ? 'Full Screen' : 'Fill Screen'}`}
                  aria-label="Toggle Screen Fit"
                >
                  <Scan className="w-3.5 h-3.5 text-[#35A7FF]" />
                  <span className="font-mono text-[11px] font-semibold whitespace-nowrap">
                    {fitMode === 'contain' ? 'Fit Screen' : fitMode === 'cover' ? 'Full Screen' : 'Fill Screen'}
                  </span>
                </button>

                {/* TV Series Episode & Season Drawer Trigger */}
                {isTv && (
                  <div className="flex items-center gap-1 sm:gap-2">
                    {/* Next Episode Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextEpisode();
                      }}
                      className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-[#0B1224]/90 hover:bg-[#16223D] active:bg-[#050A18] border border-white/[0.08] text-xs font-semibold text-[#F5F7FF] cursor-pointer transition-colors min-h-[36px]"
                      title="Next Episode"
                    >
                      <SkipForward className="w-3.5 h-3.5 text-[#35A7FF]" />
                      <span className="hidden sm:inline">Next Ep</span>
                    </button>

                    {/* Seasons & Episodes Menu Trigger */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBrowsingSeason(currentSeason);
                        setIsEpisodesMenuOpen((prev) => !prev);
                        setIsQualityMenuOpen(false);
                        setIsSpeedMenuOpen(false);
                      }}
                      className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#0B1224]/90 hover:bg-[#16223D] active:bg-[#050A18] border border-white/[0.08] text-xs font-semibold text-[#F5F7FF] cursor-pointer transition-colors min-h-[36px]"
                      title="Seasons & Episodes"
                    >
                      <ListOrdered className="w-4 h-4 text-[#35A7FF]" />
                      <span className="font-mono text-xs text-[#35A7FF]">S{currentSeason}:E{currentEpisode}</span>
                    </button>
                  </div>
                )}

                {/* Fullscreen Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFullscreen();
                  }}
                  className="w-10 h-10 rounded-xl text-gray-300 hover:text-white active:bg-white/10 flex items-center justify-center cursor-pointer transition-colors press-feedback"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-featured Seasons & Episodes Drawer / Modal */}
      {isTv && isEpisodesMenuOpen && !isMinimized && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsEpisodesMenuOpen(false);
          }}
          className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:w-[480px] max-h-[85vh] sm:max-h-[90vh] bg-[#0B1224] border-t sm:border border-white/[0.08] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up sm:animate-fade-in"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#050A18]">
              <div className="min-w-0 pr-2">
                <h3 className="text-base font-bold text-[#F5F7FF] font-headline truncate">
                  {currentMovie.title}
                </h3>
                <p className="text-xs text-[#8D9AB5] mt-0.5 font-medium">
                  Now Playing: <span className="text-[#35A7FF] font-bold font-mono">Season {currentSeason} • Episode {currentEpisode}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEpisodesMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-[#16223D] hover:bg-[#111B33] text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Season Selector Tabs */}
            {allSeasons.length > 1 && (
              <div className="px-4 py-3 border-b border-white/[0.08] bg-[#050A18]/60">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#8D9AB5] mb-2 font-mono flex items-center justify-between">
                  <span>Select Season</span>
                  <span className="text-[#35A7FF] text-[10px]">Browsing Season {browsingSeason}</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {allSeasons.map((s) => {
                    const sNum = s.season_number;
                    const isBrowsing = browsingSeason === sNum;
                    const isCurrent = currentSeason === sNum;
                    return (
                      <button
                        key={sNum}
                        type="button"
                        onClick={() => {
                          queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
                          setBrowsingSeason(sNum);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer press-feedback flex items-center gap-1.5 ${
                          isBrowsing
                            ? 'bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white shadow-[0_2px_8px_rgba(23,107,255,0.35)] font-extrabold'
                            : 'bg-[#0E172B] text-gray-300 hover:bg-[#16223D] hover:text-white border border-white/[0.08]'
                        }`}
                      >
                        <span>Season {sNum}</span>
                        {isCurrent && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isBrowsing ? 'bg-white' : 'bg-[#35A7FF]'}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Episodes List / Grid */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[50vh] sm:max-h-[55vh]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#F5F7FF] uppercase tracking-wider font-mono">
                  Season {browsingSeason} Episodes ({activeEpisodesList.length})
                </span>
                {browsingSeason !== currentSeason && (
                  <span className="text-[11px] text-[#35A7FF] font-medium">
                    Tap episode to switch season
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {activeEpisodesList.map((ep) => {
                  const epNum = ep.episode_number;
                  const isSelected = browsingSeason === currentSeason && epNum === currentEpisode;
                  return (
                    <button
                      key={epNum}
                      type="button"
                      onClick={() => handleSelectSeasonAndEpisode(browsingSeason, epNum)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer press-feedback flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#176BFF]/15 border-[#35A7FF] shadow-[0_0_15px_rgba(23,107,255,0.25)]'
                          : 'bg-[#0E172B] border-white/[0.08] hover:bg-[#16223D] hover:border-[#35A7FF]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold font-mono ${isSelected ? 'text-[#35A7FF]' : 'text-[#F5F7FF]'}`}>
                          Episode {epNum}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#176BFF] text-white">
                            Playing
                          </span>
                        )}
                      </div>
                      {ep.title && ep.title !== `Episode ${epNum}` && (
                        <span className="text-[11px] text-[#8D9AB5] line-clamp-1 mt-1 font-normal">
                          {ep.title}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="p-3 border-t border-white/[0.08] bg-[#050A18] flex items-center justify-between">
              <button
                type="button"
                onClick={handleNextEpisode}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0E172B] hover:bg-[#16223D] text-xs font-bold text-[#F5F7FF] transition-colors cursor-pointer border border-white/[0.08]"
              >
                <SkipForward className="w-3.5 h-3.5 text-[#35A7FF]" />
                <span>Next Episode</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEpisodesMenuOpen(false)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white text-xs font-bold hover:brightness-110 shadow-[0_2px_10px_rgba(23,107,255,0.35)] transition-all cursor-pointer"
              >
                Back to Player
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';
export default VideoPlayer;
