import { useState, useEffect } from 'react';
import { useTransport } from '../../../hooks/useTransport';
import { formatDepartureTime, formatTimeUntil, calculateDelay, formatDelay } from '../../../services/entur';
import { Circle } from '../../icons';

/**
 * Public transport departures from Entur API
 * Simple single-line display matching wireframe
 */
export function Transport() {
  const { departures, isLoading, error } = useTransport();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter to departures in the future AND not cancelled
  const futureDepartures = departures.filter(
    (d) => d.expectedTime > currentTime && !d.cancelled
  );
  const nextDeparture = futureDepartures[0];
  const upcomingDepartures = futureDepartures.slice(1, 3); // Next 2 after the first

  // Check if all departures are cancelled
  const cancelledCount = departures.filter(d => d.cancelled).length;

  if (error && departures.length === 0) {
    return (
      <div className="h-full w-full px-6 flex items-center">
        <span className="text-gray-500">Kunne ikke hente bussavganger</span>
      </div>
    );
  }

  if (isLoading && departures.length === 0) {
    return (
      <div className="h-full w-full px-6 flex items-center gap-4">
        <span className="text-2xl font-bold text-gray-600 tabular-nums">--:--</span>
      </div>
    );
  }

  if (!nextDeparture) {
    // Check if we have cancelled departures
    if (cancelledCount > 0) {
      return (
        <div className="h-full w-full px-6 flex items-center">
          <span className="text-red-500" style={{ fontSize: '1.8rem' }}>
            {cancelledCount} avlyste avganger
          </span>
        </div>
      );
    }
    return (
      <div className="h-full w-full px-6 flex items-center gap-4">
        <span className="text-gray-500 text-lg">Ingen avganger</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full px-6 py-3 bg-black/30 backdrop-blur border border-white/5 rounded-lg">
      {/* Main departure - horizontal */}
      <div className="flex items-center gap-4">
        {/* Bus number */}
        <span className="bg-blue-600 text-white px-4 py-2 rounded font-bold" style={{ fontSize: '2.8rem' }}>
          {nextDeparture.line}
        </span>

        {/* Destination */}
        <span className="font-semibold text-white" style={{ fontSize: '2.24rem' }}>
          {nextDeparture.destination}
        </span>

        {/* Departure time */}
        <span className="font-bold tabular-nums text-white" style={{ fontSize: '3.5rem' }}>
          {formatDepartureTime(nextDeparture.expectedTime)}
        </span>

        {/* Time until */}
        <span className="text-gray-400" style={{ fontSize: '1.4rem' }}>
          ({formatTimeUntil(nextDeparture.expectedTime, currentTime)})
        </span>

        {/* Delay indicator */}
        {(() => {
          const delay = calculateDelay(nextDeparture.scheduledTime, nextDeparture.expectedTime);
          if (delay !== null && delay > 0) {
            return (
              <span className="text-orange-400 font-semibold" style={{ fontSize: '1.4rem' }}>
                {formatDelay(delay)}
              </span>
            );
          } else if (delay !== null && delay < 0) {
            return (
              <span className="text-green-400 font-semibold" style={{ fontSize: '1.4rem' }}>
                {formatDelay(delay)}
              </span>
            );
          }
          return null;
        })()}

        {/* Realtime indicator */}
        {nextDeparture.isRealtime && (
          <span className="text-green-400 text-sm flex items-center gap-1">
            <Circle size={8} fill="currentColor" />
            sanntid
          </span>
        )}
      </div>

      {/* Upcoming departures - vertical stack */}
      {upcomingDepartures.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <span className="text-gray-500" style={{ fontSize: '1.2rem' }}>Deretter</span>
          <div className="flex gap-6 mt-2">
            {upcomingDepartures.map((dep, index) => {
              const delay = calculateDelay(dep.scheduledTime, dep.expectedTime);
              return (
                <div key={index} className="flex items-baseline gap-2">
                  <span className="tabular-nums text-white font-semibold" style={{ fontSize: '2.2rem' }}>
                    {formatDepartureTime(dep.expectedTime)}
                  </span>
                  {delay !== null && delay !== 0 && (
                    <span className={delay > 0 ? 'text-orange-400' : 'text-green-400'} style={{ fontSize: '1.2rem' }}>
                      {formatDelay(delay)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
