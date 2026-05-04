import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { useMobile } from '../store/mobileStore';
import { MOBILE_APPS } from '../appRegistry';

export default function MobileRecentApps() {
  const { appStack, activeAppId, openApp, closeApp, closeAllApps, isRecentAppsOpen, setRecentAppsOpen } = useMobile();

  if (!isRecentAppsOpen) return null;

  if (appStack.length === 0) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ background: 'rgba(5,5,8,0.95)', backdropFilter: 'blur(24px)', paddingTop: 'var(--status-bar-height)', paddingBottom: 'var(--nav-bar-height)' }}
        onClick={() => setRecentAppsOpen(false)}
      >
        <p className="text-white/20 text-[16px]">No recent apps</p>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: 'rgba(5,5,8,0.95)',
        backdropFilter: 'blur(24px)',
        paddingTop: 'var(--status-bar-height)',
        paddingBottom: 'var(--nav-bar-height)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="text-white text-xl font-semibold">Recent</h2>
        {appStack.length > 0 && (
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/8 active:bg-white/15 text-white/60 text-[13px]"
            onClick={closeAllApps}
          >
            <Trash2 size={13} />
            Close all
          </button>
        )}
      </div>

      {/* App Cards */}
      <div className="flex-1 overflow-x-auto px-5 flex items-center gap-4"
        style={{ scrollSnapType: 'x mandatory' }}>
        {[...appStack].reverse().map((openApp_) => {
          const app = MOBILE_APPS.find(a => a.id === openApp_.appId);
          const isActive = openApp_.id === activeAppId;
          const Icon = app?.icon;

          return (
            <div
              key={openApp_.id}
              className="flex-none"
              style={{ scrollSnapAlign: 'center', width: 'calc(100vw - 80px)' }}
            >
              {/* Card */}
              <div
                className="relative rounded-3xl overflow-hidden"
                style={{
                  height: 'calc(var(--content-height) * 0.78)',
                  background: 'var(--nx-surface-3)',
                  border: `2px solid ${isActive ? 'var(--nx-accent)' : 'rgba(255,255,255,0.07)'}`,
                  boxShadow: isActive ? '0 0 20px rgba(16,185,129,0.2)' : '0 8px 24px rgba(0,0,0,0.5)',
                }}
                onClick={() => { setRecentAppsOpen(false); openApp(openApp_.appId); }}
              >
                {/* App header */}
                <div
                  className="px-4 py-5 flex items-center gap-3"
                  style={{ background: app?.iconBg ?? 'rgba(255,255,255,0.05)' }}
                >
                  {Icon && <Icon size={22} className="text-white" strokeWidth={1.8} />}
                  <span className="text-white font-semibold text-[16px]">{app?.name ?? openApp_.appId}</span>
                  {isActive && (
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Active
                    </span>
                  )}
                </div>

                {/* Preview area */}
                <div className="flex-1 flex items-center justify-center p-6"
                  style={{ height: 'calc(100% - 72px)' }}>
                  {Icon && (
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Icon size={64} className="text-white" strokeWidth={1} />
                      <span className="text-white text-[14px] font-medium">{app?.name}</span>
                    </div>
                  )}
                </div>

                {/* Close button */}
                <button
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center active:bg-black/80 z-10"
                  onClick={e => { e.stopPropagation(); closeApp(openApp_.appId); }}
                >
                  <X size={14} className="text-white" />
                </button>
              </div>

              {/* App label below card */}
              <div className="flex justify-center mt-2">
                <span className="text-white/50 text-[12px]">{app?.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
