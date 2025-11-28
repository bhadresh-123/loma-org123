// Type-safe field mapping utility for profile data integrity
// Converts between frontend camelCase and database snake_case

export interface ProfileFormData {
  // Frontend camelCase format (from forms)
  name?: string;
  title?: string;
  license?: string;
  email?: string;
  phone?: string;
  personalPhone?: string;
  personalEmail?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  gender?: string;
  race?: string;
  biography?: string;
  yearsOfExperience?: number;
  qualifications?: string;
  specialties?: string[];
  languages?: string[];
  sessionFormat?: string;
  baseRate?: number;
  slidingScale?: boolean;
  therapistIdentities?: string[];
  ssn?: string;
  dateOfBirth?: string;
  birthCity?: string;
  birthState?: string;
  birthCountry?: string;
  isUsCitizen?: boolean;
  workPermitVisa?: string;
  npiNumber?: string;
  taxonomyCode?: string;
  einNumber?: string;
  legalBusinessName?: string;
  defaultNoteFormat?: string;
  sessionDuration?: number;
  timeZone?: string;
}

export interface ProfileDatabaseData {
  // Database snake_case format (actual columns)
  name?: string;
  title?: string;
  license?: string;
  email?: string;
  phone?: string;
  personalphone?: string;
  personalemail?: string;
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  gender?: string;
  race?: string;
  biography?: string;
  yearsofexperience?: number;
  qualifications?: string;
  specialties?: string; // JSON serialized array
  languages?: string; // JSON serialized array
  sessionformat?: string;
  baserate?: string; // Stored as string in DB
  slidingscale?: boolean;
  therapistidentities?: string; // JSON serialized array
  ssn?: string;
  date_of_birth?: Date;
  birth_city?: string;
  birth_state?: string;
  birth_country?: string;
  is_us_citizen?: boolean;
  work_permit_visa?: string;
  npi_number?: string;
  taxonomy_code?: string;
  ein?: string; // Note: einNumber → ein
  legal_business_name?: string;
  business_physical_address?: string; // Stores combined address
  default_note_format?: string;
  session_duration?: number;
  time_zone?: string;
}

// Field mapping dictionary: frontend → database
const FIELD_MAPPING: Record<keyof ProfileFormData, keyof ProfileDatabaseData> = {
  name: 'name',
  title: 'title',
  license: 'license',
  email: 'email',
  phone: 'phone',
  personalPhone: 'personalphone',
  personalEmail: 'personalemail',
  address: 'address',
  city: 'city',
  state: 'state',
  zipCode: 'zipcode',
  gender: 'gender',
  race: 'race',
  biography: 'biography',
  yearsOfExperience: 'yearsofexperience',
  qualifications: 'qualifications',
  specialties: 'specialties',
  languages: 'languages',
  sessionFormat: 'sessionformat',
  baseRate: 'baserate',
  slidingScale: 'slidingscale',
  therapistIdentities: 'therapistidentities',
  ssn: 'ssn',
  dateOfBirth: 'date_of_birth',
  birthCity: 'birth_city',
  birthState: 'birth_state',
  birthCountry: 'birth_country',
  isUsCitizen: 'is_us_citizen',
  workPermitVisa: 'work_permit_visa',
  npiNumber: 'npi_number',
  taxonomyCode: 'taxonomy_code',
  einNumber: 'ein',
  legalBusinessName: 'legal_business_name',
  defaultNoteFormat: 'default_note_format',
  sessionDuration: 'session_duration',
  timeZone: 'time_zone',
};

// Reverse mapping: database → frontend
const REVERSE_FIELD_MAPPING: Record<keyof ProfileDatabaseData, keyof ProfileFormData> = 
  Object.fromEntries(
    Object.entries(FIELD_MAPPING).map(([key, value]) => [value, key])
  ) as Record<keyof ProfileDatabaseData, keyof ProfileFormData>;

// Array fields that need JSON serialization
const ARRAY_FIELDS = new Set<keyof ProfileFormData>(['specialties', 'languages', 'therapistIdentities']);

// Number fields that need type conversion
const NUMBER_FIELDS = new Set<keyof ProfileFormData>(['yearsOfExperience', 'baseRate', 'sessionDuration']);

// Date fields that need special handling
const DATE_FIELDS = new Set<keyof ProfileFormData>(['dateOfBirth']);

/**
 * Convert frontend form data to database format
 */
