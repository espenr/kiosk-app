import { useTransport } from '../../../hooks/useTransport';
import { formatDepartureTime, formatTimeUntil } from '../../../services/entur';

/**
 * Public transport departures from Entur API
 * Shows next departures from configured stop places
 */
export function Transport() {
  const { departures, isLoading, error } = useTransport();

  // Filter to departures in the future and take first 4
  const now = new Date();
  const upcomingDepartures = departures
    .filter((d) => d.expectedTime > now)
    .slice(0, 4);

  if (error && departures.length === 0) {
    return (
      <div className="h-full w-full p-6 flex items-center">
        <div className="text-red-400">
          <div className="text-sm">Kunne ikke hente avganger</div>
          <div className="text-xs text-gray-500">{error}</div>
        </div>
      </div>
    );
  }

  if (isLoading && departures.length === 0) {
    return (
      <div className="h-full w-full p-6">
        <div className="text-sm text-gray-400 mb-2">Neste buss fra Planetringen</div>
        <div className="flex items-center gap-4 animate-pulse">
          <div className="text-4xl font-bold text-gray-600">--:--</div>
        </div>
      </div>
    );
  }

  if (upcomingDepartures.length === 0) {
    return (
      <div className="h-full w-full p-6">
        <div className="text-sm text-gray-400 mb-2">Neste buss fra Planetringen</div>
        <div className="text-gray-500">Ingen avganger funnet</div>
      </div>
    );
  }

  const nextDeparture = upcomingDepartures[0];
  const laterDepartures = upcomingDepartures.slice(1);

  return (
    <div className="h-full w-full p-6 flex items-start gap-8">
      {/* Next departure - large */}
      <div className="flex-shrink-0">
        <div className="text-sm text-gray-400 mb-1">Neste buss</div>
        <div className="flex items-center gap-4">
          <div className="text-4xl font-bold tabular-nums">
            {formatDepartureTime(nextDeparture.expectedTime)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-lg font-semibold">
                {nextDeparture.line}
              </span>
              <span className="text-lg">{nextDeparture.destination}</span>
            </div>
            <div className="text-sm text-gray-400 flex items-center gap-2">
              <span>om {formatTimeUntil(nextDeparture.expectedTime)}</span>
              {nextDeparture.isRealtime && (
                <span className="text-green-400 text-xs">● sanntid</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Later departures */}
      {laterDepartures.length > 0 && (
        <div className="flex-1 border-l border-gray-700 pl-6">
          <div className="text-sm text-gray-400 mb-2">Senere avganger</div>
          <div className="space-y-2">
            {laterDepartures.map((dep, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm">
                <span className="tabular-nums font-medium w-12">
                  {formatDepartureTime(dep.expectedTime)}
                </span>
                <span className="bg-gray-700 text-white px-1.5 py-0.5 rounded text-xs font-semibold">
                  {dep.line}
                </span>
                <span className="text-gray-300 truncate">{dep.destination}</span>
                {dep.isRealtime && (
                  <span className="text-green-400 text-xs ml-auto">●</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
