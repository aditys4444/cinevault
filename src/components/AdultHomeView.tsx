import React, { useState, useMemo, useEffect, memo } from 'react';
import type { Movie } from '../types/movie';
import {
  getAdultCatalog,
  subscribeToAdultCatalog,
  syncRemoteAdultCatalog,
} from '../data/adultCatalog';
import { HeroBanner } from './HeroBanner';
import { MovieRow } from './MovieRow';
import { Flame, X } from 'lucide-react';

interface AdultHomeViewProps {
  onPlayMovie: (movie: Movie) => void;
  onSelectMovie: (movie: Movie) => void;
  onExitAdultMode: () => void;
}

export const AdultHomeView: React.FC<AdultHomeViewProps> = memo(({
  onPlayMovie,
  onSelectMovie,
  onExitAdultMode,
}) => {
  const [catalog, setCatalog] = useState(() => getAdultCatalog());
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    const unsubscribe = subscribeToAdultCatalog((updated) => {
      if (updated && Array.isArray(updated.rows)) {
        setCatalog(updated);
      }
    });
    syncRemoteAdultCatalog().catch(() => {});
    return unsubscribe;
  }, []);

  const filteredRows = useMemo(() => {
    if (activeCategory === 'all') return catalog.rows;
    return catalog.rows.filter((shelf) => shelf.id === activeCategory);
  }, [activeCategory, catalog]);

  // High-Performance Progressive Shelf Rendering for Low & Mid-tier Devices:
  // Render top 4 shelves immediately (0ms instant paint), then smoothly batch remaining shelves
  const [renderedShelfCount, setRenderedShelfCount] = useState<number>(4);

  // Reset to initial batch whenever user switches category filter tabs
  useEffect(() => {
    setRenderedShelfCount(4);
  }, [activeCategory]);

  useEffect(() => {
    if (renderedShelfCount >= filteredRows.length) return;
    const timer = setTimeout(() => {
      setRenderedShelfCount((prev) => Math.min(prev + 4, filteredRows.length));
    }, 60);
    return () => clearTimeout(timer);
  }, [renderedShelfCount, filteredRows.length]);

  return (
    <div className="view-transition-enter space-y-4">
      {/* 18+ Mode Indicator Bar (High-performance solid gradient without compositor blur) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-3">
        <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-red-950/70 via-[#0B1224] to-[#0B1224] border border-red-500/30 shadow-lg">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <Flame className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-[#F5F7FF] font-headline">
                  CineVault 18+ Content Vault
                </span>
                <span className="text-[10px] font-mono font-bold bg-red-600/30 text-red-300 border border-red-500/40 px-1.5 py-0.2 rounded-md uppercase">
                  Adults Only
                </span>
              </div>
              <p className="text-[11px] text-[#8D9AB5] truncate hidden sm:block">
                Showing uncensored adult dramas, erotic thrillers, late night & web series
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onExitAdultMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0E172B] hover:bg-[#16223D] active:bg-[#050A18] text-xs font-semibold text-[#8D9AB5] hover:text-[#F5F7FF] border border-white/[0.08] transition-colors cursor-pointer shrink-0 press-feedback"
            title="Return to standard CineVault"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Exit 18+</span>
          </button>
        </div>
      </div>

      {/* Featured 18+ Premiere Carousel */}
      {catalog.featured && (
        <HeroBanner
          movies={[
            catalog.featured,
            ...(catalog.rows[0]?.items || []).slice(0, 6),
          ]}
          movie={catalog.featured}
          onPlayMovie={onPlayMovie}
          onSelectMovie={onSelectMovie}
        />
      )}

      {/* Category Filter Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-2">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap press-feedback ${
              activeCategory === 'all'
                ? 'bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white shadow-[0_2px_8px_rgba(23,107,255,0.35)]'
                : 'bg-[#0E172B] text-[#8D9AB5] hover:text-[#F5F7FF] hover:bg-[#16223D] border border-white/[0.08]'
            }`}
          >
            All 18+ Titles ({catalog.total_titles || 0})
          </button>

          {catalog.rows.map((shelf) => (
            <button
              key={shelf.id}
              type="button"
              onClick={() => setActiveCategory(shelf.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap press-feedback ${
                activeCategory === shelf.id
                  ? 'bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white shadow-[0_2px_8px_rgba(23,107,255,0.35)]'
                  : 'bg-[#0E172B] text-[#8D9AB5] hover:text-[#F5F7FF] hover:bg-[#16223D] border border-white/[0.08]'
              }`}
            >
              {shelf.title} ({shelf.items.length})
            </button>
          ))}
        </div>
      </div>

      {/* Categorized 18+ Content Rows (Progressively Revealed) */}
      <div className="mt-2 space-y-2">
        {filteredRows.slice(0, renderedShelfCount).map((shelf, idx) => (
          <MovieRow
            key={shelf.id}
            shelf={shelf}
            onSelectMovie={onSelectMovie}
            priorityRow={idx < 2}
          />
        ))}
      </div>
    </div>
  );
});

AdultHomeView.displayName = 'AdultHomeView';
