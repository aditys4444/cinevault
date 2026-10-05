import React, { memo, useCallback } from 'react';
import { Film, Search, Award, Download, Tv } from 'lucide-react';

interface BottomNavProps {
  activeView: 'home' | 'livetv' | 'downloads' | 'profile';
  onNavigate: (view: 'home' | 'livetv' | 'downloads' | 'profile') => void;
  onOpenSearch: () => void;
  downloadCount?: number;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  badge?: number;
  isLive?: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = memo(({ icon, label, isActive, badge, isLive, onClick }) => {
  const handleTap = useCallback(() => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    onClick();
  }, [onClick]);

  return (
    <button
      type="button"
      onClick={handleTap}
      aria-label={label}
      className={`relative flex items-center justify-center p-2.5 rounded-full transition-all duration-200 cursor-pointer active:scale-90 press-feedback ${
        isActive
          ? 'bg-gradient-to-tr from-[#176BFF] to-[#35A7FF] text-white shadow-[0_0_16px_rgba(23,107,255,0.65)]'
          : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.06]'
      }`}
    >
      {/* Icon with badge */}
      <span className="relative flex items-center justify-center">
        {icon}
        {isLive && !isActive && (
          <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444] animate-pulse" />
        )}
        {badge != null && badge > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 rounded-full text-[8.5px] font-bold bg-[#00D2FF] text-black leading-[15px] text-center shadow-sm">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
    </button>
  );
});
NavItem.displayName = 'NavItem';

export const BottomNav: React.FC<BottomNavProps> = memo(({
  activeView,
  onNavigate,
  onOpenSearch,
  downloadCount = 0,
}) => {
  return (
    <nav
      className="fixed left-1/2 -translate-x-1/2 z-40 md:hidden w-[92%] max-w-sm px-3 py-2 rounded-full bg-[#0E1726]/95 border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.85),0_0_18px_rgba(23,107,255,0.25)] flex items-center justify-between"
      style={{
        bottom: 'max(12px, calc(env(safe-area-inset-bottom, 0px) + 8px))',
      }}
      role="tablist"
      aria-label="Main navigation"
    >
      <NavItem
        icon={<Film className="w-5 h-5" />}
        label="Vault"
        isActive={activeView === 'home'}
        onClick={() => onNavigate('home')}
      />

      <NavItem
        icon={<Search className="w-5 h-5" />}
        label="Explore"
        isActive={false}
        onClick={onOpenSearch}
      />

      <NavItem
        icon={<Tv className="w-5 h-5" />}
        label="Live TV"
        isActive={activeView === 'livetv'}
        isLive={true}
        onClick={() => onNavigate('livetv')}
      />

      <NavItem
        icon={<Download className="w-5 h-5" />}
        label="Downloads"
        isActive={activeView === 'downloads'}
        badge={downloadCount}
        onClick={() => onNavigate('downloads')}
      />

      <NavItem
        icon={<Award className="w-5 h-5" />}
        label="Privé"
        isActive={activeView === 'profile'}
        onClick={() => onNavigate('profile')}
      />
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';
