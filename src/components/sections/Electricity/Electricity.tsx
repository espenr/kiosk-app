import { useElectricity } from '@/hooks/useElectricity';
import { useLiveMeasurement } from '@/hooks/useLiveMeasurement';
import { useConfig } from '@/contexts/ConfigContext';
import { formatPrice, getPriceLevelBgClass, getPriceLevelColor, getGridFee, getGridFeePeriod, ConnectionState } from '@/services/tibber';
import { Sun, Moon, Circle } from '@/components/icons';

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
  const { measurement, connectionState, freshness, lastUpdateSeconds } = useLiveMeasurement(
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

  // Get connection indicator color based on state and freshness
  const getConnectionColor = () => {
    if (connectionState === ConnectionState.DISCONNECTED) return 'text-gray-500';
    if (connectionState === ConnectionState.ERROR) return 'text-red-500';
    if (connectionState === ConnectionState.CONNECTING ||
        connectionState === ConnectionState.OPEN ||
        connectionState === ConnectionState.SUBSCRIBED) return 'text-yellow-400';
    if (freshness === 'stale' || connectionState === ConnectionState.STALE) return 'text-orange-500';
    if (freshness === 'warning') return 'text-yellow-400';
    return 'text-green-400'; // DATA_FLOWING
  };

  // Get connection status text
  const getConnectionStatus = () => {
    switch (connectionState) {
      case ConnectionState.DISCONNECTED: return 'Ikke tilkoblet';
      case ConnectionState.CONNECTING: return 'Kobler til...';
      case ConnectionState.OPEN: return 'Autentiserer...';
      case ConnectionState.SUBSCRIBED: return 'Venter på data...';
      case ConnectionState.ERROR: return 'Tilkoblingsfeil';
      case ConnectionState.STALE: return 'Kobler til på nytt...';
      case ConnectionState.DATA_FLOWING:
        if (freshness === 'warning' && lastUpdateSeconds) {
          return `Sist oppdatert ${lastUpdateSeconds}s siden`;
        }
        return measurement ? `${measurement.accumulatedConsumption.toFixed(1)} kWh i dag` : 'Tilkoblet';
      default: return 'Ukjent status';
    }
  };

  return (
    <div className="h-full w-full px-4 py-2 flex gap-4 bg-black/30 backdrop-blur border border-white/5 rounded-lg">
      {/* Current price - compact, scaled for 1080x1920 */}
      <div className="flex-shrink-0 flex flex-col justify-center border-r border-gray-700 pr-4">
        <div className="text-gray-400 flex items-center gap-1" style={{ fontSize: '1.1rem' }}>
          <span>Strømpris</span>
          {currentPeriod === 'day' ? <Sun size={20} /> : <Moon size={20} />}
        </div>
        {isLoading && !electricity ? (
          <div className="font-bold text-gray-500" style={{ fontSize: '2.8rem' }}>--,--</div>
        ) : electricity?.current ? (
          <div
            className="font-bold"
            style={{ fontSize: '2.8rem', color: getPriceLevelColor(electricity.current.level) }}
          >
            {formatPrice(electricity.current.total + currentGridFee).replace('.', ',')}
          </div>
        ) : (
          <div className="font-bold text-gray-500" style={{ fontSize: '2.8rem' }}>--,--</div>
        )}
        <div className="text-gray-400" style={{ fontSize: '1.1rem' }}>kr/kWh</div>
      </div>

      {/* Live consumption from Tibber Pulse */}
      {electricity?.realTimeEnabled && (
        <div className="flex-shrink-0 flex flex-col justify-center border-r border-gray-700 pr-4">
          <div className="text-gray-400 flex items-center gap-1" style={{ fontSize: '1.1rem' }}>
            Forbruk
            <Circle
              size={11}
              fill="currentColor"
              className={getConnectionColor()}
            />
          </div>
          <div
            className="font-bold"
            style={{
              fontSize: '2.8rem',
              opacity: freshness === 'stale' ? 0.5 : 1,
              color: freshness === 'stale' ? '#9ca3af' : '#60a5fa',
            }}
          >
            {measurement ? formatPower(measurement.power) : '--'}
          </div>
          <div className="text-gray-400" style={{ fontSize: '1.1rem' }}>
            {getConnectionStatus()}
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
                  {/* Bar area with price overlay */}
                  <div className="flex-1 w-full relative flex items-end">
                    {/* Colored bar (bottom-aligned) */}
                    <div
                      className={`w-full rounded-t ${getPriceLevelBgClass(price.level)} ${
                        isCurrentHour ? 'ring-1 ring-white' : ''
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />

                    {/* Price label (absolute positioned at bottom) */}
                    <div className="absolute bottom-1 left-0 right-0 text-center">
                      <div
                        className={`text-black truncate ${isCurrentHour ? 'font-bold' : ''}`}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {formatPrice(price.total).replace('.', ',')}
                      </div>
                    </div>
                  </div>

                  {/* Time below bar */}
                  <div className={isCurrentHour ? 'text-white font-bold' : 'text-gray-500'} style={{ fontSize: '0.7rem' }}>
                    {hour}
                  </div>
                </div>
              );
            })
          : // Placeholder bars when loading
            Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center min-w-0">
                <div className="flex-1 w-full relative flex items-end">
                  <div
                    className="w-full bg-gray-700 rounded-t animate-pulse"
                    style={{ height: `${30 + (i % 5) * 10}%` }}
                  />
                  <div className="absolute bottom-1 left-0 right-0 text-center">
                    <div
                      className="text-gray-600 truncate"
                      style={{ fontSize: '0.7rem' }}
                    >
                      --
                    </div>
                  </div>
                </div>
                <div className="text-gray-600" style={{ fontSize: '0.7rem' }}>{i}</div>
              </div>
            ))}
      </div>
    </div>
  );
}
