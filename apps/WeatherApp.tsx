import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, Wind, Thermometer, MapPin, RefreshCw, Droplets, CloudSnow, Search, Clock, CloudDrizzle, Zap } from 'lucide-react';

const WMO_MAP: Record<number, { label: string; Icon: any }> = {
  0:  { label: 'Clear Sky',        Icon: Sun        },
  1:  { label: 'Mostly Clear',     Icon: Sun        },
  2:  { label: 'Partly Cloudy',    Icon: Cloud      },
  3:  { label: 'Overcast',         Icon: Cloud      },
  45: { label: 'Foggy',            Icon: Cloud      },
  48: { label: 'Icy Fog',          Icon: Cloud      },
  51: { label: 'Light Drizzle',    Icon: CloudDrizzle },
  61: { label: 'Light Rain',       Icon: CloudRain  },
  63: { label: 'Moderate Rain',    Icon: CloudRain  },
  65: { label: 'Heavy Rain',       Icon: CloudRain  },
  71: { label: 'Light Snow',       Icon: CloudSnow  },
  73: { label: 'Moderate Snow',    Icon: CloudSnow  },
  75: { label: 'Heavy Snow',       Icon: CloudSnow  },
  80: { label: 'Rain Showers',     Icon: CloudRain  },
  95: { label: 'Thunderstorm',     Icon: Zap        },
  99: { label: 'Hail Thunderstorm',Icon: Zap        },
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function WeatherApp() {
  const [cityName, setCityName] = useState('New York');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);

  const fetchWeather = async (name: string) => {
    setLoading(true);
    setError('');
    try {
      // Step 1: Geocode the city name
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`
      );
      const geoJson = await geoRes.json();
      const loc = geoJson?.results?.[0];
      if (!loc) { setError(`City "${name}" not found.`); setLoading(false); return; }

      // Step 2: Fetch weather for those coords
      const wRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}` +
        `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weathercode` +
        `&daily=weathercode,temperature_2m_max` +
        `&timezone=auto&forecast_days=5`
      );
      const w = await wRes.json();
      const cur = w.current;
      const daily = w.daily;

      const forecast = daily.time.map((dateStr: string, i: number) => {
        const day = DAYS[new Date(dateStr).getDay()];
        const code = daily.weathercode[i];
        return { day, temp: Math.round(daily.temperature_2m_max[i]), Icon: WMO_MAP[code]?.Icon || Cloud };
      });

      setCityName(`${loc.name}, ${loc.country_code?.toUpperCase()}`);
      setData({
        temp:      Math.round(cur.temperature_2m),
        feelsLike: Math.round(cur.apparent_temperature),
        humidity:  cur.relative_humidity_2m,
        wind:      Math.round(cur.wind_speed_10m),
        condition: WMO_MAP[cur.weathercode]?.label || 'Unknown',
        CondIcon:  WMO_MAP[cur.weathercode]?.Icon || Cloud,
        forecast,
      });
    } catch {
      setError('Network error — check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWeather('New York'); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) { fetchWeather(search.trim()); setSearch(''); }
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
            placeholder="Search city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </form>
        <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-black uppercase tracking-widest">
          <MapPin size={14} className="text-emerald-400" /> {cityName}
        </div>
        <button onClick={() => fetchWeather(cityName)} className="ml-3 p-2 text-zinc-500 hover:text-white transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-10 z-10 relative flex flex-col items-center justify-center">
        {loading ? (
          <div className="animate-pulse flex flex-col items-center gap-4">
            <RefreshCw size={48} className="animate-spin text-emerald-500" />
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/50">Synchronizing Atmosphere...</div>
          </div>
        ) : error ? (
          <div className="text-center text-red-400 text-sm font-mono">{error}</div>
        ) : data && (
          <div className="w-full max-w-lg animate-in fade-in zoom-in-95 duration-500">
            {/* Main Temp Card */}
            <div className="flex flex-col items-center mb-12">
              <data.CondIcon size={80} className="text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.4)] mb-6 animate-pulse" />
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
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Feels Like</span>
                <span className="text-sm font-bold font-mono">{data.feelsLike}°</span>
              </div>
            </div>

            {/* Forecast */}
            <div className="bg-black/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
              <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <Clock size={12} /> 5-Day Forecast
              </div>
              <div className="flex justify-between">
                {data.forecast.map((f: any, i: number) => (
                  <div key={i} className="flex flex-col items-center gap-3">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">{f.day}</span>
                    <f.Icon size={20} className="text-zinc-300" />
                    <span className="text-sm font-bold font-mono">{f.temp}°</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-5 mix-blend-overlay">
        <div className="w-full h-full bg-[radial-gradient(circle_at_50%_50%,_white_0%,transparent_70%)]" />
      </div>
    </div>
  );
}
