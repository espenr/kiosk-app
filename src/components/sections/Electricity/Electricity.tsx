import { useElectricity } from '@/hooks/useElectricity';
import { formatPrice, getPriceLevelBgClass, getPriceLevelColor } from '@/services/tibber';

/**
 * Electricity prices from Tibber API
 * Shows current price and 24h bar chart
 */
export function Electricity() {
  const { electricity, isLoading, error } = useElectricity();

  // Get today's prices (midnight to midnight)
  const todayPrices = electricity?.today ?? [];

  // Calculate min/max for dynamic bar heights
  const prices = todayPrices.map((p) => p.total);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 1;
  const priceRange = maxPrice - minPrice || 0.1; // Avoid division by zero

  // Find current hour
  const currentHour = new Date().getHours();

  // Handle unconfigured state
  if (error === 'Tibber API-nøkkel ikke konfigurert') {
    return (
      <div className="h-full w-full p-6 flex items-center justify-center">
        <div className="text-gray-400 text-center">
          <div className="text-lg mb-2">Tibber ikke konfigurert</div>
          <div className="text-sm">Legg til API-nøkkel i innstillinger</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-6 flex">
      {/* Current price */}
      <div className="flex-shrink-0 pr-8 border-r border-gray-700 flex flex-col justify-center">
        <div className="text-sm text-gray-400 mb-1">Strømpris nå</div>
        {isLoading && !electricity ? (
          <div className="text-5xl font-bold text-gray-500">--,--</div>
        ) : electricity?.current ? (
          <div
            className="text-5xl font-bold"
            style={{ color: getPriceLevelColor(electricity.current.level) }}
          >
            {formatPrice(electricity.current.total).replace('.', ',')}
          </div>
        ) : (
          <div className="text-5xl font-bold text-gray-500">--,--</div>
        )}
        <div className="text-lg text-gray-400">kr/kWh</div>
        {error && error !== 'Tibber API-nøkkel ikke konfigurert' && (
          <div className="text-xs text-red-400 mt-2">{error}</div>
        )}
      </div>

      {/* Today's prices chart (midnight to midnight) */}
      <div className="flex-1 pl-8 flex flex-col">
        <div className="flex-1 flex gap-0.5">
          {todayPrices.length > 0
            ? todayPrices.map((price, i) => {
                const hour = price.startsAt.getHours();
                const isCurrentHour = hour === currentHour;
                // Scale height between 20% and 100%
                const heightPercent = 20 + ((price.total - minPrice) / priceRange) * 80;
                const priceDisplay = formatPrice(price.total).replace('.', ',');

                return (
                  <div key={i} className="flex-1 flex flex-col items-center min-w-0">
                    {/* Bar container */}
                    <div className="flex-1 w-full flex items-end">
                      <div
                        className={`w-full rounded-t transition-all ${getPriceLevelBgClass(price.level)} ${
                          isCurrentHour ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900' : ''
                        } flex items-end justify-center overflow-hidden`}
                        style={{ height: `${heightPercent}%` }}
                      >
                        {/* Price inside bar */}
                        <span className="text-xs font-semibold text-black/80 whitespace-nowrap pb-1">
                          {priceDisplay}
                        </span>
                      </div>
                    </div>
                    {/* Hour label */}
                    <div className={`text-xs mt-1 ${isCurrentHour ? 'text-white font-bold' : 'text-gray-500'}`}>
                      {hour.toString().padStart(2, '0')}
                    </div>
                  </div>
                );
              })
            : // Placeholder bars when loading
              Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center min-w-0">
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className="w-full bg-gray-700 rounded-t animate-pulse"
                      style={{ height: `${30 + (i % 5) * 10}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{i.toString().padStart(2, '0')}</div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}

