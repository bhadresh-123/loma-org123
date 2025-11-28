import type { Page } from 'playwright';
import { logInfo, logWarn } from './logger.js';

export async function gotoLogin(page: Page) {
  logInfo('[Login] Navigating to CAQH login page');
  await page.goto('https://proview.caqh.org/Login/Index', {
    waitUntil: 'networkidle',
    timeout: 30000
  });
  logInfo('[Login] Login page loaded');
}

export async function waitForUserLogin(page: Page, timeoutMs = 300_000) {
  logInfo('[Login] Waiting for user to complete login/MFA via Live View (timeout: 5 minutes)');
  
  const startTime = Date.now();
  const pollInterval = 2000; // Check every 2 seconds
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const currentUrl = page.url();
      
      // Check if URL has changed from login page
      if (!currentUrl.includes('/Login/Index')) {
        logInfo('[Login] URL changed from login page, user appears logged in', { url: currentUrl });
        
        // Wait a bit for post-login page to stabilize
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        logInfo('[Login] Post-login page loaded successfully');
        return;
      }
      
      // Alternative: Check for presence of post-login elements
      const loggedInElement = await page.locator('a:has-text("My Profile"), a:has-text("Continue Application")').first().count();
      if (loggedInElement > 0) {
        logInfo('[Login] Detected logged-in state via page elements');
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        return;
      }
      
      // Wait before next check
      await page.waitForTimeout(pollInterval);
      
    } catch (error) {
      logWarn('[Login] Error during login detection', { error: error instanceof Error ? error.message : String(error) });
      // Continue polling
      await page.waitForTimeout(pollInterval);
    }
  }
  
  throw new Error('Timeout waiting for user login - user did not log in within 5 minutes');
}

