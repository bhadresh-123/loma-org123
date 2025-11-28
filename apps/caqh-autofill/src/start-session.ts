import 'dotenv/config';
import { logInfo } from './logger.js';
import { Browserbase } from '@browserbasehq/sdk';
import playwright from 'playwright-core';

export type StartedSession = {
  sessionId: string;
  liveViewUrl?: string;
};

export async function startBrowserbaseSession(): Promise<StartedSession> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  if (!apiKey) {
    console.error('[CAQH] Missing BROWSERBASE_API_KEY environment variable');
    throw new Error('Missing BROWSERBASE_API_KEY');
  }

  console.log('[CAQH] Starting new Browserbase session');
  const bb = new Browserbase({ apiKey });
  const projectId = process.env.BROWSERBASE_PROJECT_ID || 'default';
  
  // Clean up any existing running sessions to avoid hitting concurrent session limits
  try {
    const existingSessions = await bb.sessions.list({ status: 'RUNNING' });
    console.log('[CAQH] Found', existingSessions.length, 'existing running sessions');
    
    // Filter to only sessions from this project
    const projectSessions = existingSessions.filter(s => s.projectId === projectId);
    
    if (projectSessions.length > 0) {
      console.log('[CAQH] Cleaning up', projectSessions.length, 'sessions from this project');
      for (const existingSession of projectSessions) {
        try {
          await bb.sessions.update(existingSession.id, { 
            projectId,
            status: 'REQUEST_RELEASE' 
          });
          console.log('[CAQH] Requested release of session', existingSession.id);
        } catch (cleanupErr) {
          console.warn('[CAQH] Failed to cleanup session', existingSession.id, cleanupErr);
        }
      }
    }
  } catch (listErr) {
    console.warn('[CAQH] Failed to list existing sessions', listErr);
  }
  
  // Create new Browserbase session with extended timeout
  console.log('[CAQH] Creating new session with project ID:', projectId);
  const session = await bb.sessions.create({
    projectId,
    keepAlive: true, // Keep session alive after disconnecting Playwright
    timeout: 3600, // 1 hour timeout for user to login and fill form
  });

  console.log('[CAQH] Session created:', session.id, 'with keepAlive=true, timeout=3600s');

  // Navigate to CAQH registration page so user sees it immediately in Live View
  try {
    console.log('[CAQH] Connecting to session for initial navigation');
    const browser = await playwright.chromium.connectOverCDP(session.connectUrl);
    const context = browser.contexts()[0];
    const page = context.pages()[0] || await context.newPage();
    
    // Set viewport to prevent resizing during autofill
    console.log('[CAQH] Setting viewport size to 1280x1024');
    await page.setViewportSize({ width: 1280, height: 1024 });
    
    console.log('[CAQH] Navigating to CAQH registration page');
    await page.goto('https://proview.caqh.org/PR/Registration/SelfRegistration', { 
      waitUntil: 'domcontentloaded', // Less strict than networkidle
      timeout: 30000 
    });
    
    console.log('[CAQH] Registration page loaded successfully');
    
    // Wait a moment for the browser to fully stabilize before disconnecting
    await page.waitForTimeout(2000);
    console.log('[CAQH] Browser stabilized');
    
    // Disconnect Playwright but keep Browserbase session alive
    await context.close().catch(e => console.warn('[CAQH] Context close error:', e));
    await browser.close().catch(e => console.warn('[CAQH] Browser close error:', e));
    console.log('[CAQH] Initial browser connection closed, session remains active');
  } catch (navErr) {
    console.error('[CAQH] Failed to navigate to registration page:', navErr);
    console.log('[CAQH] User can manually navigate to registration page in Live View');
    // Don't throw - session is still usable even if navigation failed
  }

  // Wait a bit for Browserbase debug session to be fully ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Get Live View URLs
  console.log('[CAQH] Fetching Live View URLs');
  const liveUrls = await bb.sessions.debug(session.id);

  const liveViewUrl = liveUrls.debuggerFullscreenUrl || liveUrls.debuggerUrl;
  console.log('[CAQH] Session ready. Session ID:', session.id, 'Live View URL:', liveViewUrl);
  
  return { sessionId: session.id, liveViewUrl };
}

// Convenience helper for dev: start + connect Playwright in one call
export async function startAndConnectPlaywright() {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  if (!apiKey) throw new Error('Missing BROWSERBASE_API_KEY');
  
  const bb = new Browserbase({ apiKey });
  const session = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID || 'default',
  });
  
  // In SDK v2.x, use playwright-core directly with connectOverCDP
  const playwright = await import('playwright-core');
  const browser = await playwright.chromium.connectOverCDP(session.connectUrl);
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();
  
  return { session, browser, context, page };
}

