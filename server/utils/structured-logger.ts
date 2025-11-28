import * as os from 'os';
// Enterprise Structured Logging System
// JSON-formatted logs with correlation IDs and comprehensive metadata

import { createWriteStream, WriteStream } from 'fs';
import { join } from 'path';

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  service: string;
  correlationId: string;
  userId?: number;
  operation: string;
  duration?: number;
  metadata: Record<string, any>;
  environment: 'development' | 'staging' | 'production';
  version?: string;
  hostname?: string;
  pid?: number;
}

interface MetricEntry {
  timestamp: string;
  name: string;
  value: number;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
  tags: Record<string, string>;
  service: string;
  environment: string;
}

class StructuredLogger {
  private static instance: StructuredLogger;
  private logStream?: WriteStream;
  private metricsStream?: WriteStream;
  private readonly environment: string;
  private readonly service: string;
  private readonly version: string;
  private readonly hostname: string;
  private readonly pid: number;
  private logBuffer: LogEntry[] = [];
  private metricsBuffer: MetricEntry[] = [];
  private readonly maxBufferSize = 100;
  private readonly flushInterval = 5000; // 5 seconds

  private constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.service = 'loma-platform';
    this.version = process.env.npm_package_version || '1.0.0';
    this.hostname = process.env.HOSTNAME || os.hostname();
    this.pid = process.pid;

