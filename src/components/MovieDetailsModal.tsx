import React, { useState, useEffect, useCallback, memo } from 'react';
import type { Movie, Season } from '../types/movie';
import { movieboxService } from '../services/movieboxService';
import { cacheService } from '../services/cacheService';
import { Play, X, Bookmark, Film, Tv, Clock, Calendar, Loader2, Download, Check, Share2 } from 'lucide-react';

interface MovieDetailsModalProps {
  movie: Movie | null;
  onClose: () => void;
  onPlay: (movie: Movie, season?: number, episode?: number) => void;
  isWatchlisted: boolean;
  onToggleWatchlist: (movie: Movie) => void;
}

export const MovieDetailsModal: React.FC<MovieDetailsModalProps> = memo(({
  movie,
  onClose,
  onPlay,
  isWatchlisted,
  onToggleWatchlist,
}) => {
  const [details, setDetails] = useState<Partial<Movie> | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [backdropLoaded, setBackdropLoaded] = useState(false);
  const [backdropError, setBackdropError] = useState(false);
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);

  // Reset errors & states when movie changes
  useEffect(() => {
    setBackdropError(false);
    setBackdropLoaded(false);
    setPosterError(false);
    setPosterLoaded(false);
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

  // Background Stream Pre-fetch: Resolves CDN streams while user views details modal
  // By the time the user taps "Play", playback starts with 0ms delay!
  useEffect(() => {
    if (currentMovie && currentMovie.id) {
      movieboxService
        .getStreams(
          currentMovie.id,
          currentMovie.detailPath,
          currentMovie.media_type,
          isTv ? selectedSeason : undefined,
          isTv ? selectedEpisode : undefined,
          currentMovie.title
        )
        .catch(() => {});
    }
  }, [currentMovie?.id, currentMovie?.detailPath, currentMovie?.media_type, isTv, selectedSeason, selectedEpisode, currentMovie?.title]);

  if (!movie || !currentMovie) return null;

  const activeSeasonObj = seasons.find((s) => s.season_number === selectedSeason) || seasons[0];
  const episodes = activeSeasonObj?.episodes || [];

  const handleStartDownload = async () => {
    if (!currentMovie || isDownloading) return;
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    setIsDownloading(true);
    setDownloadFeedback('Resolving download stream...');
    try {
      const streams = await movieboxService.getStreams(
        currentMovie.id,
        currentMovie.detailPath,
        currentMovie.media_type,
        isTv ? selectedSeason : undefined,
        isTv ? selectedEpisode : undefined,
        currentMovie.title
      );
      if (!streams || !streams.streamUrl) {
        throw new Error('Direct download stream unavailable for this title');
      }
      const quality = streams.qualities?.[0]?.quality?.replace(/ Direct.*/i, '') || 'HD';
      await cacheService.startDownload(
        currentMovie,
        streams.streamUrl,
        quality,
        isTv ? selectedSeason : undefined,
        isTv ? selectedEpisode : undefined
      );
      setDownloadFeedback('Download started! Added to Downloads section.');
      setTimeout(() => setDownloadFeedback(null), 3500);
    } catch (err: any) {
      setDownloadFeedback(err?.message || 'Download failed to start');
      setTimeout(() => setDownloadFeedback(null), 3500);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePlayClick = () => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    setIsLaunching(true);
    onPlay(currentMovie, isTv ? selectedSeason : undefined, isTv ? selectedEpisode : undefined);
    setTimeout(() => setIsLaunching(false), 800);
  };

  const handleWatchlistClick = () => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    onToggleWatchlist(currentMovie);
  };

  const handleShare = async () => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    const title = currentMovie.title;
    const shareText = `Watch "${title}" on CineVault`;
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl,
        });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          // fallback ignore
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}: ${shareUrl}`);
        setDownloadFeedback('Title link copied to clipboard!');
        setTimeout(() => setDownloadFeedback(null), 3000);
      } catch {
        setDownloadFeedback('Unable to copy link');
        setTimeout(() => setDownloadFeedback(null), 3000);
      }
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#050A18]/90 backdrop-blur-xl sm:p-4 md:p-6 overflow-y-auto animate-backdrop-fade"
    >
      {/* Bottom Sheet on Mobile / Centered Card on Desktop */}
      <div className="relative w-full max-w-3xl bg-[#0B1224] border-t sm:border border-white/[0.08] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.85)] max-h-[90vh] sm:max-h-[85vh] overflow-y-auto animate-slide-in-bottom sm:animate-scale-in pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        {/* Mobile Drag Handle Indicator */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 z-30 flex items-center justify-center w-10 h-10 rounded-full bg-[#0E172B]/80 hover:bg-[#16223D] active:bg-[#050A18] text-[#8D9AB5] hover:text-[#F5F7FF] border border-white/[0.08] transition-all cursor-pointer press-feedback touch-target-sm"
          aria-label="Close details"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Backdrop Banner */}
        <div className="relative w-full h-44 sm:h-64 bg-[#0E172B] overflow-hidden">
          {!backdropLoaded && (
            <div className="absolute inset-0 bg-[#0E172B] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.05] before:to-transparent" />
          )}
          <img
            src={
              !backdropError && (currentMovie.backdrop || currentMovie.poster)
                ? (currentMovie.backdrop || currentMovie.poster)
                : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80'
            }
            alt={currentMovie.title}
            onLoad={() => setBackdropLoaded(true)}
            onError={() => {
              setBackdropError(true);
              setBackdropLoaded(true);
            }}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              backdropLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1224] via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Main Info Body */}
        <div className="relative px-4 sm:px-6 md:px-8 pb-4 -mt-16 sm:-mt-20">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
            {/* Poster Thumbnail */}
            <div className="relative w-24 sm:w-32 md:w-36 aspect-[2/3] shrink-0 rounded-xl overflow-hidden border-2 border-white/[0.08] shadow-lg bg-[#0E172B]">
              {!posterLoaded && (
                <div className="absolute inset-0 bg-[#0E172B] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.05] before:to-transparent" />
              )}
              <img
                src={
                  !posterError && currentMovie.poster
                    ? currentMovie.poster
                    : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=400&q=75'
                }
                alt={currentMovie.title}
                onLoad={() => setPosterLoaded(true)}
                onError={() => {
                  setPosterError(true);
                  setPosterLoaded(true);
                }}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  posterLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </div>

            {/* Title & Metadata */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#F5F7FF] tracking-tight leading-tight font-headline">
                {currentMovie.title}
              </h2>

              {/* Meta Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-[#8D9AB5]">
                {(currentMovie.releaseDate || currentMovie.release_year) && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0E172B] border border-white/[0.08] font-mono">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{currentMovie.releaseDate || currentMovie.release_year}</span>
                  </div>
                )}
                {currentMovie.duration && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0E172B] border border-white/[0.08] font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{currentMovie.duration}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0E172B] border border-white/[0.08] uppercase font-mono">
                  {isTv ? <Tv className="w-3.5 h-3.5 text-[#35A7FF]" /> : <Film className="w-3.5 h-3.5 text-[#176BFF]" />}
                  <span>{isTv ? 'Series' : 'Feature'}</span>
                </div>
                {isTv && (
                  <div className="px-2.5 py-1 rounded-lg bg-[#0E172B] border border-white/[0.08] font-mono text-[#35A7FF] font-semibold">
                    {seasons.length > 0 ? `${seasons.length} Season${seasons.length > 1 ? 's' : ''}` : 'Series'}
                  </div>
                )}
                {(currentMovie.is_coming_soon || currentMovie.has_resource === false) && (
                  <div className="px-2.5 py-1 rounded-lg bg-[#176BFF]/20 border border-[#35A7FF]/40 font-bold text-[#35A7FF] uppercase tracking-wider text-[11px]">
                    Coming Soon
                  </div>
                )}
              </div>

              {/* Genres */}
              {currentMovie.genres && currentMovie.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {currentMovie.genres.map((g, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full bg-[#0E172B] border border-white/[0.08] text-[11px] text-[#8D9AB5] font-medium"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Row — 48dp Compliant Touch Targets */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mt-5 sm:mt-6">
            <button
              type="button"
              disabled={isLaunching || ((currentMovie.is_coming_soon || currentMovie.has_resource === false) && !currentMovie.trailer_url)}
              onClick={handlePlayClick}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#176BFF] to-[#35A7FF] hover:brightness-110 active:scale-95 text-white font-extrabold text-sm sm:text-base min-h-[48px] shadow-[0_4px_24px_rgba(23,107,255,0.45)] transition-all press-feedback cursor-pointer disabled:opacity-80 flex-1 sm:flex-initial"
            >
              {isLaunching ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5 fill-current" />
              )}
              <span>
                {isLaunching
                  ? 'Launching...'
                  : (currentMovie.is_coming_soon || currentMovie.has_resource === false)
                    ? (currentMovie.trailer_url ? 'Watch Trailer' : 'Coming Soon')
                    : isTv
                      ? `Play S${selectedSeason} E${selectedEpisode}`
                      : 'Play Movie'}
              </span>
            </button>

            {/* Offline Download Button */}
            <button
              type="button"
              disabled={isDownloading}
              onClick={handleStartDownload}
              className="flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-xl border text-sm font-semibold min-h-[48px] transition-all cursor-pointer bg-[#0E172B] border-white/[0.08] hover:bg-[#16223D] hover:border-[#35A7FF]/40 text-[#8D9AB5] hover:text-[#F5F7FF] press-feedback"
              title="Download for offline playback"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#35A7FF]" />
              ) : (
                <Download className="w-4 h-4 text-[#35A7FF]" />
              )}
              <span>{isDownloading ? 'Starting...' : 'Download'}</span>
            </button>

            {/* Watchlist Toggle */}
            <button
              type="button"
              onClick={handleWatchlistClick}
              className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-xl border text-sm font-semibold min-h-[48px] transition-all cursor-pointer press-feedback ${
                isWatchlisted
                  ? 'bg-[#176BFF]/20 border-[#35A7FF]/50 text-[#35A7FF]'
                  : 'bg-[#0E172B] border-white/[0.08] hover:bg-[#16223D] text-[#8D9AB5] hover:text-[#F5F7FF]'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isWatchlisted ? 'fill-current' : ''}`} />
              <span>{isWatchlisted ? 'Saved' : 'Watchlist'}</span>
            </button>

            {/* Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-xl border text-sm font-semibold min-h-[48px] transition-all cursor-pointer bg-[#0E172B] border-white/[0.08] hover:bg-[#16223D] text-[#8D9AB5] hover:text-[#F5F7FF] press-feedback"
              title="Share title"
            >
              <Share2 className="w-4 h-4 text-[#35A7FF]" />
              <span>Share</span>
            </button>
          </div>

          {/* Download / Share Notification Toast / Feedback */}
          {downloadFeedback && (
            <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-[#176BFF]/15 border border-[#35A7FF]/35 text-[#35A7FF] text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 shrink-0" />
              <span>{downloadFeedback}</span>
            </div>
          )}

          {/* Overview */}
          <div className="mt-5 sm:mt-6">
            <h4 className="text-xs font-semibold text-[#8D9AB5] uppercase tracking-wider mb-1.5 font-mono">
              Synopsis
            </h4>
            <p className="text-xs sm:text-sm text-[#F5F7FF]/90 leading-relaxed font-body">
              {currentMovie.overview}
            </p>
          </div>

          {/* Cast & Crew Chips */}
          {currentMovie.cast && currentMovie.cast.length > 0 && (
            <div className="mt-5 sm:mt-6">
              <h4 className="text-xs font-semibold text-[#8D9AB5] uppercase tracking-wider mb-2 font-mono">
                Featured Cast
              </h4>
              <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
                {currentMovie.cast.slice(0, 10).map((c, idx) => {
                  const name = typeof c === 'string' ? c : c.name;
                  const character = typeof c === 'string' ? undefined : c.character;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0E172B] border border-white/[0.08] shrink-0"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#176BFF]/15 flex items-center justify-center text-[10px] font-bold text-[#35A7FF]">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#F5F7FF] whitespace-nowrap">{name}</span>
                        {character && (
                          <span className="text-[10px] text-[#8D9AB5] whitespace-nowrap">{character}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TV Series Seasons & Episodes Selector */}
          {isTv && seasons.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/[0.08]">
              <h4 className="text-xs font-semibold text-[#8D9AB5] uppercase tracking-wider mb-2.5 font-mono">
                Episodes
              </h4>

              {/* Season Selector Tabs */}
              {seasons.length > 1 && (
                <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-none pb-1">
                  {seasons.map((s) => (
                    <button
                      key={s.season_number}
                      type="button"
                      onClick={() => {
                        queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
                        setSelectedSeason(s.season_number);
                        setSelectedEpisode(1);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all press-feedback min-h-[36px] ${
                        selectedSeason === s.season_number
                          ? 'bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white font-bold shadow-md shadow-[#176BFF]/30'
                          : 'bg-[#0E172B] hover:bg-[#16223D] text-[#8D9AB5] border border-white/[0.08]'
                      }`}
                    >
                      {s.name || `Season ${s.season_number}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Episode Grid with 44dp+ touch targets */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-52 overflow-y-auto pr-1">
                {episodes.length > 0 ? (
                  episodes.map((ep) => (
                    <button
                      key={ep.episode_number}
                      type="button"
                      onClick={() => {
                        queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
                        setSelectedEpisode(ep.episode_number);
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-semibold text-center border min-h-[44px] flex items-center justify-center transition-all cursor-pointer press-feedback ${
                        selectedEpisode === ep.episode_number
                          ? 'bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white border-transparent font-bold shadow-md shadow-[#176BFF]/30'
                          : 'bg-[#0E172B] border-white/[0.08] hover:bg-[#16223D] text-[#8D9AB5] hover:text-[#F5F7FF]'
                      }`}
                    >
                      Episode {ep.episode_number}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-[#8D9AB5] col-span-full py-2">No episodes listed for this season.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

MovieDetailsModal.displayName = 'MovieDetailsModal';
