// Server-side Profile Type System
// Centralized type definitions for profile data handling

// Database types (snake_case) - matches actual database columns with null handling
export interface ProfileDatabase {
  id: number;
  username: string;
  password: string;
  name: string;
  title: string | null;
  license: string | null;
  
  // Contact Information
  email: string | null;
  phone: string | null;
  personalphone: string | null;
  personalemail: string | null;
  
  // Address
  address: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  
  // Demographics
  gender: string | null;
  race: string | null;
  
  // Professional Info
  specialties: string | null; // JSON string
  biography: string | null;
  yearsofexperience: number | null;
  qualifications: string | null;
  
  // Practice Details
  languages: string | null; // JSON string
  sessionformat: string | null;
  baserate: string | null;
  slidingscale: boolean | null;
  therapistidentities: string | null; // JSON string
  
  // Personal Identity (HIPAA)
  ssn: string | null;
  dateofbirth: string | null;
  birthcity: string | null;
  birthstate: string | null;
  birthcountry: string | null;
  isuscitizen: number | null;
  workpermitvisa: string | null;
  
  // Professional Credentials
  npinumber: string | null;
  taxonomycode: string | null;
  ein: string | null;
  legal_business_name: string | null;

  
  // LOMA Settings
  default_note_format: string | null;
  session_duration: number | null;
  time_zone: string | null;
  
  // CV Files
  cvfilename: string | null;
  cvoriginalname: string | null;
  cvmimetype: string | null;
  
  created_at: Date | null;
}

// Frontend types (camelCase) - received from API requests
export interface ProfileFormData {
  // Basic Info
  name?: string;
  title?: string;
  license?: string;
  
  // Contact Information
  email?: string;
  phone?: string;
  personalPhone?: string;
  personalEmail?: string;
  
  // Address
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  
  // Demographics
  gender?: string;
  race?: string;
  
  // Professional Info
  specialties?: string[];
  biography?: string;
  yearsOfExperience?: number;
  qualifications?: string;
  
  // Practice Details
  languages?: string[];
  sessionFormat?: string;
  baseRate?: number;
  slidingScale?: boolean;
  therapistIdentities?: string[];
  
  // Personal Identity (HIPAA)
  ssn?: string;
  dateOfBirth?: string; // ISO string from date picker
  birthCity?: string;
  birthState?: string;
  birthCountry?: string;
  isUsCitizen?: boolean;
  workPermitVisa?: string;
  
  // Professional Credentials
  npiNumber?: string;
  taxonomyCode?: string;
  einNumber?: string;
  legalBusinessName?: string;
  
  // LOMA Settings
  defaultNoteFormat?: string;
  sessionDuration?: number;
  timeZone?: string;
  
  // CV Files
  cvFilename?: string;
  cvOriginalName?: string;
  cvMimeType?: string;
}

// Field mapping for transformations
export const FIELD_MAPPING = {
  // Basic Info
  name: 'name',
  title: 'title',
  license: 'license',
  
  // Contact Info
  email: 'email',
  phone: 'phone',
  personalPhone: 'personalphone',
  personalEmail: 'personalemail',
  
  // Address
  address: 'address',
  city: 'city',
  state: 'state',
  zipCode: 'zipcode',
  
  // Demographics
  gender: 'gender',
  race: 'race',
  
  // Professional Info
  specialties: 'specialties',
  biography: 'biography',
  yearsOfExperience: 'yearsofexperience',
  qualifications: 'qualifications',
  
  // Practice Details
  languages: 'languages',
  sessionFormat: 'sessionformat',
  baseRate: 'baserate',
  slidingScale: 'slidingscale',
  therapistIdentities: 'therapistidentities',
  
  // Personal Identity (HIPAA)
  ssn: 'ssn',
  dateOfBirth: 'dateofbirth',
  birthCity: 'birthcity',
  birthState: 'birthstate',
  birthCountry: 'birthcountry',
  isUsCitizen: 'isuscitizen',
  workPermitVisa: 'workpermitvisa',
  
  // Professional Credentials
  npiNumber: 'npinumber',
  taxonomyCode: 'taxonomycode',
  einNumber: 'ein',
  legalBusinessName: 'legal_business_name',
  
  // LOMA Settings
  defaultNoteFormat: 'default_note_format',
  sessionDuration: 'session_duration',
  timeZone: 'time_zone',
  
  // CV Files
  cvFilename: 'cvfilename',
  cvOriginalName: 'cvoriginalname',
  cvMimeType: 'cvmimetype'
} as const;

