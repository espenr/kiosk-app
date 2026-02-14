/**
 * Public transport departures from Entur API
 * Placeholder - will be implemented in Phase 3
 */
export function Transport() {
  return (
    <div className="h-full w-full p-6">
      <div className="text-sm text-gray-400 mb-2">Neste buss fra Vikhammeråsen</div>
      <div className="flex items-center gap-4">
        <div className="text-4xl font-bold">--:--</div>
        <div className="text-gray-400">
          <div className="text-lg">Linje --</div>
          <div className="text-sm">Retning --</div>
        </div>
      </div>
    </div>
  );
}
