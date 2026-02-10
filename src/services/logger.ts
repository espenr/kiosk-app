/**
 * Simple client-side console logger
 * No backend calls, just console output for development
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export enum LogSource {
  WIDGET = 'widget',
  APP = 'app',
  LAYOUT = 'layout',
  API = 'api',
  OTHER = 'other'
}

export interface LogContext {
  [key: string]: unknown;
}

/**
 * Simple console-only logger
 */
class ClientLogger {
  private isDevelopment = import.meta.env.DEV;

  error(message: string, source: LogSource = LogSource.APP, context?: LogContext, error?: Error) {
    if (this.isDevelopment) {
      console.error(`[${source.toUpperCase()}] ${message}`, context, error);
    }
  }

  warn(message: string, source: LogSource = LogSource.APP, context?: LogContext) {
    if (this.isDevelopment) {
      console.warn(`[${source.toUpperCase()}] ${message}`, context);
    }
  }

  info(message: string, source: LogSource = LogSource.APP, context?: LogContext) {
    if (this.isDevelopment) {
      console.info(`[${source.toUpperCase()}] ${message}`, context);
    }
  }

  debug(message: string, source: LogSource = LogSource.APP, context?: LogContext) {
    if (this.isDevelopment) {
      console.debug(`[${source.toUpperCase()}] ${message}`, context);
    }
  }
}

export const logger = new ClientLogger();
export default logger;