    this.initializeStreams();
    this.startPeriodicFlush();
    this.setupGracefulShutdown();
  }

  static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
    }
    return StructuredLogger.instance;
  }

  private initializeStreams() {
    if (this.environment === 'production') {
      const logsDir = process.env.LOGS_DIR || './logs';
      this.logStream = createWriteStream(join(logsDir, 'application.log'), { flags: 'a' });
      this.metricsStream = createWriteStream(join(logsDir, 'metrics.log'), { flags: 'a' });
    }
  }

  private startPeriodicFlush() {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  private setupGracefulShutdown() {
    const shutdown = () => {
      this.flush();
      this.logStream?.end();
      this.metricsStream?.end();
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('exit', shutdown);
  }

  static generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static log(
    level: LogEntry['level'],
    operation: string,
    metadata: Record<string, any> = {},
    correlationId?: string,
    userId?: number,
    duration?: number
  ): void {
    const logger = StructuredLogger.getInstance();
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: logger.service,
      correlationId: correlationId || this.generateCorrelationId(),
      userId,
      operation,
      duration,
      metadata,
      environment: logger.environment,
      version: logger.version,
      hostname: logger.hostname,
      pid: logger.pid
    };

    logger.addLogEntry(entry);
  }

  static debug(operation: string, metadata: Record<string, any> = {}, correlationId?: string, userId?: number): void {
    this.log('debug', operation, metadata, correlationId, userId);
  }

  static info(operation: string, metadata: Record<string, any> = {}, correlationId?: string, userId?: number): void {
    this.log('info', operation, metadata, correlationId, userId);
  }

  static warn(operation: string, metadata: Record<string, any> = {}, correlationId?: string, userId?: number): void {
    this.log('warn', operation, metadata, correlationId, userId);
  }

  static error(operation: string, error: Error, metadata: Record<string, any> = {}, correlationId?: string, userId?: number): void {
    this.log('error', operation, {
      ...metadata,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    }, correlationId, userId);
  }

  static critical(operation: string, error: Error, metadata: Record<string, any> = {}, correlationId?: string, userId?: number): void {
    this.log('critical', operation, {
      ...metadata,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    }, correlationId, userId);

    // Immediately flush critical errors
    StructuredLogger.getInstance().flush();
  }

  static metric(
    name: string,
    value: number,
    type: MetricEntry['type'] = 'gauge',
    tags: Record<string, string> = {}
  ): void {
    const logger = StructuredLogger.getInstance();
    
    const entry: MetricEntry = {
      timestamp: new Date().toISOString(),
      name,
      value,
      type,
      tags,
      service: logger.service,
      environment: logger.environment
    };

    logger.addMetricEntry(entry);
  }

  static counter(name: string, value: number = 1, tags: Record<string, string> = {}): void {
    this.metric(name, value, 'counter', tags);
  }

  static gauge(name: string, value: number, tags: Record<string, string> = {}): void {
    this.metric(name, value, 'gauge', tags);
  }

  static timer(name: string, tags: Record<string, string> = {}): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.metric(name, duration, 'timer', tags);
      return duration;
    };
  }

  static histogram(name: string, value: number, tags: Record<string, string> = {}): void {
    this.metric(name, value, 'histogram', tags);
  }

  private addLogEntry(entry: LogEntry): void {
    // Output to console in development
    if (this.environment === 'development') {
      const colorMap = {
        debug: '\x1b[36m',    // Cyan
        info: '\x1b[32m',     // Green
        warn: '\x1b[33m',     // Yellow
        error: '\x1b[31m',    // Red
        critical: '\x1b[35m'  // Magenta
      };
      
      const color = colorMap[entry.level];
      const reset = '\x1b[0m';
      
      console.log(
        `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} ${entry.operation}`,
        entry.metadata
      );
    }

    this.logBuffer.push(entry);

    // Flush buffer if it gets too large
    if (this.logBuffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  private addMetricEntry(entry: MetricEntry): void {
    if (this.environment === 'development') {
      console.log(`[METRIC] ${entry.name}: ${entry.value} (${entry.type})`, entry.tags);
    }

    this.metricsBuffer.push(entry);

    // Flush metrics buffer if it gets too large
    if (this.metricsBuffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  private flush(): void {
    // Flush logs
    if (this.logBuffer.length > 0) {
      const logsToFlush = [...this.logBuffer];
      this.logBuffer = [];

      if (this.logStream) {
        logsToFlush.forEach(entry => {
          this.logStream!.write(JSON.stringify(entry) + '\n');
        });
      }

      // Send to external logging service in production
      if (this.environment === 'production') {
        this.sendToExternalService('logs', logsToFlush);
      }
    }

    // Flush metrics
    if (this.metricsBuffer.length > 0) {
      const metricsToFlush = [...this.metricsBuffer];
      this.metricsBuffer = [];

      if (this.metricsStream) {
        metricsToFlush.forEach(entry => {
          this.metricsStream!.write(JSON.stringify(entry) + '\n');
        });
      }

      // Send to external metrics service in production
      if (this.environment === 'production') {
        this.sendToExternalService('metrics', metricsToFlush);
      }
    }
  }

  private async sendToExternalService(type: 'logs' | 'metrics', data: any[]): Promise<void> {
    // In production, this would send to services like DataDog, New Relic, etc.
    // For now, we'll just ensure the data is properly formatted
    try {
      // Example: Send to external logging service
      // await fetch('https://logs.example.com/v1/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ [type]: data })
      // });
    } catch (error) {
      // Fallback: ensure we don't lose logs due to external service failures
      console.error(`Failed to send ${type} to external service:`, error);
    }
  }

  static getStats(): {
    logBufferSize: number;
    metricsBufferSize: number;
    environment: string;
    service: string;
    uptime: number;
  } {
    const logger = StructuredLogger.getInstance();
    
    return {
      logBufferSize: logger.logBuffer.length,
      metricsBufferSize: logger.metricsBuffer.length,
      environment: logger.environment,
      service: logger.service,
      uptime: process.uptime()
    };
  }

  static clearBuffers(): void {
    const logger = StructuredLogger.getInstance();
    logger.logBuffer = [];
    logger.metricsBuffer = [];
  }
}

// Express middleware for request logging
export function requestLoggingMiddleware(req: any, res: any, next: any) {
  const correlationId = StructuredLogger.generateCorrelationId();
  req.correlationId = correlationId;
  
  const startTime = Date.now();
  
  StructuredLogger.info('http_request_start', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id
  }, correlationId, req.user?.id);

  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    
    StructuredLogger.info('http_request_complete', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      contentLength: data?.length || 0,
      userId: req.user?.id
    }, correlationId, req.user?.id, duration);

    // Track metrics
    StructuredLogger.counter('http_requests_total', 1, {
      method: req.method,
      status: res.statusCode.toString()
    });

    StructuredLogger.histogram('http_request_duration_ms', duration, {
      method: req.method,
      status: res.statusCode.toString()
    });

    return originalSend.call(this, data);
  };

  next();
}

export { StructuredLogger };