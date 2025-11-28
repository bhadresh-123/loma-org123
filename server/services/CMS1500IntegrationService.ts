import { ProfileService } from './ProfileService';
import { db } from '@db';
import { getActiveSchema } from '@db';
import { eq } from 'drizzle-orm';

/**
 * CMS-1500 Integration Service using the new clean profile system
 * Replaces hardcoded profile data with ProfileService integration
 */
export class CMS1500IntegrationService {
  /**
   * Generate CMS-1500 claim data using the new profile system
   */
  static async generateClaimFromSession(userId: number, sessionId: number) {
    try {
      // Get practitioner profile from new system
      const profile = await ProfileService.getProfileForIntegration(userId);
      if (!profile) {
        throw new Error('Practitioner profile not found');
      }

      // Get session data using HIPAA schema
      const schema = getActiveSchema();
      
      // Check if required tables exist in current schema
      if (!schema.clinicalSessions || !schema.patients) {
        console.log('Required tables not available in HIPAA schema - skipping CMS-1500 claim generation');
        return null;
      }

      const session = await db.query.clinicalSessions.findFirst({
        where: eq(schema.clinicalSessions.id, sessionId),
        with: {
          patient: true
        }
      });

      if (!session || session.userId !== userId) {
        throw new Error('Session not found or access denied');
      }

      // Get client insurance details if available
      const clientInsurance = await db.query.clientInsuranceDetails.findFirst({
        where: eq(clientInsuranceDetails.patientId, session.patientId)
      });

      // Generate claim number
      const claimNumber = `CMS${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      // Build CMS-1500 claim data using ProfileService integration
      const claimData = {
        userId,
        patientId: session.patientId,
        sessionId,
        claimNumber,
        
        // Patient Information (from patient record)
        patientName: session.patient?.name || '',
        patientDateOfBirth: session.patient?.dateOfBirth || null,
        patientAddress: session.patient?.address || '',
        patientCity: session.patient?.city || '',
        patientState: session.patient?.state || '',
        patientZip: session.patient?.zipCode || '',
        patientPhone: session.patient?.phone || '',
        patientSex: session.patient?.gender || '',
        
        // Insurance Information (from client insurance details)
        primaryInsuranceName: clientInsurance?.primaryInsuranceName || '',
        primaryPolicyNumber: clientInsurance?.primaryPolicyNumber || '',
        primaryGroupNumber: clientInsurance?.primaryGroupNumber || '',
        primaryInsuredName: clientInsurance?.primaryInsuredName || session.patient?.name || '',
        primaryInsuredDateOfBirth: clientInsurance?.primaryInsuredDateOfBirth || session.patient?.dateOfBirth || null,
        relationshipToInsured: clientInsurance?.relationshipToInsured || 'self',
        
        // Provider Information (from ProfileService)
        renderingProviderName: profile.basic.name,
        renderingProviderNpi: profile.credentialing.npiNumber,
        renderingProviderAddress: profile.practice.address,
        renderingProviderCity: profile.practice.city,
        renderingProviderState: profile.practice.state,
        renderingProviderZip: profile.practice.zipCode,
        renderingProviderPhone: profile.practice.personalPhone,
        
        // Billing Provider (same as rendering for private practice)
        billingProviderName: profile.credentialing.legalBusinessName || profile.basic.name,
        billingProviderNpi: profile.credentialing.npiNumber,
        billingProviderAddress: profile.practice.address,
        billingProviderCity: profile.practice.city,
        billingProviderState: profile.practice.state,
        billingProviderZip: profile.practice.zipCode,
        billingProviderPhone: profile.practice.personalPhone,
        billingProviderEin: profile.credentialing.einNumber,
        
        // Service Information
        dateOfService: session.date,
        placeOfService: '11', // Office
        cptCode: session.cptCode || '90834', // Default psychotherapy code
        charges: session.cost || profile.practice.baseRate || 150,
        units: 1,
        
        // Diagnosis
        primaryDiagnosisCode: session.primaryDiagnosis || 'F41.1', // Default anxiety
        
        // Additional fields
        taxonomyCode: profile.credentialing.taxonomyCode,
        providerSignatureOnFile: true,
        acceptAssignment: profile.insurance.isInsuranceProvider,
        
        // Status and tracking
        status: 'draft',
        submissionDate: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return claimData;
      
    } catch (error) {
      console.error('CMS-1500 generation failed:', error);
      throw new Error(`Failed to generate CMS-1500 claim: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate that all required profile data is available for CMS-1500 generation
   */
  static async validateProfileForCMS1500(userId: number) {
    try {
      const schema = getActiveSchema();
      
      // Check if required tables exist in current schema
      if (!schema.clinicalSessions || !schema.patients) {
        console.log('Required tables not available in HIPAA schema - skipping CMS-1500 profile validation');
        return { isValid: false, missingFields: ['Required tables not available'] };
      }

      const profile = await ProfileService.getProfileForIntegration(userId);
      if (!profile) {
        return {
          isValid: false,
          missingFields: ['profile'],
          message: 'No profile data found'
        };
      }

      const requiredFields = [
        { field: 'basic.name', value: profile.basic.name },
        { field: 'credentialing.npiNumber', value: profile.credentialing.npiNumber },
        { field: 'practice.address', value: profile.practice.address },
        { field: 'practice.city', value: profile.practice.city },
        { field: 'practice.state', value: profile.practice.state },
        { field: 'practice.zipCode', value: profile.practice.zipCode },
        { field: 'credentialing.taxonomyCode', value: profile.credentialing.taxonomyCode },
      ];

      const missingFields = requiredFields
        .filter(({ value }) => !value || value.trim() === '')
        .map(({ field }) => field);

      return {
        isValid: missingFields.length === 0,
        missingFields,
        message: missingFields.length > 0 
          ? `Missing required fields: ${missingFields.join(', ')}` 
          : 'Profile validation passed'
      };

    } catch (error) {
      console.error('Profile validation failed:', error);
      return {
        isValid: false,
        missingFields: ['profile'],
        message: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  /**
   * Get formatted provider information for CMS-1500 forms
   */
  static async getProviderInfo(userId: number) {
    const profile = await ProfileService.getProfileForIntegration(userId);
    if (!profile) {
      throw new Error('Provider profile not found');
    }

    return {
      name: profile.basic.name,
      npi: profile.credentialing.npiNumber,
      taxonomy: profile.credentialing.taxonomyCode,
      address: {
        street: profile.practice.address,
        city: profile.practice.city,
        state: profile.practice.state,
        zip: profile.practice.zipCode
      },
      contact: {
        phone: profile.practice.personalPhone,
        email: profile.practice.personalEmail
      },
      business: {
        name: profile.credentialing.legalBusinessName || profile.basic.name,
        ein: profile.credentialing.einNumber
      }
    };
  }
}