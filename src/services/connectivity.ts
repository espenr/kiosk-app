/**
 * Check internet connectivity by fetching a small, reliable resource
 * @returns Promise<boolean> - true if online, false if offline
 */
export async function checkConnectivity(): Promise<boolean> {
  try {
    // Try fetching a small, reliable resource with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return true; // If fetch succeeds, we're online
  } catch {
    // Fetch failed - check navigator.onLine as fallback
    return navigator.onLine;
  }
}
