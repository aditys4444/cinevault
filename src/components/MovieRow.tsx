import React, { useRef, useCallback, memo } from 'react';
import type { Movie, MovieShelf } from '../types/movie';
import { MovieCard } from './MovieCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MovieRowProps {
  shelf: MovieShelf;
  onSelectMovie: (movie: Movie) => void;
  priorityRow?: boolean;
}

export const MovieRow: React.FC<MovieRowProps> = memo(({ shelf, onSelectMovie, priorityRow = false }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    const distance = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  }, []);

  if (!shelf.items || shelf.items.length === 0) return null;

  return (
    <section
      className="relative py-2.5 sm:py-3.5 cv-lazy-section"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 240px' }}
    >
      {/* Shelf Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-4.5 rounded-full bg-gradient-to-b from-[#176BFF] to-[#35A7FF] shadow-[0_0_10px_rgba(53,167,255,0.7)]" />
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-[#F5F7FF] tracking-tight font-headline">
            {shelf.title}
          </h3>
        </div>
        <span className="text-xs font-semibold text-[#35A7FF] hover:text-[#52c5ff] transition-colors cursor-pointer flex items-center gap-1 select-none">
          Explore All
        </span>
      </div>

      {/* Row Carousel Area */}
      <div className="relative group/row">
        {/* Desktop Left Scroll Button */}
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => handleScroll('left')}
          className="hidden md:flex absolute -left-1 top-1/2 -translate-y-1/2 z-20 w-10 h-24 items-center justify-center bg-[#0E1726]/90 hover:bg-[#16223D] active:bg-[#060911] text-[#8D9AB5] hover:text-[#35A7FF] rounded-r-xl border-y border-r border-[#1E293B]/70 opacity-0 group-hover/row:opacity-100 transition-all cursor-pointer shadow-lg press-feedback backdrop-blur-md"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Horizontal Items Container with Scroll-Snap */}
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-none px-4 sm:px-6 md:px-8 scroll-smooth scroll-snap-x"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {shelf.items.map((movie, idx) => (
            <div
              key={`${movie.id}_${idx}`}
              className={priorityRow ? 'animate-stagger-in' : ''}
              style={priorityRow ? { animationDelay: `${Math.min(idx * 40, 240)}ms` } : undefined}
            >
              <MovieCard
                movie={movie}
                onSelect={onSelectMovie}
                priority={priorityRow && idx < 6}
              />
            </div>
          ))}
        </div>

        {/* Desktop Right Scroll Button */}
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => handleScroll('right')}
          className="hidden md:flex absolute -right-1 top-1/2 -translate-y-1/2 z-20 w-10 h-24 items-center justify-center bg-[#0E1726]/90 hover:bg-[#16223D] active:bg-[#060911] text-[#8D9AB5] hover:text-[#35A7FF] rounded-l-xl border-y border-l border-[#1E293B]/70 opacity-0 group-hover/row:opacity-100 transition-all cursor-pointer shadow-lg press-feedback backdrop-blur-md"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </section>
  );
});

MovieRow.displayName = 'MovieRow';
