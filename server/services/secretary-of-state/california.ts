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

export async function checkCaliforniaBusinessName(businessName: string): Promise<BusinessNameCheckResponse> {
  try {
    log(`Checking business name "${businessName}" in CA`);
    const normalizedName = businessName.trim();

    // Validate name length
    if (normalizedName.length < 1) {
      return {
        success: false,
        available: false,
        message: 'Business name cannot be empty',
        verificationUrl: 'https://bizfileonline.sos.ca.gov/search/business',
        verificationSteps: [],
        requiresAdditionalApproval: false
      };
    }

    // Check for basic character validity
    const validNameFormat = /^[a-zA-Z0-9\s\-&'.]+$/.test(normalizedName);
    if (!validNameFormat) {
      return {
        success: false,
        available: false,
        message: 'Business name can only contain letters, numbers, spaces, and basic punctuation (hyphen, ampersand, period)',
        verificationUrl: 'https://bizfileonline.sos.ca.gov/search/business',
        verificationSteps: [],
        requiresAdditionalApproval: false
      };
    }

    // Check for restricted words that require additional approval
    const restrictedWords = [
      'bank', 'trust', 'insurance', 'federal', 'national', 
      'united states', 'reserve', 'academy', 'college', 
      'university', 'education', 'school'
    ];

    const hasRestrictedWord = restrictedWords.some(word => 
      normalizedName.toLowerCase().includes(word)
    );

    if (hasRestrictedWord) {
      return {
        success: true,
        available: false,
        message: 'This name contains restricted words that require additional approval from state agencies.',
        verificationUrl: 'https://bizfileonline.sos.ca.gov/search/business',
        verificationSteps: [
          'Contact the appropriate regulatory agency for the restricted word used',
          'Obtain written approval before proceeding with registration',
          'Be prepared to provide additional documentation'
        ],
        requiresAdditionalApproval: true
      };
    }

    // Make the actual API call to CA Secretary of State
    try {
      const baseUrl = 'https://bizfileonline.sos.ca.gov';

      // First, get the session cookies
      const initResponse = await fetch(baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TherapistPlatform/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      const cookies = initResponse.headers.get('set-cookie');

      // Make the search request
      const searchUrl = `${baseUrl}/api/Records/businesssearch`;
      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; TherapistPlatform/1.0)',
          'Origin': baseUrl,
          'Referer': `${baseUrl}/search`,
          'Cookie': cookies || '',
        },
        body: JSON.stringify({
          SearchType: "EXACT",
          SearchCriteria: {
            BusinessName: normalizedName,
            EntityType: "ALL",
            Status: "ALL",
            SearchFields: ["ENTITY_NAME"],
            OperatorType: "ALL"
          },
          RecordsPerPage: 10,
          PageNumber: 1
        })
      });

      if (response.ok) {
        const data = await response.json();
        const hasMatches = data.totalRecords > 0;

        return {
          success: true,
          available: !hasMatches,
          message: hasMatches ? 
            'This name is not available. Please try a different name.' :
            'This name appears to be available for registration.',
          verificationUrl: 'https://bizfileonline.sos.ca.gov/search/business',
          verificationSteps: [
            '1. Visit the California Secretary of State business search page',
            '2. Enter your exact business name',
            '3. Review all similar names',
            '4. Check California naming requirements'
          ],
          requiresAdditionalApproval: false
        };
      }
    } catch (error) {
      log('California API check error:', String(error));
    }

    // Fallback response if API call fails
    return {
      success: true,
      available: true,
      message: `Please verify "${businessName}" availability on the California Secretary of State website.`,
      verificationUrl: 'https://bizfileonline.sos.ca.gov/search/business',
      verificationSteps: [
        '1. Visit the California Secretary of State business search page',
        '2. Enter your exact business name',
        '3. Check for exact matches and similar names',
        '4. Verify name availability with multiple search methods',
        '5. Consider consulting with a legal professional'
      ],
      requiresAdditionalApproval: false
    };

  } catch (error) {
    log('Error in checkCaliforniaBusinessName:', String(error));
    return {
      success: false,
      available: false,
      message: 'Unable to perform preliminary name check. Please verify directly on the California Secretary of State website.',
      verificationUrl: 'https://bizfileonline.sos.ca.gov/search/business',
      verificationSteps: [],
      requiresAdditionalApproval: false
    };
  }
}