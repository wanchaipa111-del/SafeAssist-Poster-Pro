import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500/95 backdrop-blur-sm px-3.5 py-2 text-xs font-semibold text-white shadow-xl border border-amber-400">
      <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse shrink-0" />
      <span>โหมดออฟไลน์ — ข้อมูลกำลังทำงานจากแคชในเครื่อง</span>
    </div>
  );
};
