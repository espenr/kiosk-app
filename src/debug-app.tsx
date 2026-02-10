/**
 * Simplified App for debugging
 */

function DebugApp() {
  return (
    <div className="w-full h-screen bg-gray-800 text-white">
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-4">Debug App</h1>
          <p className="text-xl mb-8">Simplified for troubleshooting</p>

          <div className="p-4 bg-white/10 rounded-md max-w-[600px]">
            <h2 className="text-lg font-semibold mb-2">Clock Widget Debug</h2>
            <p>Current time: {new Date().toLocaleTimeString()}</p>
            <p>Current date: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DebugApp;