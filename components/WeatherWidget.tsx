'use client';

import { useState, useEffect } from 'react';
import { CloudRain, Sun, Cloud, Wind, Droplets, MapPin, Loader2, RefreshCw } from 'lucide-react';

export default function WeatherWidget() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState('Local Weather');

  // Default Fallback
  const DEFAULT_LAT = 5.6037;
  const DEFAULT_LON = -0.1870;

  useEffect(() => {
    initWeather();
  }, []);

  async function initWeather() {
    setLoading(true);

    // 1. Check Cache
    const cached = localStorage.getItem('farmWeather');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < 1000 * 60 * 60) { // 1 hour
            setWeather(data);
            setLocationName(data.locationName || 'Local Weather');
            setLoading(false);
            return;
        }
      } catch (e) {}
    }

    // 2. Determine Location
    if (typeof navigator === 'undefined' || !navigator.onLine) {
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const { latitude, longitude } = pos.coords;
            let city = "Current Location";
            try {
                const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                const geoData = await geoRes.json();
                city = geoData.city || geoData.locality || geoData.principalSubdivision || "Current Location";
            } catch (e) {
                console.warn("Could not determine city name");
            }
            await fetchWeather(latitude, longitude, city);
        },
        async (err) => {
            console.warn("GPS denied/failed. Using IP fallback.");
            await fallbackToIPLocation();
        },
        { timeout: 5000 }
    );
  }

  async function fallbackToIPLocation() {
      try {
          const res = await fetch('https://ipapi.co/json/');
          const data = await res.json();
          if (data.latitude && data.longitude) {
              await fetchWeather(data.latitude, data.longitude, data.city);
          } else {
              throw new Error("IP failed");
          }
      } catch (e) {
          await fetchWeather(DEFAULT_LAT, DEFAULT_LON, "Accra (Default)");
      }
  }

  async function fetchWeather(lat: number, lon: number, city?: string) {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,rain,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
      );
      const data = await res.json();

      const name = city || "Local Weather";
      setLocationName(name);

      const weatherData = {
        current: data.current,
        daily: data.daily,
        timestamp: Date.now(),
        coords: { lat, lon },
        locationName: name
      };

      setWeather(weatherData);
      localStorage.setItem('farmWeather', JSON.stringify(weatherData));
    } catch (e) {
      console.error("Weather fetch failed", e);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !weather) return (
    <div className="h-[220px] bg-teal-900/50 rounded-xl animate-pulse border border-teal-800 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
    </div>
  );
  
  if (!weather) return (
      <div className="h-[220px] bg-teal-900 rounded-xl p-6 text-white flex flex-col items-center justify-center text-center">
          <Cloud className="w-10 h-10 mb-2 opacity-50" />
          <p className="text-sm opacity-80">Weather unavailable offline</p>
          <button onClick={initWeather} className="mt-2 text-xs bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition-colors">Retry</button>
      </div>
  );

  const { current, daily } = weather;
  const isRaining = current.rain > 0;

  return (
    // Updated background to darker teal gradient
    <div className="bg-gradient-to-br from-teal-800 to-teal-950 rounded-xl p-5 text-white shadow-lg relative overflow-hidden min-h-[220px] flex flex-col justify-between group">
      
      {/* Background Icon */}
      <div className="absolute -right-4 -top-4 opacity-10 pointer-events-none transition-transform group-hover:scale-110 duration-700">
          {isRaining ? <CloudRain className="w-32 h-32 text-teal-200" /> : <Sun className="w-32 h-32 text-orange-200" />}
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
            <div>
                <h3 className="font-semibold text-teal-50 text-sm flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-200" /> {locationName}
                </h3>
                <div className="text-4xl font-bold tracking-tight text-white">
                    {Math.round(current.temperature_2m)}°
                </div>
                <p className="text-teal-100 text-sm font-medium mt-1 flex items-center gap-2">
                    {isRaining ? 'Rainy' : 'Clear Sky'}
                </p>
            </div>
            
            <div className="flex flex-col gap-1.5 text-right">
                <div className="bg-black/20 backdrop-blur-md rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-xs font-medium text-teal-50">
                    <Droplets className="w-3.5 h-3.5 text-teal-300" /> 
                    {current.relative_humidity_2m}%
                </div>
                <div className="bg-black/20 backdrop-blur-md rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-xs font-medium text-teal-50">
                    <Wind className="w-3.5 h-3.5 text-teal-300" /> 
                    {current.wind_speed_10m} km/h
                </div>
            </div>
        </div>

        {/* Forecast */}
        <div className="grid grid-cols-3 gap-2 mt-2">
            {[0, 1, 2].map((i: number) => (
                <div key={i} className="flex flex-col items-center justify-center bg-black/20 backdrop-blur-md rounded-lg p-2 border border-white/5">
                    <p className="text-[10px] uppercase font-bold text-teal-200/80 mb-1">
                        {new Date(daily.time[i]).toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="font-bold text-sm text-white">
                        {Math.round(daily.temperature_2m_max[i])}°
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                        <CloudRain className="w-3 h-3 text-teal-300" />
                        <span className="text-[10px] text-teal-100">
                            {daily.precipitation_probability_max[i]}%
                        </span>
                    </div>
                </div>
            ))}
        </div>
      </div>
      
      <button 
        onClick={initWeather} 
        className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100"
        title="Refresh Weather"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-white ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
