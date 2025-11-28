import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { HealthMonitor } from '../../utils/health-monitor';
import healthRoutes from '../../routes/health';

describe('Health Monitor Integration Tests', () => {
  let app: express.Application;
  let healthMonitor: HealthMonitor;

  beforeEach(() => {
    app = express();
    app.use('/health', healthRoutes);
    healthMonitor = HealthMonitor.getInstance();
    healthMonitor.clearCache();
  });

  afterEach(async () => {
    await healthMonitor.stop();
  });

  describe('Basic Health Check', () => {
    it('should return 200 for basic health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        service: 'loma-platform'
      });
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeGreaterThan(0);
    });
  });

  describe('Readiness Check', () => {
    it('should return 200 when system is ready', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ready'
      });
      expect(response.body.checks).toBeDefined();
      expect(response.body.checks.database).toBeDefined();
      expect(response.body.checks.memory).toBeDefined();
    });

    it('should return 503 when database is unhealthy', async () => {
      // Mock database failure
      healthMonitor.registerCheck('database', async () => ({
        name: 'database',
        status: 'unhealthy',
        responseTime: 1000,
        lastChecked: new Date().toISOString(),
        error: 'Connection failed'
      }));

      const response = await request(app)
        .get('/health/ready')
        .expect(503);

      expect(response.body.status).toBe('not_ready');
    });
  });

  describe('Detailed Health Check', () => {
    it('should return comprehensive health status', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toMatchObject({
        status: expect.any(String),
        checks: expect.any(Array),
        uptime: expect.any(Number),
        version: expect.any(String),
        timestamp: expect.any(String),
        environment: expect.any(String)
      });

      expect(response.body.checks.length).toBeGreaterThan(0);
      
      // Verify each check has required properties
      response.body.checks.forEach((check: any) => {
        expect(check).toMatchObject({
          name: expect.any(String),
          status: expect.stringMatching(/^(healthy|unhealthy|degraded)$/),
          responseTime: expect.any(Number),
          lastChecked: expect.any(String)
        });
      });
    });

    it('should return 503 when system is unhealthy', async () => {
      // Mock multiple failures
      healthMonitor.registerCheck('database', async () => ({
        name: 'database',
        status: 'unhealthy',
        responseTime: 1000,
        lastChecked: new Date().toISOString(),
        error: 'Connection timeout'
      }));

      healthMonitor.registerCheck('memory', async () => ({
        name: 'memory',
        status: 'unhealthy',
        responseTime: 100,
        lastChecked: new Date().toISOString(),
        error: 'Out of memory'
      }));

      const response = await request(app)
        .get('/health/detailed')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
    });
  });

  describe('Metrics Endpoint', () => {
    it('should return Prometheus-compatible metrics', async () => {
      const response = await request(app)
        .get('/health/metrics')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
      expect(response.text).toContain('system_health_checks_total');
      expect(response.text).toContain('system_uptime_seconds');
      expect(response.text).toContain('nodejs_memory_usage_bytes');
    });

    it('should include custom metrics', async () => {
      const response = await request(app)
        .get('/health/metrics')
        .expect(200);

      expect(response.text).toContain('logger_buffer_size');
      expect(response.text).toContain('health_check_response_time_ms');
    });
  });

  describe('Individual Health Checks', () => {
    it('should return specific health check status', async () => {
      const response = await request(app)
        .get('/health/check/database')
        .expect(200);

      expect(response.body).toMatchObject({
        name: 'database',
        status: expect.stringMatching(/^(healthy|unhealthy|degraded)$/),
        responseTime: expect.any(Number),
        lastChecked: expect.any(String)
      });
    });

    it('should return 404 for non-existent check', async () => {
      const response = await request(app)
        .get('/health/check/nonexistent')
        .expect(404);

      expect(response.body.error).toContain('not found');
      expect(response.body.availableChecks).toContain('database');
    });

    it('should return 503 for unhealthy check', async () => {
      // Mock unhealthy check
      healthMonitor.registerCheck('test_check', async () => ({
        name: 'test_check',
        status: 'unhealthy',
        responseTime: 500,
        lastChecked: new Date().toISOString(),
        error: 'Test failure'
      }));

      const response = await request(app)
        .get('/health/check/test_check')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
    });
  });

  describe('Cache Management', () => {
    it('should clear health check cache', async () => {
      // First, populate cache
      await request(app).get('/health/detailed');

      // Clear cache
      const response = await request(app)
        .post('/health/cache/clear')
        .expect(200);

      expect(response.body.message).toContain('cleared');
    });
  });

  describe('Performance Testing', () => {
    it('should handle concurrent health checks efficiently', async () => {
      const promises = Array.from({ length: 10 }, () => 
        request(app).get('/health')
      );

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should cache health check results', async () => {
      // First request - should hit the actual check
      const response1 = await request(app).get('/health/detailed');
      const time1 = Date.now();

      // Second request - should use cache
      const response2 = await request(app).get('/health/detailed');
      const time2 = Date.now();

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      
      // Second request should be faster (cached)
      expect(time2 - time1).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database connection failure
      healthMonitor.registerCheck('database', async () => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/health/check/database')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.error).toContain('Database connection failed');
    });

    it('should handle memory check errors', async () => {
      // Mock memory check failure
      healthMonitor.registerCheck('memory', async () => {
        throw new Error('Memory check failed');
      });

      const response = await request(app)
        .get('/health/check/memory')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
    });

    it('should handle external service failures', async () => {
      // Mock external service check
      healthMonitor.registerCheck('external_service', async () => ({
        name: 'external_service',
        status: 'degraded',
        responseTime: 2000,
        lastChecked: new Date().toISOString(),
        details: {
          service: 'email',
          status: 'timeout'
        }
      }));

      const response = await request(app)
        .get('/health/check/external_service')
        .expect(200);

      expect(response.body.status).toBe('degraded');
    });
  });

  describe('Real-time Monitoring', () => {
    it('should detect system degradation', async () => {
      // Mock high memory usage
      healthMonitor.registerCheck('memory', async () => ({
        name: 'memory',
        status: 'degraded',
        responseTime: 100,
        lastChecked: new Date().toISOString(),
        details: {
          systemMemoryUsage: 85,
          heapUsed: 400,
          heapTotal: 500
        }
      }));

      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body.status).toBe('degraded');
    });

    it('should provide actionable health insights', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      // Verify health insights are actionable
      response.body.checks.forEach((check: any) => {
        if (check.details) {
          expect(check.details).toBeTypeOf('object');
        }
        
        if (check.status !== 'healthy') {
          expect(check.error || check.details).toBeDefined();
        }
      });
    });
  });
});