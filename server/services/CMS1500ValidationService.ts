import { z } from 'zod';

// CMS-1500 Field Validation Service
export class CMS1500ValidationService {
  
  // Comprehensive validation schema for CMS-1500 claims
  static readonly claimValidationSchema = z.object({
    // Box 1 - Insurance Type (Required)
    insuranceType: z.enum(['Medicare', 'Medicaid', 'Tricare', 'Champva', 'Group Health Plan', 'FECA', 'Other'], {
      required_error: 'Insurance type is required',
      invalid_type_error: 'Invalid insurance type'
    }),

    // Box 1a - Insured's ID Number (Required)
    insuranceIdNumber: z.string()
      .min(1, 'Insurance ID number is required')
      .max(20, 'Insurance ID number cannot exceed 20 characters')
      .regex(/^[A-Za-z0-9\-]+$/, 'Insurance ID can only contain letters, numbers, and hyphens'),

    // Box 2 - Patient's Name (Required)
    patientName: z.string()
      .min(1, 'Patient name is required')
      .max(35, 'Patient name cannot exceed 35 characters')
      .regex(/^[A-Za-z\s\-\.\']+$/, 'Patient name can only contain letters, spaces, hyphens, periods, and apostrophes'),

    // Box 3 - Patient's Date of Birth (Required)
    patientDateOfBirth: z.string()
      .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Date of birth must be in MM/DD/YYYY format')
      .refine((date) => {
        const parsed = new Date(date);
        const now = new Date();
        const maxAge = new Date(now.getFullYear() - 150, now.getMonth(), now.getDate());
        return parsed <= now && parsed >= maxAge;
      }, 'Invalid date of birth'),

    // Box 3 - Patient's Sex (Required)
    patientGender: z.enum(['M', 'F'], {
      required_error: 'Patient gender is required',
      invalid_type_error: 'Gender must be M or F'
    }),

    // Box 4 - Insured's Name (Required if different from patient)
    primaryInsuredName: z.string()
      .max(35, 'Insured name cannot exceed 35 characters')
      .regex(/^[A-Za-z\s\-\.\']*$/, 'Insured name can only contain letters, spaces, hyphens, periods, and apostrophes')
      .optional(),

    // Box 5 - Patient's Address (Required)
    patientAddress: z.string()
      .min(1, 'Patient address is required')
      .max(35, 'Address line cannot exceed 35 characters'),

    patientCity: z.string()
      .min(1, 'Patient city is required')
      .max(20, 'City cannot exceed 20 characters')
      .regex(/^[A-Za-z\s\-\.\']+$/, 'City can only contain letters, spaces, hyphens, periods, and apostrophes'),

    patientState: z.string()
      .length(2, 'State must be 2 characters')
      .regex(/^[A-Z]{2}$/, 'State must be uppercase 2-letter abbreviation'),

    patientZip: z.string()
      .regex(/^\d{5}(-\d{4})?$/, 'ZIP code must be in format 12345 or 12345-6789'),

    // Box 6 - Patient Relationship to Insured (Required)
    patientRelationshipToInsured: z.enum(['self', 'spouse', 'child', 'other'], {
      required_error: 'Patient relationship to insured is required'
    }),

    // Box 7 - Insured's Address (Required if different from patient)
    primaryInsuredAddress: z.string()
      .max(35, 'Insured address cannot exceed 35 characters')
      .optional(),

    // Box 8 - Reserved for NUCC Use (Should be empty)
    reservedForNUCC: z.string().max(0, 'Box 8 is reserved for NUCC use and must be empty').optional(),

    // Box 9 - Other Insured's Name (Optional)
    otherInsuredName: z.string()
      .max(35, 'Other insured name cannot exceed 35 characters')
      .regex(/^[A-Za-z\s\-\.\']*$/, 'Other insured name can only contain letters, spaces, hyphens, periods, and apostrophes')
      .optional(),

    // Box 10a-10c - Is condition related to... (Required)
    conditionRelatedToEmployment: z.boolean().default(false),
    conditionRelatedToAutoAccident: z.boolean().default(false),
    conditionRelatedToOtherAccident: z.boolean().default(false),

    // Box 10d - Auto Accident State (Required if auto accident = Yes)
    autoAccidentState: z.string()
      .length(2, 'State must be 2 characters')
      .regex(/^[A-Z]{2}$/, 'State must be uppercase 2-letter abbreviation')
      .optional(),

    // Box 11 - Insured's Policy Group Number (Required)
    insuranceGroupNumber: z.string()
      .min(1, 'Insurance group number is required')
      .max(20, 'Group number cannot exceed 20 characters'),

    // Box 12 - Patient's or Authorized Person's Signature (Required)
    signatureOnFile: z.boolean()
      .refine((val) => val === true, 'Patient signature authorization is required'),

    // Box 13 - Insured's or Authorized Person's Signature (Required)
    insuredSignatureOnFile: z.boolean()
      .refine((val) => val === true, 'Insured signature authorization is required'),

    // Box 14 - Date of Current Illness (Required for initial claims)
    dateOfCurrentIllness: z.string()
      .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Date must be in MM/DD/YYYY format')
      .optional(),

    // Box 15 - If patient has had same or similar illness (Optional)
    dateOfSimilarIllness: z.string()
      .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Date must be in MM/DD/YYYY format')
      .optional(),

    // Box 16 - Dates patient unable to work (Optional)
    datePatientUnableToWork: z.string()
      .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Date must be in MM/DD/YYYY format')
      .optional(),

    // Box 17 - Name of Referring Physician (Optional)
    referringPhysician: z.string()
      .max(35, 'Referring physician name cannot exceed 35 characters')
      .regex(/^[A-Za-z\s\-\.\']*$/, 'Physician name can only contain letters, spaces, hyphens, periods, and apostrophes')
      .optional(),

    // Box 17a - Referring Physician NPI (Required if referring physician provided)
    referringPhysicianNpi: z.string()
      .regex(/^\d{10}$/, 'NPI must be exactly 10 digits')
      .optional(),

    // Box 18 - Hospitalization Dates (Optional)
    hospitalizationDateFrom: z.string()
      .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Date must be in MM/DD/YYYY format')
      .optional(),

    hospitalizationDateTo: z.string()
      .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Date must be in MM/DD/YYYY format')
      .optional(),

    // Box 19 - Reserved for Local Use (Optional)
    reservedForLocalUse: z.string()
      .max(80, 'Reserved field cannot exceed 80 characters')
      .optional(),

    // Box 20 - Outside Lab (Required)
    outsideLab: z.boolean().default(false),
    labCharges: z.string()
      .regex(/^\d+\.\d{2}$/, 'Lab charges must be in format 00.00')
      .optional(),

    // Box 21 - Diagnosis Codes (Required - at least one)
    primaryDiagnosisCode: z.string()
      .min(1, 'Primary diagnosis code is required')
      .regex(/^[A-Z]\d{2}\.\d{1,2}$/, 'Diagnosis code must be valid ICD-10 format (A00.0)'),

    secondaryDiagnosisCode: z.string()
      .regex(/^[A-Z]\d{2}\.\d{1,2}$/, 'Secondary diagnosis code must be valid ICD-10 format')
      .optional(),

    tertiaryDiagnosisCode: z.string()
      .regex(/^[A-Z]\d{2}\.\d{1,2}$/, 'Tertiary diagnosis code must be valid ICD-10 format')
      .optional(),

    quaternaryDiagnosisCode: z.string()
      .regex(/^[A-Z]\d{2}\.\d{1,2}$/, 'Quaternary diagnosis code must be valid ICD-10 format')
      .optional(),

    // Box 22 - Resubmission Code (Optional)
    resubmissionCode: z.string()
      .max(10, 'Resubmission code cannot exceed 10 characters')
      .optional(),

    // Box 23 - Prior Authorization Number (Optional)
    priorAuthNumber: z.string()
      .max(20, 'Prior authorization number cannot exceed 20 characters')
      .optional(),

    // Box 24A - Date of Service (Required)
    dateOfService: z.string()
      .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Service date must be in MM/DD/YYYY format')
      .refine((date) => {
        const serviceDate = new Date(date);
        const now = new Date();
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        return serviceDate <= now && serviceDate >= oneYearAgo;
      }, 'Service date must be within the last year'),

    // Box 24B - Place of Service (Required)
    placeOfService: z.string()
      .regex(/^\d{2}$/, 'Place of service must be 2 digits')
      .refine((pos) => {
        const validPOS = ['11', '12', '02', '03', '04', '05', '06', '07', '08', '09', '10', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '31', '32', '33', '34', '41', '42', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '60', '61', '62', '65', '71', '72', '81', '99'];
        return validPOS.includes(pos);
      }, 'Invalid place of service code'),

    // Box 24D - Procedures/Services/Supplies (Required)
    cptCode: z.string()
      .regex(/^\d{5}$/, 'CPT code must be exactly 5 digits')
      .refine((code) => {
        // Basic CPT code validation - should be enhanced with actual CPT database
        const cptNum = parseInt(code);
        return cptNum >= 90000 && cptNum <= 99999; // Evaluation and Management codes
      }, 'Invalid CPT code for mental health services'),

    // Box 24E - Diagnosis Pointer (Required)
    diagnosisPointer: z.string()
      .regex(/^[1-4](,[1-4])*$/, 'Diagnosis pointer must be 1-4, separated by commas')
      .default('1'),

    // Box 24F - Charges (Required)
    chargeAmount: z.string()
      .regex(/^\d+\.\d{2}$/, 'Charge amount must be in format 00.00')
      .refine((amount) => {
        const charge = parseFloat(amount);
        return charge > 0 && charge <= 9999.99;
      }, 'Charge amount must be between 0.01 and 9999.99'),

    // Box 24G - Days or Units (Required)
    daysOrUnits: z.number()
      .int('Days or units must be a whole number')
      .min(1, 'Days or units must be at least 1')
      .max(999, 'Days or units cannot exceed 999')
      .default(1),

    // Box 24H - EPSDT Family Plan (Optional)
    epsdtFamilyPlan: z.string()
      .max(2, 'EPSDT family plan cannot exceed 2 characters')
      .optional(),

    // Box 24I - ID Qual (Optional)
    idQualifier: z.string()
      .max(2, 'ID qualifier cannot exceed 2 characters')
      .optional(),

    // Box 24J - Rendering Provider NPI (Required)
    renderingProviderNpi: z.string()
      .regex(/^\d{10}$/, 'Rendering provider NPI must be exactly 10 digits')
      .refine(async (npi) => {
        // This would be validated against NPPES in real implementation
        return true; // Placeholder for NPI validation
      }, 'Invalid NPI number'),

    // Box 25 - Federal Tax ID Number (Required)
    federalTaxId: z.string()
      .regex(/^\d{2}-\d{7}$/, 'Federal Tax ID must be in format 12-3456789'),

    // Box 26 - Patient's Account Number (Required)
    patientAccountNumber: z.string()
      .min(1, 'Patient account number is required')
      .max(20, 'Account number cannot exceed 20 characters'),

    // Box 27 - Accept Assignment (Required)
    acceptAssignment: z.boolean().default(true),

    // Box 28 - Total Charge (Required)
    totalCharge: z.string()
      .regex(/^\d+\.\d{2}$/, 'Total charge must be in format 00.00'),

    // Box 29 - Amount Paid (Optional)
    amountPaid: z.string()
      .regex(/^\d+\.\d{2}$/, 'Amount paid must be in format 00.00')
      .optional(),

    // Box 30 - Balance Due (Calculated)
    balanceDue: z.string()
      .regex(/^\d+\.\d{2}$/, 'Balance due must be in format 00.00')
      .optional(),

    // Box 31 - Signature of Physician (Required)
    physicianSignatureOnFile: z.boolean()
      .refine((val) => val === true, 'Physician signature is required'),

    // Box 32 - Service Facility Name and Address (Required if different from billing)
    serviceFacilityName: z.string()
      .max(35, 'Service facility name cannot exceed 35 characters')
      .optional(),

    serviceFacilityAddress: z.string()
      .max(35, 'Service facility address cannot exceed 35 characters')
      .optional(),

    serviceFacilityNpi: z.string()
      .regex(/^\d{10}$/, 'Service facility NPI must be exactly 10 digits')
      .optional(),

    // Box 33 - Billing Provider Info (Required)
    billingProviderName: z.string()
      .min(1, 'Billing provider name is required')
      .max(35, 'Billing provider name cannot exceed 35 characters'),

    billingProviderAddress: z.string()
      .min(1, 'Billing provider address is required')
      .max(35, 'Billing provider address cannot exceed 35 characters'),

    billingProviderCity: z.string()
      .min(1, 'Billing provider city is required')
      .max(20, 'Billing provider city cannot exceed 20 characters'),

    billingProviderState: z.string()
      .length(2, 'Billing provider state must be 2 characters')
      .regex(/^[A-Z]{2}$/, 'State must be uppercase 2-letter abbreviation'),

    billingProviderZip: z.string()
      .regex(/^\d{5}(-\d{4})?$/, 'ZIP code must be in format 12345 or 12345-6789'),

    billingProviderNpi: z.string()
      .regex(/^\d{10}$/, 'Billing provider NPI must be exactly 10 digits'),
  });

  // Validate cross-field dependencies
  static validateCrossFieldRules(data: any): string[] {
    const errors: string[] = [];

    // Auto accident state required if auto accident is true
    if (data.conditionRelatedToAutoAccident && !data.autoAccidentState) {
      errors.push('Auto accident state is required when condition is related to auto accident');
    }

    // Referring physician NPI required if referring physician provided
    if (data.referringPhysician && !data.referringPhysicianNpi) {
      errors.push('Referring physician NPI is required when referring physician is provided');
    }

    // Hospitalization date validation
    if (data.hospitalizationDateFrom && data.hospitalizationDateTo) {
      const fromDate = new Date(data.hospitalizationDateFrom);
      const toDate = new Date(data.hospitalizationDateTo);
      if (fromDate > toDate) {
        errors.push('Hospitalization end date must be after start date');
      }
    }

    // Lab charges required if outside lab is true
    if (data.outsideLab && !data.labCharges) {
      errors.push('Lab charges are required when outside lab is selected');
    }

    // Service facility info required if different from billing
    if (data.serviceFacilityName && (!data.serviceFacilityAddress || !data.serviceFacilityNpi)) {
      errors.push('Service facility address and NPI are required when facility name is provided');
    }

    // Total charge should equal sum of line items
    if (data.totalCharge && data.chargeAmount) {
      const total = parseFloat(data.totalCharge);
      const lineTotal = parseFloat(data.chargeAmount) * (data.daysOrUnits || 1);
      if (Math.abs(total - lineTotal) > 0.01) {
        errors.push('Total charge must equal sum of line item charges');
      }
    }

    // Balance due calculation
    if (data.totalCharge && data.amountPaid && data.balanceDue) {
      const total = parseFloat(data.totalCharge);
      const paid = parseFloat(data.amountPaid);
      const balance = parseFloat(data.balanceDue);
      const expectedBalance = total - paid;
      if (Math.abs(balance - expectedBalance) > 0.01) {
        errors.push('Balance due must equal total charge minus amount paid');
      }
    }

    return errors;
  }

  // Get mental health specific CPT codes
  static getMentalHealthCPTCodes(): Array<{ code: string; description: string; duration: number }> {
    return [
      { code: '90791', description: 'Psychiatric diagnostic evaluation', duration: 60 },
      { code: '90792', description: 'Psychiatric diagnostic evaluation with medical services', duration: 60 },
      { code: '90834', description: 'Psychotherapy, 45 minutes', duration: 45 },
      { code: '90837', description: 'Psychotherapy, 60 minutes', duration: 60 },
      { code: '90847', description: 'Family psychotherapy with patient present', duration: 50 },
      { code: '90853', description: 'Group psychotherapy', duration: 60 },
      { code: '90901', description: 'Biofeedback training', duration: 30 },
      { code: '96116', description: 'Neurobehavioral status exam', duration: 60 },
      { code: '96118', description: 'Neuropsychological testing', duration: 60 },
      { code: '96130', description: 'Psychological testing evaluation', duration: 60 },
      { code: '96136', description: 'Psychological or neuropsychological test administration', duration: 30 },
      { code: '96138', description: 'Psychological or neuropsychological test administration', duration: 60 }
    ];
  }

  // Get common mental health diagnosis codes
  static getMentalHealthDiagnosisCodes(): Array<{ code: string; description: string; category: string }> {
    return [
      { code: 'F41.1', description: 'Generalized anxiety disorder', category: 'Anxiety' },
      { code: 'F41.9', description: 'Anxiety disorder, unspecified', category: 'Anxiety' },
      { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified', category: 'Depression' },
      { code: 'F33.1', description: 'Major depressive disorder, recurrent, moderate', category: 'Depression' },
      { code: 'F43.10', description: 'Post-traumatic stress disorder, unspecified', category: 'Trauma' },
      { code: 'F43.12', description: 'Post-traumatic stress disorder, chronic', category: 'Trauma' },
      { code: 'F84.0', description: 'Autistic disorder', category: 'Developmental' },
      { code: 'F90.9', description: 'Attention-deficit hyperactivity disorder, unspecified type', category: 'ADHD' },
      { code: 'F31.9', description: 'Bipolar disorder, unspecified', category: 'Bipolar' },
      { code: 'F25.9', description: 'Schizoaffective disorder, unspecified', category: 'Psychotic' }
    ];
  }

  // Validate place of service codes
  static validatePlaceOfService(code: string): { isValid: boolean; description?: string } {
    const placeOfServiceCodes: Record<string, string> = {
      '11': 'Office',
      '12': 'Home',
      '02': 'Telehealth',
      '03': 'School',
      '04': 'Homeless Shelter',
      '05': 'Indian Health Service',
      '06': 'Indian Health Service',
      '07': 'Tribal 638',
      '08': 'Tribal 638',
      '09': 'Prison/Correctional Facility',
      '10': 'Telehealth',
      '13': 'Assisted Living',
      '14': 'Group Home',
      '15': 'Mobile Unit',
      '20': 'Urgent Care Facility',
      '21': 'Inpatient Hospital',
      '22': 'Outpatient Hospital',
      '23': 'Emergency Room',
      '24': 'Ambulatory Surgical Center',
      '25': 'Birthing Center',
      '26': 'Military Treatment Facility',
      '31': 'Skilled Nursing Facility',
      '32': 'Nursing Facility',
      '33': 'Custodial Care Facility',
      '34': 'Hospice',
      '41': 'Ambulance - Land',
      '42': 'Ambulance - Air or Water',
      '49': 'Independent Clinic',
      '50': 'Federally Qualified Health Center',
      '51': 'Inpatient Psychiatric Facility',
      '52': 'Psychiatric Facility-Partial Hospitalization',
      '53': 'Community Mental Health Center',
      '54': 'Intermediate Care Facility/Mentally Retarded',
      '55': 'Residential Substance Abuse Treatment Facility',
      '56': 'Psychiatric Residential Treatment Center',
      '57': 'Non-residential Substance Abuse Treatment Facility',
      '58': 'Non-residential Opioid Treatment Facility',
      '60': 'Mass Immunization Center',
      '61': 'Comprehensive Inpatient Rehabilitation Facility',
      '62': 'Comprehensive Outpatient Rehabilitation Facility',
      '65': 'End-Stage Renal Disease Treatment Facility',
      '71': 'Public Health Clinic',
      '72': 'Rural Health Clinic',
      '81': 'Independent Laboratory',
      '99': 'Other Place of Service'
    };

    const description = placeOfServiceCodes[code];
    return {
      isValid: !!description,
      description
    };
  }
}