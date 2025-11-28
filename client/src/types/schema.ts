// Re-export types from the HIPAA schema for client-side use
export type {
  // Auth types
  usersAuth,
  
  // Organization types
  organizations,
  organizationMemberships,
  
  // Therapist types
  therapistProfiles,
  therapistPHI,
  
  // Patient types (formerly clients)
  patients as Client,
  
  // Clinical types
  clinicalSessions as Session,
  patientTreatmentPlans as TreatmentPlan,
  
  // Task types
  tasks as Task,
  
  // Audit types
  auditLogsHIPAA as AuditLog,
  
  // Calendar types (if they exist in schema)
  calendarBlocks as CalendarBlock,
  // meetings as Meeting,
  // meetingTypes as MeetingType,
  
  // Document types
  documents as Document,
  documentTemplates as DocumentTemplate,
  
  // Invoice types (if they exist in schema)
  // invoices as Invoice,
  // invoiceItems as InvoiceItem,
} from '@db/schema';

// Type aliases for backward compatibility  
export type { patients as Client };
export type { clinicalSessions as Session };
export type { patientTreatmentPlans as TreatmentPlan };
export type { tasks as Task };
export type { usersAuth as User };
export type { organizations as Organization };
export type { therapistProfiles as TherapistProfile };
export type { auditLogsHIPAA as AuditLog };

// Meeting types
export type Meeting = {
  id: number;
  userId: number;
  organizationId: number | null;
  typeId: number | null;
  title: string;
  date: string;
  duration: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MeetingType = {
  id: number;
  userId: number;
  organizationId: number | null;
  name: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

// Medical code types
export interface MedicalCode {
  id: number;
  code: string;
  description: string;
  codeType: string;
  category?: string;
  duration?: number;
  isActive: boolean;
  effectiveDate?: string;
  terminationDate?: string;
  createdBy?: number;
  updatedBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Assessment category types
export interface AssessmentCategory {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdBy?: number;
  updatedBy?: number;
  createdAt?: string;
  updatedAt?: string;
}
