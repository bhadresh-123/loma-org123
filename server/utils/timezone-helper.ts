import { db, getActiveSchema } from '@db';

import { eq } from 'drizzle-orm';

/**
 * Server-side timezone helper utilities
 * Provides consistent timezone handling across backend services
 */

export type SupportedTimezone = 
  | 'America/New_York'
  | 'America/Chicago'
  | 'America/Denver'
  | 'America/Los_Angeles'
  | 'America/Phoenix'
  | 'America/Anchorage'
  | 'Pacific/Honolulu';

const DEFAULT_TIMEZONE: SupportedTimezone = 'America/Los_Angeles';

/**
 * Get user's timezone from database or detect from browser
 * @param userId - User ID
 * @param browserTimezone - Optional browser-detected timezone
 * @returns User's timezone or browser-detected timezone
 */
export async function getUserTimezone(userId: number, browserTimezone?: string): Promise<SupportedTimezone> {
  try {
    // First try to get from user profile
    const schema = getActiveSchema();
    const user = await db.query[schema.users].findFirst({
      where: eq(schema.users.id, userId),
      columns: { timeZone: true }
    });
    
    if (user?.timeZone && isValidTimezone(user.timeZone)) {
      return user.timeZone as SupportedTimezone;
    }
    
    // If browser timezone provided and valid, use it
    if (browserTimezone && isValidTimezone(browserTimezone)) {
      console.log(`Using browser-detected timezone for user ${userId}: ${browserTimezone}`);
      return browserTimezone as SupportedTimezone;
    }
    
    return DEFAULT_TIMEZONE;
  } catch (error) {
    console.error('Error fetching user timezone:', error);
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Check if timezone is supported
 */
function isValidTimezone(timezone: string): timezone is SupportedTimezone {
  const supportedTimezones = [
    'America/New_York',
    'America/Chicago', 
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Anchorage',
    'Pacific/Honolulu',
  ];
  return supportedTimezones.includes(timezone as SupportedTimezone);
}

/**
 * Format date in user's timezone for notifications and tasks
 * @param date - Date to format
 * @param userTimezone - User's timezone
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDateInUserTimezone(
  date: Date,
  userTimezone: SupportedTimezone,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }
): string {
  return date.toLocaleDateString('en-US', {
    ...options,
    timeZone: userTimezone
  });
}

/**
 * Format time in user's timezone
 * @param date - Date to format
 * @param userTimezone - User's timezone
 * @returns Formatted time string
 */
export function formatTimeInUserTimezone(
  date: Date,
  userTimezone: SupportedTimezone
): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: userTimezone
  });
}

/**
 * Convert UTC date to user's timezone for display
 * @param utcDate - UTC date
 * @param userTimezone - User's timezone
 * @returns Date object in user's timezone
 */
export function convertUtcToUserTimezone(utcDate: Date, userTimezone: SupportedTimezone): Date {
  // Create a new date adjusted for the user's timezone
  const utcTime = utcDate.getTime();
  const utcOffset = utcDate.getTimezoneOffset() * 60000;
  
  // This is a simplified conversion - for production, consider using a proper timezone library
  const userDate = new Date(utcTime + utcOffset);
  return userDate;
}