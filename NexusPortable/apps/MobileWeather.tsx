import React, { useState } from 'react';
import { ChevronLeft, Cloud, Sun, CloudRain, Droplets, Wind, Thermometer, Eye } from 'lucide-react';
import type { MobileAppProps } from '../types';

const FORECAST = [
  { day: 'Mon', icon: Sun, temp: 24, low: 18, desc: 'Sunny' },
  { day: 'Tue', icon: Cloud, temp: 21, low: 15, desc: 'Cloudy' },
  { day: 'Wed', icon: CloudRain, temp: 17, low: 12, desc: 'Rain' },
  { day: 'Thu', icon: Sun, temp: 26, low: 19, desc: 'Sunny' },
  { day: 'Fri', icon: Cloud, temp: 22, low: 16, desc: 'Partly Cloudy' },
  { day: 'Sat', icon: Sun, temp: 28, low: 20, desc: 'Sunny' },
  { day: 'Sun', icon: CloudRain, temp: 19, low: 14, desc: 'Showers' },
];

const HOURLY = [
  { time: '9AM', temp: 20, icon: Sun },
  { time: '12PM', temp: 24, icon: Sun },
  { time: '3PM', temp: 26, icon: Cloud },
  { time: '6PM', temp: 23, icon: Cloud },
  { time: '9PM', temp: 19, icon: Cloud },
  { time: 'Mid', temp: 17, icon: CloudRain },
];

export default function MobileWeather({ onBack }: MobileAppProps) {
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const conv = (t: number) => unit === 'C' ? t : Math.round(t * 9/5 + 32);

  return (
    <div
      className="h-full overflow-y-auto"
      style={{
        background: 'linear-gradient(180deg, #1a2744 0%, #0f1729 60%, #050508 100%)',
      }}
    >
      {/* Header */}
      <div className="flex items-center px-4 pt-4 pb-2">
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <div className="flex-1" />
        <button
          className="px-3 py-1 rounded-full text-[13px] font-medium"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
          onClick={() => setUnit(u => u === 'C' ? 'F' : 'C')}
        >
          °{unit}
        </button>
      </div>

      {/* Current weather */}
      <div className="flex flex-col items-center px-6 pt-6 pb-8">
        <p className="text-white/70 text-[16px] font-medium">Montreal, QC</p>
        <div className="relative my-4">
          <Sun size={80} className="text-yellow-300" strokeWidth={1} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-yellow-300/20 rounded-full blur-2xl" />
          </div>
        </div>
        <p className="text-white text-8xl font-thin">{conv(24)}°</p>
        <p className="text-white/60 text-[16px] mt-1">Partly Sunny</p>
        <p className="text-white/40 text-[13px] mt-1">H:{conv(28)}° L:{conv(17)}°</p>
      </div>

      {/* Stats row */}
      <div className="mx-4 p-4 rounded-3xl mb-4"
        style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Droplets, label: 'Humidity', value: '62%' },
            { icon: Wind, label: 'Wind', value: '14 km/h' },
            { icon: Eye, label: 'Visibility', value: '10 km' },
            { icon: Thermometer, label: 'Feels', value: `${conv(22)}°` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <Icon size={18} className="text-white/50" />
              <span className="text-white text-[13px] font-medium">{value}</span>
              <span className="text-white/40 text-[10px]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hourly */}
      <div className="mx-4 p-4 rounded-3xl mb-4"
        style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-white/50 text-[12px] font-semibold uppercase tracking-wider mb-3">Hourly</p>
        <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {HOURLY.map(({ time, temp, icon: Icon }) => (
            <div key={time} className="flex flex-col items-center gap-2 flex-none">
              <p className="text-white/50 text-[12px]">{time}</p>
              <Icon size={20} className="text-yellow-300/80" strokeWidth={1.5} />
              <p className="text-white text-[13px] font-medium">{conv(temp)}°</p>
            </div>
          ))}
        </div>
      </div>

      {/* 7-day forecast */}
      <div className="mx-4 rounded-3xl overflow-hidden mb-6"
        style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-white/50 text-[12px] font-semibold uppercase tracking-wider px-4 pt-4 pb-2">7-Day Forecast</p>
        {FORECAST.map(({ day, icon: Icon, temp, low }) => (
          <div key={day} className="flex items-center gap-3 px-4 py-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-white/70 text-[14px] w-10">{day}</p>
            <Icon size={20} className="text-yellow-300/80 flex-shrink-0" strokeWidth={1.5} />
            <div className="flex-1 mx-3">
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.round((temp / 30) * 100)}%`, background: 'linear-gradient(90deg,#f59e0b,#ef4444)' }} />
              </div>
            </div>
            <p className="text-white/40 text-[13px] w-8 text-right">{conv(low)}°</p>
            <p className="text-white text-[13px] font-medium w-8 text-right">{conv(temp)}°</p>
          </div>
        ))}
      </div>
    </div>
  );
}
