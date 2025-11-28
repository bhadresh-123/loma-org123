// Centralized Logging System for Profile Components
// Provides structured logging, analytics tracking, and performance monitoring

interface LogLevel {
  DEBUG: 'debug';
  INFO: 'info';
  WARN: 'warn';
  ERROR: 'error';
  METRIC: 'metric';
}

interface BaseLogContext {
  timestamp: string;
  userId?: number;
  sessionId: string;
  userAgent: string;
  url?: string;
}

interface UserActionContext extends BaseLogContext {
  section: string;
  previousSection?: string;
  correlationId?: string;
  retryCount?: number;
}

interface ErrorContext extends BaseLogContext {
  error: string;
  stack?: string;
  componentStack?: string;
  correlationId: string;
  retryCount?: number;
}

interface PerformanceContext extends BaseLogContext {
  section: string;
  action: string;
  duration?: number;
  memoryUsage?: number;
}

interface ValidationContext extends BaseLogContext {
  section: string;
  field: string;
  validationError: string;
  inputValue?: any;
}

export class ProfileLogger {
  private static logLevel: keyof LogLevel = 'INFO';
  private static logBuffer: unknown[] = [];
  private static maxBufferSize = 100;
  private static flushInterval = 30000; // 30 seconds

  static {
    // Auto-flush logs periodically
    setInterval(() => {
      this.flushLogs();
    }, this.flushInterval);

    // Flush logs before page unload
    window.addEventListener('beforeunload', () => {
      this.flushLogs();
    });
  }

  /**
   * Set logging level for filtering
   */
  static setLogLevel(level: keyof LogLevel) {
    this.logLevel = level;
  }

  /**
   * Generate correlation ID for tracking related events
   */
  static generateCorrelationId(): string {
    return `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log user actions for analytics and debugging
   */
  static logUserAction(action: string, context: UserActionContext) {
    const logEntry = {
      level: 'info',
      type: 'user_action',
      action,
      ...context,
      performance: this.getPerformanceMetrics()
    };

    this.addToBuffer(logEntry);
    
    if (this.shouldLog('INFO')) {
      console.log(`[Profile] User Action: ${action}`, context);
    }
  }

  /**
   * Log errors with comprehensive context
   */
  static logError(errorType: string, context: ErrorContext) {
    const logEntry = {
      level: 'error',
      type: 'error',
      errorType,
      ...context,
      performance: this.getPerformanceMetrics()
    };

    this.addToBuffer(logEntry);
    
    if (this.shouldLog('ERROR')) {
      console.error(`[Profile] Error: ${errorType}`, context);
    }

    // Send critical errors immediately
    if (errorType.includes('boundary') || errorType.includes('critical')) {
      this.flushLogs();
    }
  }

  /**
   * Log performance metrics
   */
  static logPerformance(metric: string, context: PerformanceContext) {
    const logEntry = {
      level: 'metric',
      type: 'performance',
      metric,
      ...context,
      performance: this.getPerformanceMetrics()
    };

    this.addToBuffer(logEntry);
    
    if (this.shouldLog('INFO')) {
      console.log(`[Profile] Performance: ${metric}`, context);
    }
  }

  /**
   * Log validation errors
   */
  static logValidationError(context: ValidationContext) {
    const logEntry = {
      level: 'warn',
      type: 'validation',
      ...context,
      performance: this.getPerformanceMetrics()
    };

    this.addToBuffer(logEntry);
    
    if (this.shouldLog('WARN')) {
      console.warn(`[Profile] Validation Error: ${context.section}.${context.field}`, context);
    }
  }

  /**
   * Log API calls and responses
   */
  static logApiCall(endpoint: string, method: string, context: BaseLogContext & {
    requestData?: any;
    responseStatus?: number;
    responseTime?: number;
    correlationId?: string;
  }) {
    const logEntry = {
      level: 'info',
      type: 'api_call',
      endpoint,
      method,
      ...context,
      performance: this.getPerformanceMetrics()
    };

    this.addToBuffer(logEntry);
    
    if (this.shouldLog('INFO')) {
      console.log(`[Profile] API Call: ${method} ${endpoint}`, context);
    }
  }

  /**
   * Log form interactions for UX optimization
   */
  static logFormInteraction(interactionType: string, context: BaseLogContext & {
    section: string;
    field: string;
    value?: any;
    validationPassed?: boolean;
  }) {
    const logEntry = {
      level: 'debug',
      type: 'form_interaction',
      interactionType,
      ...context,
      performance: this.getPerformanceMetrics()
    };

    this.addToBuffer(logEntry);
    
    if (this.shouldLog('DEBUG')) {
      console.debug(`[Profile] Form Interaction: ${interactionType}`, context);
    }
  }

  /**
   * Get current performance metrics
   */
  private static getPerformanceMetrics() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
      memoryUsage: (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : undefined,
      timing: {
        loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
        domReady: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
        renderTime: Date.now() - performance.timeOrigin
      }
    };
  }

  /**
   * Check if we should log at this level
   */
  private static shouldLog(level: keyof LogLevel): boolean {
    const levels: Record<keyof LogLevel, number> = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
      METRIC: 1
    };

    return levels[level] >= levels[this.logLevel];
  }

  /**
   * Add log entry to buffer
   */
  private static addToBuffer(logEntry: any) {
    this.logBuffer.push(logEntry);
    
    // Prevent buffer overflow
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxBufferSize * 0.8);
    }
  }

  /**
   * Flush logs to server
   */
  private static async flushLogs() {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      // Send logs to server endpoint
      await fetch('/api/logs/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          logs: logsToFlush,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });
    } catch (error) {
      // If logging fails, store in localStorage as fallback
      try {
        const existingLogs = JSON.parse(localStorage.getItem('profile_logs') || '[]');
        const updatedLogs = [...existingLogs, ...logsToFlush].slice(-50); // Keep last 50 logs
        localStorage.setItem('profile_logs', JSON.stringify(updatedLogs));
      } catch (storageError) {
        console.warn('Failed to store logs in localStorage:', storageError);
      }
    }
  }

  /**
   * Get stored logs for debugging
   */
  static getStoredLogs(): unknown[] {
    try {
      return JSON.parse(localStorage.getItem('profile_logs') || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Clear stored logs
   */
  static clearStoredLogs() {
    localStorage.removeItem('profile_logs');
    this.logBuffer = [];
  }

  /**
   * Start performance timing
   */
  static startTiming(label: string): () => number {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.logPerformance(`timing_${label}`, {
        section: 'performance',
        action: label,
        duration,
        timestamp: new Date().toISOString(),
        sessionId: 'timing-session',
        userAgent: navigator.userAgent
      });
      return duration;
    };
  }

  /**
   * Track memory usage
   */
  static trackMemory(label: string) {
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      this.logPerformance(`memory_${label}`, {
        section: 'memory',
        action: label,
        memoryUsage: memory.usedJSHeapSize,
        timestamp: new Date().toISOString(),
        sessionId: 'memory-session',
        userAgent: navigator.userAgent
      });
    }
  }
}