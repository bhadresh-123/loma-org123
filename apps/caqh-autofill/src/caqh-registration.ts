import type { Page } from 'playwright';
import type { RegistrationData } from './mapping.js';
import { logInfo, logWarn, logError } from './logger.js';

/**
 * Fill the CAQH self-registration form
 * https://proview.caqh.org/PR/Registration/SelfRegistration
 */
export async function fillRegistrationForm(page: Page, data: RegistrationData) {
  logInfo('[Registration] Starting registration form fill');
  
  try {
    // Set viewport to prevent resizing during autofill
    logInfo('[Registration] Setting viewport size to 1280x1024');
    await page.setViewportSize({ width: 1280, height: 1024 });
    
    // Wait for the form to be loaded
    logInfo('[Registration] Waiting for form to load...');
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    
    // Wait for comboboxes to be present (NUCC dropdown)
    logInfo('[Registration] Waiting for NUCC combobox...');
    await page.waitForSelector('[role="combobox"]', { timeout: 10000, state: 'attached' });
    logInfo('[Registration] Form ready');
    
    // Keep the page at the top - don't scroll at all
    // With 1280x1024 viewport, the top section (NUCC through names) is visible
    // We'll use force: true on clicks to prevent Playwright from auto-scrolling
    logInfo('[Registration] Keeping viewport at top of page (no scrolling)');
    
    // ========================================
    // STEP 1: FILL NUCC GROUPING FIRST (most important)
    // ========================================
    logInfo('[Registration] ** STEP 1: Filling NUCC Grouping **');
    if (data.nuccGrouping) {
      try {
        // Click the first combobox (NUCC Grouping) - force to prevent auto-scroll
        logInfo(`[Registration] Selecting NUCC: "${data.nuccGrouping}"`);
        await page.getByRole('combobox').first().click({ timeout: 8000, force: true });
        await page.waitForTimeout(400); // Brief wait for dropdown
        
        // Wait for and click the option - force to prevent auto-scroll
        await page.waitForSelector('[role="treeitem"]', { timeout: 8000, state: 'visible' });
        await page.getByRole('treeitem', { name: data.nuccGrouping }).click({ timeout: 5000, force: true });
        logInfo(`[Registration] ✓ NUCC Grouping selected: ${data.nuccGrouping}`);
        await page.waitForTimeout(300);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logError(`[Registration] Failed to select NUCC Grouping: ${errorMsg}`);
        throw new Error(`NUCC Grouping selection failed: ${errorMsg}`);
      }
    } else {
      logWarn('[Registration] No NUCC Grouping value provided');
    }

    // ========================================
    // STEP 2: FILL PROVIDER TYPE
    // ========================================
    logInfo('[Registration] ** STEP 2: Filling Provider Type **');
    if (data.providerType) {
      try {
        // Click the second combobox (Provider Type) - force to prevent auto-scroll
        await page.getByRole('combobox').nth(1).click({ timeout: 5000, force: true });
        await page.waitForTimeout(300);
        
        await page.getByRole('treeitem', { name: data.providerType }).click({ force: true });
        logInfo(`[Registration] ✓ Provider Type: ${data.providerType}`);
        await page.waitForTimeout(200);
      } catch (err) {
        logWarn('[Registration] Could not select Provider Type');
      }
    }

    // ========================================
    // STEP 3: FILL PERSONAL INFORMATION
    // ========================================
    logInfo('[Registration] ** STEP 3: Filling Personal Information **');
    await fillInput(page, 'input[name*="FirstName"], input[id*="FirstName"]', data.firstName, 'First Name');
    
    if (data.middleName) {
      await fillInput(page, 'input[name*="MiddleName"], input[id*="MiddleName"]', data.middleName, 'Middle Name');
    }
    
    await fillInput(page, 'input[name*="LastName"], input[id*="LastName"]', data.lastName, 'Last Name');
    
    if (data.suffix) {
      try {
        // Try clicking the Suffix combobox and selecting the option
        const suffixCombobox = page.getByRole('combobox').filter({ hasText: '--' });
        await suffixCombobox.click({ force: true });
        await page.waitForTimeout(300);
        await page.getByRole('treeitem', { name: data.suffix }).click({ force: true });
        logInfo(`[Registration] Selected Suffix: ${data.suffix}`);
      } catch (err) {
        logWarn('[Registration] Suffix field not found or could not be selected');
      }
    }

    // Address Information
    if (data.addressType) {
      try {
        // Find and click the Address Type combobox
        await page.getByText('Address Type').locator('..').getByRole('combobox').click({ force: true });
        await page.waitForTimeout(300);
        await page.getByRole('treeitem', { name: data.addressType }).click({ force: true });
        logInfo(`[Registration] Selected Address Type: ${data.addressType}`);
      } catch (err) {
        logWarn('[Registration] Address Type field not found or could not be selected');
      }
    }

    await fillInput(page, 'input[name*="Street1"], input[id*="Street1"], input[name*="Address1"]', data.street1, 'Street 1');
    
    if (data.street2) {
      await fillInput(page, 'input[name*="Street2"], input[id*="Street2"], input[name*="Address2"]', data.street2, 'Street 2');
    }

    await fillInput(page, 'input[name*="City"], input[id*="City"]', data.city, 'City');
    
    try {
      // Find the State combobox (look for the one with "(Select)" text)
      await page.getByText('State').locator('..').getByRole('combobox').click({ force: true });
      await page.waitForTimeout(300);
      await page.getByRole('treeitem', { name: data.state, exact: true }).click({ force: true });
      logInfo(`[Registration] Selected State: ${data.state}`);
    } catch (err) {
      logWarn('[Registration] State field not found or could not be selected');
    }

    await fillInput(page, 'input[name*="Zip"], input[id*="Zip"], input[name*="PostalCode"]', data.zip, 'Zip Code');

    // Primary Practice State
    try {
      await page.getByText('Primary Practice State').locator('..').getByRole('combobox').click({ force: true });
      await page.waitForTimeout(300);
      await page.getByRole('treeitem', { name: data.primaryPracticeState, exact: true }).click({ force: true });
      logInfo(`[Registration] Selected Primary Practice State: ${data.primaryPracticeState}`);
    } catch (err) {
      logWarn('[Registration] Primary Practice State field not found or could not be selected');
    }

    // Birth Date - format as MM/DD/YYYY
    await fillInput(page, 'input[name*="Birth"], input[id*="Birth"], input[name*="DOB"]', data.birthDate, 'Birth Date');

    // Email Information
    if (data.emailType) {
      try {
        await page.getByText('E-mail Type').locator('..').getByRole('combobox').click({ force: true });
        await page.waitForTimeout(300);
        await page.getByRole('treeitem', { name: data.emailType }).click({ force: true });
        logInfo(`[Registration] Selected Email Type: ${data.emailType}`);
      } catch (err) {
        logWarn('[Registration] Email Type field not found or could not be selected');
      }
    }

    await fillInput(page, 'input[name*="Email"], input[id*="Email"]:not([name*="Confirm"]):not([id*="Confirm"])', data.email, 'Email');
    await fillInput(page, 'input[name*="EmailConfirm"], input[id*="EmailConfirm"], input[name*="ConfirmEmail"]', data.emailConfirm, 'Email Confirmation');

    // Identification Numbers
    if (data.ssn) {
      await fillInput(page, 'input[name*="SSN"], input[id*="SSN"], input[name*="SocialSecurity"]', data.ssn, 'SSN');
    }

    await fillInput(page, 'input[name*="NPI"], input[id*="NPI"]', data.npi, 'NPI Number');

    if (data.deaNumber) {
      await fillInput(page, 'input[name*="DEA"], input[id*="DEA"]', data.deaNumber, 'DEA Number');
    } else {
      // Check the "I do not have a DEA Number" checkbox if DEA is not provided
      await page.check('input[type="checkbox"][name*="DEA"], input[type="checkbox"][id*="DEA"]').catch(() => 
        logWarn('[Registration] DEA checkbox not found')
      );
    }

    // License Information
    try {
      await page.getByText('License State').locator('..').getByRole('combobox').click({ force: true });
      await page.waitForTimeout(300);
      await page.getByRole('treeitem', { name: data.licenseState, exact: true }).click({ force: true });
      logInfo(`[Registration] Selected License State: ${data.licenseState}`);
    } catch (err) {
      logWarn('[Registration] License State field not found or could not be selected');
    }

    await fillInput(page, 'input[name*="LicenseNumber"], input[id*="LicenseNumber"]', data.licenseNumber, 'License Number');

    logInfo('[Registration] All fields filled successfully');

    // Look for Continue button
    const continueButton = await page.locator('button:has-text("Continue"), input[type="submit"][value*="Continue"]').first();
    if (await continueButton.isVisible()) {
      logInfo('[Registration] Continue button found, user can click to submit');
    } else {
      logWarn('[Registration] Continue button not found');
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logWarn(`[Registration] Error during form fill: ${errorMsg}`);
    throw error;
  }
}

/**
 * Helper function to fill an input field with multiple selector attempts
 */
async function fillInput(page: Page, selectors: string, value: string, fieldName: string) {
  try {
    const field = page.locator(selectors).first();
    await field.waitFor({ state: 'visible', timeout: 5000 });
    await field.fill(value);
    logInfo(`[Registration] Filled ${fieldName}: ${value}`);
  } catch (err) {
    logWarn(`[Registration] Could not fill ${fieldName}`);
  }
}

