import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnvironmentConfig } from "../server/utils/environment";

// Import PostgreSQL HIPAA schema only
import * as hipaaSchema from "./schema-hipaa-refactored";

// Database connection - PostgreSQL only
let db: ReturnType<typeof drizzle> | null = null;
let queryClient: ReturnType<typeof postgres> | null = null;

// Synchronous initialization function
function initializeDatabase() {
  if (db) return db; // Already initialized
  
  const envConfig = getEnvironmentConfig();
  
  if (envConfig.databaseUrl) {
    try {
      const connectionString = envConfig.databaseUrl;
      
      console.log(`🔧 Using PostgreSQL database (${envConfig.isProduction ? 'Production' : 'Development'})`);
      console.log(`🔐 Using ${envConfig.useHipaaSchema ? 'HIPAA-compliant' : 'Legacy'} PostgreSQL schema`);
      
      // Use HIPAA schema only if explicitly enabled
      const schemaToUse = envConfig.useHipaaSchema ? hipaaSchema : {};
      
      // Create postgres client
      queryClient = postgres(connectionString, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });
      
      db = drizzle(queryClient, {
        schema: schemaToUse,
        logger: envConfig.isProduction ? false : {
          logQuery(query: string, params: unknown[]) {
            console.log('[DRIZZLE SQL]', query);
            console.log('[DRIZZLE PARAMS]', params);
          },
        },
      });
      console.log("✅ PostgreSQL database connection established");
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      console.error("❌ Check your DATABASE_URL environment variable");
      db = null;
    }
  } else {
    console.error("❌ DATABASE_URL not set - PostgreSQL connection required");
    console.error("❌ Please set DATABASE_URL environment variable");
  }
  
  return db;
}

// Initialize database immediately when this module is imported
initializeDatabase();

// Export the database instance directly
export { db, queryClient };

// Export a function to check if database is available
export const isDatabaseAvailable = () => {
  return db !== null;
};

// Export schema information
export const getSchemaInfo = () => ({
  isHIPAASchema: true,
  schemaType: 'hipaa',
  features: {
    encryption: true,
    auditLogging: true,
    personaSegmentation: true,
  }
});

// Dynamic schema helper for easy table access
export const getActiveSchema = () => {
  const envConfig = getEnvironmentConfig();
  
  // Return HIPAA schema only if explicitly enabled
  if (!envConfig.useHipaaSchema) {
    return {
      isHIPAASchema: false,
      users: null,
      usersAuth: null,
      patients: null,
      clinicalSessions: null,
      patientTreatmentPlans: null,
      organizations: null,
      organizationMemberships: null,
      therapistProfiles: null,
      therapistPHI: null,
      auditLogs: null,
      tasks: null,
      documents: null,
      invoices: null,
      notifications: null,
      userProfiles: null,
      meetingTypes: null,
      meetings: null,
      calendarBlocks: null,
      workSchedules: null,
      cptCodes: null,
      diagnosisCodes: null,
      psychologicalAssessments: null,
    };
  }
  
  // PostgreSQL HIPAA schema only
  return {
    isHIPAASchema: true,
    users: hipaaSchema.usersAuth,
    usersAuth: hipaaSchema.usersAuth,  // Direct mapping for consistency
    patients: hipaaSchema.patients,
    clinicalSessions: hipaaSchema.clinicalSessions,
    patientTreatmentPlans: hipaaSchema.patientTreatmentPlans,
    organizations: hipaaSchema.organizations,
    organizationMemberships: hipaaSchema.organizationMemberships,
    organizationInvites: hipaaSchema.organizationInvites,
    therapistProfiles: hipaaSchema.therapistProfiles,
    therapistPHI: hipaaSchema.therapistPHI,
    auditLogs: hipaaSchema.auditLogsHIPAA,
    tasks: hipaaSchema.tasks,
    calendarBlocks: hipaaSchema.calendarBlocks,
    workSchedules: hipaaSchema.workSchedules,
    
    // Operational tables (now available)
    userSettings: hipaaSchema.userSettings,
    notifications: hipaaSchema.notifications,
    notificationSettings: hipaaSchema.notificationSettings,
    invoices: hipaaSchema.invoices,
    invoiceItems: hipaaSchema.invoiceItems,
    cardTransactions: hipaaSchema.cardTransactions,
    meetingTypes: hipaaSchema.meetingTypes,
    meetings: hipaaSchema.meetings,
    
    // Document management
    documents: hipaaSchema.documents,
    documentTemplates: hipaaSchema.documentTemplates,
    
    // Legacy tables (not in HIPAA schema)
    userProfiles: null,
    cptCodes: null,
    diagnosisCodes: null,
    psychologicalAssessments: null,
  };
};