import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { Button } from '../components/Button';

export function CalendarCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status');
    const errorParam = params.get('error');

    if (statusParam === 'error') {
      setStatus('error');
      setErrorMessage(errorParam || 'OAuth failed');
    } else if (statusParam === 'success') {
      setStatus('success');
    }
  }, []);

  const handleContinue = () => {
    if (status === 'success') {
      route('/admin/settings?oauth_success=true');
    } else {
      route('/admin/settings');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        {status === 'loading' && (
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 mt-4">Processing authorization...</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">Success!</h2>
              <p className="text-gray-600">Your Google Calendar has been connected.</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Next:</strong> Click "Continue", then "Save Changes" and enter your PIN to persist the connection.
              </p>
            </div>
            <Button onClick={handleContinue} className="w-full">
              Continue to Settings
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-red-600 mb-2">Authorization Failed</h2>
              <p className="text-gray-600">{errorMessage}</p>
            </div>
            <Button onClick={handleContinue} variant="secondary" className="w-full">
              Return to Settings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
