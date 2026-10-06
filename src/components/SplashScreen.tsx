import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  isReady?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [fadingOut, setFadingOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Micro-delay to trigger entry transitions cleanly
    requestAnimationFrame(() => setMounted(true));

    // Snappy, luxurious 850ms brand display
    const timer = setTimeout(() => {
      setFadingOut(true);
    }, 850);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (fadingOut) {
      const exitTimer = setTimeout(() => {
        onComplete();
      }, 250); // 250ms smooth crossfade
      return () => clearTimeout(exitTimer);
    }
  }, [fadingOut, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050A18] select-none transition-all duration-300 ease-out ${
        fadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{ willChange: 'opacity, transform' }}
    >
      {/* Cinematic Ambient Glow Aura */}
      <div className="absolute w-[300px] sm:w-[420px] h-[300px] sm:h-[420px] rounded-full bg-gradient-to-tr from-[#176BFF]/25 via-[#35A7FF]/15 to-transparent blur-[90px] pointer-events-none animate-pulse" />

      {/* Center Brand Identity */}
      <div
        className={`relative z-10 flex flex-col items-center px-6 transition-all duration-500 ease-out ${
          mounted ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
        }`}
      >
        {/* Emblem/Logo Container with Glassmorphic Glow */}
        <div className="relative w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center drop-shadow-[0_16px_40px_rgba(23,107,255,0.45)]">
          <img
            src="/logo-user.png"
            alt="CineVault"
            className="w-full h-full object-contain filter drop-shadow-[0_8px_24px_rgba(0,0,0,0.8)]"
            draggable={false}
          />
        </div>

        {/* Brand Name Typography */}
        <div className="mt-5 flex flex-col items-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[0.28em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F5F7FF] to-[#35A7FF] drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] font-headline pl-[0.28em]">
            CINEVAULT
          </h1>
          <p className="mt-1.5 text-[10px] sm:text-[11px] tracking-[0.35em] uppercase font-semibold text-[#8D9AB5] pl-[0.35em]">
            CURATED CINEMA
          </p>
        </div>

        {/* Minimalist Sapphire Progress Line */}
        <div className="w-28 sm:w-36 h-[2px] bg-white/[0.08] rounded-full mt-7 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#176BFF] via-[#35A7FF] to-[#176BFF] rounded-full animate-[progress_1s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
};
