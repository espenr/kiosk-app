/**
 * Setup wizard for first-time configuration
 * Multi-step form accessed from mobile/laptop
 */

import { useState } from 'preact/hooks';
import { route } from 'preact-router';
import { completeSetup } from '../../../services/auth';
import { useConfig } from '../../../contexts/ConfigContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

type Step = 'code' | 'pin' | 'config';

interface WizardState {
  code: string;
  pin: string;
  pinConfirm: string;
  latitude: string;
  longitude: string;
  gridFee: string;
}

export function SetupWizard() {
  const { syncWithServer } = useConfig();
  const [step, setStep] = useState<Step>('code');
  const [state, setState] = useState<WizardState>({
    code: '',
    pin: '',
    pinConfirm: '',
    latitude: '63.4325',
    longitude: '10.6379',
    gridFee: '0.36',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const updateState = (field: keyof WizardState, value: string) => {
    setState((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateCode = () => {
    if (!/^[A-Z0-9]{6}$/.test(state.code)) {
      setError('Code must be 6 characters (letters and numbers)');
      return false;
    }
    return true;
  };

  const validatePin = () => {
    if (!/^\d{4,8}$/.test(state.pin)) {
      setError('PIN must be 4-8 digits');
      return false;
    }
    if (state.pin !== state.pinConfirm) {
      setError('PINs do not match');
      return false;
    }
    return true;
  };

  const validateConfig = () => {
    const lat = parseFloat(state.latitude);
    const lon = parseFloat(state.longitude);
    const fee = parseFloat(state.gridFee);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Invalid latitude (must be between -90 and 90)');
      return false;
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      setError('Invalid longitude (must be between -180 and 180)');
      return false;
    }
    if (isNaN(fee) || fee < 0) {
      setError('Invalid grid fee (must be a positive number)');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError(null);

    if (step === 'code') {
      if (validateCode()) {
        setStep('pin');
      }
    } else if (step === 'pin') {
      if (validatePin()) {
        setStep('config');
      }
    }
  };

  const handleBack = () => {
    setError(null);
    if (step === 'pin') {
      setStep('code');
    } else if (step === 'config') {
      setStep('pin');
    }
  };

  const handleSubmit = async () => {
    if (!validateConfig()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await completeSetup({
        code: state.code,
        pin: state.pin,
        config: {
          location: {
            latitude: parseFloat(state.latitude),
            longitude: parseFloat(state.longitude),
            stopPlaceIds: [],
          },
          apiKeys: {
            tibber: '',
          },
          electricity: {
            gridFee: parseFloat(state.gridFee),
          },
          photos: {
            sharedAlbumUrl: '',
            interval: 30,
          },
          calendar: {
            calendars: [],
          },
        },
      });

      // Sync config with ConfigContext
      await syncWithServer();

      // Success - redirect to settings
      route('/admin/settings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 'code', label: 'Code' },
    { id: 'pin', label: 'PIN' },
    { id: 'config', label: 'Config' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            {steps.map((s, index) => (
              <div key={s.id} className="flex items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index <= currentStepIndex
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      index < currentStepIndex ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            {steps.map((s) => (
              <div key={s.id} className="flex-1 text-center">
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-6">Setup Kiosk</h1>

          {/* Step 1: Code */}
          {step === 'code' && (
            <div className="space-y-6">
              <p className="text-gray-600">
                Enter the 6-character code displayed on the TV screen.
              </p>

              <Input
                label="Setup Code"
                value={state.code}
                onChange={(v) => updateState('code', v.toUpperCase())}
                placeholder="ABC123"
                pattern="[A-Z0-9]{6}"
                maxLength={6}
                required
                error={error || undefined}
              />

              <div className="flex justify-end">
                <Button onClick={handleNext}>Next</Button>
              </div>
            </div>
          )}

          {/* Step 2: PIN */}
          {step === 'pin' && (
            <div className="space-y-6">
              <p className="text-gray-600">
                Create a 4-8 digit PIN for admin access. You'll use this PIN to log in and make
                changes to the kiosk settings.
              </p>

              <Input
                label="PIN"
                type="password"
                value={state.pin}
                onChange={(v) => updateState('pin', v)}
                placeholder="Enter 4-8 digits"
                pattern="[0-9]{4,8}"
                maxLength={8}
                required
                error={error || undefined}
              />

              <Input
                label="Confirm PIN"
                type="password"
                value={state.pinConfirm}
                onChange={(v) => updateState('pinConfirm', v)}
                placeholder="Re-enter PIN"
                pattern="[0-9]{4,8}"
                maxLength={8}
                required
              />

              <div className="flex gap-3 justify-between">
                <Button variant="secondary" onClick={handleBack}>
                  Back
                </Button>
                <Button onClick={handleNext}>Next</Button>
              </div>
            </div>
          )}

          {/* Step 3: Config */}
          {step === 'config' && (
            <div className="space-y-6">
              <p className="text-gray-600">
                Enter your location and electricity grid fee. You can configure additional settings
                (API keys, calendar, etc.) after setup is complete.
              </p>

              <Input
                label="Latitude"
                type="number"
                value={state.latitude}
                onChange={(v) => updateState('latitude', v)}
                placeholder="63.4325"
                required
                error={error && error.includes('latitude') ? error : undefined}
              />

              <Input
                label="Longitude"
                type="number"
                value={state.longitude}
                onChange={(v) => updateState('longitude', v)}
                placeholder="10.6379"
                required
                error={error && error.includes('longitude') ? error : undefined}
              />

              <Input
                label="Grid Fee (kr/kWh)"
                type="number"
                value={state.gridFee}
                onChange={(v) => updateState('gridFee', v)}
                placeholder="0.36"
                required
                error={error && error.includes('grid fee') ? error : undefined}
              />

              <p className="text-sm text-gray-500">
                Default location is Trondheim (Planetringen). Default grid fee is 0.36 kr/kWh
                (typical for Tensio/Trondheim).
              </p>

              {error && !error.includes('latitude') && !error.includes('longitude') && !error.includes('grid fee') && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-3 justify-between">
                <Button variant="secondary" onClick={handleBack} disabled={loading}>
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Completing Setup...' : 'Complete Setup'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Need help? The code expires in 15 minutes.</p>
          <p className="mt-1">You can generate a new code from the TV screen.</p>
        </div>
      </div>
    </div>
  );
}
