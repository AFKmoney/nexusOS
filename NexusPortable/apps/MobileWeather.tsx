import React, { useState, useEffect } from 'react';
import { ChevronLeft, Cloud, Sun, CloudRain, Droplets, Wind, Thermometer, Eye, RefreshCw, CloudSnow, Search, Clock, CloudDrizzle, Zap, MapPin } from 'lucide-react';
import type { MobileAppProps } from '../types';

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

export default function MobileWeather({ onBack }: MobileAppProps) {
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [cityName, setCityName] = useState('New York');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);

  const conv = (t: number) => unit === 'C' ? t : Math.round(t * 9/5 + 32);

  const fetchWeather = async (name: string) => {
    setLoading(true);
    setError('');
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`
      );
      const geoJson = await geoRes.json();
      const loc = geoJson?.results?.[0];
      if (!loc) { setError(`City "${name}" not found.`); setLoading(false); return; }

      const wRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}` +
        `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weathercode` +
        `&hourly=temperature_2m,weathercode` +
        `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
        `&timezone=auto&forecast_days=7`
      );
      const w = await wRes.json();
      const cur = w.current;
      const daily = w.daily;
      const hourly = w.hourly;

      const forecast = daily.time.map((dateStr: string, i: number) => {
        const day = DAYS[new Date(dateStr).getDay()];
        const code = daily.weathercode[i];
        return {
            day,
            temp: Math.round(daily.temperature_2m_max[i]),
            low: Math.round(daily.temperature_2m_min[i]),
            Icon: WMO_MAP[code]?.Icon || Cloud
        };
      });

      const currentHourIndex = new Date().getHours();
      const nextHourly = [];
      for(let i = 0; i < 24; i += 3) {
          const idx = currentHourIndex + i;
          if (idx < hourly.time.length) {
            const timeStr = hourly.time[idx];
            const date = new Date(timeStr);
            let hours = date.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            nextHourly.push({
                time: `${hours}${ampm}`,
                temp: Math.round(hourly.temperature_2m[idx]),
                Icon: WMO_MAP[hourly.weathercode[idx]]?.Icon || Cloud
            });
          }
      }

      setCityName(`${loc.name}, ${loc.country_code?.toUpperCase()}`);
      setData({
        temp:      Math.round(cur.temperature_2m),
        feelsLike: Math.round(cur.apparent_temperature),
        humidity:  cur.relative_humidity_2m,
        wind:      Math.round(cur.wind_speed_10m),
        condition: WMO_MAP[cur.weathercode]?.label || 'Unknown',
        CondIcon:  WMO_MAP[cur.weathercode]?.Icon || Cloud,
        forecast,
        hourly: nextHourly
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
    <div
      className="h-full overflow-y-auto flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #1a2744 0%, #0f1729 60%, #050508 100%)',
      }}
    >
      {/* Header */}
      <div className="flex items-center px-4 pt-4 pb-2">
        <button className="p-1.5 rounded-xl active:bg-white/10" onClick={onBack}>
          <ChevronLeft size={22} className="text-white" />
        </button>
        <div className="flex-1 px-4">
            <form onSubmit={handleSearch} className="relative flex-1 group">
              <Search size={14} className="absolute left-3 top-2.5 text-white/50 group-focus-within:text-white transition-colors" />
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs outline-none focus:border-white/30 text-white transition-all placeholder:text-white/40"
                placeholder="Search city..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </form>
        </div>
        <button
          className="px-3 py-1.5 rounded-xl text-[13px] font-medium"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
          onClick={() => setUnit(u => u === 'C' ? 'F' : 'C')}
        >
          °{unit}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <RefreshCw size={32} className="animate-spin text-white/50" />
              <div className="text-[12px] font-medium text-white/50 uppercase tracking-widest">Loading...</div>
            </div>
        ) : error ? (
            <div className="flex items-center justify-center h-64">
                <div className="text-center text-red-400 text-sm">{error}</div>
            </div>
        ) : data && (
            <div className="animate-fade-in">
              {/* Current weather */}
              <div className="flex flex-col items-center px-6 pt-2 pb-8">
                <p className="text-white/70 text-[16px] font-medium flex items-center gap-1">
                    <MapPin size={14}/> {cityName}
                </p>
                <div className="relative my-4">
                  <data.CondIcon size={80} className="text-yellow-300" strokeWidth={1} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-yellow-300/20 rounded-full blur-2xl" />
                  </div>
                </div>
                <p className="text-white text-8xl font-thin">{conv(data.temp)}°</p>
                <p className="text-white/60 text-[16px] mt-1">{data.condition}</p>
                <p className="text-white/40 text-[13px] mt-1">H:{conv(data.forecast[0].temp)}° L:{conv(data.forecast[0].low)}°</p>
              </div>

              {/* Stats row */}
              <div className="mx-4 p-4 rounded-3xl mb-4"
                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { icon: Droplets, label: 'Humidity', value: `${data.humidity}%` },
                    { icon: Wind, label: 'Wind', value: `${data.wind} km/h` },
                    { icon: Eye, label: 'Visibility', value: '10 km' },
                    { icon: Thermometer, label: 'Feels', value: `${conv(data.feelsLike)}°` },
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
                  {data.hourly.map(({ time, temp, Icon }: any) => (
                    <div key={time} className="flex flex-col items-center gap-2 flex-none">
                      <p className="text-white/50 text-[12px]">{time}</p>
                      <Icon size={20} className="text-yellow-300/80" strokeWidth={1.5} />
                      <p className="text-white text-[13px] font-medium">{conv(temp)}°</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7-day forecast */}
              <div className="mx-4 rounded-3xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-white/50 text-[12px] font-semibold uppercase tracking-wider px-4 pt-4 pb-2">7-Day Forecast</p>
                {data.forecast.map(({ day, Icon, temp, low }: any) => (
                  <div key={day} className="flex items-center gap-3 px-4 py-3"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-white/70 text-[14px] w-10">{day}</p>
                    <Icon size={20} className="text-yellow-300/80 flex-shrink-0" strokeWidth={1.5} />
                    <div className="flex-1 mx-3">
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.round((temp / 40) * 100)}%`, background: 'linear-gradient(90deg,#f59e0b,#ef4444)' }} />
                      </div>
                    </div>
                    <p className="text-white/40 text-[13px] w-8 text-right">{conv(low)}°</p>
                    <p className="text-white text-[13px] font-medium w-8 text-right">{conv(temp)}°</p>
                  </div>
                ))}
              </div>
            </div>
        )}
      </div>
    </div>
  );
}
