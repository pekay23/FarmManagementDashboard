'use client';

import { useState, useEffect } from 'react';
import { CloudRain, Sun, Cloud, Wind, Droplets, MapPin, Loader2 } from 'lucide-react';

export default function WeatherWidget() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Default to Accra, Ghana if location is denied or fails
  const DEFAULT_LAT = 5.6037;
  const DEFAULT_LON = -0.1870;

  useEffect(() => {
    // 1. Check Cache
    const cached = localStorage.getItem('farmWeather');
    if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < 1000 * 60 * 60) { // 1 hour cache
            setWeather(data);
            setLoading(false);
            return;
        }
    }

    // 2. Fetch Function
    const fetchWeather = async (lat: number, lon: number) => {
        try {
            const res = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,rain,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
            );
            const data = await res.json();
            
            const weatherData = {
                current: data.current,
                daily: data.daily,
                timestamp: Date.now()
            };
            
            setWeather(weatherData);
            localStorage.setItem('farmWeather', JSON.stringify(weatherData));
        } catch (e) {
            console.error("Weather error", e);
        } finally {
            setLoading(false);
        }
    };

    // 3. Try Geolocation, fallback to Default
    if (navigator.onLine) {
        navigator.geolocation.getCurrentPosition(
            (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
            (err) => {
                console.warn("Location denied, using default");
                fetchWeather(DEFAULT_LAT, DEFAULT_LON);
            }
        );
    } else {
        setLoading(false);
    }
  }, []);

  if (loading) return (
    <div className="h-[220px] bg-primary-50/50 rounded-xl animate-pulse border border-primary-100 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary-300 animate-spin" />
    </div>
  );
  
  if (!weather) return (
      <div className="h-[220px] bg-primary-600 rounded-xl p-6 text-white flex flex-col items-center justify-center text-center">
          <Cloud className="w-10 h-10 mb-2 opacity-50" />
          <p className="text-sm opacity-80">Weather unavailable offline</p>
      </div>
  );

  const { current, daily } = weather;
  const isRaining = current.rain > 0;

  return (
    <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl p-5 text-white shadow-lg relative overflow-hidden min-h-[220px] flex flex-col justify-between">
      
      {/* Background Icon (Decorative) */}
      <div className="absolute -right-4 -top-4 opacity-10 pointer-events-none">
          {isRaining ? <CloudRain className="w-32 h-32" /> : <Sun className="w-32 h-32" />}
      </div>

      {/* Main Info */}
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
            <div>
                <h3 className="font-semibold text-white/90 text-sm flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3.5 h-3.5" /> Local Weather
                </h3>
                <div className="text-4xl font-bold tracking-tight">
                    {Math.round(current.temperature_2m)}°
                </div>
                <p className="text-white/80 text-sm font-medium mt-1">
                    {isRaining ? 'Rainy' : 'Clear Sky'}
                </p>
            </div>
            
            <div className="flex flex-col gap-1.5 text-right">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-xs font-medium text-white/90">
                    <Droplets className="w-3.5 h-3.5 text-blue-200" /> 
                    {current.relative_humidity_2m}%
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-xs font-medium text-white/90">
                    <Wind className="w-3.5 h-3.5 text-gray-200" /> 
                    {current.wind_speed_10m} km/h
                </div>
            </div>
        </div>

        {/* 3 Day Forecast - Improved Visibility */}
        <div className="grid grid-cols-3 gap-2 mt-2">
            {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg p-2 border border-white/10">
                    <p className="text-[10px] uppercase font-bold text-white/70 mb-1">
                        {new Date(daily.time[i]).toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="font-bold text-sm text-white">
                        {Math.round(daily.temperature_2m_max[i])}°
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                        <CloudRain className="w-3 h-3 text-blue-200" />
                        <span className="text-[10px] text-white/90">
                            {daily.precipitation_probability_max[i]}%
                        </span>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
