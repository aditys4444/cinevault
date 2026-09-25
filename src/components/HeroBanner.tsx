import React, { useState, useEffect, useCallback, memo } from 'react';
import type { Movie } from '../types/movie';
import { Play, Info, Loader2 } from 'lucide-react';
import { movieboxService } from '../services/movieboxService';

interface HeroBannerProps {
  movie: Movie | null;
  onPlayMovie: (movie: Movie) => void;
  onSelectMovie: (movie: Movie) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = memo(({ movie, onPlayMovie, onSelectMovie }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
    setIsStarting(false);
  }, [movie?.id]);

  // Pre-warm featured hero stream in background after initial catalog has settled
  useEffect(() => {
    if (!movie?.id) return;
    const timer = setTimeout(() => {
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
    }, 5000);
    return () => clearTimeout(timer);
  }, [movie?.id, movie?.detailPath, movie?.media_type, movie?.title]);

  const handlePlay = useCallback(() => {
    if (!movie) return;
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    setIsStarting(true);
    onPlayMovie(movie);
    setTimeout(() => setIsStarting(false), 800);
  }, [movie, onPlayMovie]);

  const handleSelect = useCallback(() => {
    if (!movie) return;
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    onSelectMovie(movie);
  }, [movie, onSelectMovie]);

  if (!movie) {
    return (
      <div className="relative w-full h-[50vh] sm:h-[56vh] md:h-[66vh] min-h-[340px] max-h-[640px] bg-[#0E131F] animate-pulse flex items-end p-6 sm:p-10">
        <div className="w-full max-w-xl space-y-4">
          <div className="h-6 w-24 bg-white/10 rounded-lg" />
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

  const fallbackUrl = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1920&q=80';
  const bgImage = !imageError && (movie.backdrop || movie.poster) ? (movie.backdrop || movie.poster) : fallbackUrl;

  return (
    <div className="relative w-full h-[50vh] sm:h-[56vh] md:h-[66vh] min-h-[340px] max-h-[640px] bg-[#0B0D10] overflow-hidden select-none">
      {/* Background Image with Smooth Fade-in */}
      <img
        src={bgImage}
        alt={movie.title}
        fetchPriority="high"
        loading="eager"
        decoding="async"
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        className={`absolute inset-0 w-full h-full object-cover object-center transform scale-[1.02] transition-opacity duration-500 ease-out ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ willChange: 'opacity, transform' }}
      />

      {/* Crystal-Clear Bottom & Text Gradient (Vivid Backdrop Visibility) */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D10] via-[#0B0D10]/35 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B0D10]/75 via-[#0B0D10]/20 to-transparent w-full md:w-1/2 pointer-events-none" />

      {/* Hero Content */}
      <div className="relative z-10 h-full flex flex-col justify-end px-4 sm:px-8 md:px-12 pb-6 sm:pb-8 max-w-2xl lg:max-w-3xl">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-2 sm:mb-2.5 flex-wrap">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#F0B429] text-[#0B0D10] font-mono shadow-sm">
            Featured Premiere
          </span>
          <span className="text-xs text-[#9A9FA8] font-medium font-mono">{movie.release_year || 2024}</span>
          {movie.duration && (
            <>
              <span className="text-xs text-[#292E35]">•</span>
              <span className="text-xs text-[#9A9FA8] font-mono">{movie.duration}</span>
            </>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-[#F5F5F2] tracking-tight leading-tight line-clamp-2 drop-shadow-md font-headline">
          {movie.title}
        </h1>

        {/* Overview */}
        <p className="mt-1.5 sm:mt-2.5 text-xs sm:text-sm text-[#9A9FA8] line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-xl font-body">
          {movie.overview}
        </p>

        {/* Action Buttons — Compliant with Android 48dp minimum touch target */}
        <div className="flex items-center gap-2.5 sm:gap-3 mt-4 sm:mt-5 w-full sm:w-auto">
          <button
            type="button"
            disabled={isStarting}
            onClick={handlePlay}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-xl bg-[#F0B429] hover:bg-[#E4BA65] active:bg-[#D99E0B] text-[#0B0D10] font-bold text-sm sm:text-base min-h-[48px] shadow-[var(--shadow-button)] transition-all press-feedback cursor-pointer disabled:opacity-80"
          >
            {isStarting ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            ) : (
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            )}
            <span>{isStarting ? 'Launching...' : 'Play Film'}</span>
          </button>

          <button
            type="button"
            onClick={handleSelect}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-xl bg-[#15181D] hover:bg-[#1D2127] active:bg-[#0B0D10] text-[#F5F5F2] font-semibold text-sm sm:text-base min-h-[48px] border border-[#292E35] transition-all press-feedback cursor-pointer"
          >
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-[#F0B429]" />
            <span>Overview</span>
          </button>
        </div>
      </div>
    </div>
  );
});

HeroBanner.displayName = 'HeroBanner';
