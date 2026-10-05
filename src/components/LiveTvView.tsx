import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Radio,
  Tv,
  Film,
  Trophy,
  Music,
  Smile,
  Compass,
  Sparkles,
  Search,
  RotateCcw,
  Loader2,
  AlertCircle,
  ChevronLeft,
  Globe,
  SkipForward,
  SkipBack,
  PictureInPicture,
} from 'lucide-react';
import {
  liveTvService,
  LIVE_CATEGORIES,
} from '../services/liveTvService';
import type { ChannelCategory, LiveChannel } from '../services/liveTvService';

interface LiveTvViewProps {
  onSelectMovie?: (movie: any) => void;
}

interface ChannelCardProps {
  channel: LiveChannel;
  isActive: boolean;
  onSelect: (channel: LiveChannel) => void;
}

const ChannelCard = memo(({ channel, isActive, onSelect }: ChannelCardProps) => {
  return (
    <div
      onClick={() => onSelect(channel)}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 80px' }}
      className={`group relative flex items-center gap-2.5 sm:gap-3 p-2.5 rounded-xl transition-all cursor-pointer select-none border ${
        isActive
          ? 'bg-[#176BFF]/15 border-[#35A7FF] shadow-[0_0_15px_rgba(23,107,255,0.25)]'
          : 'bg-[#0E172B] hover:bg-[#16223D] border-white/[0.08] hover:border-[#35A7FF]/40'
      }`}
    >
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#050A18] border border-white/[0.08] p-1 flex items-center justify-center overflow-hidden shrink-0">
        <img
          src={channel.logo}
          alt={channel.name}
          width={36}
          height={36}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-contain"
          onError={(e) => {
            const el = e.target as HTMLElement;
            el.style.display = 'none';
          }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <h4 className={`text-xs sm:text-sm font-bold truncate leading-tight transition-colors ${
            isActive ? 'text-[#35A7FF]' : 'text-[#F5F7FF] group-hover:text-[#35A7FF]'
          }`}>
            {channel.name}
          </h4>
          {isActive ? (
            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#176BFF] text-white font-black uppercase tracking-wider animate-pulse shrink-0">
              LIVE
            </span>
          ) : (
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-black/40 text-[#8D9AB5] shrink-0">
              {channel.quality || 'HD'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return prev.isActive === next.isActive && prev.channel.id === next.channel.id;
});

ChannelCard.displayName = 'ChannelCard';

export const LiveTvView: React.FC<LiveTvViewProps> = memo(() => {
  const [allChannels, setAllChannels] = useState<LiveChannel[]>(() => liveTvService.getChannels());
  const [selectedCategory, setSelectedCategory] = useState<ChannelCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeChannel, setActiveChannel] = useState<LiveChannel>(() => allChannels[0] || liveTvService.getChannels()[0]);

  // Subscribe to real-time remote channel updates
  useEffect(() => {
    const unsubscribe = liveTvService.subscribe((updated) => {
      if (Array.isArray(updated) && updated.length > 0) {
        setAllChannels(updated);
        setActiveChannel((prev) => {
          if (!prev) return updated[0];
          const exists = updated.find((c) => c.id === prev.id);
          return exists || updated[0];
        });
      }
    });
    liveTvService.syncRemoteChannels().catch(() => {});
    return unsubscribe;
  }, []);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [needsUnmute, setNeedsUnmute] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Native Android Landscape & Immersive Fullscreen Bridge
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
      if (playerContainerRef.current && typeof playerContainerRef.current.requestFullscreen === 'function') {
        playerContainerRef.current.requestFullscreen().catch(() => {});
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

  // Exit Landscape / Fullscreen Mode helper
  const exitFullscreenMode = useCallback(() => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    setIsFullscreen(false);
    exitLandscape();
    setShowControls(true);
  }, [exitLandscape]);

  // Fullscreen / Landscape Toggle
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
    setShowControls(true);
  }, [enterLandscape, exitLandscape]);

  // Synchronize orientation state from window/screen events
  useEffect(() => {
    const handleOrientation = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      setIsFullscreen(isLandscape);
    };
    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);
    return () => {
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, []);

  // Intercept Android hardware Back button when in Fullscreen/Landscape
  useEffect(() => {
    if (!isFullscreen) return;

    const handlePlayerBack = () => {
      exitFullscreenMode();
      return true;
    };

    (window as any).handleAndroidBack = handlePlayerBack;
    return () => {
      if ((window as any).handleAndroidBack === handlePlayerBack) {
        delete (window as any).handleAndroidBack;
      }
    };
  }, [isFullscreen, exitFullscreenMode]);

  // Handle Background Scroll Locking when in Fullscreen
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    const origTouch = document.body.style.touchAction;
    if (isFullscreen) {
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
  }, [isFullscreen, exitLandscape]);

  // Picture in Picture helper
  const triggerPip = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).AndroidDevice?.enterPipMode) {
        const handled = (window as any).AndroidDevice.enterPipMode();
        if (handled) return;
      }
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current && document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {}
  }, []);

  // Ensure clean teardown and register global PiP triggers
  useEffect(() => {
    (window as any).__cinevaultCanAutoPip = () => isPlaying && !error;
    (window as any).__cinevaultTriggerPip = triggerPip;
    return () => {
      delete (window as any).__cinevaultCanAutoPip;
      delete (window as any).__cinevaultTriggerPip;
      exitLandscape();
    };
  }, [isPlaying, error, triggerPip, exitLandscape]);

  // Filtered Channels based on Category and Search Query
  const filteredChannels = useMemo(() => {
    let list = allChannels;
    if (selectedCategory !== 'all') {
      list = list.filter((c) => c.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.currentProgram.toLowerCase().includes(q) ||
          c.language.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allChannels, selectedCategory, searchQuery]);

  // Controls auto-hide timer (Auto-hides after 3.5s when playing)
  const triggerShowControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 3500);
  }, []);

  // Safe Autoplay function with muted fallback
  const startAutoplay = useCallback(async (video: HTMLVideoElement) => {
    try {
      video.muted = isMuted;
      await video.play();
      setIsPlaying(true);
      setIsLoading(false);
      setNeedsUnmute(false);
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        video.muted = true;
        setIsMuted(true);
        setNeedsUnmute(true);
        try {
          await video.play();
          setIsPlaying(true);
          setIsLoading(false);
        } catch {
          setIsLoading(false);
          setIsPlaying(false);
        }
      } else {
        setIsLoading(false);
      }
    }
  }, [isMuted]);

  // Load & Stream the Active Channel
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeChannel) return;

    setIsLoading(true);
    setError(null);
    setShowControls(true);

    let currentLoadedUrl = activeChannel.streamUrl;
    let retryAttempts = 0;
    const maxRetries = 3;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // 1. Try HLS.js when supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        startFragPrefetch: true,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 5,
        backBufferLength: 10,
        maxBufferSize: 15 * 1000 * 1000,
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
        maxBufferHole: 0.5,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 3,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 3,
        fragLoadingTimeOut: 15000,
        fragLoadingMaxRetry: 4,
      });
      hlsRef.current = hls;

      hls.loadSource(currentLoadedUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        startAutoplay(video);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
          return;
        }
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (activeChannel.fallbackUrl && currentLoadedUrl !== activeChannel.fallbackUrl) {
                currentLoadedUrl = activeChannel.fallbackUrl;
                retryAttempts = 0;
                hls.loadSource(activeChannel.fallbackUrl);
                hls.startLoad();
              } else if (retryAttempts < maxRetries) {
                retryAttempts++;
                hls.startLoad();
              } else {
                hls.destroy();
                setError('Live stream connection failed. Tap Retry to reconnect.');
                setIsLoading(false);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              if (activeChannel.fallbackUrl && currentLoadedUrl !== activeChannel.fallbackUrl) {
                currentLoadedUrl = activeChannel.fallbackUrl;
                hls.loadSource(activeChannel.fallbackUrl);
                hls.startLoad();
              } else {
                hls.destroy();
                setError('Live broadcast temporarily unavailable. Tap Retry to reconnect.');
                setIsLoading(false);
              }
              break;
          }
        }
      });
    }
    // 2. Native HLS support (Apple Safari / WebView)
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = currentLoadedUrl;
      video.addEventListener('loadedmetadata', () => {
        startAutoplay(video);
      }, { once: true });

      const handleError = () => {
        if (activeChannel.fallbackUrl && video.src !== activeChannel.fallbackUrl) {
          video.src = activeChannel.fallbackUrl;
          startAutoplay(video);
        } else {
          setError('Live broadcast temporarily unavailable. Tap Retry to reconnect.');
          setIsLoading(false);
        }
      };
      video.addEventListener('error', handleError, { once: true });
    } else {
      setError('Live streaming is not supported on this device.');
      setIsLoading(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeChannel, reloadKey, startAutoplay]);

  const handleRetryStream = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setReloadKey((prev) => prev + 1);
  }, []);

  // Channel Selection Handler
  const handleSelectChannel = useCallback((channel: LiveChannel) => {
    if (channel.id === activeChannel.id) return;
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    setActiveChannel(channel);
    setError(null);
    setIsLoading(true);
  }, [activeChannel.id]);

  // Next & Previous Channel Quick Navigation (Landscape / Fullscreen)
  const handleNextChannel = useCallback(() => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    const currentIndex = filteredChannels.findIndex((c) => c.id === activeChannel.id);
    const nextChannel = currentIndex >= 0 && currentIndex < filteredChannels.length - 1
      ? filteredChannels[currentIndex + 1]
      : filteredChannels[0];
    if (nextChannel) {
      setActiveChannel(nextChannel);
      setError(null);
      setIsLoading(true);
    }
  }, [filteredChannels, activeChannel.id]);

  const handlePrevChannel = useCallback(() => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    const currentIndex = filteredChannels.findIndex((c) => c.id === activeChannel.id);
    const prevChannel = currentIndex > 0
      ? filteredChannels[currentIndex - 1]
      : filteredChannels[filteredChannels.length - 1];
    if (prevChannel) {
      setActiveChannel(prevChannel);
      setError(null);
      setIsLoading(true);
    }
  }, [filteredChannels, activeChannel.id]);

  // Play / Pause Toggle
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
    triggerShowControls();
  }, [triggerShowControls]);

  // Mute Toggle
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setIsMuted(next);
    if (!next) {
      setNeedsUnmute(false);
      video.volume = 1;
    }
  }, []);

  // Background Surface Click (Toggles controls visibility ONLY — NEVER pauses playback)
  const handleSurfaceClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, [role="button"], a, select')) {
      return;
    }
    if (showControls) {
      setShowControls(false);
    } else {
      triggerShowControls();
    }
  };

  // Video Native Event Handlers
  const handleVideoWaiting = useCallback(() => {
    setIsLoading(true);
  }, []);

  const handleVideoPlaying = useCallback(() => {
    setIsLoading(false);
    setIsPlaying(true);
  }, []);

  const handleVideoPause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleVideoStalled = useCallback(() => {
    // Stalled event handled naturally by Hls.js buffer
  }, []);

  // Render Category Icon Helper
  const renderCategoryIcon = (catId: ChannelCategory) => {
    switch (catId) {
      case 'all': return <Radio className="w-3.5 h-3.5" />;
      case 'hindi-news':
      case 'english-news': return <Tv className="w-3.5 h-3.5" />;
      case 'hindi-movies': return <Film className="w-3.5 h-3.5" />;
      case 'sports': return <Trophy className="w-3.5 h-3.5" />;
      case 'music': return <Music className="w-3.5 h-3.5" />;
      case 'hindi-entertainment': return <Sparkles className="w-3.5 h-3.5" />;
      case 'kids': return <Smile className="w-3.5 h-3.5" />;
      case 'documentary': return <Compass className="w-3.5 h-3.5" />;
      default: return <Globe className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050A18] text-[#F5F7FF] pb-24 md:pb-12">
      {/* Top Header & Search Bar (Only shown in portrait mode) */}
      {!isFullscreen && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight font-headline text-[#F5F7FF]">
                Live TV
              </h1>
            </div>

            {/* Quick Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#8D9AB5] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Aaj Tak, Star, Sports..."
                className="w-full pl-9 pr-3 py-1.5 sm:py-2 rounded-xl bg-[#0E172B] border border-white/[0.1] text-xs sm:text-sm text-[#F5F7FF] placeholder-[#8D9AB5] focus:outline-none focus:border-[#176BFF] focus:ring-1 focus:ring-[#176BFF] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8D9AB5] hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Niche & Category Pills Selector */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {LIVE_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
                    setSelectedCategory(cat.id);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white border-transparent shadow-[0_2px_10px_rgba(23,107,255,0.4)]'
                      : 'bg-[#0E172B] text-[#8D9AB5] hover:text-[#F5F7FF] hover:bg-[#16223D] border-white/[0.08]'
                  }`}
                >
                  {renderCategoryIcon(cat.id)}
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Layout: Live Player + Channel Grid */}
      <div className={isFullscreen ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2'}>
        <div className="flex flex-col gap-3">
          {/* Live Player Container (Full hardware landscape when fullscreen, aspect-video in portrait) */}
          <div
            ref={playerContainerRef}
            onClick={handleSurfaceClick}
            className={
              isFullscreen
                ? 'player-fullscreen-mode fixed inset-0 z-[9999] w-screen h-[100dvh] bg-black flex items-center justify-center select-none overflow-hidden touch-none'
                : 'relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/[0.08] select-none group'
            }
          >
            {/* HTML5 Video Tag */}
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted={isMuted}
              className="w-full h-full object-contain bg-black"
              onWaiting={handleVideoWaiting}
              onPlaying={handleVideoPlaying}
              onPause={handleVideoPause}
              onStalled={handleVideoStalled}
            />

            {/* Tap to Unmute Audio Banner */}
            {needsUnmute && !isLoading && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white text-xs font-bold shadow-[0_4px_20px_rgba(23,107,255,0.4)] flex items-center gap-1.5 cursor-pointer animate-pulse select-none active:scale-95 transition-transform"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>Tap to Unmute Audio</span>
              </button>
            )}

            {/* Simple Loading Spinner */}
            {isLoading && !error && (
              <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 pointer-events-none">
                <Loader2 className="w-9 h-9 text-[#35A7FF] animate-spin" />
                <span className="text-xs font-medium text-[#F5F7FF]">
                  Loading {activeChannel.name}...
                </span>
              </div>
            )}

            {/* Error Notice */}
            {error && (
              <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center gap-3">
                <div className="flex flex-col items-center gap-2.5 p-5 max-w-sm bg-[#0B1224] rounded-2xl border border-white/[0.08] shadow-2xl">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                  <p className="text-xs text-[#8D9AB5] font-medium leading-relaxed">{error}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={handleRetryStream}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white font-bold text-xs hover:brightness-110 shadow-[0_2px_10px_rgba(23,107,255,0.4)] transition-all cursor-pointer active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                    {isFullscreen && (
                      <button
                        type="button"
                        onClick={exitFullscreenMode}
                        className="px-4 py-2 rounded-xl bg-[#0E172B] text-white font-medium text-xs border border-white/[0.08] transition-colors cursor-pointer active:scale-95"
                      >
                        Exit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* NEW SIMPLE VIDEO PLAYER LAYER */}
            <div
              className={`absolute inset-0 z-30 flex flex-col justify-between p-3 sm:p-5 bg-gradient-to-b from-black/85 via-transparent to-black/85 transition-opacity duration-200 ${
                showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* TOP BAR: Channel identity, live indicator & quality */}
              <div
                className="flex items-center justify-between gap-3 pointer-events-auto"
                style={{
                  paddingLeft: 'max(8px, env(safe-area-inset-left, 8px))',
                  paddingRight: 'max(8px, env(safe-area-inset-right, 8px))',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isFullscreen && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        exitFullscreenMode();
                      }}
                      className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 active:bg-black text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                      aria-label="Back"
                    >
                      <ChevronLeft className="w-5 h-5 text-[#35A7FF]" />
                    </button>
                  )}

                  <div className="w-8 h-8 rounded-lg bg-[#050A18] border border-white/10 p-1 flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src={activeChannel.logo}
                      alt={activeChannel.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
                        {activeChannel.name}
                      </h2>
                      <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white uppercase tracking-wider shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        LIVE
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerPip();
                    }}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-colors"
                    title="Picture-in-Picture"
                    aria-label="Picture-in-Picture"
                  >
                    <PictureInPicture className="w-3.5 h-3.5 text-[#35A7FF]" />
                  </button>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white/10 text-white/90 border border-white/10">
                    {activeChannel.quality || 'HD'}
                  </span>
                </div>
              </div>

              {/* CENTER: Clean Single Play / Pause Button */}
              <div className="flex items-center justify-center pointer-events-auto">
                {!isLoading && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayPause();
                    }}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-[#176BFF] to-[#35A7FF] hover:brightness-110 active:scale-95 text-white flex items-center justify-center shadow-[0_8px_24px_rgba(23,107,255,0.45)] cursor-pointer transition-transform"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current ml-0.5" />
                    )}
                  </button>
                )}
              </div>

              {/* BOTTOM BAR: Play, Mute, Channel Switchers, PiP & Fullscreen */}
              <div
                className="flex items-center justify-between pointer-events-auto"
                style={{
                  paddingLeft: 'max(8px, env(safe-area-inset-left, 8px))',
                  paddingRight: 'max(8px, env(safe-area-inset-right, 8px))',
                }}
              >
                {/* Left: Play/Pause + Mute */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayPause();
                    }}
                    className="w-9 h-9 rounded-lg text-white hover:text-[#35A7FF] active:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute();
                    }}
                    className="w-9 h-9 rounded-lg text-white hover:text-[#35A7FF] active:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                {/* Right: Prev Channel / Next Channel + PiP + Fullscreen */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevChannel();
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-semibold cursor-pointer transition-colors"
                    title="Previous Channel"
                  >
                    <SkipBack className="w-3.5 h-3.5 text-[#35A7FF]" />
                    <span className="hidden sm:inline">Prev</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextChannel();
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-semibold cursor-pointer transition-colors"
                    title="Next Channel"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <SkipForward className="w-3.5 h-3.5 text-[#35A7FF]" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerPip();
                    }}
                    className="w-9 h-9 rounded-lg text-white hover:text-[#35A7FF] active:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
                    title="Picture in Picture"
                    aria-label="Picture in Picture"
                  >
                    <PictureInPicture className="w-4 h-4 text-[#35A7FF]" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFullscreen();
                    }}
                    className="w-9 h-9 rounded-lg text-white hover:text-[#35A7FF] active:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
                    aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Active Channel Info Strip (Portrait only) */}
          {!isFullscreen && (
            <div className="bg-[#0E172B] border border-white/[0.08] rounded-xl p-3 flex items-center justify-between shadow-[0_4px_16px_rgba(5,10,24,0.6)]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-[#050A18] border border-white/[0.08] p-1 flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={activeChannel.logo}
                    alt={activeChannel.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#F5F7FF] truncate">{activeChannel.name}</h3>
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold shrink-0">
                      LIVE
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-[#8D9AB5] shrink-0">
                <button
                  type="button"
                  onClick={triggerPip}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-[#35A7FF] border border-white/[0.08] transition-colors cursor-pointer"
                  title="Picture-in-Picture"
                >
                  <PictureInPicture className="w-3.5 h-3.5" />
                  <span>PiP</span>
                </button>
                <span className="px-2 py-1 rounded bg-white/[0.06] border border-white/[0.08] text-gray-300">
                  {activeChannel.quality || 'HD'}
                </span>
              </div>
            </div>
          )}

          {/* Channel Guide Grid Section (Portrait only) */}
          {!isFullscreen && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#F5F7FF]">
                  Channel Guide ({filteredChannels.length})
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
                {filteredChannels.map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    isActive={channel.id === activeChannel.id}
                    onSelect={handleSelectChannel}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

LiveTvView.displayName = 'LiveTvView';
