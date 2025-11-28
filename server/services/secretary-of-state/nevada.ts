import { log } from '../../vite';
import fetch from 'node-fetch';

interface BusinessNameCheckResponse {
  success: boolean;
  available: boolean;
  message: string;
  verificationUrl: string;
  verificationSteps: string[];
  requiresAdditionalApproval: boolean;
}

const RESTRICTED_WORDS = [
  'bank', 'trust', 'insurance', 'federal', 'casino',
  'gaming', 'incorporated', 'limited', 'corporation'
];

export async function checkNevadaBusinessName(businessName: string): Promise<BusinessNameCheckResponse> {
  try {
    const normalizedName = businessName.trim();
    
    if (normalizedName.length < 1) {
      return {
        success: false,
        available: false,
        message: 'Business name cannot be empty',
        verificationUrl: 'https://esos.nv.gov/EntitySearch/OnlineBusinessAndMarkSearch',
        verificationSteps: [],
        requiresAdditionalApproval: false
      };
    }

    const hasRestrictedWord = RESTRICTED_WORDS.some(word => 
      normalizedName.toLowerCase().includes(word)
    );

    if (hasRestrictedWord) {
      return {
        success: true,
        available: false,
        message: 'This name contains restricted words that require additional approval.',
        verificationUrl: 'https://esos.nv.gov/EntitySearch/OnlineBusinessAndMarkSearch',
        verificationSteps: [
          'Contact the Nevada Secretary of State office',
          'Obtain written approval before proceeding',
          'Provide additional documentation as required'
        ],
        requiresAdditionalApproval: true
      };
    }

    try {
      const response = await fetch('https://esos.nv.gov/EntitySearch/BusinessSearchService', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; TherapistPlatform/1.0)'
        },
        body: JSON.stringify({
          searchValue: normalizedName,
          searchType: "Entity"
        })
      });

      if (response.ok) {
        const data = await response.json();
        const hasMatches = data.totalRecords > 0;

        return {
          success: true,
          available: !hasMatches,
          message: hasMatches ? 
            'Similar names found. Please verify through official channels.' :
            'Name appears available but requires official verification.',
          verificationUrl: 'https://esos.nv.gov/EntitySearch/OnlineBusinessAndMarkSearch',
          verificationSteps: [
            '1. Visit the Nevada Secretary of State business search page',
            '2. Enter your exact business name',
            '3. Review all similar names',
            '4. Check Nevada naming requirements'
          ],
          requiresAdditionalApproval: false
        };
      }
    } catch (error) {
      log('Nevada API check error:', String(error));
    }

    return {
      success: true,
      available: true,
      message: 'Please verify name availability through the Nevada Secretary of State website.',
      verificationUrl: 'https://esos.nv.gov/EntitySearch/OnlineBusinessAndMarkSearch',
      verificationSteps: [
        '1. Visit the Nevada Secretary of State business search page',
        '2. Enter your exact business name',
        '3. Review all similar names',
        '4. Check Nevada naming requirements'
      ],
      requiresAdditionalApproval: false
    };
  } catch (error) {
    log('Error in checkNevadaBusinessName:', String(error));
    return {
      success: false,
      available: false,
      message: 'Unable to check name. Please verify directly with Nevada Secretary of State.',
      verificationUrl: 'https://esos.nv.gov/EntitySearch/OnlineBusinessAndMarkSearch',
      verificationSteps: [],
      requiresAdditionalApproval: false
    };
  }
}