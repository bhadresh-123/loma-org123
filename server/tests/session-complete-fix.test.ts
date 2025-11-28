
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../index';
import fetch from 'node-fetch';
import { db } from '../../db';
import { getSchemaInfo } from '@db';

// Use HIPAA schema only - legacy schema support removed
import * as hipaaSchema from "@db/schema-hipaa-refactored";
let usersTable = hipaaSchema.usersAuth;
let patientsTable = hipaaSchema.patients;
let clinicalSessionsTable = hipaaSchema.clinicalSessions;
let patientTreatmentPlansTable = hipaaSchema.patientTreatmentPlans;

import { eq } from 'drizzle-orm';

// Helper function to wait for server startup
const waitForServer = (port: number) => {
  return new Promise<void>((resolve, reject) => {
    const maxAttempts = 10;
    let attempts = 0;
    
    const checkServer = async () => {
      try {
        const response = await fetch(`http://localhost:${port}/api/health`);
        if (response.ok) {
          resolve();
        } else {
          retry();
        }
      } catch (error) {
        retry();
      }
    };
    
    const retry = () => {
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkServer, 500);
      } else {
        reject(new Error('Server did not start in time'));
      }
    };
    
    checkServer();
  });
};

describe('Session Completion API', () => {
  const PORT = 5001; // Use a different port than the main server
  let server: any;
  
  beforeAll(async () => {
    // Start the server on a different port
    server = app.listen(PORT, '0.0.0.0');
    await waitForServer(PORT);
  });
  
  afterAll(() => {
    if (server) {
      server.close();
    }
  });
  
  it('should mark a session as completed', async () => {
    // First create a test session
    const testSession = await db.insert(clinicalSessionsTable).values({
      userId: 1,
      patientId: 1,
      date: new Date(),
      duration: 50,
      status: 'scheduled',
      type: 'individual',
      notes: 'Test session',
      isPaid: false,
    }).returning();
    
    const sessionId = testSession[0].id;
    
    try {
      // Now try to complete the session
      const response = await fetch(`http://localhost:${PORT}/api/clinicalSessionsTable/${sessionId}/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Verify the response contains the completed session
      expect(data.session).toBeDefined();
      expect(data.session.status).toBe('completed');
      
      // Verify the session was actually updated in the database
      const updatedSessionInDb = await db.query.clinicalSessionsTable.findFirst({
        where: eq(clinicalSessionsTable.id, sessionId),
      });
      
      expect(updatedSessionInDb).toBeDefined();
      expect(updatedSessionInDb?.status).toBe('completed');
    } finally {
      // Clean up test data
      await db.delete(clinicalSessionsTable).where(eq(clinicalSessionsTable.id, sessionId));
    }
  });
});
