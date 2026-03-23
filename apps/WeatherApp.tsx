import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, Wind, Thermometer, Droplets, Eye, MapPin } from 'lucide-react';

interface WeatherData {
  temp: number; feels: number; humidity: number; wind: number; visibility: number;
  condition: string; icon: string; city: string;
  forecast: { day: string; high: number; low: number; condition: string }[];
}

export default function WeatherApp() {
  const [city, setCity] = useState('Montreal');
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [unit, setUnit] = useState<'C'|'F'>('C');

  // Simulated weather data (no API key needed)
  useEffect(() => {
    fetchWeather(city);
  }, []);

  const fetchWeather = (c: string) => {
    setLoading(true);
    setTimeout(() => {
      const conditions = ['Sunny', 'Cloudy', 'Rain', 'Partly Cloudy', 'Snow', 'Thunderstorm'];
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const today = new Date().getDay();
      const baseTemp = 15 + Math.floor(Math.random() * 20) - 5;
      setData({
        temp: baseTemp,
        feels: baseTemp - 2 + Math.floor(Math.random() * 4),
        humidity: 40 + Math.floor(Math.random() * 40),
        wind: 5 + Math.floor(Math.random() * 25),
        visibility: 5 + Math.floor(Math.random() * 10),
        condition: conditions[Math.floor(Math.random() * conditions.length)],
        icon: '☀️',
        city: c,
        forecast: Array.from({ length: 7 }, (_, i) => ({
          day: days[(today + i) % 7],
          high: baseTemp + Math.floor(Math.random() * 8),
          low: baseTemp - Math.floor(Math.random() * 8),
          condition: conditions[Math.floor(Math.random() * conditions.length)],
        })),
      });
      setLoading(false);
    }, 500);
  };

  const conditionIcon = (c: string) => {
    if (c.includes('Rain') || c.includes('Thunder')) return <CloudRain size={16} className="text-blue-400" />;
    if (c.includes('Cloud')) return <Cloud size={16} className="text-zinc-400" />;
    return <Sun size={16} className="text-amber-400" />;
  };

  const toUnit = (t: number) => unit === 'F' ? Math.round(t * 9/5 + 32) : t;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-[#0a0a1a] to-[#0f172a] text-zinc-100 overflow-auto">
      {/* Search */}
      <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
        <MapPin size={14} className="text-cyan-400" />
        <input value={city} onChange={e => setCity(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchWeather(city)}
          className="flex-1 bg-transparent text-sm outline-none text-white placeholder-zinc-600" placeholder="Enter city..." />
        <button onClick={() => setUnit(unit === 'C' ? 'F' : 'C')} className="px-2 py-0.5 text-xs border border-white/10 rounded-lg text-zinc-400 hover:text-white transition">°{unit}</button>
      </div>

      {loading && <div className="flex-1 flex items-center justify-center text-zinc-600 animate-pulse">Loading...</div>}

      {data && !loading && (
        <>
          {/* Current */}
          <div className="px-6 py-8 text-center">
            <div className="text-sm text-zinc-500 mb-1">{data.city}</div>
            <div className="text-6xl font-extralight text-white mb-1">{toUnit(data.temp)}°</div>
            <div className="text-sm text-zinc-400">{data.condition}</div>
            <div className="text-xs text-zinc-600 mt-1">Feels like {toUnit(data.feels)}°</div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 px-5 pb-5">
            {[
              { icon: Droplets, label: 'Humidity', val: `${data.humidity}%`, color: 'text-blue-400' },
              { icon: Wind, label: 'Wind', val: `${data.wind} km/h`, color: 'text-cyan-400' },
              { icon: Eye, label: 'Visibility', val: `${data.visibility} km`, color: 'text-violet-400' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                <s.icon size={16} className={`mx-auto mb-1 ${s.color}`} />
                <div className="text-[10px] text-zinc-500 uppercase">{s.label}</div>
                <div className="text-sm font-semibold text-white">{s.val}</div>
              </div>
            ))}
          </div>

          {/* 7-day forecast */}
          <div className="px-5 pb-5">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">7-Day Forecast</div>
            <div className="space-y-1">
              {data.forecast.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-white/5 transition">
                  <span className="text-xs text-zinc-400 w-10">{i === 0 ? 'Today' : d.day}</span>
                  {conditionIcon(d.condition)}
                  <span className="text-xs text-zinc-500 flex-1 ml-2">{d.condition}</span>
                  <span className="text-xs text-white font-mono">{toUnit(d.high)}° / <span className="text-zinc-500">{toUnit(d.low)}°</span></span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
