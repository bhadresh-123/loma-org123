// Robust validation schemas for profile updates
import { z } from 'zod';

// Base field validators
const sanitizeString = (str: string | null | undefined): string | null => {
  if (!str || typeof str !== 'string') return null;
  return str.trim() || null;
};

const sanitizeOptionalString = (str: string | null | undefined): string | null => {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  return trimmed.length > 0 ? trimmed : null;
};

// Note format enum with all supported formats
const NOTE_FORMATS = [
  'SOAP', 'DAP', 'BIRP', 'PIE', 
  'SIRP', 'CBE', 'Narrative', 
  'FIRP', 'GIRP', 'MSE'
] as const;

// LOMA Settings Schema
export const lomaSettingsSchema = z.object({
  defaultNoteFormat: z.enum(NOTE_FORMATS, {
    errorMap: () => ({ message: `Must be one of: ${NOTE_FORMATS.join(', ')}` })
  }).nullable().optional(),
  
  sessionDuration: z.number()
    .min(15, 'Session duration must be at least 15 minutes')
    .max(240, 'Session duration cannot exceed 240 minutes')
    .nullable()
    .optional(),
    
  timeZone: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      return sanitized && sanitized.length <= 50 ? sanitized : null;
    }),
});

// Practice Details Schema
export const practiceDetailsSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .transform(sanitizeString),
    
  title: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      return sanitized && sanitized.length <= 100 ? sanitized : null;
    }),
    
  license: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      return sanitized && sanitized.length <= 50 ? sanitized : null;
    }),
    
  email: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      return sanitized && sanitized.length <= 255 ? sanitized : null;
    })
    .refine(val => !val || z.string().email().safeParse(val).success, 'Invalid email format'),
    
  phone: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      if (!sanitized || !/^[\d\s\-\(\)\+\.]*$/.test(sanitized)) return null;
      return sanitized.length <= 20 ? sanitized : null;
    }),
    
  personalPhone: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      if (!sanitized || !/^[\d\s\-\(\)\+\.]*$/.test(sanitized)) return null;
      return sanitized.length <= 20 ? sanitized : null;
    }),
    
  personalEmail: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      return sanitized && sanitized.length <= 255 ? sanitized : null;
    })
    .refine(val => !val || z.string().email().safeParse(val).success, 'Invalid personal email format'),
    
  address: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      return sanitized && sanitized.length <= 200 ? sanitized : null;
    }),
    
  city: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      return sanitized && sanitized.length <= 100 ? sanitized : null;
    }),
    
  state: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      return sanitized && sanitized.length <= 50 ? sanitized : null;
    }),
    
  zipCode: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      if (!sanitized || !/^[\d\-\s]*$/.test(sanitized)) return null;
      return sanitized.length <= 10 ? sanitized : null;
    }),
    
  gender: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      return sanitized && sanitized.length <= 50 ? sanitized : null;
    }),
    
  race: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      return sanitized && sanitized.length <= 100 ? sanitized : null;
    }),
    
  biography: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      return sanitized && sanitized.length <= 2000 ? sanitized : null;
    }),
    
  yearsOfExperience: z.number()
    .min(0, 'Years of experience cannot be negative')
    .max(70, 'Years of experience cannot exceed 70')
    .nullable()
    .optional(),
    
  qualifications: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      return sanitized && sanitized.length <= 1000 ? sanitized : null;
    }),
    
  specialties: z.array(z.string().max(100))
    .max(20, 'Cannot have more than 20 specialties')
    .nullable()
    .default([]),
    
  languages: z.array(z.string().max(50))
    .max(15, 'Cannot have more than 15 languages')
    .nullable()
    .default([]),
    
  sessionFormat: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      return sanitized && sanitized.length <= 50 ? sanitized : null;
    }),
    
  baseRate: z.number()
    .min(0, 'Base rate cannot be negative')
    .max(10000, 'Base rate cannot exceed $10,000')
    .nullable()
    .optional(),
    
  slidingScale: z.boolean()
    .nullable()
    .optional(),
    
  therapistIdentities: z.array(z.string().max(100))
    .max(10, 'Cannot have more than 10 therapist identities')
    .nullable()
    .default([]),
});

// Credentialing Schema
export const credentialingSchema = z.object({
  ssn: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const cleaned = val.trim();
      if (!/^\d{3}-?\d{2}-?\d{4}$/.test(cleaned)) return null;
      return sanitizeOptionalString(cleaned);
    }),
    
  dateOfBirth: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const trimmed = val.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
      return trimmed;
    }),
    
  birthCity: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      return sanitized && sanitized.length <= 100 ? sanitized : null;
    }),
    
  birthState: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      return sanitized && sanitized.length <= 50 ? sanitized : null;
    }),
    
  birthCountry: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      return sanitized && sanitized.length <= 100 ? sanitized : null;
    }),
    
  isUsCitizen: z.boolean()
    .nullable()
    .optional(),
    
  workPermitVisa: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      return sanitized && sanitized.length <= 100 ? sanitized : null;
    }),
    
  npiNumber: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const cleaned = val.trim();
      if (!/^\d{10}$/.test(cleaned)) return null;
      return sanitizeOptionalString(cleaned);
    }),
    
  taxonomyCode: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      return sanitized && sanitized.length <= 20 ? sanitized : null;
    }),
    
  einNumber: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const cleaned = val.trim();
      if (!/^\d{2}-?\d{7}$/.test(cleaned)) return null;
      return sanitizeOptionalString(cleaned);
    }),
    
  legalBusinessName: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeOptionalString(val);
      return sanitized && sanitized.length <= 200 ? sanitized : null;
    }),
    

});

// Combined unified profile schema
export const unifiedProfileSchema = z.object({
  ...practiceDetailsSchema.shape,
  ...credentialingSchema.shape,
  ...lomaSettingsSchema.shape,
}).partial(); // All fields are optional for updates

// Validation helper functions
export const validateProfileData = (data: any) => {
  const result = unifiedProfileSchema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));
    
    return {
      success: false,
      errors,
      data: null
    };
  }
  
  return {
    success: true,
    errors: [],
    data: result.data
  };
};

export const validateLomaSettings = (data: any) => {
  const result = lomaSettingsSchema.safeParse(data);
  
  if (!result.success) {
    return {
      success: false,
      errors: result.error.errors.map(err => err.message)
    };
  }
  
  return {
    success: true,
    errors: [],
    data: result.data
  };
};