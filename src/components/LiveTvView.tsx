import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
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
  Sun,
  SunMedium,
  SunDim,
  Scan,
  SkipForward,
  SkipBack,
} from 'lucide-react';
import {
  liveTvService,
  LIVE_CATEGORIES,
} from '../services/liveTvService';
import type { ChannelCategory, LiveChannel } from '../services/liveTvService';

interface LiveTvViewProps {
  onSelectMovie?: (movie: any) => void;
}

export const LiveTvView: React.FC<LiveTvViewProps> = memo(() => {
  const allChannels: LiveChannel[] = useMemo(() => liveTvService.getChannels(), []);
  const [selectedCategory, setSelectedCategory] = useState<ChannelCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeChannel, setActiveChannel] = useState<LiveChannel>(allChannels[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [needsUnmute, setNeedsUnmute] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);

  // Screen Brightness, Fit Mode & Gesture Navigation State (matching VideoPlayer)
  const [brightness, setBrightness] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cinevault_player_brightness');
      return saved ? Math.max(0.1, Math.min(1.0, parseFloat(saved))) : 1.0;
    } catch {
      return 1.0;
    }
  });
  const [fitMode, setFitMode] = useState<'contain' | 'cover' | 'fill'>(() => {
    try {
      return (localStorage.getItem('cinevault_player_fit') as any) || 'contain';
    } catch {
      return 'contain';
    }
  });
  const [volume, setVolume] = useState<number>(1);
  const [activeGesture, setActiveGesture] = useState<'brightness' | 'volume' | null>(null);
  const [gestureValue, setGestureValue] = useState<number>(100);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{
    startX: number;
    startY: number;
    side: 'left' | 'right' | 'center';
    initialVal: number;
    hasMoved: boolean;
  } | null>(null);

  // Native Android Landscape & Immersive Fullscreen Bridge (Exact parity with VideoPlayer)
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
    setFitMode('contain');
    setShowControls(true);
  }, [exitLandscape]);

  // Fullscreen / Landscape Toggle (Smooth, hardware-rotated, edge-to-edge)
  const toggleFullscreen = useCallback(() => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    setIsFullscreen((prev) => {
      const next = !prev;
      if (next) {
        enterLandscape();
      } else {
        exitLandscape();
        setFitMode('contain');
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
      if (!isLandscape) {
        setFitMode('contain');
      }
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

  // Ensure clean teardown when navigating away or unmounting
  useEffect(() => {
    return () => {
      exitLandscape();
    };
  }, [exitLandscape]);

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
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
        maxBufferSize: 30 * 1000 * 1000,
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
      video.volume = volume || 1;
    }
  }, [volume]);

  // Aspect Ratio Fit Mode Cycler (Fit -> Zoom -> Stretch)
  const cycleFitMode = useCallback(() => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    setFitMode((prev) => {
      let next: 'contain' | 'cover' | 'fill' = 'contain';
      if (prev === 'contain') {
        next = 'cover';
      } else if (prev === 'cover') {
        next = 'fill';
      } else {
        next = 'contain';
      }
      try {
        localStorage.setItem('cinevault_player_fit', next);
      } catch {}
      return next;
    });
  }, []);

  // Background Surface Click (Toggles controls visibility ONLY — NEVER pauses playback)
  const handleSurfaceClick = (e: React.MouseEvent) => {
    if (touchStartPosRef.current?.hasMoved) {
      return;
    }
    if ((e.target as HTMLElement).closest('button, input, [role="button"], a, select')) {
      return;
    }
    if (showControls) {
      setShowControls(false);
    } else {
      triggerShowControls();
    }
  };

  // Touch Gesture Handlers for Brightness (Left half) and Volume (Right half) in Landscape/Fullscreen
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = playerContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = touch.clientX - rect.left;

    const isLandscape = window.innerWidth > window.innerHeight || isFullscreen;

    let side: 'left' | 'right' | 'center' = 'center';
    let initialVal = 1;
    if (isLandscape) {
      if (x < rect.width * 0.45) {
        side = 'left';
        initialVal = brightness;
      } else if (x > rect.width * 0.55) {
        side = 'right';
        const v = videoRef.current ? videoRef.current.volume : volume;
        initialVal = isMuted ? 0 : v;
      }
    }

    touchStartPosRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      side,
      initialVal,
      hasMoved: false,
    };
  }, [isFullscreen, brightness, volume, isMuted]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartPosRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const { startX, startY, side, initialVal } = touchStartPosRef.current;
    if (side === 'center') return;

    const deltaY = startY - touch.clientY; // Swiping up increases value
    const deltaX = Math.abs(touch.clientX - startX);

    if (!touchStartPosRef.current.hasMoved) {
      if (Math.abs(deltaY) < 8) return;
      if (deltaX > Math.abs(deltaY)) {
        touchStartPosRef.current.side = 'center';
        return;
      }
      touchStartPosRef.current.hasMoved = true;
    }

    const sensitivity = window.innerHeight * 0.65;
    const change = deltaY / sensitivity;

    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
      gestureTimeoutRef.current = null;
    }

    if (side === 'left') {
      const nextBrightness = Math.max(0.1, Math.min(1.0, initialVal + change));
      setBrightness(nextBrightness);
      try {
        localStorage.setItem('cinevault_player_brightness', nextBrightness.toFixed(2));
      } catch {}
      setActiveGesture('brightness');
      setGestureValue(Math.round(nextBrightness * 100));
    } else if (side === 'right') {
      const nextVol = Math.max(0, Math.min(1.0, initialVal + change));
      if (videoRef.current) {
        videoRef.current.volume = nextVol;
        if (nextVol > 0 && videoRef.current.muted) {
          videoRef.current.muted = false;
          setIsMuted(false);
        }
      }
      setVolume(nextVol);
      if (nextVol === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
      }
      setActiveGesture('volume');
      setGestureValue(Math.round(nextVol * 100));
    }
  }, [isMuted]);

  const handleTouchEnd = useCallback(() => {
    if (touchStartPosRef.current?.hasMoved) {
      if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
      gestureTimeoutRef.current = setTimeout(() => {
        setActiveGesture(null);
      }, 1000);
    }
    setTimeout(() => {
      touchStartPosRef.current = null;
    }, 50);
  }, []);

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
    <div className="min-h-screen bg-[#0B0D10] text-[#F5F5F2] pb-24 md:pb-12">
      {/* Top Header & Search Bar (Only shown in portrait mode) */}
      {!isFullscreen && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#292E35]/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight font-headline text-[#F5F5F2]">
                Live TV
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-mono">
                24x7 Stream
              </span>
            </div>

            {/* Quick Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Aaj Tak, Star, Sports..."
                className="w-full pl-9 pr-3 py-1.5 sm:py-2 rounded-xl bg-[#15181D] border border-[#292E35] text-xs sm:text-sm text-[#F5F5F2] placeholder-gray-500 focus:outline-none focus:border-[#F0B429] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
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
                      ? 'bg-[#F0B429] text-[#0B0D10] border-[#F0B429] shadow-[0_2px_10px_rgba(240,180,41,0.3)]'
                      : 'bg-[#15181D] text-gray-300 hover:text-white hover:bg-[#1D2127] border-[#292E35]'
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
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            className={
              isFullscreen
                ? 'player-fullscreen-mode fixed inset-0 z-[9999] w-screen h-[100dvh] bg-black flex items-center justify-center select-none overflow-hidden touch-none'
                : 'relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-[#292E35] select-none'
            }
          >
            {/* HTML5 Video Tag — with Screen Fit support (contain / cover / fill) */}
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted={isMuted}
              className={`w-full h-full transition-[object-fit] duration-200 ${
                !isFullscreen
                  ? 'object-contain'
                  : fitMode === 'cover'
                  ? 'object-cover'
                  : fitMode === 'fill'
                  ? 'object-fill'
                  : 'object-contain'
              } bg-black`}
              onWaiting={handleVideoWaiting}
              onPlaying={handleVideoPlaying}
              onPause={handleVideoPause}
              onStalled={handleVideoStalled}
            />

            {/* Hardware-accelerated Software Brightness Scrim */}
            {isFullscreen && (
              <div
                className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-100"
                style={{
                  backgroundColor: '#000000',
                  opacity: Math.max(0, 1 - brightness),
                }}
              />
            )}

            {/* Left Edge: Brightness Gesture HUD (Landscape) */}
            {isFullscreen && activeGesture === 'brightness' && (
              <div className="absolute left-6 sm:left-10 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center bg-[#15181D]/90 backdrop-blur-xl border border-white/20 px-3 py-4 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] pointer-events-none animate-fade-in min-w-[56px]">
                <div className="text-[#F0B429] mb-3">
                  {gestureValue > 60 ? (
                    <Sun className="w-6 h-6" />
                  ) : gestureValue > 30 ? (
                    <SunMedium className="w-6 h-6" />
                  ) : (
                    <SunDim className="w-6 h-6" />
                  )}
                </div>
                <div className="relative w-2 h-28 sm:h-36 bg-white/20 rounded-full overflow-hidden flex flex-col justify-end">
                  <div
                    className="w-full bg-gradient-to-t from-[#F0B429] to-[#FFF0B3] rounded-full transition-all duration-75"
                    style={{ height: `${gestureValue}%` }}
                  />
                </div>
                <span className="mt-3 text-[11px] font-mono font-bold text-white tracking-wider">
                  {gestureValue}%
                </span>
              </div>
            )}

            {/* Right Edge: Volume Gesture HUD (Landscape) */}
            {isFullscreen && activeGesture === 'volume' && (
              <div className="absolute right-6 sm:right-10 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center bg-[#15181D]/90 backdrop-blur-xl border border-white/20 px-3 py-4 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] pointer-events-none animate-fade-in min-w-[56px]">
                <div className="text-[#F0B429] mb-3">
                  {gestureValue === 0 || isMuted ? (
                    <VolumeX className="w-6 h-6 text-red-400" />
                  ) : gestureValue < 50 ? (
                    <Volume1 className="w-6 h-6" />
                  ) : (
                    <Volume2 className="w-6 h-6" />
                  )}
                </div>
                <div className="relative w-2 h-28 sm:h-36 bg-white/20 rounded-full overflow-hidden flex flex-col justify-end">
                  <div
                    className="w-full bg-gradient-to-t from-[#F0B429] to-[#FFF0B3] rounded-full transition-all duration-75"
                    style={{ height: `${gestureValue}%` }}
                  />
                </div>
                <span className="mt-3 text-[11px] font-mono font-bold text-white tracking-wider">
                  {gestureValue}%
                </span>
              </div>
            )}

            {/* Tap to Unmute Audio Banner */}
            {needsUnmute && !isLoading && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-[#F0B429] text-[#0B0D10] text-xs font-bold shadow-[0_4px_20px_rgba(240,180,41,0.4)] flex items-center gap-1.5 cursor-pointer animate-bounce select-none"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>Tap to Unmute Audio</span>
              </div>
            )}

            {/* Loading Spinner */}
            {isLoading && (
              <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 pointer-events-none">
                <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-[#F0B429] animate-spin" />
                <span className="text-xs font-mono font-bold text-gray-200 tracking-wide mt-2">
                  Tuning into {activeChannel.name}...
                </span>
              </div>
            )}

            {/* Error Screen with Retry & Back to Channels */}
            {error && (
              <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center gap-3">
                <div className="flex flex-col items-center gap-3 p-6 max-w-md bg-[#15181D] rounded-2xl border border-[#292E35] shadow-2xl">
                  <AlertCircle className="w-10 h-10 text-red-400" />
                  <h3 className="text-sm sm:text-base font-bold text-white font-headline">
                    Broadcast Notice
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed font-body">
                    {error}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={handleRetryStream}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F0B429] text-[#0B0D10] font-bold text-xs hover:bg-[#F7C948] transition-colors cursor-pointer shadow-[0_4px_16px_rgba(240,180,41,0.35)] active:scale-95"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Retry Broadcast</span>
                    </button>
                    {isFullscreen && (
                      <button
                        type="button"
                        onClick={exitFullscreenMode}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#1D2127] hover:bg-[#292E35] text-white font-medium text-xs border border-[#292E35] transition-colors cursor-pointer active:scale-95"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Back to Channels</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* CONTROLS OVERLAY (Matches VideoPlayer Streaming UI) */}
            <div
              className={`absolute inset-0 z-30 flex flex-col justify-between p-3 sm:p-5 transition-opacity duration-200 ${
                showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* TOP BAR */}
              <div
                className="flex items-center justify-between pointer-events-auto bg-gradient-to-b from-black/95 via-black/50 to-transparent p-2.5 sm:p-4 rounded-t-xl gap-3"
                style={{
                  paddingLeft: 'max(14px, env(safe-area-inset-left, 14px))',
                  paddingRight: 'max(14px, env(safe-area-inset-right, 14px))',
                }}
              >
                {/* Left: Back (in landscape) + Channel Logo & Title */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {isFullscreen && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        exitFullscreenMode();
                      }}
                      className="w-10 h-10 rounded-full bg-[#15181D]/80 hover:bg-[#1D2127] active:bg-[#0B0D10] border border-[#292E35] text-white flex items-center justify-center cursor-pointer transition-colors press-feedback flex-shrink-0"
                      title="Exit Landscape"
                      aria-label="Back"
                    >
                      <ChevronLeft className="w-5 h-5 text-[#F0B429]" />
                    </button>
                  )}

                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0B0D10]/80 border border-white/10 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                    <img
                      src={activeChannel.logo}
                      alt={activeChannel.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs sm:text-sm md:text-base font-bold text-[#F5F5F2] truncate font-headline leading-tight">
                        {activeChannel.name}
                      </h2>
                      <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-red-600 text-white font-bold leading-none animate-pulse shrink-0">
                        LIVE
                      </span>
                      {activeChannel.badge && (
                        <span className="hidden sm:inline text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#F0B429]/15 text-[#F0B429] font-bold shrink-0">
                          {activeChannel.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-300 truncate max-w-xs sm:max-w-md mt-0.5 font-medium">
                      {activeChannel.currentProgram}
                    </p>
                  </div>
                </div>

                {/* Right: Screen Fit toggle (Landscape) + Quality Tag */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isFullscreen && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        cycleFitMode();
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#15181D]/90 hover:bg-[#1D2127] active:bg-[#0B0D10] border border-[#292E35] text-xs font-semibold text-gray-200 cursor-pointer transition-colors min-h-[36px]"
                      title={`Screen Fit: ${fitMode === 'contain' ? 'Fit (Original)' : fitMode === 'cover' ? 'Zoom (Fill Screen)' : 'Stretch'}`}
                      aria-label="Toggle Screen Fit"
                    >
                      <Scan className="w-3.5 h-3.5 text-[#F0B429]" />
                      <span className="font-mono text-[11px] uppercase hidden sm:inline">
                        {fitMode === 'contain' ? 'Fit' : fitMode === 'cover' ? 'Zoom' : 'Stretch'}
                      </span>
                    </button>
                  )}

                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl bg-white/10 border border-white/15 text-white">
                    {activeChannel.quality}
                  </span>
                </div>
              </div>

              {/* CENTER PLAY/PAUSE & CHANNEL JUMP CONTROLS */}
              <div
                className={`pointer-events-auto flex items-center justify-center gap-6 sm:gap-10 transition-opacity duration-200 ${
                  isLoading ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                {/* Previous Channel Button (Landscape) */}
                {isFullscreen && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevChannel();
                    }}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 border border-white/15 text-white/90 hover:text-[#F0B429] flex items-center justify-center cursor-pointer transition-all backdrop-blur-md press-feedback"
                    title="Previous Channel"
                    aria-label="Previous Channel"
                  >
                    <SkipBack className="w-5 h-5 sm:w-6 sm:h-6 text-[#F0B429]" />
                  </button>
                )}

                {/* Big Gold Center Play/Pause Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlayPause();
                  }}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#F0B429] hover:bg-[#F7C948] active:scale-95 text-[#0B0D10] flex items-center justify-center cursor-pointer transition-all shadow-[0_8px_30px_rgba(240,180,41,0.45)] press-feedback"
                  title={isPlaying ? 'Pause' : 'Play'}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 sm:w-9 sm:h-9 fill-current" />
                  ) : (
                    <Play className="w-7 h-7 sm:w-9 sm:h-9 fill-current ml-1" />
                  )}
                </button>

                {/* Next Channel Button (Landscape) */}
                {isFullscreen && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextChannel();
                    }}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 border border-white/15 text-white/90 hover:text-[#F0B429] flex items-center justify-center cursor-pointer transition-all backdrop-blur-md press-feedback"
                    title="Next Channel"
                    aria-label="Next Channel"
                  >
                    <SkipForward className="w-5 h-5 sm:w-6 sm:h-6 text-[#F0B429]" />
                  </button>
                )}
              </div>

              {/* BOTTOM CONTROLS BAR */}
              <div
                className="flex items-center justify-between pointer-events-auto bg-gradient-to-t from-black/95 via-black/60 to-transparent p-2.5 sm:p-4 rounded-b-xl"
                style={{
                  paddingLeft: 'max(14px, env(safe-area-inset-left, 14px))',
                  paddingRight: 'max(14px, env(safe-area-inset-right, 14px))',
                }}
              >
                {/* Left: Play/Pause, Mute & Live Status */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayPause();
                    }}
                    className="w-10 h-10 rounded-xl text-white hover:text-[#F0B429] active:bg-white/10 flex items-center justify-center cursor-pointer transition-colors press-feedback"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute();
                    }}
                    className="w-9 h-9 rounded-xl text-gray-300 hover:text-white active:bg-white/10 flex items-center justify-center cursor-pointer transition-colors press-feedback"
                    title={isMuted ? 'Unmute' : 'Mute'}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#F0B429]" />}
                  </button>

                  {/* Volume Slider - Landscape Only */}
                  {isFullscreen && (
                    <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md">
                      <Volume2 className="w-3.5 h-3.5 text-[#F0B429]" />
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.02}
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (videoRef.current) {
                            videoRef.current.volume = val;
                            if (val > 0 && videoRef.current.muted) {
                              videoRef.current.muted = false;
                              setIsMuted(false);
                            }
                          }
                          setVolume(val);
                          if (val === 0) setIsMuted(true);
                          else if (isMuted) setIsMuted(false);
                          setActiveGesture('volume');
                          setGestureValue(Math.round(val * 100));
                          if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
                          gestureTimeoutRef.current = setTimeout(() => setActiveGesture(null), 1000);
                        }}
                        className="w-16 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#F0B429]"
                        title="Audio Volume"
                      />
                      <span className="font-mono text-[10px] text-gray-300 w-7 text-right">{isMuted ? '0%' : `${Math.round(volume * 100)}%`}</span>
                    </div>
                  )}

                  {/* Live Status indicator */}
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-mono font-bold select-none ml-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span>LIVE STREAM</span>
                  </div>
                </div>

                {/* Right: Quick Channel Switcher (Landscape) + Fullscreen Toggle */}
                <div className="flex items-center gap-2">
                  {isFullscreen && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrevChannel();
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-[#15181D]/90 hover:bg-[#1D2127] active:bg-[#0B0D10] border border-[#292E35] text-xs font-semibold text-gray-200 cursor-pointer transition-colors flex items-center gap-1 min-h-[36px]"
                        title="Previous Channel"
                      >
                        <SkipBack className="w-3.5 h-3.5 text-[#F0B429]" />
                        <span className="hidden sm:inline">Prev</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNextChannel();
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-[#15181D]/90 hover:bg-[#1D2127] active:bg-[#0B0D10] border border-[#292E35] text-xs font-semibold text-gray-200 cursor-pointer transition-colors flex items-center gap-1 min-h-[36px]"
                        title="Next Channel"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <SkipForward className="w-3.5 h-3.5 text-[#F0B429]" />
                      </button>
                    </div>
                  )}

                  {/* Fullscreen Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFullscreen();
                    }}
                    className="w-10 h-10 rounded-xl text-gray-300 hover:text-white active:bg-white/10 flex items-center justify-center cursor-pointer transition-colors press-feedback"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Landscape Mode'}
                    aria-label={isFullscreen ? 'Exit Fullscreen' : 'Landscape Mode'}
                  >
                    {isFullscreen ? <Minimize className="w-5 h-5 text-white" /> : <Maximize className="w-5 h-5 text-white" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Active Channel Info Strip (Portrait only) */}
          {!isFullscreen && (
            <div className="bg-[#15181D] border border-[#292E35] rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0B0D10] border border-[#292E35] p-1 flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={activeChannel.logo}
                    alt={activeChannel.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{activeChannel.name}</h3>
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">
                      LIVE
                    </span>
                    {activeChannel.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#F0B429]/15 text-[#F0B429] font-bold">
                        {activeChannel.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#9A9FA8] mt-0.5 truncate max-w-xs sm:max-w-md">
                    {activeChannel.currentProgram}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                <span>{activeChannel.language}</span>
              </div>
            </div>
          )}

          {/* Channel Guide Grid Section (Portrait only) */}
          {!isFullscreen && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-200">
                  Channel Guide ({filteredChannels.length})
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
                {filteredChannels.map((channel) => {
                  const isActive = channel.id === activeChannel.id;
                  return (
                    <div
                      key={channel.id}
                      onClick={() => handleSelectChannel(channel)}
                      className={`group relative flex flex-col justify-between p-3 rounded-xl transition-all cursor-pointer select-none border ${
                        isActive
                          ? 'bg-[#F0B429]/10 border-[#F0B429] shadow-[0_0_15px_rgba(240,180,41,0.25)]'
                          : 'bg-[#15181D] hover:bg-[#1D2127] border-[#292E35] hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-[#0B0D10] border border-[#292E35] p-1 flex items-center justify-center overflow-hidden shrink-0">
                          <img
                            src={channel.logo}
                            alt={channel.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="flex flex-col items-end">
                          {isActive ? (
                            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#F0B429] text-[#0B0D10] font-black uppercase tracking-wider animate-pulse">
                              PLAYING
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-black/40 text-gray-400">
                              {channel.quality}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className={`text-xs font-bold truncate leading-tight transition-colors ${
                          isActive ? 'text-[#F0B429]' : 'text-gray-200 group-hover:text-white'
                        }`}>
                          {channel.name}
                        </h4>
                        <p className="text-[10px] text-gray-400 truncate mt-1">
                          {channel.currentProgram}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

LiveTvView.displayName = 'LiveTvView';
