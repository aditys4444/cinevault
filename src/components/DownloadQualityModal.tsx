import React, { memo } from 'react';
import { Download, X, Film, Tv, HardDrive, Wifi } from 'lucide-react';
import type { Movie, StreamQuality } from '../types/movie';

interface DownloadQualityModalProps {
  isOpen: boolean;
  onClose: () => void;
  movie: Movie;
  season?: number;
  episode?: number;
  qualities: StreamQuality[];
  isLoading?: boolean;
  onSelectQuality: (quality: StreamQuality) => void;
}

export const DownloadQualityModal: React.FC<DownloadQualityModalProps> = memo(({
  isOpen,
  onClose,
  movie,
  season,
  episode,
  qualities,
  isLoading = false,
  onSelectQuality,
}) => {
  if (!isOpen) return null;

  const isTv = movie.media_type === 'tv' || movie.media_type === 'series' || Boolean(season);

  // Helper to format or estimate size
  const getQualityDetails = (q: StreamQuality, index: number) => {
    const rawRes = (q.resolution || q.quality || '').toLowerCase();
    const is1080 = rawRes.includes('1080');
    const is720 = rawRes.includes('720');
    const is480 = rawRes.includes('480');
    const is360 = rawRes.includes('360');

    let badge = 'HD';
    let label = 'High Definition';
    let badgeColor = 'bg-[#176BFF]/20 text-[#35A7FF] border-[#35A7FF]/30';
    let estSize = q.size_mb ? `${Math.round(q.size_mb)} MB` : '~750 MB';
    let tag = '';

    if (is1080) {
      badge = '1080p';
      label = 'Full HD • Crisp & Detailed';
      badgeColor = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/35';
      estSize = q.size_mb ? `${Math.round(q.size_mb)} MB` : '~1.4 GB';
      tag = 'Best Quality';
    } else if (is720) {
      badge = '720p';
      label = 'HD • Recommended Balance';
      badgeColor = 'bg-[#176BFF]/20 text-[#35A7FF] border-[#35A7FF]/35';
      estSize = q.size_mb ? `${Math.round(q.size_mb)} MB` : '~750 MB';
      tag = 'Recommended';
    } else if (is480) {
      badge = '480p';
      label = 'Standard • Fast Download';
      badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/35';
      estSize = q.size_mb ? `${Math.round(q.size_mb)} MB` : '~420 MB';
      tag = 'Fast';
    } else if (is360) {
      badge = '360p';
      label = 'Data Saver • Smallest Size';
      badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/35';
      estSize = q.size_mb ? `${Math.round(q.size_mb)} MB` : '~240 MB';
      tag = 'Data Saver';
    } else {
      badge = q.quality.replace(/ Direct.*/i, '') || `Stream ${index + 1}`;
      label = 'Direct Video Stream';
      estSize = q.size_mb ? `${Math.round(q.size_mb)} MB` : '~600 MB';
    }

    return { badge, label, badgeColor, estSize, tag };
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[#080E1E] border border-white/[0.1] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-[#0B1426]/70">
          <div className="flex items-center gap-3 min-w-0">
            {movie.poster ? (
              <img
                src={movie.poster}
                alt={movie.title}
                className="w-10 h-14 object-cover rounded-lg border border-white/10 shrink-0 shadow-md"
              />
            ) : (
              <div className="w-10 h-14 rounded-lg bg-[#16223D] flex items-center justify-center text-[#35A7FF] shrink-0 border border-white/10">
                {isTv ? <Tv className="w-5 h-5" /> : <Film className="w-5 h-5" />}
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#35A7FF] font-bold flex items-center gap-1.5">
                <Download className="w-3 h-3" />
                Select Download Quality
              </span>
              <h3 className="text-sm sm:text-base font-bold text-[#F5F7FF] truncate font-headline">
                {movie.title}
              </h3>
              {isTv && season && episode && (
                <p className="text-[11px] font-mono text-[#8D9AB5]">
                  Season {season} • Episode {episode}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-[#8D9AB5] hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5">
          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-9 h-9 rounded-full border-2 border-[#176BFF] border-t-transparent animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#F5F7FF]">Resolving high-speed streams...</p>
                <p className="text-xs text-[#8D9AB5]">Fetching 1080p, 720p, and SD download options</p>
              </div>
            </div>
          ) : qualities.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 mx-auto flex items-center justify-center border border-red-500/20">
                <Wifi className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#F5F7FF]">No Direct Download Streams Found</p>
                <p className="text-xs text-[#8D9AB5] mt-1 max-w-xs mx-auto">
                  Direct offline stream is temporarily busy for this title. Please try again shortly or stream online.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-[11px] text-[#8D9AB5] font-mono px-1 pb-1">
                <span>Available Qualities</span>
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-[#35A7FF]" />
                  Storage & Speed
                </span>
              </div>

              {qualities.map((q, idx) => {
                const details = getQualityDetails(q, idx);
                return (
                  <button
                    key={`${q.quality}_${idx}`}
                    type="button"
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(10);
                      onSelectQuality(q);
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#0E172B] hover:bg-[#16223D] active:bg-[#050A18] border border-white/[0.08] hover:border-[#35A7FF]/40 transition-all text-left group cursor-pointer press-feedback"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`text-xs font-mono font-bold px-2 py-1 rounded-md border shrink-0 ${details.badgeColor}`}
                      >
                        {details.badge}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-[#F5F7FF] group-hover:text-[#35A7FF] transition-colors truncate">
                            {details.label}
                          </span>
                          {details.tag && (
                            <span className="hidden xs:inline-flex items-center text-[9px] font-mono font-bold bg-[#176BFF]/20 text-[#35A7FF] px-1.5 py-0.5 rounded border border-[#35A7FF]/30">
                              {details.tag}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#8D9AB5] font-mono">
                          Est. Size: {details.estSize}
                        </span>
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-[#176BFF]/15 group-hover:bg-gradient-to-r group-hover:from-[#176BFF] group-hover:to-[#35A7FF] text-[#35A7FF] group-hover:text-white flex items-center justify-center shrink-0 transition-all border border-[#35A7FF]/30 group-hover:border-transparent group-hover:shadow-[0_2px_10px_rgba(23,107,255,0.4)] ml-2">
                      <Download className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 sm:p-4 bg-[#050A18]/80 border-t border-white/[0.06] text-center">
          <p className="text-[11px] text-[#8D9AB5]">
            Downloads are stored securely on your device for full offline playback anytime.
          </p>
        </div>
      </div>
    </div>
  );
});

DownloadQualityModal.displayName = 'DownloadQualityModal';
