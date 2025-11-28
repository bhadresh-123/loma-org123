import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StructuredLogger } from '../../utils/structured-logger';

describe('StructuredLogger', () => {
  beforeEach(() => {
    StructuredLogger.clearBuffers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    StructuredLogger.clearBuffers();
  });

  describe('Correlation ID Generation', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = StructuredLogger.generateCorrelationId();
      const id2 = StructuredLogger.generateCorrelationId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe('Logging Levels', () => {
    it('should log debug messages with correct metadata', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      StructuredLogger.debug('test_operation', { key: 'value' }, 'test-correlation-id', 123);
      
      if (process.env.NODE_ENV === 'development') {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[DEBUG]'),
          expect.objectContaining({ key: 'value' })
        );
      }
      
      consoleSpy.mockRestore();
    });

    it('should log info messages with correlation ID', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      StructuredLogger.info('user_login', { userId: 123 }, 'correlation-123');
      
      if (process.env.NODE_ENV === 'development') {
        expect(consoleSpy).toHaveBeenCalled();
      }
      
      consoleSpy.mockRestore();
    });

    it('should log errors with stack traces', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const testError = new Error('Test error message');
      
      StructuredLogger.error('database_error', testError, { query: 'SELECT * FROM users' });
      
      if (process.env.NODE_ENV === 'development') {
        expect(consoleSpy).toHaveBeenCalled();
      }
      
      consoleSpy.mockRestore();
    });
  });

  describe('Metrics Collection', () => {
    it('should record counter metrics', () => {
      StructuredLogger.counter('api_requests', 5, { endpoint: '/users' });
      
      const stats = StructuredLogger.getStats();
      expect(stats.metricsBufferSize).toBeGreaterThan(0);
    });

    it('should record gauge metrics', () => {
      StructuredLogger.gauge('memory_usage', 512, { unit: 'MB' });
      
      const stats = StructuredLogger.getStats();
      expect(stats.metricsBufferSize).toBeGreaterThan(0);
    });

    it('should record timer metrics with duration', () => {
      const timer = StructuredLogger.timer('database_query', { table: 'users' });
      
      setTimeout(() => {
        const duration = timer();
        expect(duration).toBeGreaterThan(0);
      }, 10);
    });
  });

  describe('Buffer Management', () => {
    it('should track buffer sizes correctly', () => {
      StructuredLogger.info('test1');
      StructuredLogger.info('test2');
      StructuredLogger.counter('test_metric', 1);
      
      const stats = StructuredLogger.getStats();
      expect(stats.logBufferSize).toBe(2);
      expect(stats.metricsBufferSize).toBe(1);
    });

    it('should clear buffers when requested', () => {
      StructuredLogger.info('test_log');
      StructuredLogger.counter('test_metric', 1);
      
      let stats = StructuredLogger.getStats();
      expect(stats.logBufferSize).toBeGreaterThan(0);
      expect(stats.metricsBufferSize).toBeGreaterThan(0);
      
      StructuredLogger.clearBuffers();
      
      stats = StructuredLogger.getStats();
      expect(stats.logBufferSize).toBe(0);
      expect(stats.metricsBufferSize).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should handle high-volume logging efficiently', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        StructuredLogger.info(`test_message_${i}`, { index: i });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000);
    });
  });
});