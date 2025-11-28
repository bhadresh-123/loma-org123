/**
 * PHI Protection Middleware - Consolidated
 * 
 * Single source of truth for all PHI protection and HIPAA compliance:
 * - PHI detection and anonymization
 * - HIPAA compliance headers
 * - Field-level encryption/decryption
 * - PHI access auditing
 * 
 * Consolidates: enhanced-phi-protection.ts, hipaa-middleware.ts, phi-encryption-middleware.ts
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PHIEntity {
  type: string;
  value: string;
  replacement: string;
  position: number;
  length: number;
}

interface PHIProcessingResult {
  original: string;
  anonymized: string;
  entities: PHIEntity[];
  riskLevel: 'low' | 'medium' | 'high';
  requiresReview: boolean;
}

// ============================================================================
// PHI DETECTION AND ANONYMIZATION
// ============================================================================

/**
 * PHI detection patterns for various types of protected information
 */
const PHI_PATTERNS = [
  {
    type: 'name',
    regex: /\b[A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
    replacement: '[CLIENT_NAME]',
    riskLevel: 'high' as const
  },
  {
    type: 'email',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[EMAIL]',
    riskLevel: 'high' as const
  },
  {
    type: 'phone',
    regex: /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
    replacement: '[PHONE]',
    riskLevel: 'high' as const
  },
  {
    type: 'ssn',
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[SSN]',
    riskLevel: 'high' as const
  },
  {
    type: 'address',
    regex: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Circle|Ct|Court)\b/g,
    replacement: '[ADDRESS]',
    riskLevel: 'high' as const
  },
  {
    type: 'date',
    regex: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
    replacement: '[DATE]',
    riskLevel: 'medium' as const
  },
  {
    type: 'medical_record',
    regex: /\b(?:MRN|Medical Record|Patient ID|Chart)\s*#?\s*\d+\b/gi,
    replacement: '[MEDICAL_RECORD]',
    riskLevel: 'high' as const
  },
  {
    type: 'insurance',
    regex: /\b(?:Insurance|Policy|Member ID)\s*#?\s*[A-Z0-9]+\b/gi,
    replacement: '[INSURANCE]',
    riskLevel: 'high' as const
  },
  {
    type: 'diagnosis',
    regex: /\b(?:ICD-10|DSM-5|Diagnosis)\s*[A-Z0-9.-]+\b/gi,
    replacement: '[DIAGNOSIS_CODE]',
    riskLevel: 'medium' as const
  }
];

/**
 * Process text to detect and anonymize PHI
 */
export function processPHI(text: string): PHIProcessingResult {
  const entities: PHIEntity[] = [];
  let anonymized = text;
  let maxRiskLevel: 'low' | 'medium' | 'high' = 'low';

  for (const pattern of PHI_PATTERNS) {
    const matches = [...text.matchAll(pattern.regex)];
    
    for (const match of matches) {
      if (match.index !== undefined) {
        entities.push({
          type: pattern.type,
          value: match[0],
          replacement: pattern.replacement,
          position: match.index,
          length: match[0].length
        });

        // Update max risk level
        if (pattern.riskLevel === 'high') {
          maxRiskLevel = 'high';
        } else if (pattern.riskLevel === 'medium' && maxRiskLevel !== 'high') {
          maxRiskLevel = 'medium';
        }

        // Replace in anonymized text
        anonymized = anonymized.replace(match[0], pattern.replacement);
      }
    }
  }

  return {
    original: text,
    anonymized,
    entities,
    riskLevel: maxRiskLevel,
    requiresReview: maxRiskLevel === 'high'
  };
}

/**
 * Middleware to detect and anonymize PHI in AI requests
 * Protects PHI from being sent to external AI APIs
 */
export const protectAIRequests = (req: Request, res: Response, next: NextFunction) => {
  // Only apply to AI-related endpoints
  if (!req.path.includes('/ai-assistant') && !req.path.includes('/ai')) {
    return next();
  }

  try {
    let phiDetected = false;
    
    // Check request body for PHI
    if (req.body) {
      const bodyString = JSON.stringify(req.body);
      const result = processPHI(bodyString);

      if (result.entities.length > 0) {
        console.warn(`[PHI-PROTECTION] Detected ${result.entities.length} PHI entities in AI request`);
        console.warn(`[PHI-PROTECTION] Risk level: ${result.riskLevel}`);

        // Store original for audit
        (req as any).originalBody = req.body;
        (req as any).phiDetected = result.entities;

        // Replace body with anonymized version
        try {
          req.body = JSON.parse(result.anonymized);
          phiDetected = true;
        } catch (error) {
          console.error('[PHI-PROTECTION] Failed to parse anonymized body:', error);
        }
      }
    }

    // Add PHI protection headers
    res.set({
      'X-PHI-Protection': 'enabled',
      'X-PHI-Sanitized': phiDetected ? 'true' : 'false'
    });

    next();
  } catch (error) {
    console.error('[PHI-PROTECTION] Error in AI request protection:', error);
    next(); // Don't block request if protection fails
  }
};

