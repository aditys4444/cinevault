import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  isReady?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, isReady = true }) => {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Fast brand presentation — 400ms minimum then rapid fade
    const minTimer = setTimeout(() => {
      if (isReady) {
        setFadingOut(true);
      }
    }, 400);

    // Hard safeguard: never hold splash screen for more than 700ms under any network conditions
    const maxTimer = setTimeout(() => {
      setFadingOut(true);
    }, 700);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, [isReady]);

  // If data becomes ready after 400ms, fade out immediately
  useEffect(() => {
    if (isReady && !fadingOut) {
      const readyTimer = setTimeout(() => setFadingOut(true), 100);
      return () => clearTimeout(readyTimer);
    }
  }, [isReady, fadingOut]);

  useEffect(() => {
    if (fadingOut) {
      const exitTimer = setTimeout(() => {
        onComplete();
      }, 200); // 200ms smooth fade
      return () => clearTimeout(exitTimer);
    }
  }, [fadingOut, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0B0D10] select-none transition-all duration-200 ease-out ${
        fadingOut ? 'opacity-0 scale-[1.02] pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{ willChange: 'opacity, transform' }}
    >
      {/* Ambient Champagne Gold Glow */}
      <div className="absolute w-[240px] sm:w-[320px] h-[240px] sm:h-[320px] rounded-full bg-[#F0B429]/8 blur-[80px] pointer-events-none" />

      {/* Logo Container */}
      <div className="relative z-10 flex flex-col items-center px-6">
        <div className="w-[160px] sm:w-[200px] md:w-[240px] aspect-square flex items-center justify-center drop-shadow-[0_12px_36px_rgba(0,0,0,0.8)]">
          <img
            src="/logo-user.png"
            alt="CineVault"
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>

        {/* Tagline */}
        <p className="mt-5 text-[11px] sm:text-xs tracking-[0.25em] uppercase font-semibold text-[#F0B429]">
          Curated Luxury Streaming
        </p>

        {/* Progress Indicator */}
        <div className="w-32 sm:w-40 h-[2px] bg-[#1D2127] rounded-full mt-6 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#F0B429]/40 via-[#F0B429] to-[#F0B429]/40 rounded-full animate-[progress_1.2s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
};
