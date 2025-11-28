import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Lightweight timezone utilities for LOMA platform
 * Replaces date-fns with dayjs to fix build timeout issues
 */

// Supported timezones matching the database constraint
export const SUPPORTED_TIMEZONES = [
  'America/New_York',
  'America/Chicago', 
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
] as const;

export type SupportedTimezone = typeof SUPPORTED_TIMEZONES[number];

/**
 * Converts date-fns format strings to dayjs format strings
 */
function convertDateFnsFormat(formatStr: string): string {
  return formatStr
    .replace(/yyyy/g, 'YYYY')
    .replace(/dd/g, 'DD')
    .replace(/MM/g, 'MM')
    .replace(/HH/g, 'HH')
    .replace(/mm/g, 'mm')
    .replace(/ss/g, 'ss')
    .replace(/PPPP/g, 'dddd, MMMM D, YYYY')  // Long date format (e.g., "Monday, January 1, 2024")
    .replace(/PPP/g, 'MMMM D, YYYY')         // Medium date format (e.g., "January 1, 2024")
    .replace(/EEEE/g, 'dddd')                // Full day name (Monday, Tuesday, etc.) - must come before EEE
    .replace(/EEE/g, 'ddd')                  // Day abbreviation (Mon, Tue, etc.)
    .replace(/MMMM/g, 'MMMM')                // Full month name (January, February, etc.) - must come before MMM
    .replace(/MMM/g, 'MMM')                  // Month abbreviation (Jan, Feb, etc.)
    .replace(/p/g, 'h:mm A')
    .replace(/\bd\b/g, 'D');                 // Day of month (1, 2, ..., 31)
}

/**
 * Formats a date/time for display in the user's timezone
 * @param date - Date string (ISO) or Date object
 * @param userTimezone - User's timezone (from their profile)
 * @param formatStr - date-fns format string (will be converted to dayjs format)
 * @returns Formatted date/time string in user's timezone
 */
export function formatInUserTimezone(
  date: string | Date,
  userTimezone: SupportedTimezone,
  formatStr: string = 'MMM D, YYYY h:mm A'
): string {
  try {
    const dayjsFormat = convertDateFnsFormat(formatStr);
    return dayjs(date).tz(userTimezone).format(dayjsFormat);
  } catch (error) {
    console.error('Error formatting date in timezone:', error);
    return 'Invalid Date';
  }
}

/**
 * Formats date only (no time) in user's timezone
 */
export function formatDateInUserTimezone(
  date: string | Date,
  userTimezone: SupportedTimezone,
  formatStr: string = 'MMM D, YYYY'
): string {
  return formatInUserTimezone(date, userTimezone, formatStr);
}

/**
 * Formats time only (no date) in user's timezone
 */
export function formatTimeInUserTimezone(
  date: string | Date,
  userTimezone: SupportedTimezone,
  formatStr: string = 'h:mm A'
): string {
  return formatInUserTimezone(date, userTimezone, formatStr);
}

/**
 * Converts a local date/time in user's timezone to UTC for storage
 * @param localDate - Date object representing time in user's timezone
 * @param userTimezone - User's timezone
 * @returns UTC Date object for database storage
 */
export function convertToUtc(localDate: Date, userTimezone: SupportedTimezone): Date {
  return dayjs.tz(localDate, userTimezone).utc().toDate();
}

/**
 * Converts UTC date to user's timezone for display/editing
 * @param utcDate - UTC date from database
 * @param userTimezone - User's timezone
 * @returns Date object in user's timezone
 */
export function convertFromUtc(utcDate: Date | string, userTimezone: SupportedTimezone): Date {
  return dayjs.utc(utcDate).tz(userTimezone).toDate();
}

/**
 * Creates a new Date for a specific time in user's timezone
 * @param year - Full year
 * @param month - Month (0-11, adjusted for dayjs which uses 1-12)
 * @param day - Day of month
 * @param hours - Hours (0-23)
 * @param minutes - Minutes (0-59)
 * @param userTimezone - User's timezone
 * @returns UTC Date object for storage
 */
export function createDateInUserTimezone(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  userTimezone: SupportedTimezone
): Date {
  // dayjs months are 0-indexed like Date constructor
  const localDateTime = dayjs.tz(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`, userTimezone);
  return localDateTime.utc().toDate();
}

/**
 * Gets timezone display name for UI
 */
export function getTimezoneDisplayName(timezone: SupportedTimezone): string {
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
 * Validates if a timezone is supported
 */
export function isValidTimezone(timezone: string): timezone is SupportedTimezone {
  return SUPPORTED_TIMEZONES.includes(timezone as SupportedTimezone);
}

/**
 * Gets current time in user's timezone
 */
export function getCurrentTimeInUserTimezone(userTimezone: SupportedTimezone): Date {
  return dayjs().tz(userTimezone).toDate();
}

/**
 * Prepares a local date for server submission (converts to UTC ISO string)
 */
export function prepareForServer(localDate: Date, userTimezone: SupportedTimezone): string {
  return dayjs.tz(localDate, userTimezone).utc().toISOString();
}

/**
 * Parse ISO date string to Date object
 */
export function parseISO(dateString: string): Date {
  return dayjs(dateString).toDate();
}

/**
 * Format date using standard format
 */
export function format(date: Date | string, formatStr: string): string {
  return dayjs(date).format(formatStr);
}

/**
 * Format date in specific timezone (equivalent to formatInTimeZone from date-fns-tz)
 */
export function formatInTimeZone(
  date: Date | string,
  timeZone: SupportedTimezone,
  formatStr: string
): string {
  return dayjs(date).tz(timeZone).format(formatStr);
}

/**
 * Convert from zoned time (equivalent to fromZonedTime from date-fns-tz)
 */
export function fromZonedTime(date: Date, timeZone: SupportedTimezone): Date {
  return dayjs.tz(date, timeZone).utc().toDate();
}

/**
 * Convert to zoned time (equivalent to toZonedTime from date-fns-tz)
 */
export function toZonedTime(date: Date | string, timeZone: SupportedTimezone): Date {
  return dayjs.utc(date).tz(timeZone).toDate();
}