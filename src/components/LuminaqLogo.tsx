import React from 'react';

interface LuminaqLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const LuminaqLogo: React.FC<LuminaqLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
}) => {
  // Height configurations
  const heightMap = {
    sm: 'h-8',
    md: 'h-11',
    lg: 'h-16',
  };

  return (
    <div className={`flex items-center space-x-3 select-none ${className}`}>
      {/* SVG Emblem matching the uploaded Luminaq Soft logo */}
      <svg
        className={`${heightMap[size]} w-auto aspect-square shrink-0 drop-shadow-[0_2px_10px_rgba(56,189,248,0.35)]`}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="luminaqOuter" x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="35%" stopColor="#67E8F9" />
            <stop offset="70%" stopColor="#6EE7B7" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>

          <linearGradient id="luminaqInner" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="50%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>

          <radialGradient id="luminaqGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient background glow */}
        <circle cx="50" cy="50" r="38" fill="url(#luminaqGlow)" opacity="0.4" />

        {/* Outer Droplet & Swirl Q Ribbon */}
        <path
          d="M 38 12 
             C 45 22, 52 28, 62 33 
             C 74 39, 82 50, 80 64 
             C 78 77, 66 86, 52 86 
             C 34 86, 21 73, 21 55 
             C 21 42, 28 32, 38 12 Z"
          fill="url(#luminaqOuter)"
        />

        {/* Inner Counter/Loop Cutout to form the ring */}
        <path
          d="M 50 34 
             C 61 34, 69 42, 69 53 
             C 69 64, 60 72, 49 72 
             C 38 72, 31 63, 31 52 
             C 31 41, 40 34, 50 34 Z"
          fill="url(#luminaqInner)"
          opacity="0.15"
        />

        {/* Q Tail Swirl Sweep */}
        <path
          d="M 46 72 
             C 56 72, 67 76, 75 83 
             C 78 85, 83 87, 85 86 
             C 87 85, 82 80, 77 75 
             C 72 70, 68 66, 68 62 
             C 68 60, 70 59, 72 61 
             C 75 64, 80 72, 74 77 
             C 68 81, 57 77, 46 72 Z"
          fill="url(#luminaqOuter)"
        />

        {/* Center Four-Point Sparkle Star (✦) */}
        <path
          d="M 50 36 
             Q 50 48 40 51 
             Q 50 54 50 66 
             Q 50 54 60 51 
             Q 50 48 50 36 Z"
          fill="#FFFFFF"
          filter="drop-shadow(0 0 4px rgba(255, 255, 255, 0.9))"
        />
        <circle cx="50" cy="51" r="2.5" fill="#E0F2FE" />
      </svg>

      {/* Brand Text Typography */}
      <div className="flex flex-col justify-center leading-none">
        <span
          className={`font-extrabold tracking-tight text-slate-900 dark:text-white ${
            size === 'sm' ? 'text-lg' : size === 'md' ? 'text-2xl' : 'text-3xl'
          }`}
          style={{ letterSpacing: '-0.02em' }}
        >
          Luminaq
        </span>
        {showSubtitle && (
          <span
            className={`font-bold tracking-[0.28em] text-sky-500 dark:text-sky-400 uppercase mt-0.5 ${
              size === 'sm' ? 'text-[9px]' : size === 'md' ? 'text-[11px]' : 'text-xs'
            }`}
          >
            SOFT
          </span>
        )}
      </div>
    </div>
  );
};
