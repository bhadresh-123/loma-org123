/**
 * Test to verify audit logging works correctly for registration
 * Tests both successful and failed registration scenarios
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { db } from '@db';
import { usersAuth, auditLogsHIPAA } from '../../../db/schema-hipaa-refactored';
import { eq, desc } from 'drizzle-orm';

describe('Registration Audit Logging Fix', () => {
  let app: express.Application;
  const testUsername = `test_audit_${Date.now()}`;
  const testData = {
    username: testUsername,
    password: 'TestPass123!',
    name: 'Audit Test User',
    email: 'audit@test.com',
    practiceName: 'Audit Test Practice'
  };

  beforeAll(async () => {
    // Import and setup the server
    const serverModule = await import('../../index');
    app = serverModule.default || serverModule;
  });

  afterAll(async () => {
    // Clean up test user if created
    try {
      await db.delete(usersAuth).where(eq(usersAuth.username, testUsername));
    } catch (error) {
      console.log('Cleanup error (expected if user was not created):', error);
    }
  });

  it('should successfully register user and create audit log with valid userId', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(testData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.username).toBe(testUsername);

    // Verify audit log was created with the new user's ID
    const auditLogs = await db
      .select()
      .from(auditLogsHIPAA)
      .where(eq(auditLogsHIPAA.userId, response.body.id))
      .orderBy(desc(auditLogsHIPAA.createdAt))
      .limit(1);

    expect(auditLogs.length).toBeGreaterThan(0);
    expect(auditLogs[0].userId).toBe(response.body.id);
    expect(auditLogs[0].action).toBe('LOGIN'); // Registration is logged as LOGIN
    expect(auditLogs[0].resourceType).toBe('SYSTEM');
  });

  it('should handle failed registration (validation error) with null userId', async () => {
    const invalidData = {
      username: 'ab', // Too short
      password: 'weak',
      name: 'Test',
      practiceName: 'Test'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(invalidData)
      .expect(400);

    expect(response.body).toHaveProperty('error');

    // Verify audit log was created with null userId for failed registration
    // Wait a moment for async audit logging to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    const auditLogs = await db
      .select()
      .from(auditLogsHIPAA)
      .where(eq(auditLogsHIPAA.responseStatus, 400))
      .orderBy(desc(auditLogsHIPAA.createdAt))
      .limit(5);

    // Should find audit logs with null userId for failed operations
    const failedAuthLogs = auditLogs.filter(log => 
      log.action === 'LOGIN' && log.resourceType === 'SYSTEM' && log.userId === null
    );

    expect(failedAuthLogs.length).toBeGreaterThan(0);
  });

  it('should handle duplicate username registration with null userId', async () => {
    // First registration should succeed
    await request(app)
      .post('/api/auth/register')
      .send({
        ...testData,
        username: `${testUsername}_dup`
      })
      .expect(201);

    // Second registration with same username should fail
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...testData,
        username: `${testUsername}_dup`
      })
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/USER_EXISTS|already exists/i);

    // Wait for async audit logging
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify audit log exists for failed duplicate registration
    const auditLogs = await db
      .select()
      .from(auditLogsHIPAA)
      .where(eq(auditLogsHIPAA.responseStatus, 400))
      .orderBy(desc(auditLogsHIPAA.createdAt))
      .limit(5);

    expect(auditLogs.length).toBeGreaterThan(0);

    // Clean up the duplicate test user
    await db.delete(usersAuth).where(eq(usersAuth.username, `${testUsername}_dup`));
  });

  it('should verify audit logs table accepts null userId without foreign key errors', async () => {
    // This test verifies the database schema allows null userId
    try {
      await db.insert(auditLogsHIPAA).values({
        userId: null,
        action: 'LOGIN',
        resourceType: 'SYSTEM',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        responseStatus: 400,
        securityLevel: 'standard',
        riskScore: 10,
        hipaaCompliant: true,
        phiFieldsCount: 0,
        dataRetentionDate: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000)
      });

      // If we get here, the insert succeeded
      expect(true).toBe(true);

      // Clean up test audit log
      await db
        .delete(auditLogsHIPAA)
        .where(eq(auditLogsHIPAA.userAgent, 'Test Agent'));
    } catch (error) {
      // Should not throw foreign key constraint error
      fail(`Database should accept null userId: ${error}`);
    }
  });
});

