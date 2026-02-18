/**
 * Factory reset page - Delete all data with confirmation
 */

import { useState } from 'preact/hooks';
import { route } from 'preact-router';
import { factoryReset } from '../../../services/auth';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export function FactoryResetPage() {
  const [confirmText, setConfirmText] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: SubmitEvent) => {
    e.preventDefault();

    if (confirmText !== 'RESET') {
      setError('Please type "RESET" to confirm');
      return;
    }

    if (!/^\d{4,8}$/.test(pin)) {
      setError('PIN must be 4-8 digits');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await factoryReset(pin);

      // Success - redirect to setup
      route('/admin/setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Factory reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-red-600 mb-6">Factory Reset</h1>

          {/* Warning */}
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h2 className="text-lg font-semibold text-red-900 mb-2">⚠️ Warning: This Cannot Be Undone</h2>
                <p className="text-sm text-red-800">
                  Factory reset will <strong>permanently delete</strong> all configuration data:
                </p>
                <ul className="text-sm text-red-800 mt-2 list-disc list-inside space-y-1">
                  <li>Location settings (latitude, longitude)</li>
                  <li>API keys (Tibber token)</li>
                  <li>Electricity grid fee</li>
                  <li>Photo slideshow URL and settings</li>
                  <li>Google Calendar credentials</li>
                  <li>Admin PIN</li>
                </ul>
                <p className="text-sm text-red-800 mt-3 font-medium">
                  You will need to complete the setup wizard again from scratch.
                </p>
              </div>
            </div>
          </div>

          {/* Alternative Options */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">Consider These Alternatives</h2>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>
                <strong>Forgot PIN?</strong> Use{' '}
                <a href="/admin/recovery" className="text-blue-600 hover:underline font-medium">
                  PIN recovery
                </a>{' '}
                to reset PIN without losing settings
              </li>
              <li>
                <strong>Change settings?</strong> Just update them in the{' '}
                <a href="/admin/settings" className="text-blue-600 hover:underline font-medium">
                  settings page
                </a>
              </li>
              <li>
                <strong>SSH access?</strong> Run <code className="bg-blue-100 px-1 rounded">sudo kiosk-admin reset-pin</code> to preserve settings
              </li>
            </ul>
          </div>

          {/* Confirmation Form */}
          <form onSubmit={handleReset} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-bold text-red-600">RESET</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText((e.target as HTMLInputElement).value)}
                placeholder="Type RESET (all caps)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
              <p className="text-sm text-gray-500 mt-1">Must be typed exactly as shown</p>
            </div>

            <Input
              label="Admin PIN"
              type="password"
              value={pin}
              onChange={setPin}
              placeholder="Enter your 4-8 digit PIN"
              pattern="[0-9]{4,8}"
              maxLength={8}
              required
              error={error || undefined}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                type="button"
                onClick={() => route('/admin/settings')}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                type="submit"
                disabled={loading || confirmText !== 'RESET'}
                className="flex-1"
              >
                {loading ? 'Resetting...' : 'Factory Reset'}
              </Button>
            </div>
          </form>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
            <p>
              Need help?{' '}
              <a href="/admin/recovery" className="text-blue-600 hover:underline">
                View recovery instructions
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
