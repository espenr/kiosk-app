import { useElectricity } from '@/hooks/useElectricity';
import { useLiveMeasurement } from '@/hooks/useLiveMeasurement';
import { useConfig } from '@/contexts/ConfigContext';
import { formatPrice, getPriceLevelBgClass, getPriceLevelColor, getGridFee, getGridFeePeriod } from '@/services/tibber';

/**
 * Electricity prices from Tibber API
 * Shows current price, live consumption, and compact 24h bar chart
 * Grid fee (nettleie) is added to Tibber prices
 */
export function Electricity() {
  const { electricity, isLoading, error } = useElectricity();
  const { config } = useConfig();
  const gridFeeRate = config.electricity.gridFee;

  // Live consumption from Tibber Pulse
  const { measurement, isConnected } = useLiveMeasurement(
    electricity?.homeId ?? null,
    electricity?.realTimeEnabled ?? false
  );

  // Get today's prices (midnight to midnight) with time-based grid fee added
  const todayPrices = (electricity?.today ?? []).map(p => ({
    ...p,
    total: p.total + getGridFee(gridFeeRate, p.startsAt),
  }));

  // Calculate min/max for dynamic bar heights
  const prices = todayPrices.map((p) => p.total);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 1;
  const priceRange = maxPrice - minPrice || 0.1;

  // Find current hour and grid fee period
  const currentHour = new Date().getHours();
  const currentGridFee = getGridFee(gridFeeRate);
  const currentPeriod = getGridFeePeriod();

  // Handle unconfigured state
  if (error === 'Tibber API-nøkkel ikke konfigurert') {
    return (
      <div className="h-full w-full px-4 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Strømpris ikke konfigurert</div>
      </div>
    );
  }

  // Format power in kW
  const formatPower = (watts: number) => {
    if (watts >= 1000) {
      return `${(watts / 1000).toFixed(1)} kW`;
    }
    return `${Math.round(watts)} W`;
  };

  return (
    <div className="h-full w-full px-4 py-2 flex gap-4">
      {/* Current price - compact */}
      <div className="flex-shrink-0 flex flex-col justify-center border-r border-gray-700 pr-4">
        <div className="text-xs text-gray-400">
          Strømpris {currentPeriod === 'day' ? '☀️' : '🌙'}
        </div>
        {isLoading && !electricity ? (
          <div className="text-2xl font-bold text-gray-500">--,--</div>
        ) : electricity?.current ? (
          <div
            className="text-2xl font-bold"
            style={{ color: getPriceLevelColor(electricity.current.level) }}
          >
            {formatPrice(electricity.current.total + currentGridFee).replace('.', ',')}
          </div>
        ) : (
          <div className="text-2xl font-bold text-gray-500">--,--</div>
        )}
        <div className="text-xs text-gray-400">kr/kWh</div>
      </div>

      {/* Live consumption from Tibber Pulse */}
      {electricity?.realTimeEnabled && (
        <div className="flex-shrink-0 flex flex-col justify-center border-r border-gray-700 pr-4">
          <div className="text-xs text-gray-400 flex items-center gap-1">
            Forbruk
            {isConnected && <span className="text-green-400">●</span>}
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {measurement ? formatPower(measurement.power) : '--'}
          </div>
          <div className="text-xs text-gray-400">
            {measurement
              ? `${measurement.accumulatedConsumption.toFixed(1)} kWh i dag`
              : 'Kobler til...'}
          </div>
        </div>
      )}

      {/* Today's prices chart - compact */}
      <div className="flex-1 flex gap-px min-w-0">
        {todayPrices.length > 0
          ? todayPrices.map((price, i) => {
              const hour = price.startsAt.getHours();
              const isCurrentHour = hour === currentHour;
              // Scale height between 15% and 85% of the bar area
              const heightPercent = 15 + ((price.total - minPrice) / priceRange) * 70;

              return (
                <div key={i} className="flex-1 flex flex-col items-center min-w-0">
                  {/* Price above bar */}
                  <div className="text-[8px] text-gray-400 truncate">
                    {formatPrice(price.total).replace('.', ',')}
                  </div>
                  {/* Bar */}
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className={`w-full rounded-t ${getPriceLevelBgClass(price.level)} ${
                        isCurrentHour ? 'ring-1 ring-white' : ''
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  {/* Time below bar */}
                  <div className={`text-[8px] ${isCurrentHour ? 'text-white font-bold' : 'text-gray-500'}`}>
                    {hour}
                  </div>
                </div>
              );
            })
          : // Placeholder bars when loading
            Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className="text-[8px] text-gray-600">--</div>
                <div className="flex-1 w-full flex items-end">
                  <div
                    className="w-full bg-gray-700 rounded-t animate-pulse"
                    style={{ height: `${30 + (i % 5) * 10}%` }}
                  />
                </div>
                <div className="text-[8px] text-gray-600">{i}</div>
              </div>
            ))}
      </div>
    </div>
  );
}
