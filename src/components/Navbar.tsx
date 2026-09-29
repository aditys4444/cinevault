import React, { memo, useCallback } from 'react';
import { Film, Tv, Download } from 'lucide-react';
import { OFFICIAL_TELEGRAM_URL } from '../config/version';

interface NavbarProps {
  onOpenSearch?: () => void;
  activeView: 'home' | 'livetv' | 'downloads' | 'profile';
  onNavigate: (view: 'home' | 'livetv' | 'downloads' | 'profile') => void;
  userName?: string;
  userInitials?: string;
  isAdultMode?: boolean;
  onToggleAdultMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = memo(({
  activeView,
  onNavigate,
  userName = 'Julian Vance',
  userInitials = 'JV',
  isAdultMode = false,
  onToggleAdultMode,
}) => {
  const handleLogoClick = useCallback(() => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    if (onToggleAdultMode) {
      onToggleAdultMode();
    } else {
      onNavigate('home');
    }
  }, [onToggleAdultMode, onNavigate]);

  const handleTelegramClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    
    // In Android App WebView, invoke the native intent directly
    try {
      const android = (window as any).AndroidDevice;
      if (android) {
        e.preventDefault();
        if (typeof android.openTelegram === 'function') {
          android.openTelegram(OFFICIAL_TELEGRAM_URL);
          return;
        }
        if (typeof android.openExternalUrl === 'function') {
          android.openExternalUrl(OFFICIAL_TELEGRAM_URL);
          return;
        }
      }
    } catch (err) {
      console.warn('Native openTelegram failed:', err);
    }
    // On web browsers, the <a> tag handles opening in new tab smoothly
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#060911]/90 backdrop-blur-xl border-b border-[#1E293B]/60 transition-colors shadow-[0_4px_30px_rgba(0,0,0,0.8)] pt-safe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 h-14 sm:h-16 flex items-center justify-between">
        {/* CineVault Brand Logo with 18+ Secret Toggle */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleLogoClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleLogoClick();
          }}
          className="h-10 sm:h-12 max-w-[170px] sm:max-w-[210px] flex items-center gap-2 cursor-pointer select-none focus:outline-none transition-transform active:scale-95 group"
          title={isAdultMode ? "18+ Mode Active - Click to return to Standard CineVault" : "Click logo to enter 18+ Content"}
        >
          {isAdultMode ? (
            <div className="flex items-center gap-2 animate-fade-in">
              <img
                src="/cinevault-18plus-logo.jpg"
                alt="CineVault 18+"
                className="h-9 sm:h-10 w-auto rounded-lg object-contain border border-[#176BFF]/60 shadow-[0_0_14px_rgba(23,107,255,0.4)]"
                draggable={false}
              />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-red-600/20 text-red-400 border border-red-500/30">
                18+
              </span>
            </div>
          ) : (
            <img
              src="/logo-user.png"
              alt="CineVault"
              className="h-full w-auto max-w-full object-contain"
              draggable={false}
            />
          )}
        </div>

        {/* Desktop Center Navigation Links */}
        <div className="hidden md:flex items-center gap-1.5 bg-[#0E1726]/90 border border-[#1E293B]/60 rounded-xl p-1 shadow-inner backdrop-blur-md">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer press-feedback ${
              activeView === 'home'
                ? 'bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white font-bold shadow-[0_2px_12px_rgba(23,107,255,0.45)]'
                : 'text-[#8D9AB5] hover:text-[#F5F7FF] hover:bg-[#16223D]'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Vault</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('livetv')}
            className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer press-feedback ${
              activeView === 'livetv'
                ? 'bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white font-bold shadow-[0_2px_12px_rgba(23,107,255,0.45)]'
                : 'text-[#8D9AB5] hover:text-[#F5F7FF] hover:bg-[#16223D]'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Live TV</span>
            <span className="px-1 py-[0.5px] bg-red-600 text-white text-[7.5px] font-black uppercase rounded-full animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.7)] leading-none">
              LIVE
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('downloads')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer press-feedback ${
              activeView === 'downloads'
                ? 'bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white font-bold shadow-[0_2px_12px_rgba(23,107,255,0.45)]'
                : 'text-[#8D9AB5] hover:text-[#F5F7FF] hover:bg-[#16223D]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Downloads</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Telegram Channel Button (Mobile & Desktop) */}
          <a
            href={OFFICIAL_TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleTelegramClick}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-[#229ED9]/15 hover:bg-[#229ED9]/25 active:bg-[#229ED9]/30 border border-[#229ED9]/40 text-[#229ED9] hover:text-[#52c5ff] transition-all cursor-pointer press-feedback shadow-[0_2px_12px_rgba(34,158,217,0.2)] no-underline"
            title="Join Official CineVault Telegram Channel"
            aria-label="Official Telegram Channel"
          >
            <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px] fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            <span className="text-xs sm:text-sm font-bold tracking-tight">Telegram</span>
          </a>

          {/* Desktop: VIP Privé Profile Button (hidden on mobile since profile is in BottomNav) */}
          <button
            type="button"
            onClick={() => onNavigate(activeView === 'profile' ? 'home' : 'profile')}
            title={`VIP Profile: ${userName}`}
            className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer press-feedback border ${
              activeView === 'profile'
                ? 'bg-[#176BFF]/15 border-[#35A7FF]/50 text-[#35A7FF]'
                : 'bg-transparent border-transparent hover:bg-[#0E172B] text-[#8D9AB5] hover:text-[#F5F7FF]'
            }`}
          >
            <div className="w-6 h-6 rounded-full p-[1.5px] bg-gradient-to-tr from-[#176BFF] to-[#35A7FF]">
              <div className="w-full h-full rounded-full bg-[#0B1224] flex items-center justify-center text-[9px] font-bold text-[#35A7FF]">
                {userInitials}
              </div>
            </div>
            <span>Privé</span>
          </button>
        </div>
      </div>
    </header>
  );
});

Navbar.displayName = 'Navbar';
