import React, { useEffect } from 'react';
import { Download } from 'lucide-react';
import type { UpdateInfo } from '../services/updateService';
import { updateService } from '../services/updateService';
import { OFFICIAL_WEBSITE_URL } from '../config/version';

interface UpdateModalProps {
  updateInfo: UpdateInfo;
  currentVersion: string;
  currentVersionCode?: number;
  isMandatory?: boolean;
  onClose?: () => void;
  onLater?: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  updateInfo,
  currentVersion: _currentVersion,
  isMandatory = false,
  onClose,
  onLater,
}) => {
  const isForceUpdate = Boolean(updateInfo.forceUpdate || isMandatory);
  const websiteUrl =
    (updateInfo.websiteUrl && !updateInfo.websiteUrl.toLowerCase().endsWith('.apk'))
      ? updateInfo.websiteUrl
      : (OFFICIAL_WEBSITE_URL || 'https://cinevaultapk.online/');

  // Prevent background scrolling while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Handle escape key only for non-mandatory updates
  useEffect(() => {
    if (isForceUpdate) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleLaterClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isForceUpdate]);

  // Lock down Android back press when force update is active
  useEffect(() => {
    if (!isForceUpdate) return;
    const blockBack = () => {
      return false;
    };
    (window as any).handleAndroidBack = blockBack;
    return () => {
      if ((window as any).handleAndroidBack === blockBack) {
        delete (window as any).handleAndroidBack;
      }
    };
  }, [isForceUpdate]);

  const handleUpdateClick = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    try {
      const androidDevice = (window as any).AndroidDevice;
      if (androidDevice && typeof androidDevice.openExternalUrl === 'function') {
        const opened = androidDevice.openExternalUrl(websiteUrl);
        if (opened) return;
      }
    } catch {}
    updateService.openUpdateUrl(websiteUrl);
  };

  const handleLaterClick = () => {
    if (isForceUpdate) return;
    if (onLater) {
      onLater();
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100000] flex flex-col items-center justify-center p-6 bg-black/95 backdrop-blur-md select-none animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-dialog-title"
    >
      {/* Background click handler (if not mandatory) */}
      <div
        className="absolute inset-0"
        onClick={isForceUpdate ? undefined : handleLaterClick}
      />

      {/* Main Centered Content */}
      <div
        className="relative z-10 flex flex-col items-center text-center max-w-sm w-full px-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CineVault Logo in Elevated Cinema Card */}
        <div className="relative mb-6 flex items-center justify-center w-36 h-36 sm:w-40 sm:h-40 rounded-3xl bg-[#0B1224] border border-white/[0.08] shadow-[0_16px_48px_rgba(5,10,24,0.85)] p-4">
          <div className="absolute inset-0 rounded-3xl bg-[#176BFF]/15 blur-xl pointer-events-none" />
          <img
            src="/logo-user.png"
            alt="CineVault"
            className="w-full h-full object-contain relative z-10 drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)]"
            draggable={false}
          />
        </div>

        {/* Title: Update Required or Update Available */}
        <div className="flex flex-col items-center">
          {isForceUpdate && (
            <span className="mb-2 text-[10px] tracking-[0.2em] uppercase font-bold text-[#35A7FF] bg-[#176BFF]/15 border border-[#35A7FF]/30 px-3 py-1 rounded-full">
              Action Required • Mandatory Update
            </span>
          )}
          <h2
            id="update-dialog-title"
            className="text-2xl sm:text-[26px] font-black text-[#F5F7FF] tracking-tight leading-tight font-headline"
          >
            {isForceUpdate ? 'Update Required' : 'Update Available'}
          </h2>
        </div>

        {/* Subtitle */}
        <p className="mt-2 text-sm sm:text-base text-[#8D9AB5] font-medium leading-relaxed max-w-[280px]">
          {isForceUpdate
            ? 'To continue using CineVault, please update to the latest version.'
            : (updateInfo.updateMessage || 'Update The Apk To The Latest Version')}
        </p>

        {/* Version Chip */}
        <div className="mt-3 flex items-center justify-center">
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#176BFF]/15 border border-[#35A7FF]/30 text-[#35A7FF] font-semibold">
            v{updateInfo.latestVersionName} Available
          </span>
        </div>

        {/* Action Button: "Update Now" */}
        <div className="mt-7 w-full max-w-[260px] space-y-3">
          <button
            type="button"
            onClick={handleUpdateClick}
            className="w-full py-4 px-8 rounded-full bg-gradient-to-r from-[#176BFF] to-[#35A7FF] text-white font-black text-base shadow-[0_10px_28px_rgba(23,107,255,0.45)] hover:shadow-[0_12px_32px_rgba(53,167,255,0.6)] active:scale-[0.97] transition-all flex items-center justify-center gap-2 cursor-pointer tracking-wide"
          >
            <Download className="w-5 h-5 text-white" />
            <span>Update Now</span>
          </button>

          {/* Optional "Later" action for non-mandatory updates */}
          {!isForceUpdate && (
            <button
              type="button"
              onClick={handleLaterClick}
              className="w-full py-2.5 text-xs font-semibold text-[#8D9AB5] hover:text-[#F5F7FF] transition-colors cursor-pointer"
            >
              Later
            </button>
          )}
        </div>

        <p className="mt-4 text-[11px] text-[#8D9AB5]/80">
          Official CineVault Website • https://cinevaultapk.online/
        </p>
      </div>
    </div>
  );
};
