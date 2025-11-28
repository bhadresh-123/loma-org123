export type Address = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
};

export type RegistrationData = {
  nuccGrouping?: string; // e.g., "Behavioral Health & Social Service Providers"
  providerType?: string; // e.g., "Psychologist"
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  addressType?: string; // e.g., "Practice"
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  primaryPracticeState: string;
  birthDate: string;
  emailType?: string; // e.g., "Primary"
  email: string;
  emailConfirm: string;
  ssn?: string;
  npi: string;
  deaNumber?: string;
  licenseState: string;
  licenseNumber: string;
};

export type ProviderProfile = {
  identifiers: { npi: string; ssnLast4?: string; caqhId?: string };
  personal: { firstName: string; middleName?: string; lastName: string; suffix?: string; dob: string };
  contact: { email: string; phone: string };
  addresses: { practice: Address; mailing?: Address };
  licensure: Array<{ state: string; number: string; expires: string }>;
  education: Array<{ school: string; degree: string; start: string; end: string }>;
  employment: Array<{ org: string; start: string; end?: string; address?: Address }>;
  malpractice: { carrier?: string; policyNumber?: string; start?: string; end?: string };
  disclosures: Record<string, 'YES' | 'NO' | 'N/A'>;
  registration?: RegistrationData;
};

