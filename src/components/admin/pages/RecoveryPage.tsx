/**
 * Recovery page - SSH instructions for PIN reset
 */

import { route } from 'preact-router';
import { Button } from '../components/Button';

export function RecoveryPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">PIN Recovery</h1>

          <div className="prose max-w-none">
            <p className="text-gray-600 mb-6">
              If you've forgotten your PIN, you can reset it using SSH access to the Raspberry Pi.
              This will preserve your settings but generate a new setup code.
            </p>

            {/* SSH Access Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-900">Step 1: SSH into the Pi</h2>
              <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm overflow-x-auto">
                <code>ssh pi@[kiosk-ip-address]</code>
              </div>
              <p className="text-sm text-blue-800 mt-2">
                Replace [kiosk-ip-address] with your Raspberry Pi's IP address (e.g., 192.168.50.37)
              </p>
            </div>

            {/* Reset PIN Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-900">Step 2: Reset PIN</h2>

              {/* First check if kiosk-admin is installed */}
              <p className="text-sm text-blue-800 mb-3">
                First, check if the <code className="bg-blue-100 px-1 rounded">kiosk-admin</code> command is
                installed:
              </p>
              <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm overflow-x-auto mb-3">
                <code>which kiosk-admin</code>
              </div>

              {/* If installed */}
              <p className="text-sm text-blue-800 mb-2 font-semibold">
                If installed (shows /usr/local/bin/kiosk-admin):
              </p>
              <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm overflow-x-auto mb-4">
                <code>sudo kiosk-admin reset-pin</code>
              </div>

              {/* If NOT installed */}
              <p className="text-sm text-blue-800 mb-2 font-semibold">If NOT installed (no output):</p>
              <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm overflow-x-auto mb-2">
                <code>
                  sudo bash /var/www/kiosk/scripts/kiosk-admin reset-pin
                </code>
              </div>
              <p className="text-xs text-blue-700 mb-3">
                Or install it first: <code className="bg-blue-100 px-1 rounded">sudo bash
                /var/www/kiosk/scripts/setup-admin.sh</code>
              </p>

              <p className="text-sm text-blue-800 mt-4">This will:</p>
              <ul className="text-sm text-blue-800 mt-2 list-disc list-inside space-y-1">
                <li>Delete the PIN (auth.json)</li>
                <li>Preserve your settings (config.enc.json)</li>
                <li>Generate a new 6-character setup code</li>
                <li>Restart the backend server</li>
              </ul>
            </div>

            {/* Complete Setup Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-900">Step 3: Complete Setup</h2>
              <p className="text-sm text-blue-800 mb-3">
                After running the reset command, you'll see a new setup code on the terminal:
              </p>
              <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm">
                <code>
                  Setup code: ABC123
                  <br />
                  Code expires in 15 minutes
                  <br />
                  Visit http://[kiosk-ip]/admin to continue
                </code>
              </div>
              <p className="text-sm text-blue-800 mt-3">
                Visit <strong>/admin/setup/wizard</strong> on your phone or laptop and enter the code to create a new
                PIN. Your settings will remain unchanged.
              </p>
            </div>

            {/* Alternative Section */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-yellow-900">Alternative: Factory Reset</h2>
              <p className="text-sm text-yellow-800 mb-3">
                If you want to delete ALL data (settings + PIN) and start fresh:
              </p>
              <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm overflow-x-auto mb-2">
                <code>sudo kiosk-admin factory-reset</code>
              </div>
              <p className="text-xs text-yellow-700 mb-3">
                Or if not installed: <code className="bg-yellow-100 px-1 rounded">sudo bash
                /var/www/kiosk/scripts/kiosk-admin factory-reset</code>
              </p>
              <p className="text-sm text-yellow-800 mt-3">
                ⚠️ This will erase all configuration including API keys, location, and calendar settings.
              </p>
            </div>

            {/* Check Status Section */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Check Status</h2>
              <p className="text-sm text-gray-600 mb-3">View current setup state and data files:</p>
              <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm overflow-x-auto mb-2">
                <code>kiosk-admin status</code>
              </div>
              <p className="text-xs text-gray-500">
                Or if not installed: <code className="bg-gray-200 px-1 rounded">bash
                /var/www/kiosk/scripts/kiosk-admin status</code>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex gap-3 justify-between">
            <Button variant="secondary" onClick={() => route('/admin/login')}>
              Back to Login
            </Button>
            <Button onClick={() => route('/')}>Go to Dashboard</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
