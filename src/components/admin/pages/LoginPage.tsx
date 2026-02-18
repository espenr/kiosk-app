/**
 * Login page - PIN authentication
 */

import { useState } from 'preact/hooks';
import { route } from 'preact-router';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export function LoginPage() {
  const { login } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();

    if (!/^\d{4,8}$/.test(pin)) {
      setError('PIN must be 4-8 digits');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(pin);
      route('/admin/settings');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);

      // Extract remaining attempts from error (if API returns it)
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin }),
          credentials: 'include',
        });
        const data = await response.json();
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        if (data.lockoutSeconds !== undefined) {
          setError(`Too many failed attempts. Locked out for ${data.lockoutSeconds}s`);
        }
      } catch {
        // Ignore
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6">Admin Login</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="PIN"
            type="password"
            value={pin}
            onChange={setPin}
            placeholder="Enter 4-8 digit PIN"
            pattern="[0-9]{4,8}"
            maxLength={8}
            required
            error={error || undefined}
          />

          {remainingAttempts !== null && remainingAttempts > 0 && (
            <p className="text-sm text-yellow-600">Remaining attempts: {remainingAttempts}</p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <a href="/" className="hover:text-blue-600">
            Back to Dashboard
          </a>
          <span className="mx-2">•</span>
          <a href="/admin/recovery" className="hover:text-blue-600">
            Recovery instructions
          </a>
        </div>
      </div>
    </div>
  );
}
