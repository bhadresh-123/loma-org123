
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../db';
import { getSchemaInfo } from '@db';

// Use HIPAA schema only - legacy schema support removed
import * as hipaaSchema from "@db/schema-hipaa-refactored";
let usersTable = hipaaSchema.usersAuth;
let patientsTable = hipaaSchema.patients;
let clinicalSessionsTable = hipaaSchema.clinicalSessions;
let patientTreatmentPlansTable = hipaaSchema.patientTreatmentPlans;

import fetch from 'node-fetch';
import { eq } from 'drizzle-orm';
import { addDays } from 'dayjs';

// Test server URL
const API_URL = 'http://localhost:5000';

describe('Session Completion E2E Tests', () => {
  // Test client and session IDs
  let testClientId: number;
  let testSessionId: number;

  // Setup: Create test client and session
  beforeAll(async () => {
    // Create test client
    const clientResult = await db.insert(patientsTable).values({
      name: 'Test E2E Client',
      email: 'test-e2e@example.com',
      phone: '555-123-4567',
      status: 'active',
      type: 'individual',
      billingType: 'private_pay',
      sessionCost: 150,
      noShowFee: 75
    }).returning();

    testClientId = clientResult[0].id;

    // Create test session (scheduled for tomorrow)
    const sessionDate = addDays(new Date(), 1);
    const sessionResult = await db.insert(clinicalSessionsTable).values({
      patientId: testClientId,
      userId: 1, // Assuming user ID 1 exists
      date: sessionDate,
      duration: 50,
      status: 'scheduled',
      type: 'individual',
      notes: 'Test session for E2E testing'
    }).returning();

    testSessionId = sessionResult[0].id;
    
    console.log(`Created test client ID: ${testClientId} and session ID: ${testSessionId}`);
  });

  // Cleanup: Delete test session and client
  afterAll(async () => {
    // Delete any tasks related to the test session
    await db.delete(tasks).where(eq(tasks.sessionId, testSessionId));
    
    // Delete test session
    await db.delete(clinicalSessionsTable).where(eq(clinicalSessionsTable.id, testSessionId));
    
    // Delete test client
    await db.delete(patientsTable).where(eq(patientsTable.id, testClientId));
    
    console.log('Cleaned up test data');
  });

  // Test completing a session via status endpoint
  it('should complete a session and create a task via status endpoint', async () => {
    // Complete the session
    const response = await fetch(`${API_URL}/api/clinicalSessionsTable/${testSessionId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'completed' })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('completed');

    // Verify session was updated in database
    const updatedSession = await db.query.clinicalSessionsTable.findFirst({
      where: eq(clinicalSessionsTable.id, testSessionId)
    });

    expect(updatedSession).not.toBeNull();
    expect(updatedSession?.status).toBe('completed');

    // Verify a task was created
    const tasks = await db.query.tasks.findMany({
      where: eq(tasks.sessionId, testSessionId)
    });

    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks[0].type).toBe('session_note');
    expect(tasks[0].status).toBe('pending');
  });

  // Test session completion via the complete endpoint
  it('should complete a session via the dedicated completion endpoint', async () => {
    // First reset the session status to scheduled
    await db.update(clinicalSessionsTable)
      .set({ status: 'scheduled' })
      .where(eq(clinicalSessionsTable.id, testSessionId));
    
    // Delete any existing tasks
    await db.delete(tasks).where(eq(tasks.sessionId, testSessionId));
    
    // Complete the session using the dedicated endpoint
    const response = await fetch(`${API_URL}/api/clinicalSessionsTable/${testSessionId}/complete`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.session.status).toBe('completed');
    expect(data.taskCreated).toBe(true);

    // Verify session was updated in database
    const updatedSession = await db.query.clinicalSessionsTable.findFirst({
      where: eq(clinicalSessionsTable.id, testSessionId)
    });

    expect(updatedSession).not.toBeNull();
    expect(updatedSession?.status).toBe('completed');

    // Verify a task was created
    const tasks = await db.query.tasks.findMany({
      where: eq(tasks.sessionId, testSessionId)
    });

    expect(tasks.length).toBe(1);
    expect(tasks[0].type).toBe('session_note');
    expect(tasks[0].status).toBe('pending');
  });
});