// Type-safe transformation functions
export const transformToDatabase = (formData: Partial<ProfileFormData>): Record<string, any> => {
  const dbData: Record<string, any> = {};
  
  Object.entries(formData).forEach(([key, value]) => {
    const dbKey = FIELD_MAPPING[key as keyof typeof FIELD_MAPPING];
    
    // Debug all field transformations
    if (process.env.NODE_ENV === 'development') {
      console.log(`[TRANSFORM-DEBUG] ${key}:`, {
        value,
        dbKey,
        hasMapping: !!dbKey,
        valueType: typeof value,
        isEmpty: value === "",
        isNull: value === null,
        isUndefined: value === undefined
      });
    }
    
    if (dbKey && value !== undefined) {
      // Handle array fields
      if (Array.isArray(value)) {
        dbData[dbKey] = JSON.stringify(value);
      }
      // Handle date fields
      else if (key === 'dateOfBirth' && value) {
        dbData[dbKey] = new Date(value as string);
      }
      // Handle numeric fields
      else if ((key === 'yearsOfExperience' || key === 'sessionDuration') && value !== null && value !== '') {
        dbData[dbKey] = typeof value === 'number' ? value : parseInt(value as string, 10);
      }
      else if (key === 'baseRate' && value !== null && value !== '') {
        dbData[dbKey] = parseFloat(value as string).toString();
      }
      // Handle all other fields including LOMA settings
      else {
        dbData[dbKey] = value;
      }
    } else if (!dbKey && process.env.NODE_ENV === 'development') {
      console.warn(`[TRANSFORM-WARNING] No database mapping found for field: ${key}`);
    }
  });
  
  return dbData;
};

export const transformFromDatabase = (dbData: Partial<ProfileDatabase>) => {
  const parseJsonSafely = (jsonString: string | null | undefined): any[] => {
    if (!jsonString) return [];
    try {
      return JSON.parse(jsonString);
    } catch {
      return [];
    }
  };

  // Business address parsing no longer needed since fields removed

  return {
    id: dbData.id || 0,
    username: dbData.username || '',
    name: dbData.name || '',
    title: dbData.title,
    license: dbData.license,
    
    // Contact Information
    email: dbData.email,
    phone: dbData.phone,
    personalPhone: dbData.personalphone,
    personalEmail: dbData.personalemail,
    
    // Address
    address: dbData.address,
    city: dbData.city,
    state: dbData.state,
    zipCode: dbData.zipcode,
    
    // Demographics
    gender: dbData.gender,
    race: dbData.race,
    
    // Professional Info
    specialties: parseJsonSafely(dbData.specialties),
    biography: dbData.biography,
    yearsOfExperience: dbData.yearsofexperience,
    qualifications: dbData.qualifications,
    
    // Practice Details
    languages: parseJsonSafely(dbData.languages),
    sessionFormat: dbData.sessionformat,
    baseRate: dbData.baserate ? parseFloat(dbData.baserate) : undefined,
    slidingScale: dbData.slidingscale,
    therapistIdentities: parseJsonSafely(dbData.therapistidentities),
    
    // Personal Identity (HIPAA)
    ssn: dbData.ssn,
    dateOfBirth: dbData.dateofbirth,
    birthCity: dbData.birthcity,
    birthState: dbData.birthstate,
    birthCountry: dbData.birthcountry,
    isUsCitizen: dbData.isuscitizen === 1,
    workPermitVisa: dbData.workpermitvisa,
    
    // Professional Credentials
    npiNumber: dbData.npinumber,
    taxonomyCode: dbData.taxonomycode,
    einNumber: dbData.ein,
    legalBusinessName: dbData.legal_business_name,
    
    // LOMA Settings
    defaultNoteFormat: dbData.default_note_format,
    sessionDuration: dbData.session_duration,
    timeZone: dbData.time_zone,
    
    // CV Files
    cvFilename: dbData.cvfilename,
    cvOriginalName: dbData.cvoriginalname,
    cvMimeType: dbData.cvmimetype,
    
    createdAt: dbData.created_at ? (typeof dbData.created_at === 'string' ? dbData.created_at : dbData.created_at.toISOString()) : new Date().toISOString()
  };
};