import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import type { Movie, Season, StreamQuality } from '../types/movie';
import { movieboxService } from '../services/movieboxService';
import { cacheService } from '../services/cacheService';
import { BUNDLED_HOME_CATALOG } from '../data/homeCatalogBootstrap';
import { Play, X, Bookmark, Loader2, Download, Check, Share2, Sparkles, Star } from 'lucide-react';
import { DownloadQualityModal } from './DownloadQualityModal';

interface MovieDetailsModalProps {
  movie: Movie | null;
  onClose: () => void;
  onPlay: (movie: Movie, season?: number, episode?: number) => void;
  isWatchlisted: boolean;
  onToggleWatchlist: (movie: Movie) => void;
  onSelectMovie?: (movie: Movie) => void;
  catalogRows?: { id: string; title: string; items: Movie[] }[];
}

export const MovieDetailsModal: React.FC<MovieDetailsModalProps> = memo(({
  movie,
  onClose,
  onPlay,
  isWatchlisted,
  onToggleWatchlist,
  onSelectMovie,
  catalogRows,
}) => {
  const [details, setDetails] = useState<Partial<Movie> | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);

  // Quality selector modal state
  const [isQualityModalOpen, setIsQualityModalOpen] = useState(false);
  const [downloadQualities, setDownloadQualities] = useState<StreamQuality[]>([]);
  const [isResolvingQualities, setIsResolvingQualities] = useState(false);
  const [downloadTargetEpisode, setDownloadTargetEpisode] = useState<{ season: number; episode: number } | null>(null);

  const modalScrollRef = useRef<HTMLDivElement>(null);

  // Reset launch state when movie changes
  useEffect(() => {
    setIsLaunching(false);
  }, [movie?.id]);

  // Fetch complete details when modal opens
  useEffect(() => {
    if (!movie) {
      setDetails(null);
      return;
    }

    document.body.style.overflow = 'hidden';
    setSelectedSeason(1);
    setSelectedEpisode(1);

    let isMounted = true;
    movieboxService.getDetails(movie.id, movie.detailPath).then((d) => {
      if (isMounted && d) {
        setDetails(d);
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      isMounted = false;
    };
  }, [movie, onClose]);

  const handleClose = useCallback(() => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    onClose();
  }, [onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  const currentMovie: Movie | null = movie
    ? {
        ...movie,
        ...(details || {}),
      }
    : null;

  const seasons: Season[] = currentMovie?.seasons || [];
  const isTv = Boolean(
    (currentMovie?.media_type === 'series' || currentMovie?.media_type === 'tv') &&
    seasons.length > 0
  );

  const episodes = useMemo(() => {
    if (!isTv || seasons.length === 0) return [];
    const currentSeasonObj = seasons.find((s) => s.season_number === selectedSeason) || seasons[0];
    return currentSeasonObj ? currentSeasonObj.episodes : [];
  }, [isTv, seasons, selectedSeason]);

  // Instant zero-lag content suggestions directly from in-memory catalog
  const relatedMovies = useMemo(() => {
    if (!currentMovie) return [];
    const curId = currentMovie.id;
    const curTitle = (currentMovie.title || '').toLowerCase();
    const curGenres = (currentMovie.genres || []).map((g) => g.toLowerCase());
    const candidates: Movie[] = [];
    const seen = new Set<string>();

    const shelves = catalogRows && catalogRows.length > 0 ? catalogRows : (BUNDLED_HOME_CATALOG.rows || []);
    for (const shelf of shelves) {
      for (const item of shelf.items || []) {
        if (!item || !item.id || item.id === curId || seen.has(item.id)) continue;
        if (item.title?.toLowerCase() === curTitle) continue;
        seen.add(item.id);
        candidates.push(item);
      }
    }

    // Filter by matching genre
    const genreMatches = candidates.filter((item) =>
      (item.genres || []).some((g) => curGenres.includes(g.toLowerCase()))
    );

    if (genreMatches.length >= 6) {
      return genreMatches.slice(0, 10);
    }

    // Combine genre matches with other catalog blockbusters
    const combined = [...genreMatches];
    for (const item of candidates) {
      if (combined.length >= 8) break;
      if (!combined.some((c) => c.id === item.id)) {
        combined.push(item);
      }
    }
    return combined.slice(0, 8);
  }, [currentMovie?.id, currentMovie?.title, currentMovie?.genres, catalogRows]);

  const handleSelectSuggestedMovie = useCallback((sugMovie: Movie) => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    if (onSelectMovie) {
      onSelectMovie(sugMovie);
    } else {
      setDetails(null);
    }
    modalScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [onSelectMovie]);

  const handlePlayClick = () => {
    if (!currentMovie) return;
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(10); });
    setIsLaunching(true);
    if (isTv) {
      onPlay(currentMovie, selectedSeason, selectedEpisode);
    } else {
      onPlay(currentMovie);
    }
    setTimeout(() => setIsLaunching(false), 800);
  };

  const handleWatchlistClick = () => {
    if (!currentMovie) return;
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    onToggleWatchlist(currentMovie);
  };

  const handleOpenDownloadSelector = async (seasonNum?: number, episodeNum?: number) => {
    if (!currentMovie) return;
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });

    const targetSeason = seasonNum ?? (isTv ? selectedSeason : undefined);
    const targetEpisode = episodeNum ?? (isTv ? selectedEpisode : undefined);

    setDownloadTargetEpisode(targetSeason && targetEpisode ? { season: targetSeason, episode: targetEpisode } : null);
    setIsQualityModalOpen(true);
    setIsResolvingQualities(true);

    try {
      const streamInfo = await movieboxService.getStreams(
        currentMovie.id,
        currentMovie.detailPath,
        currentMovie.media_type,
        targetSeason,
        targetEpisode,
        currentMovie.title
      );

      if (streamInfo?.qualities && streamInfo.qualities.length > 0) {
        setDownloadQualities(streamInfo.qualities);
      } else if (streamInfo?.streamUrl) {
        setDownloadQualities([{
          quality: 'Original / 720p',
          resolution: '720p',
          url: streamInfo.streamUrl,
          isHls: Boolean(streamInfo.streamUrl.includes('.m3u8')),
        }]);
      } else {
        setDownloadQualities([]);
      }
    } catch {
      setDownloadQualities([]);
    } finally {
      setIsResolvingQualities(false);
    }
  };

  const handleSelectDownloadQuality = async (qualityItem: StreamQuality) => {
    if (!currentMovie) return;
    setIsDownloading(true);

    try {
      const targetSeason = downloadTargetEpisode?.season ?? (isTv ? selectedSeason : undefined);
      const targetEpisode = downloadTargetEpisode?.episode ?? (isTv ? selectedEpisode : undefined);

      await cacheService.startDownload(
        currentMovie,
        qualityItem.url,
        qualityItem.resolution || qualityItem.quality,
        targetSeason,
        targetEpisode
      );

      setDownloadFeedback(`Downloading at ${qualityItem.resolution || qualityItem.quality}`);
      setTimeout(() => setDownloadFeedback(null), 3500);
    } catch {
      setDownloadFeedback('Download failed. Please try another quality.');
      setTimeout(() => setDownloadFeedback(null), 3500);
    } finally {
      setIsDownloading(false);
      setIsQualityModalOpen(false);
    }
  };

  const handleShare = async () => {
    if (!currentMovie) return;
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });

    const shareData = {
      title: `${currentMovie.title} on CineVault`,
      text: `Watch ${currentMovie.title} in HD streaming on CineVault.`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        setDownloadFeedback('Link copied to clipboard');
        setTimeout(() => setDownloadFeedback(null), 2500);
      } catch {
        setDownloadFeedback('Unable to copy link');
        setTimeout(() => setDownloadFeedback(null), 2500);
      }
    }
  };

  if (!currentMovie) return null;

  const bannerImg = currentMovie.backdrop || currentMovie.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80';

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#050A18]/85 backdrop-blur-md sm:p-4 md:p-6 overflow-y-auto animate-backdrop-fade"
    >
      {/* Bottom Sheet on Mobile / Centered Card on Desktop */}
      <div
        ref={modalScrollRef}
        className="relative w-full max-w-2xl bg-[#0B1224] border-t sm:border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.85)] max-h-[92vh] sm:max-h-[85vh] overflow-y-auto animate-slide-in-bottom sm:animate-scale-in pb-8"
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 z-30 flex items-center justify-center w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 transition-all cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Clear Header Banner with Smooth Blend */}
        <div className="relative w-full aspect-video max-h-72 bg-[#0E172B] overflow-hidden">
          <img
            src={bannerImg}
            alt={currentMovie.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1224] via-[#0B1224]/50 to-transparent pointer-events-none" />
        </div>

        {/* Content Body — Simple, Spacious & High Clarity */}
        <div className="px-5 sm:px-6 -mt-10 relative z-10 space-y-4">
          {/* Title & Clean Metadata */}
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md">
              {currentMovie.title}
            </h2>

            {/* Single High-Contrast Metadata Line */}
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-[#94A3B8]">
              {currentMovie.rating ? (
                <span className="flex items-center gap-1 font-bold text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{Number(currentMovie.rating).toFixed(1)}</span>
                </span>
              ) : null}
              <span>•</span>
              <span className="font-medium text-white">{currentMovie.releaseDate || currentMovie.release_year || '2024'}</span>
              <span>•</span>
              <span className="text-[#35A7FF] font-semibold">{isTv ? 'TV Series' : (currentMovie.duration || 'Movie')}</span>
              {currentMovie.genres && currentMovie.genres.length > 0 && (
                <>
                  <span>•</span>
                  <span className="text-[#CBD5E1] truncate">{currentMovie.genres.slice(0, 3).join(', ')}</span>
                </>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              disabled={isLaunching}
              onClick={handlePlayClick}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-[#176BFF] to-[#35A7FF] hover:brightness-110 active:scale-[0.98] text-white font-bold text-sm min-h-[46px] shadow-lg shadow-[#176BFF]/30 transition-all cursor-pointer"
            >
              {isLaunching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>{isTv ? `Play S${selectedSeason} E${selectedEpisode}` : 'Play Movie'}</span>
            </button>

            <button
              type="button"
              disabled={isDownloading}
              onClick={() => handleOpenDownloadSelector()}
              className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-white/10 bg-[#0E172B] hover:bg-[#16223D] text-[#8D9AB5] hover:text-white text-xs font-semibold min-h-[46px] transition-all cursor-pointer"
              title="Download for offline playback"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#35A7FF]" />
              ) : (
                <Download className="w-4 h-4 text-[#35A7FF]" />
              )}
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              type="button"
              onClick={handleWatchlistClick}
              className={`flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border text-xs font-semibold min-h-[46px] transition-all cursor-pointer ${
                isWatchlisted
                  ? 'bg-[#176BFF]/20 border-[#35A7FF]/50 text-[#35A7FF]'
                  : 'bg-[#0E172B] border-white/10 hover:bg-[#16223D] text-[#8D9AB5] hover:text-white'
              }`}
              title="Save to Watchlist"
            >
              <Bookmark className={`w-4 h-4 ${isWatchlisted ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">{isWatchlisted ? 'Saved' : 'Watchlist'}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center p-3 rounded-xl border border-white/10 bg-[#0E172B] hover:bg-[#16223D] text-[#8D9AB5] hover:text-white min-h-[46px] transition-all cursor-pointer"
              title="Share"
            >
              <Share2 className="w-4 h-4 text-[#35A7FF]" />
            </button>
          </div>

          {/* Feedback Toast */}
          {downloadFeedback && (
            <div className="px-3 py-2 rounded-xl bg-[#176BFF]/15 border border-[#35A7FF]/30 text-[#35A7FF] text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{downloadFeedback}</span>
            </div>
          )}

          {/* Synopsis */}
          <div className="pt-2">
            <h4 className="text-xs font-semibold text-[#8D9AB5] uppercase tracking-wider mb-1.5 font-mono">
              Synopsis
            </h4>
            <p className="text-sm text-[#E2E8F0] leading-relaxed">
              {currentMovie.overview || 'No synopsis available for this title.'}
            </p>
          </div>

          {/* More Content Suggestions (Directly below Synopsis, Simple & Instant) */}
          {relatedMovies.length > 0 && (
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#35A7FF]" />
                  <span>More Content Suggestions</span>
                </h4>
                <span className="text-[10px] text-[#8D9AB5] font-mono">
                  {relatedMovies.length} Titles
                </span>
              </div>

              {/* Horizontal Scroll Strip */}
              <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-2 pt-1">
                {relatedMovies.map((relMovie) => (
                  <div
                    key={relMovie.id}
                    onClick={() => handleSelectSuggestedMovie(relMovie)}
                    className="group relative flex flex-col w-[110px] sm:w-[130px] shrink-0 cursor-pointer select-none transition-transform active:scale-95 hover:scale-105"
                  >
                    <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-[#0E172B] border border-white/10 group-hover:border-[#35A7FF]/60 shadow-md">
                      <img
                        src={relMovie.poster || relMovie.backdrop}
                        alt={relMovie.title}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                      {relMovie.rating ? (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          <span>{Number(relMovie.rating).toFixed(1)}</span>
                        </div>
                      ) : null}
                    </div>
                    <h5 className="mt-1.5 text-xs font-medium text-white truncate group-hover:text-[#35A7FF]">
                      {relMovie.title}
                    </h5>
                    <span className="text-[10px] text-[#8D9AB5]">
                      {relMovie.release_year || 'Movie'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TV Episodes (if TV series) */}
          {isTv && seasons.length > 0 && (
            <div className="pt-4 border-t border-white/10">
              <h4 className="text-xs font-semibold text-[#8D9AB5] uppercase tracking-wider mb-2.5 font-mono">
                Episodes
              </h4>
              {/* Season Tabs */}
              {seasons.length > 1 && (
                <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-none pb-1">
                  {seasons.map((s) => (
                    <button
                      key={s.season_number}
                      type="button"
                      onClick={() => {
                        setSelectedSeason(s.season_number);
                        setSelectedEpisode(1);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                        selectedSeason === s.season_number
                          ? 'bg-[#176BFF] text-white'
                          : 'bg-[#0E172B] text-[#8D9AB5] border border-white/10'
                      }`}
                    >
                      {s.name || `Season ${s.season_number}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Episode Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                {episodes.map((ep) => (
                  <button
                    key={ep.episode_number}
                    type="button"
                    onClick={() => {
                      setSelectedEpisode(ep.episode_number);
                      onPlay(currentMovie, selectedSeason, ep.episode_number);
                    }}
                    className={`p-2 rounded-lg border text-xs font-medium text-left truncate transition-all cursor-pointer ${
                      selectedEpisode === ep.episode_number
                        ? 'bg-[#176BFF]/20 border-[#35A7FF] text-white font-bold'
                        : 'bg-[#0E172B] border-white/10 text-[#8D9AB5] hover:text-white'
                    }`}
                  >
                    Ep {ep.episode_number}: {ep.title || `Episode ${ep.episode_number}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Download Quality Selector Modal */}
        {isQualityModalOpen && currentMovie && (
          <DownloadQualityModal
            isOpen={isQualityModalOpen}
            onClose={() => setIsQualityModalOpen(false)}
            movie={currentMovie}
            season={downloadTargetEpisode?.season ?? (isTv ? selectedSeason : undefined)}
            episode={downloadTargetEpisode?.episode ?? (isTv ? selectedEpisode : undefined)}
            qualities={downloadQualities}
            isLoading={isResolvingQualities}
            onSelectQuality={handleSelectDownloadQuality}
          />
        )}
      </div>
    </div>
  );
});

MovieDetailsModal.displayName = 'MovieDetailsModal';
