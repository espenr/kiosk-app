/**
 * Version-based localStorage cleanup
 * Ensures clean state when new version is deployed
 */

const VERSION_KEY = '__kiosk_app_version__';

/**
 * Check if app version changed and clear localStorage if needed
 * This ensures a clean start after deployments, preventing:
 * - Stale cached data
 * - Version migration bugs
 * - Schema mismatches
 * - Cached error states
 *
 * @returns Promise<boolean> - true if localStorage was cleared
 */
export async function checkVersionAndClearCache(): Promise<boolean> {
  try {
    // Fetch current deployed version from backend
    const response = await fetch('/api/version', {
      method: 'GET',
      cache: 'no-cache',
    });

    if (!response.ok) {
      console.warn('Failed to fetch version, skipping cache clear');
      return false;
    }

    const data = await response.json();
    const currentVersion = data.version;

    if (!currentVersion || currentVersion === 'unknown') {
      console.warn('Unknown version, skipping cache clear');
      return false;
    }

    // Get last loaded version from localStorage
    const lastVersion = localStorage.getItem(VERSION_KEY);

    // If version changed, clear localStorage
    if (lastVersion && lastVersion !== currentVersion) {
      console.log(
        `Version changed: ${lastVersion} → ${currentVersion}. Clearing localStorage for clean start.`
      );

      // Clear all localStorage
      localStorage.clear();

      // Store new version
      localStorage.setItem(VERSION_KEY, currentVersion);

      return true;
    }

    // First load or same version - just update/store version
    if (!lastVersion) {
      console.log(`First load. Storing version: ${currentVersion}`);
      localStorage.setItem(VERSION_KEY, currentVersion);
    }

    return false;
  } catch (error) {
    console.error('Version check failed:', error);
    return false;
  }
}
