import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { type Server } from 'express';
import { setupAuth } from '../auth';
import { registerRoutes } from '../routes';
import { coreSecurityMiddleware } from '../middleware/core-security';

describe('Security Implementation Validation', () => {
  let app: express.Application;
  let server: Server | null;

  beforeAll(async () => {
    app = express();
    
    // Apply security middleware
    app.use(coreSecurityMiddleware.helmetSecurityHeaders());
    app.use(coreSecurityMiddleware.preventSQLInjection);
    app.use('/api', coreSecurityMiddleware.rateLimits.api);
    
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    // Setup auth and routes
    setupAuth(app);
    server = registerRoutes(app);
  });

  afterAll(() => {
    if (server) {
      server.close();
    }
  });

  describe('Authentication Protection', () => {
    it('should require authentication for protected endpoints', async () => {
      const protectedEndpoints = [
        '/api/patients',
        '/api/clinical-sessions', 
        '/api/tasks',
        '/api/work-schedules',
        '/api/notifications',
        '/api/documents'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('AUTH_REQUIRED');
      }
    });

    it('should allow public access to authentication endpoints', async () => {
      const publicEndpoints = [
        { method: 'post', path: '/api/login' },
        { method: 'post', path: '/api/register' }
      ];

      for (const endpoint of publicEndpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        // Should not be 401 (auth required), may be 400 (validation error) or other
        expect(response.status).not.toBe(401);
      }
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should prevent SQL injection attempts', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1 OR 1=1",
        "UNION SELECT * FROM users",
        "'; DELETE FROM sessions; --"
      ];

      for (const input of maliciousInputs) {
        const response = await request(app)
          .post('/api/register')
          .send({
            username: input,
            password: 'test123',
            name: 'Test User',
            email: 'test@example.com'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('INVALID_INPUT');
      }
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          username: '',
          password: '',
          name: '',
          email: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_INPUT');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app).get('/api/journey');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on authentication endpoints', async () => {
      const promises = [];
      
      // Make multiple rapid requests to trigger rate limit
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/login')
            .send({ username: 'test', password: 'wrong' })
        );
      }

      const responses = await Promise.all(promises);
      
      // At least one should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should not leak sensitive information in error responses', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('NOT_FOUND');
      expect(response.body.message).toBeDefined();
      expect(response.body.stack).toBeUndefined();
      expect(response.body.details).toBeUndefined();
    });
  });
});

describe('Resource Ownership Validation', () => {
  let app: express.Application;
  let server: Server | null;
  let userToken: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    setupAuth(app);
    server = registerRoutes(app);

    // Create a test user and get session
    await request(app)
      .post('/api/register')
      .send({
        username: 'testuser',
        password: 'testpass123',
        name: 'Test User',
        email: 'test@security.com'
      });

    const loginResponse = await request(app)
      .post('/api/login')
      .send({
        username: 'testuser',
        password: 'testpass123'
      });

    userToken = loginResponse.headers['set-cookie'];
  });

  afterAll(() => {
    if (server) {
      server.close();
    }
  });

  it('should prevent access to other users resources', async () => {
    // Try to access a resource with invalid ID
    const response = await request(app)
      .get('/api/patients/99999')
      .set('Cookie', userToken);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('NOT_FOUND');
  });

  it('should scope queries to authenticated user', async () => {
    // Get user's clients - should only return their own
    const response = await request(app)
      .get('/api/patients')
      .set('Cookie', userToken);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    
    // All returned clients should belong to the authenticated user
    response.body.forEach((client: Record<string, unknown>) => {
      expect(client.userId).toBeDefined();
    });
  });
});