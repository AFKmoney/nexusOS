import { useState, useEffect, useRef, useCallback } from 'react';

interface SystemControls {
  volume: number;
  setVolume: (v: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
  brightness: number;
  setBrightness: (v: number) => void;
  batteryLevel: number;
  isCharging: boolean;
  isOnline: boolean;
  connectionType: string;
  effectiveType: string;
}

export function useSystemControls(): SystemControls {
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('nexus-volume');
    return saved ? parseFloat(saved) : 80;
  });
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('nexus-muted') === 'true';
  });
  const [brightness, setBrightnessState] = useState(() => {
    const saved = localStorage.getItem('nexus-brightness');
    return saved ? parseFloat(saved) : 100;
  });
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState('Unknown');
  const [effectiveType, setEffectiveType] = useState('');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize Web Audio API gain node
  useEffect(() => {
    try {
      audioCtxRef.current = new AudioContext();
      gainNodeRef.current = audioCtxRef.current.createGain();
      gainNodeRef.current.connect(audioCtxRef.current.destination);
      gainNodeRef.current.gain.value = isMuted ? 0 : volume / 100;
    } catch (e) {
      console.warn('[SystemControls] Web Audio API unavailable:', e);
    }
    return () => {
      audioCtxRef.current?.close();
    };
  }, []);

  // Update gain when volume changes
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : volume / 100;
    }
    // Apply to all <audio> and <video> elements on the page
    document.querySelectorAll('audio, video').forEach(el => {
      (el as HTMLMediaElement).volume = isMuted ? 0 : volume / 100;
    });
    localStorage.setItem('nexus-volume', String(volume));
  }, [volume, isMuted]);

  // Apply brightness as a CSS filter overlay
  useEffect(() => {
    let overlay = document.getElementById('nexus-brightness-overlay') as HTMLDivElement | null;
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'nexus-brightness-overlay';
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 99999;
        transition: background-color 0.3s ease;
      `;
      document.body.appendChild(overlay);
    }
    // brightness 100 = normal, 0 = fully dark
    const darkness = 1 - brightness / 100;
    overlay.style.backgroundColor = `rgba(0, 0, 0, ${darkness * 0.85})`;
    localStorage.setItem('nexus-brightness', String(brightness));
  }, [brightness]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    setVolumeState(clamped);
    if (isMuted && clamped > 0) setIsMuted(false);
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      localStorage.setItem('nexus-muted', String(!prev));
      return !prev;
    });
  }, []);

  const setBrightness = useCallback((v: number) => {
    setBrightnessState(Math.max(10, Math.min(100, v)));
  }, []);

  // Battery API
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((bat: any) => {
        setBatteryLevel(Math.round(bat.level * 100));
        setIsCharging(bat.charging);
        bat.addEventListener('levelchange', () => setBatteryLevel(Math.round(bat.level * 100)));
        bat.addEventListener('chargingchange', () => setIsCharging(bat.charging));
      }).catch(() => {
        setBatteryLevel(85);
      });
    } else {
      setBatteryLevel(85);
    }
  }, []);

  // Network status
  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    const updateConnection = () => {
      const conn = (navigator as any).connection;
      if (conn) {
        setConnectionType(conn.type || 'wifi');
        setEffectiveType(conn.effectiveType || '');
      }
    };

    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    const conn = (navigator as any).connection;
    if (conn) {
      updateConnection();
      conn.addEventListener('change', updateConnection);
    }

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      if (conn) conn.removeEventListener('change', updateConnection);
    };
  }, []);

  return {
    volume,
    setVolume,
    isMuted,
    toggleMute,
    brightness,
    setBrightness,
    batteryLevel,
    isCharging,
    isOnline,
    connectionType,
    effectiveType,
  };
}
