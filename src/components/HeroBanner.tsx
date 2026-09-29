import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import type { Movie } from '../types/movie';
import { Play, Info, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { movieboxService } from '../services/movieboxService';

interface HeroBannerProps {
  movie?: Movie | null;
  movies?: Movie[];
  onPlayMovie: (movie: Movie) => void;
  onSelectMovie: (movie: Movie) => void;
}

const FALLBACK_URL = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1920&q=80';

export const HeroBanner: React.FC<HeroBannerProps> = memo(({
  movie,
  movies,
  onPlayMovie,
  onSelectMovie,
}) => {
  // Normalize candidate list of hero titles
  const candidateList = React.useMemo(() => {
    if (movies && movies.length > 0) return movies.filter(Boolean);
    if (movie) return [movie];
    return [];
  }, [movies, movie]);

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const touchStartRef = useRef<number | null>(null);
  const touchMoveRef = useRef<number | null>(null);
  const autoPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHoveredRef = useRef<boolean>(false);

  // Keep index within bounds if list updates
  useEffect(() => {
    if (activeIndex >= candidateList.length) {
      setActiveIndex(0);
    }
  }, [candidateList.length, activeIndex]);

  const currentMovie = candidateList[activeIndex] || null;

  // Pre-warm featured stream for current title in background
  useEffect(() => {
    if (!currentMovie?.id) return;
    const timer = setTimeout(() => {
      movieboxService
        .getStreams(
          currentMovie.id,
          currentMovie.detailPath,
          currentMovie.media_type,
          currentMovie.media_type === 'tv' ? 1 : undefined,
          currentMovie.media_type === 'tv' ? 1 : undefined,
          currentMovie.title
        )
        .catch(() => {});
    }, 4000);
    return () => clearTimeout(timer);
  }, [currentMovie?.id, currentMovie?.detailPath, currentMovie?.media_type, currentMovie?.title]);

  // Slide navigation
  const handleNext = useCallback(() => {
    if (candidateList.length <= 1) return;
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(6); });
    setActiveIndex((prev) => (prev + 1) % candidateList.length);
  }, [candidateList.length]);

  const handlePrev = useCallback(() => {
    if (candidateList.length <= 1) return;
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(6); });
    setActiveIndex((prev) => (prev - 1 + candidateList.length) % candidateList.length);
  }, [candidateList.length]);

  const handleGoToSlide = useCallback((index: number) => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(6); });
    setActiveIndex(index);
  }, []);

  // Automatic slide rotation every 7 seconds unless interacted/hovered
  const resetTimer = useCallback(() => {
    if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    if (candidateList.length > 1) {
      autoPlayTimerRef.current = setInterval(() => {
        if (!isHoveredRef.current) {
          setActiveIndex((prev) => (prev + 1) % candidateList.length);
        }
      }, 7000);
    }
  }, [candidateList.length]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [resetTimer]);

  // Touch Swipe Handlers (Swipe left -> Next, Swipe right -> Prev)
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = e.touches[0].clientX;
      touchMoveRef.current = null;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchMoveRef.current = e.touches[0].clientX;
    }
  };

  const onTouchEnd = () => {
    if (touchStartRef.current !== null && touchMoveRef.current !== null) {
      const diffX = touchStartRef.current - touchMoveRef.current;
      if (Math.abs(diffX) > 45) {
        if (diffX > 0) {
          handleNext();
        } else {
          handlePrev();
        }
        resetTimer();
      }
    }
    touchStartRef.current = null;
    touchMoveRef.current = null;
  };

  const handlePlay = useCallback(() => {
    if (!currentMovie) return;
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    setIsStarting(true);
    onPlayMovie(currentMovie);
    setTimeout(() => setIsStarting(false), 800);
  }, [currentMovie, onPlayMovie]);

  const handleSelect = useCallback(() => {
    if (!currentMovie) return;
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    onSelectMovie(currentMovie);
  }, [currentMovie, onSelectMovie]);

  if (!currentMovie) {
    return (
      <div className="relative w-full h-[50vh] sm:h-[56vh] md:h-[66vh] min-h-[340px] max-h-[640px] bg-[#060911] animate-pulse flex items-end p-6 sm:p-10">
        <div className="w-full max-w-xl space-y-4">
          <div className="h-10 w-3/4 bg-white/10 rounded-xl" />
          <div className="h-16 w-full bg-white/5 rounded-xl" />
          <div className="flex gap-3">
            <div className="h-12 w-28 bg-white/10 rounded-xl" />
            <div className="h-12 w-28 bg-white/10 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const isTv = currentMovie.media_type === 'series' || currentMovie.media_type === 'tv';
  const hasError = imageErrorMap[currentMovie.id];
  const bgImage = !hasError && (currentMovie.backdrop || currentMovie.poster)
    ? (currentMovie.backdrop || currentMovie.poster)
    : FALLBACK_URL;

  return (
    <div
      className="relative w-full h-[54vh] sm:h-[60vh] md:h-[68vh] min-h-[380px] max-h-[620px] bg-[#060911] overflow-hidden select-none group/hero"
      onMouseEnter={() => { isHoveredRef.current = true; }}
      onMouseLeave={() => { isHoveredRef.current = false; }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Background Hero Backdrop Image */}
      <img
        key={currentMovie.id}
        src={bgImage}
        alt={currentMovie.title}
        fetchPriority="high"
        loading="eager"
        decoding="async"
        onError={() => {
          setImageErrorMap((prev) => ({ ...prev, [currentMovie.id]: true }));
        }}
        className="absolute inset-0 w-full h-full object-cover object-center transform scale-[1.02] transition-opacity duration-700 ease-out"
        style={{ willChange: 'opacity, transform' }}
      />

      {/* 4-Stop Cinematic Vignette Blend into #060911 & Sapphire Glow */}
      <div className="absolute inset-0 hero-vignette pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#060911]/95 via-[#060911]/50 to-transparent w-full md:w-3/4 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_75%,rgba(23,107,255,0.24)_0%,transparent_60%)] pointer-events-none" />

      {/* Left Navigation Arrow (Desktop/Tablet) */}
      {candidateList.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
            resetTimer();
          }}
          aria-label="Previous trending title"
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full bg-[#0E1726]/75 hover:bg-[#16223D] active:bg-[#060911] text-white border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-xl opacity-0 group-hover/hero:opacity-100 transition-all cursor-pointer press-feedback"
        >
          <ChevronLeft className="w-6 h-6 text-[#35A7FF]" />
        </button>
      )}

      {/* Right Navigation Arrow (Desktop/Tablet) */}
      {candidateList.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
            resetTimer();
          }}
          aria-label="Next trending title"
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full bg-[#0E1726]/75 hover:bg-[#16223D] active:bg-[#060911] text-white border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-xl opacity-0 group-hover/hero:opacity-100 transition-all cursor-pointer press-feedback"
        >
          <ChevronRight className="w-6 h-6 text-[#35A7FF]" />
        </button>
      )}

      {/* Hero Content Overlay (No badges above title as requested) */}
      <div className="relative z-10 h-full flex flex-col justify-end px-4 sm:px-8 md:px-12 pb-6 sm:pb-8 max-w-2xl lg:max-w-3xl">
        {/* Title */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight line-clamp-2 drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)] font-headline">
          {currentMovie.title}
        </h1>

        {/* Overview */}
        <p className="mt-2 text-xs sm:text-sm text-[#94A3B8] line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-xl font-body">
          {currentMovie.overview}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 sm:gap-3 mt-4 sm:mt-5 w-full sm:w-auto">
          <button
            type="button"
            disabled={isStarting}
            onClick={handlePlay}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 sm:px-7 py-3 rounded-xl bg-gradient-to-r from-[#176BFF] to-[#00D2FF] hover:brightness-110 active:scale-[0.97] text-white font-extrabold text-sm sm:text-base min-h-[48px] shadow-[0px_8px_24px_-4px_rgba(23,107,255,0.6),0px_0px_12px_rgba(0,210,255,0.3)] transition-all press-feedback cursor-pointer disabled:opacity-80"
          >
            {isStarting ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            ) : (
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            )}
            <span>{isStarting ? 'Launching...' : (isTv ? 'Play Series' : 'Play Film')}</span>
          </button>

          <button
            type="button"
            onClick={handleSelect}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-xl bg-[#0E1726]/80 hover:bg-[#14223A] active:bg-[#0E1726] text-white font-semibold text-sm sm:text-base min-h-[48px] border border-white/15 hover:border-[#35A7FF]/40 backdrop-blur-xl transition-all active:scale-[0.97] press-feedback cursor-pointer"
          >
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-[#35A7FF]" />
            <span>Watchlist</span>
          </button>
        </div>
      </div>

      {/* Slide Navigation Dots / Indicator Capsules */}
      {candidateList.length > 1 && (
        <div className="absolute bottom-5 right-4 sm:right-8 z-20 flex items-center gap-1.5 bg-[#060911]/60 px-2.5 py-1.5 rounded-full border border-white/[0.08] backdrop-blur-md">
          {candidateList.map((m, idx) => (
            <button
              key={`${m.id}_${idx}`}
              type="button"
              onClick={() => {
                handleGoToSlide(idx);
                resetTimer();
              }}
              aria-label={`Go to slide ${idx + 1}: ${m.title}`}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                idx === activeIndex
                  ? 'w-6 h-1.5 bg-[#35A7FF] shadow-[0_0_8px_#35A7FF]'
                  : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
});

HeroBanner.displayName = 'HeroBanner';
