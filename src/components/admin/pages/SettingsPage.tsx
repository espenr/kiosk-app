/**
 * Settings page - Configuration management interface
 */

import { useState, useEffect, useCallback } from 'preact/hooks';
import { route } from 'preact-router';
import { getConfig, updateConfig, logout } from '../../../services/auth';
import { useConfig } from '../../../contexts/ConfigContext';
import { invalidateCalendarCache } from '../../../hooks/useCalendar';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { StopPlaceSearch } from '../components/StopPlaceSearch';
import type { KioskConfig } from '../../../contexts/ConfigContext';
import type { StopPlaceSuggestion } from '../../../services/entur';
import versionInfo from '../../../version.json';

export function SettingsPage() {
  const { syncWithServer, setIsDirty } = useConfig();
  const [config, setConfig] = useState<KioskConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pin, setPin] = useState('');
  const [selectedStop, setSelectedStop] = useState<StopPlaceSuggestion | null>(null);
  const [serviceAccountUploadError, setServiceAccountUploadError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getConfig();
      setConfig(data);

      // Initialize selected stop from config
      if (data.location.stopPlaceIds.length > 0 && data.location.stopPlaceName) {
        setSelectedStop({
          id: data.location.stopPlaceIds[0],
          name: data.location.stopPlaceName,
          label: data.location.stopPlaceName,
          locality: '',
          coordinates: {
            latitude: data.location.latitude,
            longitude: data.location.longitude,
          },
          categories: [],
        });
      }

      // Clear dirty flag after loading config
      setIsDirty(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load config';

      // If authentication failed, redirect to login
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('authenticated')) {
        console.log('[SettingsPage] Session expired, redirecting to login');
        route('/admin/login');
        return;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [setIsDirty]);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleLogout = async () => {
    try {
      await logout();
      route('/admin/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    }
  };

  const handleSave = () => {
    setShowPinPrompt(true);
    setPin('');
    setError(null);
  };

  const handleConfirmSave = async () => {
    if (!config) return;

    if (!/^\d{4,8}$/.test(pin)) {
      setError('PIN must be 4-8 digits');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      await updateConfig(config, pin);

      // Sync with ConfigContext
      await syncWithServer();

      // Clear dirty flag after successful save
      setIsDirty(false);

      // Invalidate calendar cache to force immediate refetch
      invalidateCalendarCache();

      // Show success in modal briefly before closing
      setSuccess(true);
      setError(null);

      // Close modal after showing success message
      setTimeout(() => {
        setShowPinPrompt(false);
        setPin('');
      }, 1500);

      // Clear success message after it's been visible for a while
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save config';

      // If authentication failed, redirect to login
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('authenticated')) {
        console.log('[SettingsPage] Session expired during save, redirecting to login');
        setShowPinPrompt(false);
        route('/admin/login');
        return;
      }

      setError(errorMessage);
      setSuccess(false);
    } finally {
      setSaving(false);
    }
  };

  const handleServiceAccountUpload = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    try {
      setServiceAccountUploadError(null);
      const text = await file.text();

      // Validate it's valid JSON with required fields
      const keyData = JSON.parse(text);
      if (!keyData.private_key || !keyData.client_email) {
        setServiceAccountUploadError('Invalid service account key: missing private_key or client_email');
        return;
      }

      // Convert to base64 for storage
      const base64 = btoa(text);
      updateField('calendar', 'serviceAccountKey', base64);
    } catch (err) {
      setServiceAccountUploadError(err instanceof Error ? err.message : 'Invalid JSON file');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateField = (section: keyof KioskConfig, field: string, value: any) => {
    if (!config) return;

    // Set dirty flag when user starts editing
    setIsDirty(true);

    const currentSection = config[section];
    // Only spread if current section is an object
    if (typeof currentSection === 'object' && currentSection !== null) {
      setConfig({
        ...config,
        [section]: {
          ...currentSection,
          [field]: value,
        },
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!config || !config.electricity?.gridFee || typeof config.electricity.gridFee !== 'object') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded">
          <p className="font-medium">Configuration needs migration</p>
          <p className="text-sm mt-2">
            Please log out and log back in to migrate your configuration to the new format.
          </p>
          <Button variant="secondary" onClick={handleLogout} className="mt-4">
            Logout
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kiosk Settings</h1>
            {!import.meta.env.DEV && !window.location.hostname.includes('localhost') && (
              <p className="text-xs text-gray-500 mt-1">Version {versionInfo.version}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => route('/admin/reset')}>
              Factory Reset
            </Button>
            <Button variant="secondary" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Introduction */}
        <div className="mb-8">
          <p className="text-gray-600">
            Configure your kiosk display settings. All changes are encrypted and require your PIN to save.
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded mb-6">
            ✓ Settings saved successfully
          </div>
        )}

        {/* Error Message */}
        {error && !showPinPrompt && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded mb-6">
            {error}
          </div>
        )}

        {/* Location Section */}
        <div className="bg-white rounded-lg shadow pt-1 px-6 pb-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Location & Transport</h2>
          <p className="text-sm text-gray-500 mb-4">Configure your location for weather and public transport data</p>

          <StopPlaceSearch
            label="Bus/Tram Stop"
            value={selectedStop}
            onChange={(stop) => {
              setSelectedStop(stop);
              if (stop) {
                updateField('location', 'stopPlaceIds', [stop.id]);
                updateField('location', 'stopPlaceName', stop.name);
                updateField('location', 'latitude', stop.coordinates.latitude);
                updateField('location', 'longitude', stop.coordinates.longitude);
              }
            }}
            focusPoint={
              config.location.latitude && config.location.longitude
                ? { latitude: config.location.latitude, longitude: config.location.longitude }
                : undefined
            }
            required
          />

          {/* Show coordinates in read-only display */}
          {selectedStop && (
            <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Coordinates (auto-populated):</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Latitude:</span>
                  <span className="ml-2 font-mono text-gray-700">{config.location.latitude.toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Longitude:</span>
                  <span className="ml-2 font-mono text-gray-700">{config.location.longitude.toFixed(4)}</span>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-500 mt-4">
            Used for weather forecast and transport departures
          </p>

          {/* Destination Filter */}
          {selectedStop && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Destination Filter</h3>
              <p className="text-sm text-gray-600 mb-4">
                Filter bus departures by destination. Useful when your stop serves routes going in multiple directions.
              </p>

              {/* Enable/Disable Toggle */}
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={!!config.transport?.destinationFilter}
                    onChange={(e) => {
                      if (e.currentTarget.checked) {
                        updateField('transport', 'destinationFilter', {
                          mode: 'whitelist',
                          destinations: [],
                        });
                      } else {
                        updateField('transport', 'destinationFilter', undefined);
                      }
                    }}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable destination filtering</span>
                </label>
              </div>

              {config.transport?.destinationFilter && (
                <div className="space-y-4 pl-6">
                  {/* Filter Mode */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filter Mode</label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={config.transport.destinationFilter.mode === 'whitelist'}
                          onChange={() => {
                            if (config.transport?.destinationFilter) {
                              updateField('transport', 'destinationFilter', {
                                ...config.transport.destinationFilter,
                                mode: 'whitelist',
                              });
                            }
                          }}
                          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          <strong>Whitelist</strong> - Only show these destinations
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={config.transport.destinationFilter.mode === 'blacklist'}
                          onChange={() => {
                            if (config.transport?.destinationFilter) {
                              updateField('transport', 'destinationFilter', {
                                ...config.transport.destinationFilter,
                                mode: 'blacklist',
                              });
                            }
                          }}
                          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          <strong>Blacklist</strong> - Hide these destinations
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Destinations List */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destinations (one per line)
                    </label>
                    <textarea
                      value={config.transport.destinationFilter.destinations.join('\n')}
                      onChange={(e) => {
                        if (config.transport?.destinationFilter) {
                          const destinations = e.currentTarget.value
                            .split('\n')
                            .map(d => d.trim())
                            .filter(d => d.length > 0);
                          updateField('transport', 'destinationFilter', {
                            ...config.transport.destinationFilter,
                            destinations,
                          });
                        }
                      }}
                      rows={5}
                      placeholder="Strindheim&#10;Sentrum&#10;Lerkendal"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Matching is case-insensitive and uses substring matching (e.g., "Sentrum" matches "Trondheim Sentrum")
                    </p>
                  </div>

                  {/* Current destinations count */}
                  {config.transport.destinationFilter.destinations.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-sm text-blue-800">
                        {config.transport.destinationFilter.mode === 'whitelist' ? '✓' : '✗'}{' '}
                        {config.transport.destinationFilter.mode === 'whitelist' ? 'Showing only' : 'Hiding'}{' '}
                        departures to:{' '}
                        <strong>{config.transport.destinationFilter.destinations.join(', ')}</strong>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* API Keys Section */}
        <div className="bg-white rounded-lg shadow pt-1 px-6 pb-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">API Keys</h2>
          <p className="text-sm text-gray-500 mb-4">API credentials for external services</p>
          <Input
            label="Tibber API Token"
            type="password"
            value={config.apiKeys.tibber}
            onChange={(v) => updateField('apiKeys', 'tibber', v)}
            placeholder="Enter Tibber API token"
          />
          <p className="text-sm text-gray-500 mt-2">
            Get your token from{' '}
            <a
              href="https://developer.tibber.com/settings/access-token"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              developer.tibber.com
            </a>
          </p>
        </div>

        {/* Electricity Section */}
        <div className="bg-white rounded-lg shadow pt-1 px-6 pb-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Electricity Pricing</h2>
          <p className="text-sm text-gray-500 mb-4">Configure grid fees for accurate electricity cost calculations</p>
          <div className="space-y-4">
            <Input
              label="Grid Fee - Day (06:00-22:00)"
              type="number"
              value={config.electricity.gridFee.day.toString()}
              onChange={(v) => {
                const gridFee = { ...config.electricity.gridFee, day: parseFloat(v) };
                updateField('electricity', 'gridFee', gridFee);
              }}
              placeholder="0.3604"
            />
            <Input
              label="Grid Fee - Night (22:00-06:00)"
              type="number"
              value={config.electricity.gridFee.night.toString()}
              onChange={(v) => {
                const gridFee = { ...config.electricity.gridFee, night: parseFloat(v) };
                updateField('electricity', 'gridFee', gridFee);
              }}
              placeholder="0.2292"
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Your grid fee (nettleie) is added to Tibber spot price. Rates vary by time of day.
            Example: Tensio Malvik day: 0.3604 kr/kWh, night: 0.2292 kr/kWh
          </p>
        </div>

        {/* Photos Section */}
        <div className="bg-white rounded-lg shadow pt-1 px-6 pb-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Photo Slideshow</h2>
          <p className="text-sm text-gray-500 mb-4">Display photos from iCloud Shared Albums</p>
          <div className="space-y-4">
            <Input
              label="iCloud Shared Album URL"
              type="url"
              value={config.photos.sharedAlbumUrl}
              onChange={(v) => updateField('photos', 'sharedAlbumUrl', v)}
              placeholder="https://www.icloud.com/sharedalbum/#..."
            />
            <Input
              label="Slide Interval (seconds)"
              type="number"
              value={config.photos.interval.toString()}
              onChange={(v) => updateField('photos', 'interval', parseInt(v))}
              placeholder="30"
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Create a shared album in iCloud Photos and paste the public link here
          </p>
        </div>

        {/* Calendar Section */}
        <div className="bg-white rounded-lg shadow pt-1 px-6 pb-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Google Calendar</h2>
          <p className="text-sm text-gray-500 mb-4">Connect and display family calendar events</p>

          {/* Service Account Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">🔐 Service Account Setup</h3>
            <ol className="text-sm text-blue-800 space-y-2 mb-4">
              <li>
                1. Create a Service Account in{' '}
                <a
                  href="https://console.cloud.google.com/iam-admin/serviceaccounts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Google Cloud Console
                </a>
              </li>
              <li>2. Download the JSON key file</li>
              <li>3. Share your calendar with the service account email (view-only)</li>
              <li>4. Upload the JSON key below</li>
            </ol>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Account JSON Key
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleServiceAccountUpload}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>

              {serviceAccountUploadError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {serviceAccountUploadError}
                </div>
              )}

              {config?.calendar.serviceAccountKey && (
                <div className="text-sm text-green-700">
                  ✓ Service Account configured
                </div>
              )}
            </div>
          </div>

          {/* Calendar Sources */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-medium mb-4">Calendar Sources</h3>
            <p className="text-sm text-gray-600 mb-4">
              After sharing calendars with your service account, configure which calendars to display.
              Use "primary" for the main calendar or the full email address for shared calendars.
            </p>

            {config.calendar.calendars && config.calendar.calendars.length > 0 ? (
              <div className="space-y-4 mb-4">
                {config.calendar.calendars.map((cal, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        label="Calendar ID"
                        type="text"
                        value={cal.id}
                        onChange={(v) => {
                          const calendars = [...(config.calendar.calendars || [])];
                          calendars[index] = { ...calendars[index], id: v };
                          updateField('calendar', 'calendars', calendars);
                        }}
                        placeholder="primary or email@gmail.com"
                      />
                      <Input
                        label="Display Name"
                        type="text"
                        value={cal.name}
                        onChange={(v) => {
                          const calendars = [...(config.calendar.calendars || [])];
                          calendars[index] = { ...calendars[index], name: v };
                          updateField('calendar', 'calendars', calendars);
                        }}
                        placeholder="e.g., Espen, Emma"
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Color
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={cal.color}
                            onChange={(e) => {
                              const calendars = [...(config.calendar.calendars || [])];
                              calendars[index] = { ...calendars[index], color: e.currentTarget.value };
                              updateField('calendar', 'calendars', calendars);
                            }}
                            className="h-10 w-20 border rounded cursor-pointer"
                          />
                          <Button
                            variant="danger"
                            onClick={() => {
                              const calendars = [...(config.calendar.calendars || [])];
                              calendars.splice(index, 1);
                              updateField('calendar', 'calendars', calendars);
                            }}
                            className="flex-1"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <Button
              variant="secondary"
              onClick={() => {
                const calendars = config.calendar.calendars || [];
                updateField('calendar', 'calendars', [
                  ...calendars,
                  { id: 'primary', name: '', color: '#4285f4' },
                ]);
              }}
            >
              + Add Calendar
            </Button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave}>Save Changes</Button>
        </div>

        {/* Danger Zone */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Danger Zone</h2>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="font-medium text-red-900 mb-2">Factory Reset</h3>
            <p className="text-sm text-red-700 mb-4">
              Permanently delete all settings and configuration. This action cannot be undone.
            </p>
            <Button variant="danger" onClick={() => route('/admin/reset')}>
              Factory Reset...
            </Button>
          </div>
        </div>
      </div>

      {/* PIN Prompt Modal */}
      {showPinPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Confirm Changes</h2>
            <p className="text-gray-600 mb-4">Enter your PIN to save changes</p>

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                ✓ Settings saved successfully
              </div>
            )}

            {error && !success && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <Input
              label="PIN"
              type="password"
              value={pin}
              onChange={setPin}
              placeholder="Enter 4-8 digit PIN"
              pattern="[0-9]{4,8}"
              maxLength={8}
              required
            />

            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowPinPrompt(false);
                  setPin('');
                  setError(null);
                  setSuccess(false);
                  // Don't clear dirty flag on cancel - user may still be editing
                }}
                disabled={saving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmSave} disabled={saving || success} className="flex-1">
                {saving ? 'Saving...' : success ? 'Saved!' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
