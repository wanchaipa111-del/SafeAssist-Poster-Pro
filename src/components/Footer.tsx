import React from 'react';
import { LuminaqLogo } from './LuminaqLogo';

interface FooterProps {
  onSecretSellerClick?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onSecretSellerClick }) => {
  return (
    <footer className="mt-12 border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md transition-colors py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Left: Luminaq Soft Company Branding */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
            <LuminaqLogo size="md" />
            <div className="sm:border-l sm:border-slate-200 sm:dark:border-slate-800 sm:pl-4 space-y-0.5">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center sm:justify-start gap-1.5">
                <span>SafeAssist Poster Pro</span>
                <span className="px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400 font-mono text-[10px] font-bold border border-blue-200 dark:border-blue-800/60">
                  v5.5.1
                </span>
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                พัฒนาและจัดจำหน่ายโดย <strong className="text-slate-600 dark:text-slate-400 font-semibold">Luminaq Soft</strong>
              </p>
              <p className="text-[10px] text-slate-400">
                Software Solutions for Modern Real Estate Professionals
              </p>
            </div>
          </div>

          {/* Right: Security & Quality Badges */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
              <i className="fa-solid fa-shield-halved text-emerald-500"></i>
              <span>Facebook Safe Anti-Ban</span>
            </span>

            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
              <i className="fa-solid fa-database text-blue-500"></i>
              <span>Offline First & Local Storage</span>
            </span>

            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
              <i className="fa-solid fa-bolt text-amber-500"></i>
              <span>Semi-Auto Pro</span>
            </span>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <p>
            © {new Date().getFullYear()} Luminaq Soft. All rights reserved.
          </p>
          <div className="flex items-center space-x-3">
            <span>Enterprise Real Estate Automation</span>
            {onSecretSellerClick && (
              <span
                onClick={onSecretSellerClick}
                className="cursor-default select-none text-slate-300 dark:text-slate-700 hover:text-slate-400 dark:hover:text-slate-600 transition"
                title="LS"
              >
                •
              </span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
