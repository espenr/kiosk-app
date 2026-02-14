/**
 * Electricity prices from Tibber API
 * Placeholder - will be implemented in Phase 4
 */
export function Electricity() {
  return (
    <div className="h-full w-full p-6 flex">
      {/* Current price */}
      <div className="flex-shrink-0 pr-8 border-r border-gray-700">
        <div className="text-sm text-gray-400 mb-1">Strømpris nå</div>
        <div className="text-5xl font-bold">--.--</div>
        <div className="text-lg text-gray-400">kr/kWh</div>
      </div>

      {/* 24h forecast chart placeholder */}
      <div className="flex-1 pl-8">
        <div className="text-sm text-gray-400 mb-3">Neste 24 timer</div>
        <div className="h-[calc(100%-2rem)] flex items-end gap-1">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-gray-700 rounded-t"
              style={{ height: `${20 + Math.random() * 60}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
