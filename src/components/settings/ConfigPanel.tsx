import { useState } from 'react';
import { useConfig } from '../../contexts/ConfigContext';

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Minimal settings panel for kiosk configuration
 */
export default function ConfigPanel({ isOpen, onClose }: ConfigPanelProps) {
  const { config, updateApiKeys, updateLocation, updatePhotos } = useConfig();
  const [tibberToken, setTibberToken] = useState(config.apiKeys.tibber);
  const [stopPlaceId, setStopPlaceId] = useState(config.location.stopPlaceId);
  const [albumUrl, setAlbumUrl] = useState(config.photos.sharedAlbumUrl);
  const [photoInterval, setPhotoInterval] = useState(config.photos.interval);

  const handleSave = () => {
    updateApiKeys({ tibber: tibberToken });
    updateLocation({ stopPlaceId });
    updatePhotos({ sharedAlbumUrl: albumUrl, interval: photoInterval });
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-gray-800 shadow-xl transform transition-transform duration-300 ease-out z-50 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold">Innstillinger</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="Lukk"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Tibber */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Strømpris (Tibber)</h3>
            <label htmlFor="tibber-token" className="block text-sm text-gray-400 mb-1">
              API Token
            </label>
            <input
              type="password"
              id="tibber-token"
              value={tibberToken}
              onChange={(e) => setTibberToken(e.target.value)}
              placeholder="Lim inn Tibber API token"
              className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Hent fra developer.tibber.com
            </p>
          </div>

          {/* Transport */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Kollektivtransport (Entur)</h3>
            <label htmlFor="stop-place-id" className="block text-sm text-gray-400 mb-1">
              Holdeplass ID
            </label>
            <input
              type="text"
              id="stop-place-id"
              value={stopPlaceId}
              onChange={(e) => setStopPlaceId(e.target.value)}
              placeholder="NSR:StopPlace:12345"
              className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Finn ID på entur.no
            </p>
          </div>

          {/* Photos */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Bildekarusell (iCloud)</h3>
            <label htmlFor="album-url" className="block text-sm text-gray-400 mb-1">
              Delt album URL
            </label>
            <input
              type="text"
              id="album-url"
              value={albumUrl}
              onChange={(e) => setAlbumUrl(e.target.value)}
              placeholder="https://share.icloud.com/photos/..."
              className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <label htmlFor="photo-interval" className="block text-sm text-gray-400 mb-1 mt-3">
              Bytt bilde hvert (sekunder)
            </label>
            <input
              type="number"
              id="photo-interval"
              min="5"
              max="300"
              value={photoInterval}
              onChange={(e) => setPhotoInterval(parseInt(e.target.value) || 30)}
              className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          <button
            onClick={handleSave}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Lagre
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-600 hover:border-gray-500 text-white rounded-md transition-colors"
          >
            Avbryt
          </button>
        </div>
      </div>
    </>
  );
}
