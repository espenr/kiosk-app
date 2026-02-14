import { useState, useEffect } from 'react';

/**
 * Header section with clock, date, and weather
 */
export function Header() {
  const [time, setTime] = useState(new Date());

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
    <div className="h-full flex items-center justify-between px-8">
      {/* Clock and Date */}
      <div className="flex items-baseline gap-6">
        <span className="text-6xl font-bold tabular-nums">{formattedTime}</span>
        <span className="text-2xl text-gray-300">{displayDate}</span>
      </div>

      {/* Weather - placeholder */}
      <div className="flex items-center gap-8">
        <div className="text-right">
          <div className="text-4xl font-semibold">--°C</div>
        </div>
        <div className="flex gap-2 text-sm text-gray-400">
          {/* 5-day forecast placeholder */}
          {['Ma', 'Ti', 'On', 'To', 'Fr'].map((day) => (
            <div key={day} className="text-center">
              <div>{day}</div>
              <div>--°</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
