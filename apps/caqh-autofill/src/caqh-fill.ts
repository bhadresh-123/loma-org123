import type { Page } from 'playwright';
import type { ProviderProfile } from './mapping.js';
import { SEL } from './selectors.js';

export async function fillProfile(page: Page, p: ProviderProfile) {
  // Navigate to profile start if needed
  await page.getByRole('link', { name: /my profile|continue application/i }).click().catch(() => {});

  // Identifiers
  if (process.env.FILL_IDS === 'true') {
    if (p.identifiers?.npi) {
      await page.locator(SEL.ids.npi).fill(p.identifiers.npi);
    }
    await page.locator(SEL.saveContinue).click().catch(() => {});
  }

  // Personal
  if (process.env.FILL_PERSONAL === 'true') {
    await page.locator(SEL.personal.firstName).fill(p.personal.firstName);
    await page.locator(SEL.personal.lastName).fill(p.personal.lastName);
    await page.locator(SEL.personal.dob).fill(p.personal.dob);
    await page.locator(SEL.saveContinue).click().catch(() => {});
  }
}

