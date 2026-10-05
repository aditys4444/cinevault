import React, { useState, useEffect, useCallback, memo } from 'react';
import type { Movie } from '../types/movie';
import { Film } from 'lucide-react';

interface MovieCardProps {
  movie: Movie;
  onSelect: (movie: Movie) => void;
  priority?: boolean;
}

const FALLBACK_POSTER_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450" fill="#0E172B"><rect width="300" height="450" fill="#0E172B"/><circle cx="150" cy="200" r="36" fill="#17223D"/><polygon points="142,186 166,200 142,214" fill="#35A7FF"/><rect x="75" y="270" width="150" height="12" rx="6" fill="#1E293B"/><rect x="100" y="295" width="100" height="8" rx="4" fill="#17223D"/></svg>'
)}`;

export const MovieCard: React.FC<MovieCardProps> = memo(({ movie, onSelect, priority = false }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset image states if movie updates
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [movie.id, movie.poster]);

  const handleCardClick = useCallback(() => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(6); });
    onSelect(movie);
  }, [movie, onSelect]);

  const posterSrc = !imageError && movie.poster ? movie.poster : FALLBACK_POSTER_SVG;
  const isTv = movie.media_type === 'series' || movie.media_type === 'tv';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className="group relative flex flex-col w-[130px] sm:w-[155px] md:w-[175px] shrink-0 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#176BFF] rounded-xl press-feedback sm:hover:scale-[1.03] transition-transform duration-200 scroll-snap-start"
    >
      {/* Poster Image Container */}
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-[#0E1726] border border-[#1E293B] sm:group-hover:border-[#35A7FF]/50 shadow-[0_4px_16px_rgba(6,9,17,0.7)] sm:group-hover:shadow-[0_8px_25px_rgba(23,107,255,0.3)] transition-all duration-200">
        {/* Lightweight static placeholder while loading (0% GPU/CPU overhead) */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-[#0E1726] flex items-center justify-center">
            <Film className="w-6 h-6 text-white/10" />
          </div>
        )}

        <img
          src={posterSrc}
          alt={movie.title}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(true);
          }}
          className={`w-full h-full object-cover transition-opacity duration-200 sm:group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Subtle Dark Overlay on hover */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>

      {/* Metadata */}
      <div className="mt-2 flex flex-col px-0.5">
        <h4 className="text-[13px] sm:text-sm font-semibold text-[#F5F7FF] truncate group-hover:text-[#35A7FF] transition-colors leading-snug" title={movie.title}>
          {movie.title}
        </h4>
        <div className="flex items-center gap-1.5 text-[11px] text-[#8D9AB5] mt-0.5">
          <span className="text-[#35A7FF] font-medium">{movie.release_year || (isTv ? 'Series' : 'Film')}</span>
          {movie.genres && movie.genres.length > 0 && (
            <>
              <span className="text-white/20">•</span>
              <span className="truncate">{movie.genres[0]}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

MovieCard.displayName = 'MovieCard';
