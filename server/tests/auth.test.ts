import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { type Express } from 'express';
import { setupTestServer } from './utils/test-server';

describe('Authentication Security Tests', () => {
  const testServer = setupTestServer();
  let app: Express;
  let testServerUrl: string;
  let cookieJar: string[] = [];

  beforeAll(async () => {
    const server = await testServer;
    app = await server.initialize();
    testServerUrl = server.url;
  });

  afterAll(async () => {
    const server = await testServer;
    await server.cleanup();
  });

  // Helper function to manage cookies
  const makeFetchWithCookies = async (url: string, options: RequestInit = {}) => {
    // Add stored cookies to request
    if (cookieJar.length > 0) {
      options.headers = {
        ...options.headers,
        'Cookie': cookieJar.join('; ')
      };
    }

    const response = await fetch(url, {
      ...options,
      credentials: 'include'
    });

    // Store new cookies
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      cookieJar = [...cookieJar, setCookie];
    }

    return response;
  };

  // Clear cookies between tests
  beforeEach(() => {
    cookieJar = [];
  });

  describe('Login Security', () => {
    it('should successfully log in with valid credentials', async () => {
      const response = await makeFetchWithCookies(`${testServerUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'testpass'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('username', 'testuser');
    });

    it('should maintain session after successful login', async () => {
      // First login
      await makeFetchWithCookies(`${testServerUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'testpass'
        })
      });

      // Then check session
      const userResponse = await makeFetchWithCookies(`${testServerUrl}/api/user`);

      expect(userResponse.status).toBe(200);
      const userData = await userResponse.json();
      expect(userData).toHaveProperty('username', 'testuser');
    });

    it('should enforce rate limiting after multiple failed attempts', async () => {
      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await makeFetchWithCookies(`${testServerUrl}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'testuser',
            password: 'wrongpass'
          })
        });
      }

      // Verify rate limiting
      const response = await makeFetchWithCookies(`${testServerUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'testpass'
        })
      });

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.message).toContain('Too many attempts');
    });

    it('should prevent session fixation attacks', async () => {
      // Get initial session cookie
      const initialResponse = await makeFetchWithCookies(`${testServerUrl}/api/user`);
      const initialCookies = cookieJar.slice();

      // Login with initial session cookie
      const loginResponse = await makeFetchWithCookies(`${testServerUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'testpass'
        })
      });

      expect(loginResponse.status).toBe(200);
      expect(cookieJar).not.toEqual(initialCookies);
    });
  });

  describe('Session Management', () => {
    it('should properly destroy session on logout', async () => {
      // First login
      await makeFetchWithCookies(`${testServerUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'testpass'
        })
      });

      // Then logout
      const logoutResponse = await makeFetchWithCookies(`${testServerUrl}/api/logout`, {
        method: 'POST'
      });

      expect(logoutResponse.status).toBe(200);

      // Verify session is cleared
      const userResponse = await makeFetchWithCookies(`${testServerUrl}/api/user`);
      expect(userResponse.status).toBe(401);
    });

    it('should handle concurrent session requests securely', async () => {
      // Login to get a valid session
      await makeFetchWithCookies(`${testServerUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'testpass'
        })
      });

      // Make multiple concurrent requests with the same session
      const requests = Array(5).fill(null).map(() => 
        makeFetchWithCookies(`${testServerUrl}/api/user`)
      );

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should maintain secure cookie attributes', async () => {
      const response = await makeFetchWithCookies(`${testServerUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'testpass'
        })
      });

      expect(response.status).toBe(200);
      const cookie = response.headers.get('set-cookie');
      expect(cookie).toBeDefined();
      expect(cookie?.toLowerCase()).toContain('httponly');
      expect(cookie?.toLowerCase()).toMatch(/samesite=(lax|strict)/);
      expect(cookie?.toLowerCase()).toContain('path=/');
    });
  });
});