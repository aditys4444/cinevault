import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import type { Movie } from '../types/movie';
import { cacheService } from '../services/cacheService';
import {
  Edit3,
  Check,
  X,
  Bookmark,
  Download,
  Play,
  Trash2,
  Settings,
  Film,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { APP_VERSION, OFFICIAL_WEBSITE_URL, OFFICIAL_TELEGRAM_URL } from '../config/version';
import { updateService, type UpdateInfo } from '../services/updateService';

export interface UserProfile {
  name: string;
  title: string;
  memberId?: string;
  sinceYear?: string;
}

interface ProfileViewProps {
  watchlist: Movie[];
  profile?: UserProfile;
  onUpdateProfile?: (profile: UserProfile) => void;
  onPlayMovie: (movie: Movie) => void;
  onSelectMovie: (movie: Movie) => void;
  onRemoveFromWatchlist: (movie: Movie) => void;
  onNavigateHome: () => void;
  onShowUpdateModal?: (info: UpdateInfo) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = memo(({
  watchlist,
  profile = {
    name: 'Julian Vance',
    title: 'CineVault Member',
    memberId: '#CV-88292',
    sinceYear: '2024',
  },
  onUpdateProfile,
  onPlayMovie,
  onSelectMovie,
  onRemoveFromWatchlist,
  onNavigateHome,
  onShowUpdateModal,
}) => {
  const [activeTab, setActiveTab] = useState<'watchlist' | 'settings'>('watchlist');

  // Profile editing
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(profile.name);

  // App Update State
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [updateStatusMessage, setUpdateStatusMessage] = useState<string | null>(null);

  // Settings State (persisted)
  const [wifiOnly, setWifiOnly] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cinevault_wifi_only') !== 'false';
    } catch {
      return true;
    }
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2500);
  }, []);

  useEffect(() => {
    setEditName(profile.name);
  }, [profile.name]);

  const handleSaveProfile = useCallback(() => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    const trimmed = editName.trim() || 'CineVault User';
    onUpdateProfile?.({
      ...profile,
      name: trimmed,
    });
    setIsEditing(false);
    showToast('Profile updated');
  }, [editName, profile, onUpdateProfile, showToast]);

  // Real offline downloads count and storage calculation
  const downloadStats = useMemo(() => {
    try {
      const dls = cacheService.getDownloads();
      const completed = dls.filter((d) => d.status === 'completed');
      const totalBytes = completed.reduce((acc, curr) => acc + (curr.totalBytes || 0), 0);
      let storageFormatted = '0 MB';
      if (totalBytes > 1024 * 1024 * 1024) {
        storageFormatted = `${(totalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
      } else if (totalBytes > 0) {
        storageFormatted = `${Math.round(totalBytes / (1024 * 1024))} MB`;
      }
      return {
        count: completed.length,
        storage: storageFormatted,
      };
    } catch {
      return { count: 0, storage: '0 MB' };
    }
  }, []);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'CV';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleWifiToggle = () => {
    const next = !wifiOnly;
    setWifiOnly(next);
    try {
      localStorage.setItem('cinevault_wifi_only', String(next));
    } catch {}
    showToast(next ? 'Downloads: Wi-Fi only' : 'Downloads: Wi-Fi & Cellular');
  };

  const handleClearCache = () => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    try {
      // Clear non-essential search and detail caches while preserving watchlist and downloads
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('cinevault_detail_') || k.startsWith('cinevault_recent_') || k.startsWith('mb_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      showToast('Cache cleared successfully');
    } catch {
      showToast('Cache cleared');
    }
  };

  const handleCheckUpdates = async () => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
    setIsCheckingUpdate(true);
    setUpdateStatusMessage('Checking https://cinevaultapk.online/ ...');
    try {
      const result = await updateService.checkForUpdate(true);
      if (result.hasUpdate && result.updateInfo) {
        setUpdateStatusMessage(`v${result.updateInfo.version} Available!`);
        showToast(`Update v${result.updateInfo.version} available!`);
        if (onShowUpdateModal) {
          onShowUpdateModal(result.updateInfo);
        } else {
          updateService.openWebsite(result.updateInfo.websiteUrl);
        }
      } else if (result.error) {
        setUpdateStatusMessage('Check failed (offline or server error)');
        showToast('Update server unreachable');
      } else {
        setUpdateStatusMessage(`v${APP_VERSION} is the latest version`);
        showToast(`CineVault is up to date (v${APP_VERSION})`);
      }
    } catch {
      setUpdateStatusMessage('Unable to check for updates');
      showToast('Could not check for updates');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleOpenTelegram = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
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
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-[#176BFF] text-white font-bold text-xs shadow-[0_4px_20px_rgba(23,107,255,0.45)] animate-fade-in pointer-events-none">
          {toastMessage}
        </div>
      )}

      {/* User Header Profile Card */}
      <div className="bg-[#0E172B] border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-[0_4px_16px_rgba(5,10,24,0.6)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* Avatar */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#176BFF] to-[#35A7FF] p-[2px] shrink-0 shadow-[0_4px_24px_rgba(23,107,255,0.45)]">
              <div className="w-full h-full rounded-[14px] bg-[#0E172B] flex items-center justify-center font-bold font-headline text-lg sm:text-xl text-[#35A7FF]">
                {getInitials(profile.name)}
              </div>
            </div>

            {/* Name & Badge */}
            <div className="min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-[#050A18] border border-[#176BFF] text-[#F5F7FF] text-sm font-semibold focus:outline-none ring-1 ring-[#176BFF]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className="p-2 rounded-xl bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white hover:brightness-110 transition-colors cursor-pointer"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditName(profile.name);
                      setIsEditing(false);
                    }}
                    className="p-2 rounded-xl bg-[#16223D] text-[#8D9AB5] hover:text-[#F5F7FF] transition-colors cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold font-headline text-[#F5F7FF] truncate">
                    {profile.name}
                  </h1>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="p-1 rounded-lg text-[#8D9AB5] hover:text-[#35A7FF] hover:bg-[#16223D] transition-colors cursor-pointer"
                    title="Edit Name"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-[#35A7FF] font-semibold bg-[#176BFF]/15 border border-[#35A7FF]/30 px-2 py-0.5 rounded-md">
                  Active Member
                </span>
                <span className="text-xs text-[#8D9AB5]">Member since {profile.sinceYear || '2024'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real Statistics Row */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/[0.08]">
          <div className="text-center p-2.5 rounded-xl bg-[#050A18]/60 border border-white/[0.08]">
            <div className="text-lg sm:text-xl font-bold font-headline text-[#35A7FF]">
              {watchlist.length}
            </div>
            <div className="text-[11px] text-[#8D9AB5] font-medium mt-0.5">Watchlist</div>
          </div>

          <div className="text-center p-2.5 rounded-xl bg-[#050A18]/60 border border-white/[0.08]">
            <div className="text-lg sm:text-xl font-bold font-headline text-[#F5F7FF]">
              {downloadStats.count}
            </div>
            <div className="text-[11px] text-[#8D9AB5] font-medium mt-0.5">Downloads</div>
          </div>

          <div className="text-center p-2.5 rounded-xl bg-[#050A18]/60 border border-white/[0.08]">
            <div className="text-lg sm:text-xl font-bold font-headline text-[#F5F7FF]">
              {downloadStats.storage}
            </div>
            <div className="text-[11px] text-[#8D9AB5] font-medium mt-0.5">Offline Size</div>
          </div>
        </div>
      </div>

      {/* Clean Tab Switcher */}
      <div className="bg-[#0E172B] border border-white/[0.08] rounded-xl p-1 flex items-center">
        <button
          type="button"
          onClick={() => {
            queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
            setActiveTab('watchlist');
          }}
          className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'watchlist'
              ? 'bg-[#16223D] text-[#35A7FF] shadow-sm border border-white/[0.08]'
              : 'text-[#8D9AB5] hover:text-[#F5F7FF]'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>My Watchlist ({watchlist.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            queueMicrotask(() => { if (navigator.vibrate) navigator.vibrate(8); });
            setActiveTab('settings');
          }}
          className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'settings'
              ? 'bg-[#16223D] text-[#35A7FF] shadow-sm border border-white/[0.08]'
              : 'text-[#8D9AB5] hover:text-[#F5F7FF]'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>

      {/* TAB 1: WATCHLIST */}
      {activeTab === 'watchlist' && (
        <div className="space-y-3 animate-fade-in">
          {watchlist.length > 0 ? (
            <div className="space-y-2.5">
              {watchlist.map((movie) => (
                <div
                  key={movie.id}
                  className="bg-[#0E172B] hover:bg-[#16223D] border border-white/[0.08] hover:border-[#35A7FF]/40 rounded-xl p-3 flex items-center justify-between gap-3 transition-colors group shadow-[0_4px_16px_rgba(5,10,24,0.6)]"
                >
                  <div
                    onClick={() => onSelectMovie(movie)}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  >
                    {/* Poster Thumbnail */}
                    <div className="w-12 h-16 rounded-lg overflow-hidden bg-[#050A18] shrink-0 border border-white/[0.08]">
                      {movie.poster ? (
                        <img
                          src={movie.poster}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#8D9AB5]">
                          <Film className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    {/* Movie Info */}
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[#F5F7FF] truncate group-hover:text-[#35A7FF] transition-colors">
                        {movie.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-[#8D9AB5] mt-0.5">
                        <span>{movie.release_year || 'Movie'}</span>
                        {movie.rating > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-[#35A7FF]">★ {movie.rating.toFixed(1)}</span>
                          </>
                        )}
                        {movie.media_type === 'tv' && (
                          <span className="text-[10px] font-mono uppercase bg-[#16223D] px-1.5 py-0.2 rounded text-[#8D9AB5] border border-white/[0.06]">
                            Series
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onPlayMovie(movie)}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-[#176BFF] to-[#35A7FF] hover:brightness-110 text-white font-bold text-xs cursor-pointer transition-colors press-feedback shadow-[0_2px_10px_rgba(23,107,255,0.4)]"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Play</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveFromWatchlist(movie)}
                      className="p-2 rounded-xl text-[#8D9AB5] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Remove from Watchlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-[#0E172B]/60 border border-white/[0.08] rounded-2xl p-6">
              <div className="w-12 h-12 rounded-2xl bg-[#16223D] border border-white/[0.08] flex items-center justify-center mx-auto mb-3 text-[#8D9AB5]">
                <Bookmark className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#F5F7FF]">Your Watchlist is Empty</h3>
              <p className="text-xs text-[#8D9AB5] mt-1 max-w-xs mx-auto">
                Save movies and series you want to watch later by tapping the bookmark icon on any title.
              </p>
              <button
                type="button"
                onClick={onNavigateHome}
                className="mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white font-bold text-xs cursor-pointer hover:brightness-110 shadow-[0_4px_16px_rgba(23,107,255,0.4)] transition-all press-feedback"
              >
                Browse Movies
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-4 animate-fade-in">
          {/* Download & Storage Settings */}
          <div className="bg-[#0E172B] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4 shadow-[0_4px_16px_rgba(5,10,24,0.6)]">
            <div className="flex items-center gap-2 text-sm font-bold text-[#F5F7FF]">
              <Download className="w-4 h-4 text-[#35A7FF]" />
              <span>Download Preferences</span>
            </div>

            {/* Wi-Fi Only Toggle */}
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="text-xs sm:text-sm font-semibold text-[#F5F7FF]">
                  Download on Wi-Fi Only
                </div>
                <div className="text-xs text-[#8D9AB5] mt-0.5">
                  Prevents consuming mobile cellular data
                </div>
              </div>
              <button
                type="button"
                onClick={handleWifiToggle}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  wifiOnly ? 'bg-gradient-to-r from-[#176BFF] to-[#35A7FF] shadow-[0_0_10px_rgba(23,107,255,0.5)]' : 'bg-[#16223D]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${
                    wifiOnly ? 'left-6' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Clear Cache Button */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <div>
                <div className="text-xs sm:text-sm font-semibold text-[#F5F7FF]">
                  Clear Cached Metadata
                </div>
                <div className="text-xs text-[#8D9AB5] mt-0.5">
                  Frees temporary search and detail cache
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearCache}
                className="px-3 py-1.5 rounded-xl bg-[#16223D] hover:bg-[#111B33] border border-white/[0.08] text-xs font-semibold text-[#8D9AB5] hover:text-[#F5F7FF] transition-colors cursor-pointer"
              >
                Clear Cache
              </button>
            </div>

            {/* In-App Updates Row */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <div>
                <div className="text-xs sm:text-sm font-semibold text-[#F5F7FF] flex items-center gap-2">
                  <span>App Updates</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#176BFF]/15 text-[#35A7FF] border border-[#35A7FF]/30 font-bold">
                    v{APP_VERSION}
                  </span>
                </div>
                <div className="text-xs text-[#8D9AB5] mt-0.5">
                  {updateStatusMessage || 'Direct updates from cinevaultapk.online'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCheckUpdates}
                disabled={isCheckingUpdate}
                className="px-3 py-1.5 rounded-xl bg-[#176BFF]/15 hover:bg-[#176BFF]/25 border border-[#35A7FF]/40 text-xs font-semibold text-[#35A7FF] hover:text-[#52c5ff] transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                <span>{isCheckingUpdate ? 'Checking...' : 'Check Update'}</span>
              </button>
            </div>

            {/* Official Telegram Community */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <div>
                <div className="text-xs sm:text-sm font-semibold text-[#F5F7FF] flex items-center gap-2">
                  <span>Official Telegram</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#176BFF]/15 text-[#35A7FF] border border-[#35A7FF]/30 font-bold">
                    COMMUNITY
                  </span>
                </div>
                <div className="text-xs text-[#8D9AB5] mt-0.5">
                  Latest releases, live channel requests & updates
                </div>
              </div>
              <a
                href={OFFICIAL_TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleOpenTelegram}
                className="px-3 py-1.5 rounded-xl bg-[#176BFF]/15 hover:bg-[#176BFF]/25 border border-[#35A7FF]/40 text-xs font-semibold text-[#35A7FF] hover:text-[#52c5ff] transition-colors cursor-pointer flex items-center gap-1.5 no-underline shadow-sm"
              >
                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
                <span>Join Channel</span>
              </a>
            </div>
          </div>

          {/* App Info Footer */}
          <div className="text-center py-4 text-xs text-[#8D9AB5] space-y-1">
            <div className="font-semibold text-[#F5F7FF]">CineVault • Android Edition</div>
            <div>Version {APP_VERSION} • Fast, Private, Offline Ready</div>
            <div>
              <a
                href={OFFICIAL_WEBSITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#35A7FF] hover:underline inline-flex items-center gap-1 mt-0.5 text-[11px]"
              >
                <span>cinevaultapk.online</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ProfileView.displayName = 'ProfileView';
