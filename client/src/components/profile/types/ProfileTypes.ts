import { z } from 'zod';

// Comprehensive Profile Type System
// Centralized type definitions for the unified profile architecture

export const profileFormSchema = z.object({
  // Basic Information
  name: z.string().min(1, "Name is required"),
  title: z.string().min(1, "Professional title is required"),
  license: z.string().min(1, "License number is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required"),

  // Practice Details
  practiceDetails: z.object({
    practiceName: z.string().min(1, "Practice name is required"),
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    zipCode: z.string().min(5, "Valid ZIP code is required"),
    gender: z.string().optional(),
    race: z.string().optional(),
    personalPhone: z.string().optional(),
    personalEmail: z.string().email().optional().or(z.literal("")),
    biography: z.string().optional(),
    yearsOfExperience: z.number().min(0, "Years of experience must be positive"),
    qualifications: z.string().optional(),
    languages: z.array(z.string()).default([]),
    sessionFormat: z.enum(["in_person", "online", "hybrid"]).default("in_person"),
    baseRate: z.number().min(0, "Base rate must be positive"),
    slidingScale: z.boolean().default(false),
    therapistIdentities: z.array(z.string()).default([]),
    specialties: z.array(z.string()).default([]),
  }),

  // Credentialing Information
  credentialing: z.object({
    ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/, "SSN must be in format XXX-XX-XXXX"),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    birthCity: z.string().min(1, "Birth city is required"),
    birthState: z.string().min(1, "Birth state is required"),
    birthCountry: z.string().min(1, "Birth country is required"),
    isUsCitizen: z.boolean().optional(),
    workPermitVisa: z.string().optional(),
    npiNumber: z.string().regex(/^\d{10}$/, "NPI must be exactly 10 digits"),
    taxonomyCode: z.string().min(1, "Taxonomy code is required"),
    einNumber: z.string().regex(/^\d{2}-?\d{7}$/, "EIN must be in format XX-XXXXXXX").optional(),
    legalBusinessName: z.string().optional(),

  }),

  // LOMA Settings
  lomaSettings: z.object({
    defaultNoteFormat: z.enum(["SOAP", "DAP", "FIRP", "GIRP", "BIRP"]).default("SOAP"),
    sessionDuration: z.number().min(15).max(180).default(50),
    timeZone: z.string().default("America/Chicago"),
  }),

  // Insurance Configuration
  insurance: z.object({
    acceptedProviders: z.array(z.string()).default([]),
    isInsuranceProvider: z.boolean().default(false),
  }),
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;

// Section-specific validation schemas
export const lomaSettingsSchema = profileFormSchema.pick({ lomaSettings: true });
export const practiceDetailsSchema = profileFormSchema.pick({ 
  name: true, 
  title: true, 
  license: true, 
  email: true, 
  phone: true, 
  practiceDetails: true 
});
export const credentialingSchema = profileFormSchema.pick({ credentialing: true });
export const insuranceSchema = profileFormSchema.pick({ insurance: true });

export type LomaSettingsData = z.infer<typeof lomaSettingsSchema>;
export type PracticeDetailsData = z.infer<typeof practiceDetailsSchema>;
export type CredentialingData = z.infer<typeof credentialingSchema>;
export type InsuranceData = z.infer<typeof insuranceSchema>;

// Work Schedule Types (separate from main form)
export interface WorkSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

// Error handling types
export interface ProfileError {
  correlationId: string;
  section: string;
  field?: string;
  message: string;
  recoverable: boolean;
  retryAfter?: number;
}

// User action tracking types
export interface UserActionContext {
  userId?: number;
  sessionId: string;
  section: string;
  previousSection?: string;
  timestamp: string;
  userAgent: string;
}

// Performance monitoring types
export interface PerformanceContext {
  section: string;
  action: string;
  userId?: number;
  sessionId: string;
}

// Optimistic update types
export interface OptimisticUpdateContext {
  section: string;
  data: Partial<ProfileFormData>;
  rollbackData?: Partial<ProfileFormData>;
}

// Constants
export const NOTE_FORMATS = [
  { value: 'SOAP', label: 'SOAP (Subjective, Objective, Assessment, Plan)' },
  { value: 'DAP', label: 'DAP (Data, Assessment, Plan)' },
  { value: 'FIRP', label: 'FIRP (Focus, Intervention, Response, Plan)' },
  { value: 'GIRP', label: 'GIRP (Goal, Intervention, Response, Plan)' },
  { value: 'BIRP', label: 'BIRP (Behavior, Intervention, Response, Plan)' }
] as const;

export const SESSION_FORMATS = [
  { value: 'in_person', label: 'In-Person' },
  { value: 'online', label: 'Online/Telehealth' },
  { value: 'hybrid', label: 'Hybrid (Both)' }
] as const;

export const DAYS_OF_WEEK = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' }
] as const;

export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
] as const;

export const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian',
  'Chinese (Mandarin)', 'Chinese (Cantonese)', 'Japanese', 'Korean', 'Arabic',
  'Hindi', 'Bengali', 'Telugu', 'Tamil', 'Gujarati', 'Punjabi', 'Vietnamese',
  'Thai', 'Tagalog', 'Polish', 'Dutch', 'Swedish', 'Norwegian', 'Danish',
  'Finnish', 'Greek', 'Hebrew', 'Turkish', 'Persian (Farsi)', 'Urdu'
] as const;

export const THERAPY_SPECIALTIES = [
  'Anxiety Disorders', 'Depression', 'PTSD', 'Trauma', 'Grief and Loss',
  'Relationship Issues', 'Family Therapy', 'Couples Therapy', 'Child Therapy',
  'Adolescent Therapy', 'Addiction and Substance Abuse', 'Eating Disorders',
  'OCD', 'ADHD', 'Autism Spectrum', 'Bipolar Disorder', 'Schizophrenia',
  'Personality Disorders', 'Self-Harm', 'Suicidal Ideation', 'Anger Management',
  'Stress Management', 'Life Transitions', 'Career Counseling', 'LGBTQ+ Issues',
  'Cultural Issues', 'Religious/Spiritual Issues', 'Chronic Illness',
  'Pain Management', 'Sleep Disorders', 'Sexual Issues'
] as const;

export const THERAPIST_IDENTITIES = [
  'LGBTQ+', 'Person of Color', 'Veteran', 'First Generation College Graduate',
  'Immigrant', 'Survivor', 'Person with Disability', 'Religious/Spiritual',
  'Multilingual', 'Rural Background', 'Urban Background', 'Working Class Background'
] as const;