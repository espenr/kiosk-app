import { useConnectivity } from '@/hooks/useConnectivity';

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function Spinner() {
  return (
    <div className="animate-spin h-12 w-12 border-4 border-white border-t-transparent rounded-full" />
  );
}

export function ConnectivityWarning() {
  const { status, downtimeDuration } = useConnectivity();

  // Don't render anything if online
  if (status === 'online') {
    return null;
  }

  const isReconnecting = status === 'reconnecting';
  const bgColor = isReconnecting ? 'bg-yellow-600' : 'bg-red-600';
  const borderColor = isReconnecting ? 'border-yellow-700' : 'border-red-700';
  const animation = isReconnecting ? '' : 'animate-pulse';

  return (
    <div
      className={`${bgColor} ${borderColor} border-b flex items-center justify-center h-20 flex-shrink-0 ${animation}`}
    >
      <div className="flex items-center gap-4">
        {isReconnecting ? (
          <Spinner />
        ) : (
          <span className="text-5xl">⚠️</span>
        )}
        <div className="flex flex-col">
          <span className="text-4xl font-bold text-white">
            {isReconnecting ? 'Reconnecting...' : 'Internet Connection Lost'}
          </span>
          {!isReconnecting && downtimeDuration > 0 && (
            <span className="text-2xl text-white opacity-90">
              Downtime: {formatDuration(downtimeDuration)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
