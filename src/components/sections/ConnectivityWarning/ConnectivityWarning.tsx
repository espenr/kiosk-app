import { useConnectivity } from '@/hooks/useConnectivity';

export function ConnectivityWarning() {
  const { isOnline } = useConnectivity();

  // Don't render anything if online
  if (isOnline) {
    return null;
  }

  return (
    <div className="bg-red-600 border-b border-red-700 flex items-center justify-center h-20 flex-shrink-0">
      <div className="flex items-center gap-4">
        <span className="text-5xl">⚠️</span>
        <span className="text-4xl font-bold text-white">
          Internet Connection Lost
        </span>
      </div>
    </div>
  );
}
