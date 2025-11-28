// Comprehensive Zod validation schemas for HIPAA-compliant data validation
import { z } from 'zod';

// Sanitization helpers
const sanitizeString = (str: string) => {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, ''); // Basic XSS prevention
};

const sanitizeOptionalString = (str: string | null | undefined) => {
  if (!str || typeof str !== 'string' || str.trim() === '') return null;
  return sanitizeString(str);
};

// Special sanitizer for business fields that should preserve empty strings
const sanitizeBusinessString = (str: string | null | undefined) => {
  if (str === null || str === undefined) return "";
  if (typeof str !== 'string') return "";
  return sanitizeString(str);
};

// Advanced validation helpers for healthcare-specific fields
const validateNPI = (npi: string): boolean => {
  // NPI must be exactly 10 digits
  if (!/^\d{10}$/.test(npi)) return false;
  
  // Luhn algorithm validation for NPI
  const digits = npi.split('').map(Number);
  let sum = 0;
  let isEven = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits[i];
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

const validateSSN = (ssn: string): boolean => {
  // Remove hyphens and spaces
  const cleanSSN = ssn.replace(/[-\s]/g, '');
  
  // Must be exactly 9 digits
  if (!/^\d{9}$/.test(cleanSSN)) return false;
  
  // Invalid SSN patterns
  const invalidPatterns = [
    /^000/, // Area number cannot be 000
    /^666/, // Area number cannot be 666
    /^9\d{2}/, // Area number cannot start with 9
    /^\d{3}00/, // Group number cannot be 00
    /^\d{5}0000$/ // Serial number cannot be 0000
  ];
  
  return !invalidPatterns.some(pattern => pattern.test(cleanSSN));
};

const validateEIN = (ein: string): boolean => {
  // Remove hyphens and spaces
  const cleanEIN = ein.replace(/[-\s]/g, '');
  
  // Must be exactly 9 digits in XX-XXXXXXX format
  if (!/^\d{9}$/.test(cleanEIN)) return false;
  
  // Valid prefixes for EIN (first two digits)
  const validPrefixes = [
    '01', '02', '03', '04', '05', '06', '10', '11', '12', '13', '14', '15', '16',
    '20', '21', '22', '23', '24', '25', '26', '27', '30', '31', '32', '33', '34',
    '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47',
    '48', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61',
    '62', '63', '64', '65', '66', '67', '68', '71', '72', '73', '74', '75', '76',
    '77', '80', '81', '82', '83', '84', '85', '86', '87', '88', '90', '91', '92',
    '93', '94', '95', '98', '99'
  ];
  
  const prefix = cleanEIN.substring(0, 2);
  return validPrefixes.includes(prefix);
};

// Base validation schemas
export const userProfileUpdateSchema = z.object({
  // Basic info
  name: z.string()
    .max(100, 'Name must be less than 100 characters')
    .transform(sanitizeString)
    .optional(),
  
  title: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeString(val);
      return sanitized && sanitized.length > 0 && sanitized.length <= 100 ? sanitized : null;
    }),
  
  license: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeString(val);
      return sanitized && sanitized.length > 0 && sanitized.length <= 50 ? sanitized : null;
    }),
  
  specialties: z.union([
    z.array(z.string()).transform(arr => JSON.stringify(arr.map(sanitizeString))),
    z.string().transform(str => {
      // Handle JSON string input
      if (str && str.startsWith('[') && str.endsWith(']')) {
        try {
          const parsed = JSON.parse(str);
          if (Array.isArray(parsed)) {
            return JSON.stringify(parsed.map(sanitizeString));
          }
        } catch (e) {
          // If parsing fails, treat as regular string
        }
      }
      return sanitizeOptionalString(str);
    })
  ]).optional(),

  // Contact information
  email: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(str => {
      if (!str || typeof str !== 'string') return null;
      const trimmed = str.trim();
      if (trimmed === "") return null;
      return sanitizeString(trimmed);
    })
    .refine(str => !str || z.string().email().safeParse(str).success, 'Invalid email format'),
  
  phone: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeString(val);
      if (!sanitized || !/^[\d\s\-\(\)\+\.]*$/.test(sanitized)) return null;
      return sanitized.length <= 20 ? sanitized : null;
    }),
  
  personalPhone: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeString(val);
      if (!sanitized || !/^[\d\s\-\(\)\+\.]*$/.test(sanitized)) return null;
      return sanitized.length <= 20 ? sanitized : null;
    }),
  
  personalEmail: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(str => {
      if (!str || typeof str !== 'string') return null;
      const trimmed = str.trim();
      if (trimmed === "") return null;
      return sanitizeString(trimmed);
    })
    .refine(str => !str || z.string().email().safeParse(str).success, 'Invalid personal email format'),

  // Address information
  address: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeString(val);
      return sanitized && sanitized.length > 0 && sanitized.length <= 255 ? sanitized : null;
    }),
  
  city: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeString(val);
      return sanitized && sanitized.length > 0 && sanitized.length <= 100 ? sanitized : null;
    }),
  
  state: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeString(val);
      return sanitized && sanitized.length > 0 && sanitized.length <= 100 ? sanitized : null;
    }),
  
  zipCode: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(str => {
      if (!str || typeof str !== 'string') return null;
      const trimmed = str.trim();
      if (trimmed === "" || !/^\d{5}(-\d{4})?$/.test(trimmed)) return null;
      return sanitizeString(trimmed);
    }),

  // Demographics
  gender: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeString(val);
      return sanitized && sanitized.length > 0 && sanitized.length <= 50 ? sanitized : null;
    }),
  
  race: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeString(val);
      return sanitized && sanitized.length > 0 && sanitized.length <= 100 ? sanitized : null;
    }),

  // Professional information
  biography: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeString(val);
      return sanitized && sanitized.length > 0 && sanitized.length <= 5000 ? sanitized : null;
    }),
  
  yearsOfExperience: z.number()
    .int('Years of experience must be a whole number')
    .min(0, 'Years of experience cannot be negative')
    .max(100, 'Years of experience must be reasonable')
    .nullable()
    .optional(),
  
  qualifications: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeString(val);
      return sanitized && sanitized.length > 0 && sanitized.length <= 2000 ? sanitized : null;
    }),

  // Practice details
  languages: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeString(val);
      return sanitized && sanitized.length > 0 && sanitized.length <= 500 ? sanitized : null;
    }),
  
  sessionFormat: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeString(val);
      return sanitized && sanitized.length > 0 && sanitized.length <= 100 ? sanitized : null;
    }),
  
  baseRate: z.number()
    .min(0, 'Base rate cannot be negative')
    .max(10000, 'Base rate must be reasonable')
    .nullable()
    .optional(),
  
  slidingScale: z.boolean()
    .nullable()
    .optional(),
  
  therapistIdentities: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeString(val);
      return sanitized && sanitized.length > 0 && sanitized.length <= 500 ? sanitized : null;
    }),

  // Advanced validation for healthcare-specific fields
  ssn: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(str => {
      if (!str || typeof str !== 'string') return null;
      const cleaned = str.trim().replace(/[-\s]/g, '');
      if (cleaned === "" || !validateSSN(cleaned)) return null;
      return sanitizeString(cleaned);
    }),

  npiNumber: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(str => {
      if (!str || typeof str !== 'string') return null;
      const cleaned = str.trim().replace(/[-\s]/g, '');
      if (cleaned === "" || !validateNPI(cleaned)) return null;
      return sanitizeString(cleaned);
    }),

  einNumber: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(str => {
      if (!str || typeof str !== 'string') return null;
      const cleaned = str.trim().replace(/[-\s]/g, '');
      if (cleaned === "" || !validateEIN(cleaned)) return null;
      return sanitizeString(cleaned);
    }),

  dateOfBirth: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(str => {
      if (!str || typeof str !== 'string') return null;
      const trimmed = str.trim();
      if (trimmed === "") return null;
      
      const date = new Date(trimmed);
      const now = new Date();
      
      // Check if date is valid
      if (isNaN(date.getTime())) return null;
      
      // Calculate age boundaries - must be between 18-100 years old
      const minBirthDate = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());
      const maxBirthDate = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
      
      if (date < minBirthDate || date > maxBirthDate) return null;
      
      return sanitizeString(trimmed);
    }),

  taxonomyCode: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(str => {
      if (!str || typeof str !== 'string') return null;
      const trimmed = str.trim();
      if (trimmed === "" || !/^[0-9A-Z]{9}X$/.test(trimmed)) return null;
      return sanitizeString(trimmed);
    }),
});