// ============================================================================
// HIPAA COMPLIANCE HEADERS
// ============================================================================

/**
 * Add HIPAA compliance headers to responses
 */
export const hipaaHeaders = (req: Request, res: Response, next: NextFunction) => {
  // HIPAA compliance indicators
  res.setHeader('X-HIPAA-Compliant', 'true');
  res.setHeader('X-PHI-Protected', 'true');
  
  // Cache control for PHI protection
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  next();
};

// ============================================================================
// FIELD-LEVEL ENCRYPTION/DECRYPTION
// ============================================================================

/**
 * PHI field mappings for HIPAA tables
 */
const HIPAA_PHI_FIELD_MAPPINGS = {
  therapist_phi: {
    encrypt: [
      'therapistSsnEncrypted',
      'therapistDobEncrypted',
      'therapistGenderEncrypted',
      'therapistRaceEncrypted',
      'therapistHomeAddressEncrypted',
      'therapistHomeCityEncrypted',
      'therapistHomeStateEncrypted',
      'therapistHomeZipEncrypted',
      'therapistPersonalPhoneEncrypted',
      'therapistPersonalEmailEncrypted',
      'therapistBirthCityEncrypted',
      'therapistBirthStateEncrypted',
      'therapistBirthCountryEncrypted',
      'therapistWorkPermitVisaEncrypted',
      'therapistEmergencyContactNameEncrypted',
      'therapistEmergencyContactPhoneEncrypted',
      'therapistEmergencyContactRelationshipEncrypted'
    ],
    searchHash: ['therapistPersonalPhoneEncrypted', 'therapistPersonalEmailEncrypted'],
    decrypt: [
      'therapistSsnEncrypted',
      'therapistDobEncrypted',
      'therapistGenderEncrypted',
      'therapistRaceEncrypted',
      'therapistPersonalPhoneEncrypted',
      'therapistPersonalEmailEncrypted'
    ]
  },
  patients: {
    encrypt: [
      'patientContactEmailEncrypted',
      'patientContactPhoneEncrypted',
      'patientHomeAddressEncrypted',
      'patientHomeCityEncrypted',
      'patientHomeStateEncrypted',
      'patientHomeZipEncrypted',
      'patientDobEncrypted',
      'patientGenderEncrypted',
      'patientRaceEncrypted',
      'patientEthnicityEncrypted',
      'patientPronounsEncrypted',
      'patientHometownEncrypted',
      'patientClinicalNotesEncrypted',
      'patientDiagnosisCodesEncrypted',
      'patientPrimaryDiagnosisEncrypted',
      'patientSecondaryDiagnosisEncrypted',
      'patientTertiaryDiagnosisEncrypted',
      'patientMedicalHistoryEncrypted',
      'patientTreatmentHistoryEncrypted',
      'patientReferringPhysicianEncrypted',
      'patientReferringPhysicianNpiEncrypted',
      'patientInsuranceProviderEncrypted',
      'patientInsuranceInfoEncrypted',
      'patientMemberIdEncrypted',
      'patientGroupNumberEncrypted',
      'patientPrimaryInsuredNameEncrypted',
      'patientPrimaryInsuredDobEncrypted',
      'patientAuthorizationInfoEncrypted',
      'patientPriorAuthNumberEncrypted'
    ],
    searchHash: ['patientContactEmailEncrypted', 'patientContactPhoneEncrypted'],
    decrypt: [
      'patientContactEmailEncrypted',
      'patientContactPhoneEncrypted',
      'patientDobEncrypted',
      'patientGenderEncrypted',
      'patientClinicalNotesEncrypted'
    ]
  },
  clinical_sessions: {
    encrypt: [
      'sessionClinicalNotesEncrypted',
      'sessionSubjectiveNotesEncrypted',
      'sessionObjectiveNotesEncrypted',
      'sessionAssessmentNotesEncrypted',
      'sessionPlanNotesEncrypted',
      'sessionTreatmentGoalsEncrypted',
      'sessionProgressNotesEncrypted',
      'sessionInterventionsEncrypted'
    ],
    searchHash: [],
    decrypt: [
      'sessionClinicalNotesEncrypted',
      'sessionSubjectiveNotesEncrypted',
      'sessionObjectiveNotesEncrypted',
      'sessionAssessmentNotesEncrypted',
      'sessionPlanNotesEncrypted'
    ]
  },
  patient_treatment_plans: {
    encrypt: [
      'treatmentPlanContentEncrypted',
      'treatmentPlanGoalsEncrypted',
      'treatmentPlanObjectivesEncrypted',
      'treatmentPlanInterventionsEncrypted',
      'treatmentPlanProgressNotesEncrypted',
      'treatmentPlanDiagnosisEncrypted',
      'treatmentPlanAssessmentEncrypted'
    ],
    searchHash: [],
    decrypt: [
      'treatmentPlanContentEncrypted',
      'treatmentPlanGoalsEncrypted',
      'treatmentPlanObjectivesEncrypted'
    ]
  }
};

