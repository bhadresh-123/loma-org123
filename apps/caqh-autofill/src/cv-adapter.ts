import type { ProviderProfile, RegistrationData } from './mapping.js';

/**
 * Adapter to convert parsed CV data from database to CAQH ProviderProfile format
 * 
 * Input structure from /api/cv-parser/data:
 * {
 *   personalInfo?: {
 *     firstName?: string;
 *     middleName?: string;
 *     lastName?: string;
 *     email?: string;
 *     phone?: string;
 *     address?: string;
 *     city?: string;
 *     state?: string;
 *     zipCode?: string;
 *     dateOfBirth?: string;
 *   };
 *   licenses?: Array<{
 *     state: string;
 *     number: string;
 *     type?: string;
 *     expirationDate?: string;
 *   }>;
 *   certifications?: Array<{
 *     name: string;
 *     number?: string;
 *   }>;
 *   education: Array<{
 *     university: string;
 *     degree: string;
 *     major: string;
 *     startDate: string | null;
 *     endDate: string | null;
 *     graduationDate: string | null;
 *     gpa: string | null;
 *     honors: string | null;
 *   }>;
 *   workExperience: Array<{
 *     organization: string;
 *     position: string;
 *     location: string | null;
 *     startDate: string | null;
 *     endDate: string | null;
 *     isCurrent: boolean;
 *     description: string | null;
 *   }>;
 * }
 */
export function adaptCvToProfile(cvData: any): ProviderProfile {
  console.log('[CAQH Adapter] Mapping CV data to CAQH profile');
  console.log('[CAQH Adapter] Input data:', JSON.stringify(cvData, null, 2).substring(0, 500) + '...');
  
  // Extract personal information
  const personalInfo = cvData?.personalInfo || {};
  
  // Parse name - handle both split names and full name string
  let firstName = personalInfo.firstName || '';
  let middleName = personalInfo.middleName || '';
  let lastName = personalInfo.lastName || '';
  
  // If name is a single string, try to split it
  if (!firstName && !lastName && personalInfo.name) {
    const nameParts = personalInfo.name.trim().split(/\s+/);
    if (nameParts.length === 1) {
      firstName = nameParts[0];
    } else if (nameParts.length === 2) {
      firstName = nameParts[0];
      lastName = nameParts[1];
    } else if (nameParts.length >= 3) {
      firstName = nameParts[0];
      middleName = nameParts.slice(1, -1).join(' ');
      lastName = nameParts[nameParts.length - 1];
    }
  }
  
  const email = personalInfo.email || '';
  const phone = personalInfo.phone || '';
  const dob = personalInfo.dateOfBirth || '';
  
  console.log('[CAQH Adapter] Parsed name:', { firstName, middleName, lastName });
  
  // Extract address information
  const addressLine1 = personalInfo.address || '';
  const city = personalInfo.city || '';
  const state = personalInfo.state || '';
  const zip = personalInfo.zipCode || '';
  
  // Extract license information
  const licenses = cvData?.licenses || [];
  const primaryLicense = licenses[0] || {};
  const licenseState = primaryLicense.state || state || '';
  const licenseNumber = primaryLicense.number || '';
  
  // Extract NPI from certifications
  const certifications = cvData?.certifications || [];
  const npiCert = certifications.find((cert: any) => 
    cert.name?.toLowerCase().includes('npi') || 
    cert.name?.toLowerCase().includes('national provider identifier')
  );
  const npi = npiCert?.number || '';
  
  // Extract DEA from certifications
  const deaCert = certifications.find((cert: any) => 
    cert.name?.toLowerCase().includes('dea')
  );
  const deaNumber = deaCert?.number || '';
  
  // Map education data to match ProviderProfile format
  const education = (cvData?.education || []).map((edu: any) => ({
    school: edu.university || '',
    degree: edu.degree || '',
    start: edu.startDate || '',
    end: edu.graduationDate || edu.endDate || '',
  }));

  // Map work experience data to match ProviderProfile format
  const employment = (cvData?.workExperience || []).map((work: any) => ({
    org: work.organization || '',
    start: work.startDate || '',
    end: work.isCurrent ? undefined : (work.endDate || undefined),
  }));

  // Map licensure data
  const licensure = licenses.map((lic: any) => ({
    state: lic.state || '',
    number: lic.number || '',
    expires: lic.expirationDate || '',
  }));

  console.log('[CAQH Adapter] Mapped', education.length, 'education entries,', employment.length, 'employment entries, and', licensure.length, 'licenses');

  // Build registration data for self-registration form
  const registration: RegistrationData = {
    // Default to Psychologist for now - can be enhanced later
    nuccGrouping: 'Behavioral Health & Social Service Providers',
    providerType: 'Psychologist',
    firstName,
    middleName,
    lastName,
    addressType: 'Practice',
    street1: addressLine1,
    city,
    state,
    zip,
    primaryPracticeState: state,
    birthDate: dob,
    emailType: 'Primary',
    email,
    emailConfirm: email,
    npi,
    deaNumber,
    licenseState,
    licenseNumber,
  };
  
  console.log('[CAQH Adapter] Registration data created:', JSON.stringify(registration, null, 2));

  return {
    identifiers: { 
      npi,
    },
    personal: {
      firstName,
      middleName,
      lastName,
      dob,
    },
    contact: { 
      email, 
      phone 
    },
    addresses: { 
      practice: { 
        line1: addressLine1, 
        city, 
        state, 
        zip 
      } 
    },
    licensure,
    education,
    employment,
    malpractice: {},
    disclosures: {},
    registration,
  };
}

