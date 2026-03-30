import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, Wind, Thermometer, MapPin, RefreshCw, Droplets, CloudLightning, Zap, Search } from 'lucide-react';
import { useOS } from '../store/osStore';

export default function WeatherApp() {
  const [city, setCity] = useState('New York');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchWeather = async (targetCity: string) => {
    setLoading(true);
    // Simulate real weather API response with high-fidelity mock
    setTimeout(() => {
      setData({
        temp: 22,
        condition: 'Clear',
        humidity: 45,
        wind: 12,
        feelsLike: 24,
        uv: 4,
        forecast: [
          { day: 'Mon', temp: 23, icon: Sun },
          { day: 'Tue', temp: 21, icon: Cloud },
          { day: 'Wed', temp: 19, icon: CloudRain },
          { day: 'Thu', temp: 24, icon: Sun },
          { day: 'Fri', temp: 26, icon: Sun },
        ]
      });
      setCity(targetCity);
      setLoading(false);
    }, 800);
  };

  useEffect(() => { fetchWeather(city); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) fetchWeather(search);
  };

  return (
    <div className="h-full bg-gradient-to-br from-blue-600/20 to-indigo-900/40 text-white flex flex-col font-sans overflow-hidden relative">
      <div className="absolute inset-0 bg-[#050508]/60 backdrop-blur-3xl z-0" />
      
      {/* Header */}
      <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between z-10 relative bg-black/20">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-xs group">
          <Search size={14} className="absolute left-3 top-2.5 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
          <input 
            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-700"
            placeholder="Search geo-coordinates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </form>
        <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-black uppercase tracking-widest">
          <MapPin size={14} className="text-emerald-400" /> {city}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-10 z-10 relative flex flex-col items-center justify-center">
        {loading ? (
          <div className="animate-pulse flex flex-col items-center gap-4">
            <RefreshCw size={48} className="animate-spin text-emerald-500" />
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/50">Synchronizing Atmosphere...</div>
          </div>
        ) : data && (
          <div className="w-full max-w-lg animate-in fade-in zoom-in-95 duration-500">
            {/* Main Temp Card */}
            <div className="flex flex-col items-center mb-12">
              <Sun size={80} className="text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.4)] mb-6 animate-pulse" />
              <div className="text-8xl font-black font-mono tracking-tighter flex items-start">
                {data.temp}<span className="text-4xl text-emerald-500 mt-2">°C</span>
              </div>
              <div className="text-xl font-bold text-zinc-300 uppercase tracking-[0.2em] mt-2">{data.condition}</div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-4 mb-12">
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center">
                <Droplets size={18} className="text-blue-400 mb-2" />
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Humidity</span>
                <span className="text-sm font-bold font-mono">{data.humidity}%</span>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center">
                <Wind size={18} className="text-teal-400 mb-2" />
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Wind</span>
                <span className="text-sm font-bold font-mono">{data.wind} km/h</span>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center">
                <Thermometer size={18} className="text-orange-400 mb-2" />
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Real Feel</span>
                <span className="text-sm font-bold font-mono">{data.feelsLike}°</span>
              </div>
            </div>

            {/* Forecast */}
            <div className="bg-black/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
              <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <Clock size={12} /> 5-Cycle Projection
              </div>
              <div className="flex justify-between">
                {data.forecast.map((f: any, i: number) => (
                  <div key={i} className="flex flex-col items-center gap-3">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">{f.day}</span>
                    <f.icon size={20} className="text-zinc-300" />
                    <span className="text-sm font-bold font-mono">{f.temp}°</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Atmospheric Effect (subtle overlay) */}
      <div className="absolute inset-0 pointer-events-none opacity-5 mix-blend-overlay">
        <div className="w-full h-full bg-[radial-gradient(circle_at_50%_50%,_white_0%,transparent_70%)]" />
      </div>
    </div>
  );
}
