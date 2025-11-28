// User Profile Type Definitions
// Proper camelCase interfaces for type safety

// HIPAA-compliant user types
export interface UserAuth {
  id: number;
  username: string;
  email: string;
  accountStatus: 'active' | 'inactive' | 'suspended';
  mfaEnabled: boolean;
  lastLogin: string | null;
  failedLoginAttempts: number;
  accountLockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TherapistProfile {
  id: number;
  userId: number;
  name: string;
  title: string | null;
  licenseNumber: string | null;
  specialties: string | null;
  languages: string | null;
  sessionFormat: string | null;
  baseRate: string | null;
  slidingScale: boolean | null;
  therapistIdentities: string | null;
  biography: string | null;
  yearsOfExperience: number | null;
  qualifications: string | null;
  npiNumber: string | null;
  taxonomyCode: string | null;
  einNumber: string | null;
  legalBusinessName: string | null;
  businessAddress: string | null;
  businessCity: string | null;
  businessState: string | null;
  businessZipCode: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  cvFilename: string | null;
  cvOriginalName: string | null;
  cvMimeType: string | null;
  cvParsedForCredentialing: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface TherapistPHI {
  id: number;
  userId: number;
  ssnEncrypted: string | null;
  dateOfBirthEncrypted: string | null;
  personalAddressEncrypted: string | null;
  personalPhoneEncrypted: string | null;
  personalEmailEncrypted: string | null;
  genderEncrypted: string | null;
  raceEncrypted: string | null;
  birthCityEncrypted: string | null;
  birthStateEncrypted: string | null;
  birthCountryEncrypted: string | null;
  isUsCitizenEncrypted: string | null;
  workPermitVisaEncrypted: string | null;
  emergencyContactNameEncrypted: string | null;
  emergencyContactPhoneEncrypted: string | null;
  emergencyContactRelationshipEncrypted: string | null;
  createdAt: string;
  updatedAt: string;
}

// Legacy user profile (for backward compatibility)
export interface UserProfile {
  id: number;
  username: string;
  name: string;
  title: string | null;
  license: string | null;
  specialties: string;
  createdAt: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  gender: string;
  race: string;
  personalPhone: string;
  personalEmail: string;
  biography: string;
  yearsOfExperience: number | null;
  qualifications: string;
  
  // Credentialing fields
  ssn: string | null;
  dateOfBirth: string | null;
  birthCity: string | null;
  birthState: string | null;
  birthCountry: string | null;
  isUsCitizen: boolean | null;
  workPermitVisa: string | null;
  npiNumber: string | null;
  taxonomyCode: string | null;
  
  // CV Upload
  cvFilename: string | null;
  cvOriginalName: string | null;
  cvMimeType: string | null;
  
  // Practice details
  languages: string | null;
  sessionFormat: string | null;
  baseRate: string | null;
  slidingScale: boolean | null;
  therapistIdentities: string | null;
  
  // Business information for credentialing
  einNumber: string | null;
  legalBusinessName: string | null;
  businessAddress: string | null;
  businessCity: string | null;
  businessState: string | null;
  businessZipCode: string | null;
  
  // LOMA Settings
  defaultNoteFormat: string | null;
  sessionDuration: number | null;
  timeZone: string | null;
}

export interface PracticeDetails {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  gender: string;
  race: string;
  personalPhone: string;
  personalEmail: string;
  biography: string;
  yearsOfExperience: number | null;
  qualifications: string;
  languages: string[];
  sessionFormat: string;
  baseRate: string;
  slidingScale: boolean;
  therapistIdentities: string[];
  specialties: string[];
  insuranceAccepted: string[];
  defaultNoteFormat: string;
  
  // Extended practice settings
  sessionDuration?: number;
  timeZone?: string;
  isInsuranceProvider?: boolean;
  privatePayRate?: number;
  groupSessionRate?: number;
}

export interface CredentialingInfo {
  ssn: string;
  dateOfBirth: string;
  birthCity: string;
  birthState: string;
  birthCountry: string;
  isUsCitizen: boolean | null;
  workPermitVisa: string;
  npiNumber: string;
  taxonomyCode: string;
}

// Raw database user type (snake_case)
export interface DatabaseUser {
  id: number;
  username: string;
  name: string;
  title: string | null;
  license: string | null;
  specialties: string;
  created_at: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  gender: string;
  race: string;
  personalphone: string;
  personalemail: string;
  biography: string;
  yearsofexperience: number | null;
  qualifications: string;
  ssn: string | null;
  dateofbirth: string | null;
  birthcity: string | null;
  birthstate: string | null;
  birthcountry: string | null;
  isuscitizen: boolean | null;
  workpermitvisa: string | null;
  npinumber: string | null;
  taxonomycode: string | null;
  cvfilename: string | null;
  cvoriginalname: string | null;
  cvmimetype: string | null;
  languages: string | null;
  sessionformat: string | null;
  baserate: string | null;
  slidingscale: boolean | null;
  therapistidentities: string | null;
  
  // Business information fields from schema
  ein: string | null;
  legal_business_name: string | null;
  business_mailing_address: string | null;
  business_physical_address: string | null;
  incorporation_state: string | null;
  business_entity: string | null;
  
  // LOMA Settings (snake_case database format)
  default_note_format: string | null;
  session_duration: number | null;
  time_zone: string | null;
}