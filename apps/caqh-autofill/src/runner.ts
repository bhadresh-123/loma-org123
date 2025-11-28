import 'dotenv/config';
import type { ProviderProfile } from './mapping.js';
import { fillRegistrationForm } from './caqh-registration.js';
import { logInfo, logError } from './logger.js';
import { Browserbase } from '@browserbasehq/sdk';
import playwright from 'playwright-core';
import { adaptCvToProfile } from './cv-adapter.js';

export async function runAutofillOnSession(sessionId: string, cvData: any) {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  if (!apiKey) {
    logError('[Runner] Missing BROWSERBASE_API_KEY environment variable');
    throw new Error('Missing BROWSERBASE_API_KEY');
  }

  logInfo('[Runner] Starting autofill for session', { sessionId });

  // Convert CV data to CAQH profile format
  const profile: ProviderProfile = adaptCvToProfile(cvData);

  // In SDK v2.x, retrieve the session to get connectUrl
  const bb = new Browserbase({ apiKey });
  
  logInfo('[Runner] Retrieving session from Browserbase');
  let session;
  try {
    session = await bb.sessions.retrieve(sessionId);
  } catch (err: any) {
    logError('[Runner] Failed to retrieve session', { 
      error: err.message, 
      status: err.status,
      sessionId 
    });
    throw new Error(`Failed to retrieve session ${sessionId}: ${err.message} (Status: ${err.status})`);
  }
  
  if (!session.connectUrl) {
    throw new Error('Session does not have a connectUrl');
  }
  
  logInfo('[Runner] Session retrieved successfully', { 
    sessionId: session.id, 
    status: session.status 
  });
  
  logInfo('[Runner] Connecting to Browserbase session via CDP');
  logInfo('[Runner] Connect URL:', { url: session.connectUrl ? 'exists' : 'missing' });
  
  try {
    // Connect using playwright-core
    const browser = await playwright.chromium.connectOverCDP(session.connectUrl);
    logInfo('[Runner] Browser connected successfully');
    
    const context = browser.contexts()[0];
    logInfo('[Runner] Got browser context');
    
    const page = context.pages()[0] || await context.newPage();
    logInfo('[Runner] Got page, ready to interact');
    
    try {
      // Get current URL to see where we are
      const currentUrl = page.url();
      logInfo(`[Runner] Current page URL: ${currentUrl}`);
      
      // Navigate to registration page if not already there
      if (!currentUrl.includes('proview.caqh.org/PR/Registration/SelfRegistration')) {
        logInfo('[Runner] Navigating to CAQH registration page...');
        await page.goto('https://proview.caqh.org/PR/Registration/SelfRegistration', {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        logInfo('[Runner] Navigation completed');
      } else {
        logInfo('[Runner] Already on registration page, refreshing to ensure form is loaded...');
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
        logInfo('[Runner] Page refreshed');
      }
      
      // Wait for the page to fully load
      logInfo('[Runner] Waiting for registration page to be fully loaded...');
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => 
        logInfo('[Runner] Network idle timeout, proceeding anyway')
      );
      
      // Fill the registration form if we have registration data
      if (profile.registration) {
        logInfo('[Runner] Registration data available, starting form fill');
        logInfo('[Runner] Registration data preview:', { 
          firstName: profile.registration.firstName,
          lastName: profile.registration.lastName,
          email: profile.registration.email,
          hasNPI: !!profile.registration.npi,
          hasLicense: !!profile.registration.licenseNumber
        });
        
        await fillRegistrationForm(page, profile.registration);
        logInfo('[Runner] Registration form fill completed');
      } else {
        logError('[Runner] No registration data available in profile', {
          hasProfile: !!profile,
          profileKeys: profile ? Object.keys(profile) : []
        });
        throw new Error('No registration data available');
      }
      
      logInfo('[Runner] Autofill process completed successfully');
    } catch (error) {
      logError('[Runner] Autofill failed', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    } finally {
      // Don't close the browser - let the user interact with it
      logInfo('[Runner] Keeping browser connection open for user interaction');
      // await browser.close();
    }
  } catch (connectionError) {
    logError('[Runner] Failed to connect to Browserbase session', { 
      error: connectionError instanceof Error ? connectionError.message : String(connectionError),
      sessionId 
    });
    throw connectionError;
  }
}

