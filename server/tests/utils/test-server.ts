import express from 'express';
import { createServer } from 'http';
import { setupAuth } from '../../auth';
import { db } from '@db';
import { getActiveSchema } from '@db';

// Use HIPAA schema only - legacy schema support removed
const schema = getActiveSchema();
const usersTable = schema.users;
const patientsTable = schema.patients;
const clinicalSessionsTable = schema.clinicalSessions;
const patientTreatmentPlansTable = schema.patientTreatmentPlans;

import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { eq } from 'drizzle-orm';

const scryptAsync = promisify(scrypt);

export async function setupTestServer() {
  const app = express();
  const testPort = 5001;

  // Setup auth and basic middleware
  app.use(express.json());
  setupAuth(app);

  // Create test user with secure password hashing
  const salt = randomBytes(32).toString('hex');
  const buf = (await scryptAsync('testpass', salt, 64, { N: 16384, r: 8, p: 1 })) as Buffer;
  const hashedPassword = `${buf.toString('hex')}.${salt}`;

  try {
    // Create a test user for authentication tests
    await db.insert(usersTable).values({
      username: 'testuser',
      password: hashedPassword,
      name: 'Test User',
      title: 'Test Doctor',
      license: 'TEST123',
      specialties: 'Testing'
    });
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }

  const server = createServer(app); // Server creation moved here

  return {
    url: `http://localhost:${testPort}`,
    initialize: async () => {
      await new Promise<void>((resolve) => {
        server.listen(testPort, '0.0.0.0', () => {
          console.log(`Test server running on port ${testPort}`);
          resolve();
        });
      });
      return app;
    },
    cleanup: async () => {
      try {
        // Clean up test user
        await db.delete(usersTable).where(eq(usersTable.username, 'testuser'));

        // Close server
        await new Promise<void>((resolve, reject) => {
          server.close((err) => {
            if (err) {
              console.error('Error closing test server:', err);
              reject(err);
              return;
            }
            console.log('Test server closed');
            resolve();
          });
        });
      } catch (error) {
        console.error('Error during cleanup:', error);
        throw error;
      }
    }
  };
}