/**
 * Middleware to encrypt PHI fields before database operations
 */
export const encryptPHIFields = (tableName: keyof typeof HIPAA_PHI_FIELD_MAPPINGS) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mapping = HIPAA_PHI_FIELD_MAPPINGS[tableName];
      if (!mapping || !req.body) {
        return next();
      }
      
      const { encryptPHI, createSearchHash } = await import('../utils/phi-encryption');
      
      let encryptedFields = 0;
      const fieldsAccessed: string[] = [];
      
      // Process each field that needs encryption
      mapping.encrypt.forEach(field => {
        if (req.body[field] && typeof req.body[field] === 'string' && req.body[field].trim() !== '') {
          try {
            // Encrypt the field
            req.body[field] = encryptPHI(req.body[field]);
            
            // Create search hash if applicable
            if (mapping.searchHash.includes(field)) {
              const hashFieldName = field.replace('Encrypted', 'SearchHash');
              req.body[hashFieldName] = createSearchHash(req.body[field]);
            }
            
            encryptedFields++;
            fieldsAccessed.push(field);
          } catch (error) {
            console.error(`Failed to encrypt HIPAA field ${field}:`, error);
            return res.status(500).json({
              error: 'HIPAA_ENCRYPTION_FAILED',
              message: `Failed to encrypt sensitive PHI data for field: ${field}`
            });
          }
        }
      });
      
      if (encryptedFields > 0) {
        console.log(`[HIPAA-ENCRYPTION] Encrypted ${encryptedFields} PHI fields for ${tableName}`);
        (req as any).hipaaFieldsAccessed = fieldsAccessed;
      }
      
      next();
    } catch (error) {
      console.error('HIPAA encryption middleware error:', error);
      return res.status(500).json({
        error: 'HIPAA_MIDDLEWARE_ERROR',
        message: 'Failed to process PHI encryption'
      });
    }
  };
};

/**
 * Middleware to decrypt PHI fields in response data
 * NOTE: This intercepts the response and decrypts BEFORE sending to client
 */
export const decryptPHIFields = (tableName: keyof typeof HIPAA_PHI_FIELD_MAPPINGS) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    
    // Override res.json to decrypt before sending
    res.json = async function(data: any): Promise<Response> {
      try {
        const mapping = HIPAA_PHI_FIELD_MAPPINGS[tableName];
        if (!mapping || !data) {
          return originalJson(data);
        }

        const { decryptPHI } = await import('../utils/phi-encryption');
        
        // Decrypt PHI fields in response
        const decryptField = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          
          mapping.decrypt.forEach(field => {
            if (obj[field] && typeof obj[field] === 'string') {
              try {
                obj[field] = decryptPHI(obj[field]);
              } catch (error) {
                console.error(`Failed to decrypt HIPAA field ${field}:`, error);
                obj[field] = null;
              }
            }
          });
        };

        // Handle single object or array
        if (Array.isArray(data)) {
          data.forEach(item => decryptField(item));
        } else {
          decryptField(data);
        }
        
        return originalJson(data);
      } catch (error) {
        console.error('HIPAA decryption middleware error:', error);
        return originalJson(data);
      }
    } as any; // Type assertion needed due to async override
    
    next();
  };
};

// ============================================================================
// CONSOLIDATED EXPORTS
// ============================================================================

/**
 * PHI protection middleware object - single namespace for PHI controls
 */
export const phiProtectionMiddleware = {
  // PHI detection and anonymization
  protectAIRequests,
  processPHI,
  
  // HIPAA headers
  hipaaHeaders,
  
  // Field-level encryption/decryption
  encryptPHIFields,
  decryptPHIFields,
  
  // PHI patterns (for external use)
  PHI_PATTERNS
};