export function frontendToDatabase(formData: ProfileFormData): ProfileDatabaseData {
  const dbData: ProfileDatabaseData = {};
  
  for (const [frontendKey, value] of Object.entries(formData)) {
    if (value === undefined || value === null) continue;
    
    const dbKey = FIELD_MAPPING[frontendKey as keyof ProfileFormData];
    if (!dbKey) {
      console.warn(`Unknown field mapping for frontend key: ${frontendKey}`);
      continue;
    }
    
    // Handle array fields with safe JSON serialization
    if (ARRAY_FIELDS.has(frontendKey as keyof ProfileFormData)) {
      if (Array.isArray(value)) {
        dbData[dbKey] = JSON.stringify(value) as any;
      } else if (typeof value === 'string') {
        // Handle already stringified arrays - prevent double encoding
        try {
          const parsed = JSON.parse(value);
          dbData[dbKey] = Array.isArray(parsed) ? value : JSON.stringify([value]) as any;
        } catch {
          dbData[dbKey] = JSON.stringify([value]) as any;
        }
      }
      continue;
    }
    
    // Handle number fields that need string conversion for database
    if (frontendKey === 'baseRate' && typeof value === 'number') {
      dbData[dbKey] = value.toString() as any;
      continue;
    }
    
    // Handle date fields
    if (DATE_FIELDS.has(frontendKey as keyof ProfileFormData) && typeof value === 'string') {
      dbData[dbKey] = new Date(value) as any;
      continue;
    }
    
    // Handle boolean fields
    if (typeof value === 'boolean') {
      dbData[dbKey] = value as any;
      continue;
    }
    
    // Handle string and number fields
    dbData[dbKey] = value as any;
  }
  
  return dbData;
}

/**
 * Convert database data to frontend format
 */
export function databaseToFrontend(dbData: ProfileDatabaseData): ProfileFormData {
  const formData: ProfileFormData = {};
  
  for (const [dbKey, value] of Object.entries(dbData)) {
    if (value === undefined || value === null) continue;
    
    const frontendKey = REVERSE_FIELD_MAPPING[dbKey as keyof ProfileDatabaseData];
    if (!frontendKey) {
      console.warn(`Unknown field mapping for database key: ${dbKey}`);
      continue;
    }
    
    // Handle array fields
    if (ARRAY_FIELDS.has(frontendKey) && typeof value === 'string') {
      try {
        formData[frontendKey] = JSON.parse(value) as any;
      } catch (error) {
        console.warn(`Failed to parse array field ${frontendKey}:`, error);
        formData[frontendKey] = [] as any;
      }
      continue;
    }
    
    // Handle baseRate string → number conversion
    if (frontendKey === 'baseRate' && typeof value === 'string') {
      const numValue = parseFloat(value);
      formData[frontendKey] = isNaN(numValue) ? 0 : numValue;
      continue;
    }
    
    // Handle date fields
    if (DATE_FIELDS.has(frontendKey) && value instanceof Date) {
      formData[frontendKey] = value.toISOString().split('T')[0] as any; // YYYY-MM-DD format
      continue;
    }
    
    // Handle other fields
    formData[frontendKey] = value as any;
  }
  
  return formData;
}

/**
 * Validate field data integrity
 */
export function validateFieldIntegrity(data: ProfileFormData): string[] {
  const errors: string[] = [];
  
  // Validate NPI number
  if (data.npiNumber && !/^\d{10}$/.test(data.npiNumber)) {
    errors.push('NPI number must be exactly 10 digits');
  }
  
  // Validate SSN format
  if (data.ssn && !/^\d{3}-?\d{2}-?\d{4}$/.test(data.ssn)) {
    errors.push('SSN must be in format XXX-XX-XXXX');
  }
  
  // Validate EIN format
  if (data.einNumber && !/^\d{2}-?\d{7}$/.test(data.einNumber)) {
    errors.push('EIN must be in format XX-XXXXXXX');
  }
  
  // Validate array fields
  if (data.specialties && !Array.isArray(data.specialties)) {
    errors.push('Specialties must be an array');
  }
  
  if (data.languages && !Array.isArray(data.languages)) {
    errors.push('Languages must be an array');
  }
  
  if (data.therapistIdentities && !Array.isArray(data.therapistIdentities)) {
    errors.push('Therapist identities must be an array');
  }
  
  // Validate numeric fields
  if (data.baseRate !== undefined && (typeof data.baseRate !== 'number' || data.baseRate < 0)) {
    errors.push('Base rate must be a positive number');
  }
  
  if (data.yearsOfExperience !== undefined && (typeof data.yearsOfExperience !== 'number' || data.yearsOfExperience < 0)) {
    errors.push('Years of experience must be a non-negative number');
  }
  
  return errors;
}

/**
 * Get all supported field mappings
 */
export function getAllFieldMappings(): Record<string, string> {
  return { ...FIELD_MAPPING };
}

/**
 * Check if a field is an array field
 */
export function isArrayField(fieldName: string): boolean {
  return ARRAY_FIELDS.has(fieldName as keyof ProfileFormData);
}

/**
 * Check if a field is a number field
 */
export function isNumberField(fieldName: string): boolean {
  return NUMBER_FIELDS.has(fieldName as keyof ProfileFormData);
}

/**
 * Check if a field is a date field
 */
export function isDateField(fieldName: string): boolean {
  return DATE_FIELDS.has(fieldName as keyof ProfileFormData);
}