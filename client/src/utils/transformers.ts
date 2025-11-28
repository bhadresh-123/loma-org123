// Data transformation utilities
// Converts between database snake_case and frontend camelCase

import { UserProfile, DatabaseUser } from '../types/user';

/**
 * Transforms raw database user response to proper camelCase interface
 */
export function transformUserResponse(dbUser: DatabaseUser): UserProfile {
  return {
    id: dbUser.id,
    username: dbUser.username,
    name: dbUser.name,
    title: dbUser.title,
    license: dbUser.license,
    specialties: dbUser.specialties,
    createdAt: dbUser.created_at,
    email: dbUser.email,
    phone: dbUser.phone,
    address: dbUser.address,
    city: dbUser.city,
    state: dbUser.state,
    zipCode: dbUser.zipcode,
    gender: dbUser.gender,
    race: dbUser.race,
    personalPhone: dbUser.personalphone,
    personalEmail: dbUser.personalemail,
    biography: dbUser.biography,
    yearsOfExperience: dbUser.yearsofexperience,
    qualifications: dbUser.qualifications,
    
    // Credentialing fields
    ssn: dbUser.ssn,
    dateOfBirth: dbUser.dateofbirth,
    birthCity: dbUser.birthcity,
    birthState: dbUser.birthstate,
    birthCountry: dbUser.birthcountry,
    isUsCitizen: dbUser.isuscitizen,
    workPermitVisa: dbUser.workpermitvisa,
    npiNumber: dbUser.npinumber,
    taxonomyCode: dbUser.taxonomycode,
    
    // CV Upload
    cvFilename: dbUser.cvfilename,
    cvOriginalName: dbUser.cvoriginalname,
    cvMimeType: dbUser.cvmimetype,
    
    // Practice details
    languages: dbUser.languages,
    sessionFormat: dbUser.sessionformat,
    baseRate: dbUser.baserate,
    slidingScale: dbUser.slidingscale,
    therapistIdentities: dbUser.therapistidentities,
    
    // Business information from database
    einNumber: dbUser.ein,
    legalBusinessName: dbUser.legal_business_name,
    businessAddress: dbUser.business_mailing_address,
    businessCity: null, // Will extract from business_mailing_address if needed
    businessState: dbUser.incorporation_state,
    businessZipCode: null, // Will extract from business_mailing_address if needed
    
    // LOMA Settings
    defaultNoteFormat: dbUser.default_note_format,
    sessionDuration: dbUser.session_duration,
    timeZone: dbUser.time_zone,
  };
}

/**
 * Transforms frontend camelCase update data to backend snake_case
 */
export function transformUpdateRequest(updateData: Partial<UserProfile>): Record<string, any> {
  const transformed: Record<string, any> = {};
  
  // Map camelCase keys to snake_case
  const fieldMapping: Record<string, string> = {
    dateOfBirth: 'dateOfBirth',
    birthCity: 'birthCity', 
    birthState: 'birthState',
    birthCountry: 'birthCountry',
    isUsCitizen: 'isUsCitizen',
    workPermitVisa: 'workPermitVisa',
    npiNumber: 'npiNumber',
    taxonomyCode: 'taxonomyCode',
    zipCode: 'zipCode',
    personalPhone: 'personalPhone',
    personalEmail: 'personalEmail',
    yearsOfExperience: 'yearsOfExperience',
    sessionFormat: 'sessionFormat',
    baseRate: 'baseRate',
    slidingScale: 'slidingScale',
    therapistIdentities: 'therapistIdentities'
  };
  
  Object.keys(updateData).forEach(key => {
    const mappedKey = fieldMapping[key] || key;
    transformed[mappedKey] = updateData[key as keyof UserProfile];
  });
  
  return transformed;
}