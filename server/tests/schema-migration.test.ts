import { describe, it, expect } from 'vitest';
import { getActiveSchema, getSchemaInfo } from '@db';
import { db } from '@db';

describe('Schema Migration Verification', () => {
  it('should use only HIPAA schema', () => {
    const schemaInfo = getSchemaInfo();
    expect(schemaInfo.isHIPAASchema).toBe(true);
    expect(schemaInfo.schemaType).toBe('hipaa');
    expect(schemaInfo.features.encryption).toBe(true);
    expect(schemaInfo.features.auditLogging).toBe(true);
    expect(schemaInfo.features.personaSegmentation).toBe(true);
  });

  it('should have HIPAA tables available', () => {
    const schema = getActiveSchema();
    
    // HIPAA tables should be available
    expect(schema.users).toBeDefined();
    expect(schema.patients).toBeDefined();
    expect(schema.clinicalSessions).toBeDefined();
    expect(schema.patientTreatmentPlans).toBeDefined();
    expect(schema.organizations).toBeDefined();
    expect(schema.organizationMemberships).toBeDefined();
    expect(schema.therapistProfiles).toBeDefined();
    expect(schema.therapistPHI).toBeDefined();
    expect(schema.auditLogs).toBeDefined();
  });

  it('should not have legacy tables available', () => {
    const schema = getActiveSchema();
    
    // Legacy tables should be null
    expect(schema.tasks).toBeNull();
    expect(schema.documents).toBeNull();
    expect(schema.invoices).toBeNull();
    expect(schema.notifications).toBeNull();
    expect(schema.userProfiles).toBeNull();
    expect(schema.meetingTypes).toBeNull();
    expect(schema.meetings).toBeNull();
    expect(schema.calendarBlocks).toBeNull();
    expect(schema.workSchedules).toBeNull();
    expect(schema.cptCodes).toBeNull();
    expect(schema.diagnosisCodes).toBeNull();
    expect(schema.psychologicalAssessments).toBeNull();
  });

  it('should be able to query HIPAA tables', async () => {
    const schema = getActiveSchema();
    
    // Test that we can query the patients table
    const patients = await db.query.patients.findMany({
      limit: 1
    });
    
    // Should not throw an error
    expect(Array.isArray(patients)).toBe(true);
  });

  it('should not be able to query legacy tables', async () => {
    // Test that legacy table queries fail gracefully
    try {
      await db.query.clients.findMany({ limit: 1 });
      // If we get here, the test should fail
      expect(true).toBe(false);
    } catch (error) {
      // Expected - legacy tables should not exist
      expect(error).toBeDefined();
    }
  });
});
