/**
 * Global error recovery system
 * Catches errors outside React Error Boundary and triggers appropriate recovery
 */

interface ErrorLog {
  timestamp: number;
  message: string;
  stack?: string;
  type: 'script' | 'promise' | 'render';
}

const MAX_ERRORS_BEFORE_RELOAD = 5; // Reload if 5+ errors in 60 seconds
const ERROR_WINDOW_MS = 60000; // 60 seconds
const errorLog: ErrorLog[] = [];

/**
 * Log error and check if we should trigger reload
 */
function logError(message: string, stack: string | undefined, type: ErrorLog['type']) {
  const now = Date.now();

  errorLog.push({ timestamp: now, message, stack, type });

  // Clean up old errors outside window
  const cutoff = now - ERROR_WINDOW_MS;
  const recentErrors = errorLog.filter((e) => e.timestamp > cutoff);
  errorLog.length = 0;
  errorLog.push(...recentErrors);

  console.error(`[ErrorRecovery] ${type} error:`, message);
  if (stack) console.error(stack);

  // If too many errors in short time, reload page
  if (recentErrors.length >= MAX_ERRORS_BEFORE_RELOAD) {
    console.error(
      `[ErrorRecovery] ${recentErrors.length} errors in ${ERROR_WINDOW_MS / 1000}s, reloading...`
    );
    setTimeout(() => window.location.reload(), 2000);
  }
}

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandlers() {
  // Catch unhandled script errors
  window.onerror = (message, _source, _lineno, _colno, error) => {
    logError(
      typeof message === 'string' ? message : 'Unknown error',
      error?.stack,
      'script'
    );
    return false;
  };

  // Catch unhandled promise rejections
  window.onunhandledrejection = (event) => {
    const message = event.reason instanceof Error
      ? event.reason.message
      : String(event.reason);
    const stack = event.reason instanceof Error ? event.reason.stack : undefined;

    logError(message, stack, 'promise');
    event.preventDefault();
  };

  console.log('[ErrorRecovery] Global error handlers initialized');
}
