import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);

  // If already running in standalone mode as installed PWA, hide install button
  if (isInstalled) {
    return (
      <div
        title="กำลังใช้งานในโหมดแอปที่ติดตั้งแล้ว (PWA Standalone Mode)"
        className="hidden md:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20"
      >
        <i className="fa-solid fa-mobile-screen-button text-[11px]"></i>
        <span>PWA Installed</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow (native prompt available)
  if (isInstallable) {
    return (
      <button
        onClick={install}
        title="ติดตั้งแอปนี้ลงเครื่อง (PWA Desktop / Mobile)"
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md shadow-blue-500/25 transition text-xs font-bold cursor-pointer animate-pulse hover:animate-none"
      >
        <i className="fa-solid fa-download text-[11px]"></i>
        <span>ติดตั้งแอป (PWA)</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          title="วิธีติดตั้งแอปลงบน iPhone / iPad"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 transition text-xs font-semibold cursor-pointer"
        >
          <i className="fa-brands fa-apple text-sm"></i>
          <span>ติดตั้งบน iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="text-base font-bold flex items-center">
                  <i className="fa-brands fa-apple text-xl mr-2 text-slate-900 dark:text-white"></i>
                  ติดตั้งบน iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 font-bold flex items-center justify-center shrink-0">1</span>
                  <p>แตะปุ่ม <strong>แชร์ (Share)</strong> <i className="fa-solid fa-arrow-up-from-bracket mx-1 text-blue-500"></i> ที่แถบเครื่องมือของ Safari ด้านล่าง</p>
                </div>
                <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 font-bold flex items-center justify-center shrink-0">2</span>
                  <p>เลื่อนลงมาแล้วเลือก <strong>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</strong> <i className="fa-regular fa-square-plus mx-1 text-emerald-500"></i></p>
                </div>
                <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 font-bold flex items-center justify-center shrink-0">3</span>
                  <p>กด <strong>"เพิ่ม" (Add)</strong> มุมขวาบน เพื่อเปิดใช้งานเหมือนแอปจริงได้ทันที!</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition cursor-pointer shadow-md"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback / Desktop Browser button (e.g. Chrome omnibox or instructions)
  return (
    <>
      <button
        onClick={() => setShowManualGuide(true)}
        title="วิธีติดตั้งแอปพลิเคชันลงในเครื่อง"
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 transition text-xs font-semibold cursor-pointer"
      >
        <i className="fa-solid fa-laptop-medical text-blue-500"></i>
        <span className="hidden sm:inline">ติดตั้งลงเครื่อง</span>
      </button>

      {showManualGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-base font-bold flex items-center">
                <i className="fa-solid fa-download text-blue-500 mr-2"></i>
                การติดตั้งแอป (PWA)
              </h3>
              <button
                onClick={() => setShowManualGuide(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <p>คุณสามารถติดตั้งแอปนี้เพื่อเปิดใช้งานแบบเต็มหน้าจอ (Standalone) ได้ทั้งบนคอมพิวเตอร์และมือถือ:</p>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2">
                <p>💻 <strong>บนคอมพิวเตอร์ (Chrome / Edge):</strong> สังเกตไอคอนติดตั้ง <i className="fa-solid fa-download text-blue-500 mx-1"></i> ที่แถบ Address bar ด้านบนขวา แล้วกด <em>"ติดตั้ง" (Install)</em></p>
                <p>📱 <strong>บนมือถือ Android:</strong> กดปุ่มเมนู 3 จุดของเบราว์เซอร์ แล้วเลือก <em>"เพิ่มลงในหน้าจอหลัก" (Install App / Add to Home screen)</em></p>
              </div>
            </div>

            <button
              onClick={() => setShowManualGuide(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition cursor-pointer shadow-md"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </>
  );
};