// Credentialing validation schema - HIPAA sensitive data
export const credentialingUpdateSchema = z.object({
  // Sensitive personal information
  ssn: z.string()
    .regex(/^\d{3}-?\d{2}-?\d{4}$/, 'Invalid SSN format')
    .transform(str => str.replace(/\D/g, '')) // Remove non-digits
    .nullable()
    .optional(),
  
  dateOfBirth: z.string()
    .transform(str => str?.trim() || "")
    .refine(str => {
      if (str === "") return true;
      const date = new Date(str);
      const now = new Date();
      
      // Check if date is valid
      if (isNaN(date.getTime())) return false;
      
      // Calculate age - must be between 18-100 years old
      const age = now.getFullYear() - date.getFullYear();
      const monthDiff = now.getMonth() - date.getMonth();
      const dayDiff = now.getDate() - date.getDate();
      
      // Adjust age if birthday hasn't occurred this year
      const adjustedAge = (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) ? age - 1 : age;
      
      return adjustedAge >= 18 && adjustedAge <= 100;
    }, 'Date of birth must be for someone between 18-100 years old')
    .transform(sanitizeOptionalString)
    .nullable()
    .optional(),
  
  birthCity: z.string()
    .max(100, 'Birth city must be less than 100 characters')
    .transform(sanitizeOptionalString)
    .nullable()
    .optional(),
  
  birthState: z.string()
    .max(100, 'Birth state must be less than 100 characters')
    .transform(sanitizeOptionalString)
    .nullable()
    .optional(),
  
  birthCountry: z.string()
    .max(100, 'Birth country must be less than 100 characters')
    .transform(sanitizeOptionalString)
    .nullable()
    .optional(),
  
  isUsCitizen: z.boolean()
    .nullable()
    .optional(),
  
  workPermitVisa: z.string()
    .max(100, 'Work permit/visa must be less than 100 characters')
    .transform(sanitizeOptionalString)
    .nullable()
    .optional(),

  // Professional credentials
  npiNumber: z.string()
    .regex(/^\d{10}$/, 'NPI number must be exactly 10 digits')
    .nullable()
    .optional(),
  
  taxonomyCode: z.string()
    .transform(str => str?.trim() || "")
    .refine(str => str === "" || /^[0-9A-Z]{9}X$/.test(str), 'Taxonomy code must be 9 alphanumeric characters followed by X (10 characters total)')
    .transform(sanitizeOptionalString)
    .nullable()
    .optional(),

  // Business information
  einNumber: z.string()
    .transform(str => str?.trim() || "")
    .refine(str => str === "" || /^\d{9}$/.test(str.replace(/-/g, '')), 'EIN must be 9 digits in format XX-XXXXXXX or XXXXXXXXX')
    .transform(sanitizeBusinessString)
    .optional(),
    
  legalBusinessName: z.string()
    .max(200, 'Legal business name must be less than 200 characters')
    .transform(sanitizeBusinessString)
    .optional(),

  // LOMA Settings - All supported note formats
  defaultNoteFormat: z.enum([
    'SOAP', 'DAP', 'BIRP', 'PIE', 
    'SIRP', 'CBE', 'Narrative', 
    'FIRP', 'GIRP', 'MSE'
  ], {
    errorMap: () => ({ message: 'Invalid note format. Must be one of: SOAP, DAP, BIRP, PIE, SIRP, CBE, Narrative, FIRP, GIRP, MSE' })
  })
    .nullable()
    .optional(),
    
  sessionDuration: z.number()
    .min(15, 'Session duration must be at least 15 minutes')
    .max(240, 'Session duration must be less than 240 minutes')
    .nullable()
    .optional(),
    
  timeZone: z.string()
    .max(50, 'Timezone must be less than 50 characters')
    .transform(sanitizeOptionalString)
    .nullable()
    .optional(),
});

