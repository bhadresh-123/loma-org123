import { log } from '../../vite';
import fetch from 'node-fetch';

interface DelawareSearchResponse {
  success: boolean;
  matches?: Array<{
    name: string;
    fileNumber?: string;
  }>;
  error?: string;
}

export async function checkDelawareBusinessName(businessName: string) {
  try {
    log(`Checking business name in Delaware: ${businessName}`);

    const baseUrl = 'https://icis.corp.delaware.gov/eCorp/EntitySearch/NameSearch.aspx';

    // First make a request to get the session cookie and viewstate
    const initResponse = await fetch(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TherapistPlatform/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });

    if (!initResponse.ok) {
      throw new Error('Failed to initialize Delaware search session');
    }

    const cookies = initResponse.headers.get('set-cookie');
    const html = await initResponse.text();

    // Extract VIEWSTATE and other form fields from the HTML
    const viewState = html.match(/id="__VIEWSTATE" value="([^"]+)"/)?.[1];
    const viewStateGenerator = html.match(/id="__VIEWSTATEGENERATOR" value="([^"]+)"/)?.[1];
    const eventValidation = html.match(/id="__EVENTVALIDATION" value="([^"]+)"/)?.[1];

    if (!viewState || !viewStateGenerator || !eventValidation) {
      throw new Error('Failed to extract Delaware search form data');
    }

    // Make the actual search request
    const searchResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies || '',
        'User-Agent': 'Mozilla/5.0 (compatible; TherapistPlatform/1.0)',
        'Referer': baseUrl
      },
      body: new URLSearchParams({
        '__VIEWSTATE': viewState,
        '__VIEWSTATEGENERATOR': viewStateGenerator,
        '__EVENTVALIDATION': eventValidation,
        'ctl00$ContentPlaceHolder1$frmEntityName': businessName,
        'ctl00$ContentPlaceHolder1$btnSubmit': 'Search'
      }).toString()
    });

    if (!searchResponse.ok) {
      throw new Error('Delaware search request failed');
    }

    const searchHtml = await searchResponse.text();

    // Check if the business name exists by looking for specific patterns in the response
    const hasExactMatch = searchHtml.includes(businessName.toUpperCase());
    const hasResults = searchHtml.includes('ctl00_ContentPlaceHolder1_divResults');

    // If we found matches, parse them
    let matches: Array<{name: string, fileNumber?: string}> = [];
    if (hasResults) {
      const resultsMatch = searchHtml.match(/<table[^>]*>[\s\S]*?<\/table>/g);
      if (resultsMatch) {
        // Extract business names from the results table
        const nameMatches = searchHtml.match(/>([\w\s,\.\-&]+LLC|[\w\s,\.\-&]+INC\.?|[\w\s,\.\-&]+CORPORATION)/g);
        if (nameMatches) {
          matches = nameMatches.map(match => ({
            name: match.replace('>', '').trim()
          }));
        }
      }
    }

    // Log the results for debugging
    log('Delaware search results:', {
      businessName,
      hasExactMatch,
      hasResults,
      matchCount: matches.length
    });

    return {
      success: true,
      available: !hasExactMatch && !hasResults,
      message: hasExactMatch ? 
        `The name "${businessName}" is not available in Delaware.` :
        hasResults ? 
          `Similar names found. Please verify through the Delaware Division of Corporations website.` :
          `The name "${businessName}" appears to be available in Delaware.`,
      verificationUrl: 'https://icis.corp.delaware.gov/eCorp/EntitySearch/NameSearch.aspx',
      verificationSteps: [
        '1. Visit the Delaware Division of Corporations website',
        '2. Enter your exact business name',
        '3. Check for exact matches and similar names',
        '4. Review Delaware naming requirements',
        '5. Consider consulting with a legal professional'
      ],
      requiresAdditionalApproval: false
    };

  } catch (error) {
    log('Error in checkDelawareBusinessName:', String(error));
    return {
      success: false,
      available: false,
      message: 'Unable to perform preliminary name check. Please verify directly on the Delaware Division of Corporations website.',
      verificationUrl: 'https://icis.corp.delaware.gov/eCorp/EntitySearch/NameSearch.aspx',
      verificationSteps: [],
      requiresAdditionalApproval: false
    };
  }
}