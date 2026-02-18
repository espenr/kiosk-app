/**
 * Setup page - displays first-time setup code on TV
 */

import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { getAuthStatus, initSetup } from '../../../services/auth';
import { Button } from '../components/Button';

export function SetupPage() {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if setup code already exists
  useEffect(() => {
    const checkExistingCode = async () => {
      try {
        const status = await getAuthStatus();
        if (status.firstTimeCode && !status.codeExpired) {
          setCode(status.firstTimeCode);
          if (status.firstTimeCode) {
            setExpiresAt(Date.now() + 15 * 60 * 1000); // Assume 15 min from now if not expired
          }
        }
      } catch (err) {
        console.error('Failed to check auth status:', err);
      } finally {
        setChecking(false);
      }
    };

    checkExistingCode();
  }, []);

  const handleStartSetup = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await initSetup();
      setCode(response.firstTimeCode);
      setExpiresAt(Date.now() + response.expiresIn * 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start setup');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToWizard = () => {
    route('/admin/setup/wizard');
  };

  // Countdown timer
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Checking setup status...</p>
        </div>
      </div>
    );
  }

  if (code) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8">Setup Code</h1>
          <div className="text-9xl font-mono font-bold tracking-widest mb-8">{code}</div>
          <p className="text-2xl mb-4">Enter this code on your phone or laptop</p>
          <p className="text-xl text-gray-400">
            {timeRemaining !== null ? `Expires in ${timeRemaining}s` : ''}
          </p>
          <div className="mt-8 flex flex-col gap-4 items-center">
            <Button onClick={handleGoToWizard} className="bg-blue-600 hover:bg-blue-700">
              I Have This Code - Continue Setup
            </Button>
            {timeRemaining === 0 && (
              <Button variant="secondary" onClick={handleStartSetup}>
                Generate New Code
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6">First-Time Setup</h1>
        <p className="text-gray-600 mb-6">
          Click the button below to generate a setup code. This code will be displayed on the TV screen and should be
          entered from your phone or laptop to complete the setup.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">{error}</div>
        )}

        <div className="space-y-3">
          <Button onClick={handleStartSetup} disabled={loading} className="w-full">
            {loading ? 'Generating...' : 'Start Setup (TV Display)'}
          </Button>

          <div className="text-center text-gray-500 text-sm">or</div>

          <Button variant="secondary" onClick={handleGoToWizard} className="w-full">
            I Have a Code - Enter Setup Code
          </Button>
        </div>
      </div>
    </div>
  );
}