// Combined profile update schema
export const completeProfileUpdateSchema = userProfileUpdateSchema.merge(credentialingUpdateSchema);

// Registration schema
export const userRegistrationSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .transform(sanitizeString),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .transform(sanitizeString),
  
  email: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(str => {
      if (!str || typeof str !== 'string') return null;
      const trimmed = str.trim();
      if (trimmed === "") return null;
      return sanitizeString(trimmed);
    })
    .refine(str => !str || z.string().email().safeParse(str).success, 'Invalid email format'),
  
  title: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeString(val);
      return sanitized && sanitized.length > 0 && sanitized.length <= 100 ? sanitized : null;
    }),
  
  license: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeString(val);
      return sanitized && sanitized.length > 0 && sanitized.length <= 50 ? sanitized : null;
    }),
  
  specialties: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || typeof val !== 'string') return null;
      const sanitized = sanitizeString(val);
      return sanitized && sanitized.length > 0 && sanitized.length <= 500 ? sanitized : null;
    }),
  
  practiceName: z.union([z.string(), z.null(), z.undefined()])
    .optional()
    .transform(val => {
      if (!val || typeof val !== 'string' || val.trim() === '') {
        return undefined; // Allow server fallback to "<name>'s Practice"
      }
      return sanitizeString(val);
    })
    .refine(val => !val || val.length <= 100, 'Practice name must be less than 100 characters'),
});

