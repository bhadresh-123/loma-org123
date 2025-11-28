import fetch from 'node-fetch';

interface NPIRecord {
  npi: string;
  name: string;
  address: {
    firstLine: string;
    city: string;
    state: string;
    postalCode: string;
  };
  taxonomy: {
    code: string;
    description: string;
  }[];
  status: 'active' | 'deactivated';
}

interface NPISearchResponse {
  result_count: number;
  results: Array<{
    number: string;
    enumeration_type: string;
    basic: {
      status: string;
      name: string;
      first_name?: string;
      last_name?: string;
      middle_name?: string;
      organizational_name?: string;
      other_names?: string[];
    };
    addresses: Array<{
      country_code: string;
      country_name: string;
      address_purpose: string;
      address_type: string;
      address_1: string;
      address_2?: string;
      city: string;
      state: string;
      postal_code: string;
      telephone_number?: string;
      fax_number?: string;
    }>;
    taxonomies: Array<{
      code: string;
      desc: string;
      taxonomy_group?: string;
      state?: string;
      license?: string;
      primary: boolean;
    }>;
  }>;
}

export class NPIValidationService {
  private static readonly NPPES_API_URL = 'https://npiregistry.cms.hhs.gov/api/';
  
  /**
   * Validate NPI number format
   */
  static validateNPIFormat(npi: string): boolean {
    // Remove any non-digits
    const cleanNPI = npi.replace(/\D/g, '');
    
    // Must be exactly 10 digits
    if (cleanNPI.length !== 10) {
      return false;
    }
    
    // Validate using Luhn algorithm (NPI checksum)
    return this.validateLuhnChecksum(cleanNPI);
  }
  
  /**
   * Validate NPI using Luhn algorithm checksum
   */
  private static validateLuhnChecksum(npi: string): boolean {
    // NPI uses Luhn algorithm with prefix "80840"
    const fullNumber = '80840' + npi.substring(0, 9);
    
    let sum = 0;
    let isEven = false;
    
    // Process from right to left
    for (let i = fullNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(fullNumber.charAt(i));
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit = digit % 10 + 1;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(npi.charAt(9));
  }
  
  /**
   * Lookup NPI in NPPES registry
   */
  static async lookupNPI(npi: string): Promise<NPIRecord | null> {
    try {
      // First validate format
      if (!this.validateNPIFormat(npi)) {
        throw new Error('Invalid NPI format');
      }
      
      const cleanNPI = npi.replace(/\D/g, '');
      
      // Query NPPES API with timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(
        `${this.NPPES_API_URL}?number=${cleanNPI}&version=2.1`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'LomaHealth/1.0'
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`NPPES API error: ${response.status}`);
      }
      
      const data = await response.json() as NPISearchResponse;
      
      if (data.result_count === 0) {
        return null; // NPI not found
      }
      
      const result = data.results[0];
      
      // Get practice location address (prefer practice location over mailing)
      const practiceAddress = result.addresses.find(addr => 
        addr.address_purpose === 'LOCATION'
      ) || result.addresses.find(addr => 
        addr.address_purpose === 'MAILING'
      ) || result.addresses[0];
      
      // Get primary taxonomy
      const primaryTaxonomy = result.taxonomies.find(tax => tax.primary) || result.taxonomies[0];
      
      // Format provider name
      let providerName = '';
      if (result.enumeration_type === 'NPI-1') {
        // Individual provider
        const parts = [result.basic.first_name, result.basic.middle_name, result.basic.last_name];
        providerName = parts.filter(Boolean).join(' ');
      } else {
        // Organization
        providerName = result.basic.organizational_name || result.basic.name;
      }
      
      return {
        npi: cleanNPI,
        name: providerName,
        address: {
          firstLine: practiceAddress?.address_1 || '',
          city: practiceAddress?.city || '',
          state: practiceAddress?.state || '',
          postalCode: practiceAddress?.postal_code || ''
        },
        taxonomy: result.taxonomies.map(tax => ({
          code: tax.code,
          description: tax.desc
        })),
        status: result.basic.status === 'A' ? 'active' : 'deactivated'
      };
      
    } catch (error) {
      console.error('NPI lookup error:', error);
      throw error;
    }
  }
  
  /**
   * Validate if NPI is active and matches provider type
   */
  static async validateProvider(npi: string, expectedTaxonomy?: string): Promise<{
    isValid: boolean;
    provider?: NPIRecord;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      const provider = await this.lookupNPI(npi);
      
      if (!provider) {
        errors.push('NPI not found in NPPES registry');
        return { isValid: false, errors };
      }
      
      if (provider.status !== 'active') {
        errors.push('NPI is deactivated');
      }
      
      // Validate taxonomy if provided
      if (expectedTaxonomy) {
        const hasTaxonomy = provider.taxonomy.some(tax => 
          tax.code === expectedTaxonomy
        );
        if (!hasTaxonomy) {
          errors.push(`Provider does not have required taxonomy: ${expectedTaxonomy}`);
        }
      }
      
      return {
        isValid: errors.length === 0,
        provider,
        errors
      };
      
    } catch (error) {
      errors.push(`NPI validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors };
    }
  }
  
  /**
   * Get common mental health taxonomy codes
   */
  static getMentalHealthTaxonomies(): Array<{ code: string; description: string }> {
    return [
      { code: '101Y00000X', description: 'Counselor' },
      { code: '101YA0400X', description: 'Addiction (Substance Use Disorder) Counselor' },
      { code: '101YM0800X', description: 'Mental Health Counselor' },
      { code: '101YP1600X', description: 'Pastoral Counselor' },
      { code: '101YP2500X', description: 'Professional Counselor' },
      { code: '101YS0200X', description: 'School Counselor' },
      { code: '103G00000X', description: 'Clinical Neuropsychologist' },
      { code: '103GC0700X', description: 'Clinical Psychologist' },
      { code: '103T00000X', description: 'Psychologist' },
      { code: '103TA0400X', description: 'Addiction (Substance Use Disorder) Psychologist' },
      { code: '103TA0700X', description: 'Adult Development & Aging Psychologist' },
      { code: '103TB0200X', description: 'Behavioral & Cognitive Psychologist' },
      { code: '103TC0700X', description: 'Clinical Psychologist' },
      { code: '103TC1900X', description: 'Counseling Psychologist' },
      { code: '103TC2200X', description: 'Clinical Child & Adolescent Psychologist' },
      { code: '103TE1000X', description: 'Educational Psychologist' },
      { code: '103TE1100X', description: 'Exercise & Sports Psychologist' },
      { code: '103TF0000X', description: 'Forensic Psychologist' },
      { code: '103TF0200X', description: 'Family Psychologist' },
      { code: '103TH0004X', description: 'Health Psychologist' },
      { code: '103TH0100X', description: 'Health Service Psychologist' },
      { code: '103TM1700X', description: 'Men & Masculinity Psychologist' },
      { code: '103TM1800X', description: 'Multiple Relationship Psychologist' },
      { code: '103TP0016X', description: 'Prescribing (Medical) Psychologist' },
      { code: '103TP0814X', description: 'Psychoanalysis Psychologist' },
      { code: '103TP2700X', description: 'Psychotherapy Psychologist' },
      { code: '103TR0400X', description: 'Rehabilitation Psychologist' },
      { code: '103TS0200X', description: 'School Psychologist' },
      { code: '103TW0100X', description: 'Women Psychologist' },
      { code: '104100000X', description: 'Social Worker' },
      { code: '1041C0700X', description: 'Clinical Social Worker' },
      { code: '1041S0200X', description: 'School Social Worker' }
    ];
  }
}