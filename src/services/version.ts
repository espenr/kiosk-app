/**
 * Check current deployed version from backend
 * @returns Promise<string> - version identifier
 */
export async function checkVersion(): Promise<string> {
  try {
    const response = await fetch('/api/version', {
      method: 'GET',
      cache: 'no-cache',
    });

    if (!response.ok) {
      throw new Error(`Version check failed: ${response.status}`);
    }

    const data = await response.json();
    return data.version || 'unknown';
  } catch (error) {
    console.error('Failed to check version:', error);
    return 'unknown';
  }
}
