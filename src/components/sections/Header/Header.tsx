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

  const formattedHoursMinutes = new Intl.DateTimeFormat('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(time);

  const formattedSeconds = new Intl.DateTimeFormat('nb-NO', {
    second: '2-digit',
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
        <div className="flex items-baseline">
          <span className="text-6xl font-bold tabular-nums leading-none">{formattedHoursMinutes}</span>
          <span className="text-2xl font-bold tabular-nums text-gray-400 ml-1">:{formattedSeconds}</span>
        </div>
        <span className="text-lg text-gray-400">{displayDate}</span>
      </div>

      {/* Weather */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Current temperature */}
        <div className="text-right flex items-center gap-2">
          {isLoading && !weather ? (
            <div className="text-5xl text-gray-500">--°C</div>
          ) : error && !weather ? (
            <div className="text-4xl text-red-400" title={error}>⚠️</div>
          ) : weather ? (
            <>
              <span className="text-5xl">{getWeatherEmoji(weather.current.symbol)}</span>
              <span className="text-5xl font-semibold">{weather.current.temperature}°C</span>
            </>
          ) : null}
        </div>

        {/* 3-day forecast */}
        <div className="flex gap-2">
          {weather?.forecast.slice(0, 3).map((day, index) => (
            <div key={index} className="text-center w-14">
              <div className="text-gray-500 text-base">{day.dayName}</div>
              <div className="text-2xl">{getWeatherEmoji(day.symbol)}</div>
              <div className="text-gray-400 text-base">
                <span>{day.high}°</span>
                <span className="text-gray-600 ml-0.5">{day.low}°</span>
              </div>
            </div>
          )) || (
            // Placeholder when loading
            ['Søn', 'Man', 'Tir'].map((day) => (
              <div key={day} className="text-center w-14">
                <div className="text-gray-600 text-base">{day}</div>
                <div className="text-2xl text-gray-600">--</div>
                <div className="text-gray-600 text-base">--°</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
