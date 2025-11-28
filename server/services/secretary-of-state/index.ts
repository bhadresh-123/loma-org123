import { checkCaliforniaBusinessName } from './california';
import { checkDelawareBusinessName } from './delaware';
import { checkNevadaBusinessName } from './nevada';
import { log } from '../../vite';

export interface BusinessNameCheckResponse {
  success: boolean;
  available: boolean;
  message: string;
  similarNames?: string[];
  state: string;
  checkedName: string;
  verificationUrl?: string;
  verificationSteps?: string[];
  requiresAdditionalApproval?: boolean;
}

import { STATE_BUSINESS_SEARCH_URLS } from './state-portals';

export async function checkBusinessNameAvailability(
  businessName: string, 
  state: string
): Promise<BusinessNameCheckResponse> {
  log(`Checking business name "${businessName}" in ${state}`);

  if (!businessName || !state) {
    return {
      success: false,
      available: false,
      message: 'Business name and state are required',
      state,
      checkedName: businessName
    };
  }

  try {
    const stateCode = state.toUpperCase();
    switch (stateCode) {
      case 'CA':
        return {
          ...(await checkCaliforniaBusinessName(businessName)),
          state,
          checkedName: businessName
        };

      case 'DE':
        return {
          ...(await checkDelawareBusinessName(businessName)),
          state,
          checkedName: businessName
        };

      case 'NV':
        return {
          ...(await checkNevadaBusinessName(businessName)),
          state,
          checkedName: businessName
        };

      default:
        // Basic validation for unsupported states
        const verificationUrl = STATE_BUSINESS_SEARCH_URLS[stateCode as keyof typeof STATE_BUSINESS_SEARCH_URLS] || 
          `https://www.google.com/search?q=${state}+secretary+of+state+business+search`;

        return {
          success: true,
          available: true,
          message: `Direct integration for ${state} is not available. Please verify through the Secretary of State website.`,
          verificationUrl,
          verificationSteps: [
            `1. Visit the ${state} Secretary of State business search page`,
            '2. Enter your exact business name',
            '3. Check for exact matches and similar names',
            '4. Review state-specific naming requirements',
            '5. Consider consulting with a legal professional'
          ],
          state,
          checkedName: businessName
        };
    }
  } catch (error) {
    log('Error in checkBusinessNameAvailability:', String(error));
    return {
      success: false,
      available: false,
      message: 'An error occurred while checking business name availability.',
      state,
      checkedName: businessName
    };
  }
}