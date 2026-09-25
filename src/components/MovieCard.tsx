import React, { useState, useEffect, useCallback, memo } from 'react';
import type { Movie } from '../types/movie';
import { Film, Tv } from 'lucide-react';

interface MovieCardProps {
  movie: Movie;
  onSelect: (movie: Movie) => void;
  priority?: boolean;
}

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

  const fallbackPoster = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=400&q=75';
  const posterSrc = !imageError && movie.poster ? movie.poster : fallbackPoster;
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
      className="group relative flex flex-col w-[130px] sm:w-[155px] md:w-[175px] shrink-0 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F0B429] rounded-xl press-feedback sm:hover:scale-[1.03] scroll-snap-start"
    >
      {/* Poster Image Container */}
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-[#15181D] border border-[#292E35] sm:group-hover:border-[#F0B429]/50 shadow-[var(--shadow-card)] sm:group-hover:shadow-[var(--shadow-card-hover)] transition-colors duration-150">
        {/* Shimmer skeleton while loading */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-[#15181D] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.05] before:to-transparent" />
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
          className={`w-full h-full object-cover transition-opacity duration-300 sm:group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Coming Soon Indicator */}
        {movie.is_coming_soon && (
          <div className="absolute top-2 left-2 flex items-center px-1.5 py-0.5 rounded-md bg-[#F0B429] text-[9px] font-bold text-[#0B0D10] shadow-sm uppercase tracking-wider">
            Soon
          </div>
        )}

        {/* Media Type Badge */}
        <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#0B0D10]/95 text-[10px] font-medium text-[#9A9FA8] border border-[#292E35]/80 shadow-sm">
          {isTv ? <Tv className="w-2.5 h-2.5 text-blue-400" /> : <Film className="w-2.5 h-2.5 text-[#F0B429]" />}
          <span className="font-mono uppercase">{isTv ? 'TV' : 'Movie'}</span>
        </div>

        {/* Subtle Dark Overlay on hover */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>

      {/* Metadata */}
      <div className="mt-2 flex flex-col px-0.5">
        <h4 className="text-[13px] sm:text-sm font-semibold text-[#F5F5F2] truncate group-hover:text-[#F0B429] transition-colors leading-snug" title={movie.title}>
          {movie.title}
        </h4>
      </div>
    </div>
  );
});

MovieCard.displayName = 'MovieCard';