// Login schema
export const loginSchema = z.object({
  username: z.string()
    .min(1, 'Username is required')
    .max(50, 'Username must be less than 50 characters')
    .transform(sanitizeString),
  
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password must be less than 128 characters'),
});

// Role-based password validation (HIPAA 1.4.4 compliance)
export function validatePasswordForRole(password: string, role?: string): { valid: boolean; error?: string } {
  // Determine minimum length based on role
  let minLength = 12; // Default for therapist/contractor
  let requiresSpecialChar = false;
  
  if (role === 'business_owner' || role === 'admin') {
    minLength = 14; // HIPAA recommendation for administrative users
    requiresSpecialChar = true;
  }
  
  // Check length
  if (password.length < minLength) {
    return {
      valid: false,
      error: `Password must be at least ${minLength} characters for ${role || 'your role'}`
    };
  }
  
  // Check for lowercase
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one lowercase letter'
    };
  }
  
  // Check for uppercase
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one uppercase letter'
    };
  }
  
  // Check for number
  if (!/\d/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one number'
    };
  }
  
  // Check for special character (admin/owner only)
  if (requiresSpecialChar && !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?) for administrative roles'
    };
  }
  
  return { valid: true };
}

// Admin password schema (14+ chars, special char required)
export const adminPasswordSchema = z.string()
  .min(14, 'Administrative users must have passwords of at least 14 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?])/, 
    'Password must contain lowercase, uppercase, number, and special character');

// Regular user password schema (12+ chars)
export const regularPasswordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
    'Password must contain at least one lowercase letter, uppercase letter, and number');

// Export validation functions
export const validateUserProfileUpdate = completeProfileUpdateSchema;

export const validateUserProfileUpdateData = (data: unknown) => {
  return completeProfileUpdateSchema.safeParse(data);
};

export const validateUserRegistration = (data: unknown) => {
  return userRegistrationSchema.safeParse(data);
};

export const validateLogin = (data: unknown) => {
  return loginSchema.safeParse(data);
};