import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import advancedFormat from 'dayjs/plugin/advancedFormat';

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);
import { db, getActiveSchema } from '@db';
import { eq } from 'drizzle-orm';

/**
 * Centralized Timezone Service - Single Source of Truth
 * Replaces all inconsistent timezone handling throughout the application
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

export interface DateComponents {
  year: number;
  month: number; // 0-11 (JavaScript Date convention)
  day: number;
  hours: number;
  minutes: number;
  seconds?: number;
}

export class TimezoneService {
  /**
   * Convert local date in user's timezone to UTC for database storage
   */
  static toUtc(localDate: Date, userTimezone: SupportedTimezone): Date {
    return dayjs.tz(localDate, userTimezone).utc().toDate();
  }

  /**
   * Convert UTC date from database to user's timezone for display
   */
  static fromUtc(utcDate: Date | string, userTimezone: SupportedTimezone): Date {
    return dayjs.utc(utcDate).tz(userTimezone).toDate();
  }

  /**
   * Create a date in user's timezone and convert to UTC for storage
   * FIXED: Now properly handles DST by using date-fns-tz zonedTimeToUtc
   */
  static createInUserTimezone(
    components: DateComponents,
    userTimezone: SupportedTimezone
  ): Date {
    const { year, month, day, hours, minutes, seconds = 0 } = components;
    
    // Create a dayjs date in the specified timezone
    // Use string format to avoid dayjs object parsing issues
    const dateString = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const zonedDate = dayjs.tz(dateString, userTimezone);
    
    // Convert to UTC for database storage
    const utcDate = zonedDate.utc().toDate();
    
    console.log(`[TimezoneService] Creating date in ${userTimezone}: ${year}-${month+1}-${day} ${hours}:${minutes}`);
    console.log(`[TimezoneService] Input components: ${JSON.stringify(components)}`);
    console.log(`[TimezoneService] Date string: ${dateString}`);
    console.log(`[TimezoneService] Zoned date: ${zonedDate.format()}`);
    console.log(`[TimezoneService] UTC result: ${utcDate.toISOString()}`);
    
    // Validate: Convert back to verify DST handling
    const verification = this.fromUtc(utcDate, userTimezone);
    console.log(`[TimezoneService] Verification - Back to ${userTimezone}: ${verification.toString()}`);
    console.log(`[TimezoneService] Expected time match: ${verification.getHours() === hours && verification.getMinutes() === minutes}`);
    
    return utcDate;
  }

  /**
   * Format date in user's timezone
   */
  static formatInUserTimezone(
    date: Date | string,
    userTimezone: SupportedTimezone,
    formatStr: string = 'MMMM D, YYYY h:mm A'
  ): string {
    try {
      const dayjsDate = dayjs.utc(date).tz(userTimezone);
      console.log(`[TimezoneService] Formatting date: ${date} in ${userTimezone}`);
      console.log(`[TimezoneService] Format string: ${formatStr}`);
      console.log(`[TimezoneService] Dayjs date: ${dayjsDate.toString()}`);
      
      const formatted = dayjsDate.format(formatStr);
      console.log(`[TimezoneService] Formatted result: ${formatted}`);
      
      return formatted;
    } catch (error) {
      console.error('[TimezoneService] Error formatting date:', error);
      return 'Invalid Date';
    }
  }

  /**
   * Get user's timezone from database with fallback
   */
  static async getUserTimezone(
    userId: number, 
    browserTimezone?: string
  ): Promise<SupportedTimezone> {
    try {
      const schema = getActiveSchema();
      const user = await db.query[schema.users].findFirst({
        where: eq(schema.users.id, userId),
        columns: { timeZone: true }
      });
      
      if (user?.timeZone && this.isValidTimezone(user.timeZone)) {
        return user.timeZone as SupportedTimezone;
      }
      
      // Use browser timezone if provided and valid
      if (browserTimezone && this.isValidTimezone(browserTimezone)) {
        console.log(`[TimezoneService] Using browser timezone for user ${userId}: ${browserTimezone}`);
        return browserTimezone as SupportedTimezone;
      }
      
      return DEFAULT_TIMEZONE;
    } catch (error) {
      console.error('[TimezoneService] Error fetching user timezone:', error);
      return DEFAULT_TIMEZONE;
    }
  }

  /**
   * Validate timezone is supported
   */
  static isValidTimezone(timezone: string): timezone is SupportedTimezone {
    const supportedTimezones: SupportedTimezone[] = [
      'America/New_York',
      'America/Chicago',
      'America/Denver', 
      'America/Los_Angeles',
      'America/Phoenix',
      'America/Anchorage',
      'Pacific/Honolulu'
    ];
    
    return supportedTimezones.includes(timezone as SupportedTimezone);
  }

  /**
   * Get timezone display name for UI
   */
  static getDisplayName(timezone: SupportedTimezone): string {
    const names: Record<SupportedTimezone, string> = {
      'America/New_York': 'Eastern Time',
      'America/Chicago': 'Central Time',
      'America/Denver': 'Mountain Time',
      'America/Los_Angeles': 'Pacific Time',
      'America/Phoenix': 'Arizona Time',
      'America/Anchorage': 'Alaska Time',
      'Pacific/Honolulu': 'Hawaii Time',
    };
    return names[timezone];
  }

  /**
   * Parse time string (e.g., "2:30 PM") into hours and minutes
   */
  static parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
    const cleanTime = timeStr.trim().toLowerCase();
    
    // Handle AM/PM format - improved regex
    const ampmMatch = cleanTime.match(/^(\d{1,2}):?(\d{0,2})\s*(am|pm)$/);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1]);
      const minutes = ampmMatch[2] ? parseInt(ampmMatch[2]) : 0;
      const isPM = ampmMatch[3] === 'pm';
      
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
      
      console.log(`[TimezoneService] Parsed "${timeStr}" as ${hours}:${minutes.toString().padStart(2, '0')} (24-hour)`);
      return { hours, minutes };
    }
    
    // Handle time without AM/PM - assume PM for working hours
    const timeOnlyMatch = cleanTime.match(/^(\d{1,2}):?(\d{0,2})$/);
    if (timeOnlyMatch) {
      let hours = parseInt(timeOnlyMatch[1]);
      const minutes = timeOnlyMatch[2] ? parseInt(timeOnlyMatch[2]) : 0;
      
      // Smart assumption for working hours:
      // 7-8: need clarification (could be AM or PM)
      // 9-11: assume AM (morning appointments)
      // 12: assume PM (noon/afternoon)
      // 1-6: assume PM (afternoon appointments)
      // For now, let's assume PM for most hours except early morning
      if (hours >= 1 && hours <= 11 && hours !== 7 && hours !== 8) {
        hours += 12; // Convert to PM
      } else if (hours === 12) {
        // 12:xx stays as 12 (noon)
      }
      // 7 and 8 will need special handling or clarification
      
      const result = { hours, minutes };
      console.log(`[TimezoneService] Parsed "${timeStr}" as ${result.hours}:${result.minutes.toString().padStart(2, '0')} (assumed PM for working hours)`);
      return result;
    }
    
    // Handle simple numbers (assume PM for common scheduling times)
    const simpleNumberMatch = cleanTime.match(/^(\d{1,2})$/);
    if (simpleNumberMatch) {
      let hours = parseInt(simpleNumberMatch[1]);
      
      // Assume PM for common scheduling hours (9-6), AM for early hours (7-8)
      if (hours >= 9 && hours <= 11) {
        // 9, 10, 11 -> assume PM (21:00, 22:00, 23:00)
        hours += 12;
      } else if (hours >= 1 && hours <= 8) {
        // 1-8 -> assume PM for scheduling context (13:00-20:00)
        hours += 12;
      }
      // 12 stays as 12 (noon)
      
      const result = { hours, minutes: 0 };
      console.log(`[TimezoneService] Parsed simple number "${timeStr}" as ${result.hours}:00 (assumed PM)`);
      return result;
    }
    
    console.log(`[TimezoneService] Failed to parse time string: "${timeStr}"`);
    return null;
  }

  /**
   * Test timezone conversion accuracy
   */
  static testConversion(
    year: number, month: number, day: number, 
    hours: number, minutes: number,
    userTimezone: SupportedTimezone
  ): { success: boolean; details: string } {
    try {
      const utcDate = this.createInUserTimezone(
        { year, month, day, hours, minutes },
        userTimezone
      );
      
      const backToLocal = this.fromUtc(utcDate, userTimezone);
      const expected = new Date(year, month, day, hours, minutes);
      
      const matches = Math.abs(backToLocal.getTime() - expected.getTime()) < 60000; // Within 1 minute
      
      return {
        success: matches,
        details: `Input: ${year}-${month+1}-${day} ${hours}:${minutes} ${userTimezone} -> UTC: ${utcDate.toISOString()} -> Back: ${backToLocal.toString()}`
      };
    } catch (error) {
      return {
        success: false,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Prepare date for server submission (convert to UTC ISO string)
   */
  static prepareForServer(localDate: Date, userTimezone: SupportedTimezone): string {
    const utcDate = this.toUtc(localDate, userTimezone);
    return utcDate.toISOString();
  }

  /**
   * Create current time in user's timezone
   */
  static getCurrentTimeInUserTimezone(userTimezone: SupportedTimezone): Date {
    return this.fromUtc(new Date(), userTimezone);
  }
}