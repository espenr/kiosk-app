import { useTransport } from '../../../hooks/useTransport';
import { formatDepartureTime, formatTimeUntil } from '../../../services/entur';

/**
 * Public transport departures from Entur API
 * Simple single-line display matching wireframe
 */
export function Transport() {
  const { departures, isLoading, error } = useTransport();

  // Stop name (could be derived from config in the future)
  const stopName = 'Planetringen';

  // Filter to departures in the future
  const now = new Date();
  const futureDepartures = departures.filter((d) => d.expectedTime > now);
  const nextDeparture = futureDepartures[0];
  const upcomingDepartures = futureDepartures.slice(1, 3); // Next 2 after the first

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
        <div className="flex flex-col">
          <span className="text-gray-500 text-sm">{stopName}</span>
          <span className="text-2xl font-bold text-gray-600 tabular-nums">--:--</span>
        </div>
      </div>
    );
  }

  if (!nextDeparture) {
    return (
      <div className="h-full w-full px-6 flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-gray-500 text-sm">{stopName}</span>
          <span className="text-gray-500 text-lg">Ingen avganger</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full px-6 flex items-center gap-4">
      <div className="flex flex-col">
        <span className="text-gray-500 text-sm">{stopName}</span>
        <span className="text-3xl font-bold tabular-nums">
          {formatDepartureTime(nextDeparture.expectedTime)}
        </span>
      </div>
      <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-lg font-semibold">
        {nextDeparture.line}
      </span>
      <span className="text-gray-400 text-base">
        ({formatTimeUntil(nextDeparture.expectedTime)})
      </span>
      {nextDeparture.isRealtime && (
        <span className="text-green-400 text-sm">● sanntid</span>
      )}

      {/* Upcoming departures */}
      {upcomingDepartures.length > 0 && (
        <div className="flex flex-col ml-4 border-l border-gray-700 pl-4">
          <span className="text-gray-500 text-sm">Deretter</span>
          <div className="flex flex-col">
            {upcomingDepartures.map((dep, index) => (
              <span key={index} className="text-xl tabular-nums text-gray-300 leading-tight">
                {formatDepartureTime(dep.expectedTime)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
