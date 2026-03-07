import { useState, useEffect } from 'react';
import { useWeather } from '../../../hooks/useWeather';
import { getWeatherSymbol, getWindDirection } from '../../../services/weather';
import { WeatherIcon, WindArrow, AlertTriangle } from '../../icons';

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
    <div className="h-full flex items-center justify-between px-3 relative">
      {/* Clock - Large but balanced - Scaled for 1080x1920 display */}
      <div className="flex items-baseline">
        <span className="font-bold tabular-nums leading-none" style={{ fontSize: '8.5rem' }}>{formattedHoursMinutes}</span>
        <span className="font-bold tabular-nums text-gray-400 ml-1" style={{ fontSize: '2.8rem' }}>:{formattedSeconds}</span>
      </div>

      {/* Date - Positioned over photo section with shadow for readability */}
      <div
        className="absolute left-3 font-bold text-white z-30"
        style={{
          fontSize: '3.5rem',
          top: 'calc(8vh + 0.5rem)',
          textShadow: '3px 3px 6px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.7)'
        }}
      >
        {displayDate}
      </div>

      {/* Hourly forecast - Positioned over photo section on the right side */}
      <div
        className="absolute right-3 z-30"
        style={{
          top: 'calc(8vh - 1.5rem)',
        }}
      >
        <div className="flex gap-2">
          {weather?.hourly.map((hour, index) => {
            const timeStr = new Intl.DateTimeFormat('nb-NO', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }).format(hour.time);

            return (
              <div key={index} className="text-center w-16">
                <div
                  className="text-gray-300 text-sm font-semibold"
                  style={{
                    textShadow: '3px 3px 6px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.7)'
                  }}
                >
                  {timeStr}
                </div>
                <div
                  style={{
                    filter: 'drop-shadow(3px 3px 6px rgba(0,0,0,0.9)) drop-shadow(-1px -1px 3px rgba(0,0,0,0.8)) drop-shadow(0 0 20px rgba(0,0,0,0.7))'
                  }}
                >
                  <WeatherIcon symbol={getWeatherSymbol(hour.symbol)} size={68} />
                </div>
                <div
                  className="text-white text-base font-semibold"
                  style={{
                    textShadow: '3px 3px 6px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.7)'
                  }}
                >
                  {hour.temperature}°
                </div>
                <div
                  className="flex items-center justify-center gap-1 text-white text-sm font-semibold"
                  style={{
                    filter: 'drop-shadow(3px 3px 6px rgba(0,0,0,0.9)) drop-shadow(-1px -1px 3px rgba(0,0,0,0.8)) drop-shadow(0 0 20px rgba(0,0,0,0.7))'
                  }}
                >
                  <WindArrow direction={getWindDirection(hour.windDirection)} size={20} />
                  <span>{hour.windSpeed.toFixed(1)}</span>
                </div>
              </div>
            );
          }) || (
            // Placeholder when loading
            ['--', '--', '--', '--'].map((_, index) => (
              <div key={index} className="text-center w-16">
                <div
                  className="text-gray-300 text-sm font-semibold"
                  style={{
                    textShadow: '3px 3px 6px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.7)'
                  }}
                >
                  --:--
                </div>
                <div
                  className="text-2xl"
                  style={{
                    textShadow: '3px 3px 6px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.7)'
                  }}
                >
                  --
                </div>
                <div
                  className="text-white text-base font-semibold"
                  style={{
                    textShadow: '3px 3px 6px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.7)'
                  }}
                >
                  --°
                </div>
                <div
                  className="flex items-center justify-center gap-1 text-white text-sm font-semibold"
                  style={{
                    textShadow: '3px 3px 6px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.7)'
                  }}
                >
                  <span className="text-lg">→</span>
                  <span>--</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Weather */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Current temperature */}
        <div className="text-right flex items-center gap-2">
          {isLoading && !weather ? (
            <div className="text-5xl text-gray-500">--°C</div>
          ) : error && !weather ? (
            <div className="text-4xl text-red-400" title={error}>
              <AlertTriangle size={48} />
            </div>
          ) : weather ? (
            <>
              <WeatherIcon symbol={getWeatherSymbol(weather.current.symbol)} size={85} />
              <span className="font-semibold" style={{ fontSize: '5.6rem' }}>{weather.current.temperature}°C</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
