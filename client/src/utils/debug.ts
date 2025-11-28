/**
 * Debug utilities for authentication and profile management
 */

interface DebugLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  category: string;
  message: string;
  data?: any;
}

class DebugLogger {
  private logs: DebugLog[] = [];
  private maxLogs = 100;

  log(level: DebugLog['level'], category: string, message: string, data?: any) {
    if (process.env.NODE_ENV !== 'development') {
      return; // Only log in development
    }

    const log: DebugLog = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    this.logs.unshift(log);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Console logging with color coding
    const colors = {
      info: '\x1b[36m', // Cyan
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';

    console.log(
      `${colors[level]}[${category}]${reset} ${message}`,
      data ? data : ''
    );
  }

  info(category: string, message: string, data?: any) {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: any) {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, data?: any) {
    this.log('error', category, message, data);
  }

  getLogs(): DebugLog[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

// Create singleton instances for different categories
export const debugAuth = new DebugLogger();
export const debugProfile = new DebugLogger();
export const debugTimezone = new DebugLogger();

// Convenience functions
export const logAuth = {
  info: (message: string, data?: any) => debugAuth.info('AUTH', message, data),
  warn: (message: string, data?: any) => debugAuth.warn('AUTH', message, data),
  error: (message: string, data?: any) => debugAuth.error('AUTH', message, data),
};

export const logProfile = {
  info: (message: string, data?: any) => debugProfile.info('PROFILE', message, data),
  warn: (message: string, data?: any) => debugProfile.warn('PROFILE', message, data),
  error: (message: string, data?: any) => debugProfile.error('PROFILE', message, data),
};

export const logTimezone = {
  info: (message: string, data?: any) => debugTimezone.info('TIMEZONE', message, data),
  warn: (message: string, data?: any) => debugTimezone.warn('TIMEZONE', message, data),
  error: (message: string, data?: any) => debugTimezone.error('TIMEZONE', message, data),
};
