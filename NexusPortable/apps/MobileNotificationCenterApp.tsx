import React from 'react';
import { ChevronLeft } from 'lucide-react';
import type { MobileAppProps } from '../types';
import DesktopComponent from '../../apps/NotificationCenter';

export default function MobileNotificationCenterApp({ onBack }: MobileAppProps) {
  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 shrink-0 bg-[#080808] border-b border-white/5 z-50 relative">
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <h1 className="text-white font-semibold text-[16px]">Notifications</h1>
      </div>
      <div className="flex-1 overflow-auto relative z-0">
        <DesktopComponent />
      </div>
    </div>
  );
}
