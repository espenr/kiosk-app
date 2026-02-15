import { useState, useEffect } from 'react';
import { useWeather } from '../../../hooks/useWeather';
import { getWeatherEmoji } from '../../../services/weather';

/**
 * Header section with clock, date, and weather
 */
export function Header() {
  const [time, setTime] = useState(new Date());
  const { weather, isLoading, error } = useWeather();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = new Intl.DateTimeFormat('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(time);

  const formattedDate = new Intl.DateTimeFormat('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(time);

  // Capitalize first letter of weekday
  const displayDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <div className="h-full flex items-center justify-between px-3">
      {/* Clock and Date */}
      <div className="flex flex-col">
        <span className="text-3xl font-bold tabular-nums leading-tight">{formattedTime}</span>
        <span className="text-sm text-gray-400">{displayDate}</span>
      </div>

      {/* Weather */}
      <div className="flex items-center gap-2">
        {/* Current temperature */}
        <div className="text-right flex items-center gap-2">
          {isLoading && !weather ? (
            <div className="text-2xl text-gray-500">--°C</div>
          ) : error && !weather ? (
            <div className="text-xl text-red-400" title={error}>⚠️</div>
          ) : weather ? (
            <>
              <span className="text-2xl">{getWeatherEmoji(weather.current.symbol)}</span>
              <span className="text-2xl font-semibold">{weather.current.temperature}°C</span>
            </>
          ) : null}
        </div>

        {/* 5-day forecast */}
        <div className="flex gap-1">
          {weather?.forecast.slice(0, 5).map((day, index) => (
            <div key={index} className="text-center w-10">
              <div className="text-gray-500 text-[10px]">{day.dayName}</div>
              <div className="text-base">{getWeatherEmoji(day.symbol)}</div>
              <div className="text-gray-400 text-[10px]">
                <span>{day.high}°</span>
                <span className="text-gray-600 ml-0.5">{day.low}°</span>
              </div>
            </div>
          )) || (
            // Placeholder when loading
            ['Søn', 'Man', 'Tir', 'Ons', 'Tor'].map((day) => (
              <div key={day} className="text-center w-10">
                <div className="text-gray-600 text-[10px]">{day}</div>
                <div className="text-base text-gray-600">--</div>
                <div className="text-gray-600 text-[10px]">--°</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
