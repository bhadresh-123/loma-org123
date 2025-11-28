/**
 * Date-fns compatibility layer using dayjs
 * This provides the same API as date-fns but uses dayjs under the hood
 * to avoid the 900+ locale dependencies that cause build timeouts
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isBetween from 'dayjs/plugin/isBetween';
import isTodayPlugin from 'dayjs/plugin/isToday';

// Initialize dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);
dayjs.extend(relativeTime);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);
dayjs.extend(isTodayPlugin);

// Export date-fns compatible functions using dayjs

export function format(date: Date | string, formatStr: string): string {
  // Convert date-fns format strings to dayjs format strings
  // Note: Replace longer patterns first (EEEE before EEE, MMMM before MMM) to avoid partial matches
  const dayjsFormat = formatStr
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
  
  return dayjs(date).format(dayjsFormat);
}

export function parseISO(dateString: string): Date {
  return dayjs(dateString).toDate();
}

export function isValid(date: Date | string): boolean {
  return dayjs(date).isValid();
}

export function isBefore(date: Date | string, dateToCompare: Date | string): boolean {
  return dayjs(date).isBefore(dayjs(dateToCompare));
}

export function isAfter(date: Date | string, dateToCompare: Date | string): boolean {
  return dayjs(date).isAfter(dayjs(dateToCompare));
}

export function isSameDay(dateLeft: Date | string, dateRight: Date | string): boolean {
  return dayjs(dateLeft).isSame(dayjs(dateRight), 'day');
}

export function isSameMonth(dateLeft: Date | string, dateRight: Date | string): boolean {
  return dayjs(dateLeft).isSame(dayjs(dateRight), 'month');
}

export function addDays(date: Date | string, amount: number): Date {
  return dayjs(date).add(amount, 'day').toDate();
}

export function addWeeks(date: Date | string, amount: number): Date {
  return dayjs(date).add(amount, 'week').toDate();
}

export function addMonths(date: Date | string, amount: number): Date {
  return dayjs(date).add(amount, 'month').toDate();
}

export function startOfDay(date: Date | string): Date {
  return dayjs(date).startOf('day').toDate();
}

export function endOfDay(date: Date | string): Date {
  return dayjs(date).endOf('day').toDate();
}

export function startOfWeek(date: Date | string): Date {
  return dayjs(date).startOf('week').toDate();
}

export function endOfWeek(date: Date | string): Date {
  return dayjs(date).endOf('week').toDate();
}

export function startOfMonth(date: Date | string): Date {
  return dayjs(date).startOf('month').toDate();
}

export function endOfMonth(date: Date | string): Date {
  return dayjs(date).endOf('month').toDate();
}

export function setHours(date: Date | string, hours: number): Date {
  return dayjs(date).hour(hours).toDate();
}

export function setMinutes(date: Date | string, minutes: number): Date {
  return dayjs(date).minute(minutes).toDate();
}

export function setSeconds(date: Date | string, seconds: number): Date {
  return dayjs(date).second(seconds).toDate();
}

export function startOfHour(date: Date | string): Date {
  return dayjs(date).startOf('hour').toDate();
}

export function eachDayOfInterval(interval: { start: Date | string; end: Date | string }): Date[] {
  const start = dayjs(interval.start);
  const end = dayjs(interval.end);
  const days: Date[] = [];
  
  let current = start;
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    days.push(current.toDate());
    current = current.add(1, 'day');
  }
  
  return days;
}

export function isWithinInterval(date: Date | string, interval: { start: Date | string; end: Date | string }): boolean {
  return dayjs(date).isBetween(dayjs(interval.start), dayjs(interval.end), null, '[]');
}

export function areIntervalsOverlapping(
  intervalLeft: { start: Date | string; end: Date | string },
  intervalRight: { start: Date | string; end: Date | string }
): boolean {
  const leftStart = dayjs(intervalLeft.start);
  const leftEnd = dayjs(intervalLeft.end);
  const rightStart = dayjs(intervalRight.start);
  const rightEnd = dayjs(intervalRight.end);
  
  return leftStart.isBefore(rightEnd) && rightStart.isBefore(leftEnd);
}

export function formatDistanceToNow(date: Date | string): string {
  return dayjs(date).fromNow();
}

// Additional compatibility functions
export function isToday(date: Date | string): boolean {
  return dayjs(date).isSame(dayjs(), 'day');
}

export function isFuture(date: Date | string): boolean {
  return dayjs(date).isAfter(dayjs());
}

// Local formatting functions
export function formatLocalTime(date: Date | string, formatStr: string = 'h:mm a'): string {
  // Convert date-fns format strings to dayjs format strings
  const dayjsFormat = formatStr
    .replace(/yyyy/g, 'YYYY')
    .replace(/dd/g, 'DD')
    .replace(/MM/g, 'MM')
    .replace(/HH/g, 'HH')
    .replace(/mm/g, 'mm')
    .replace(/ss/g, 'ss')
    .replace(/PPPP/g, 'dddd, MMMM D, YYYY')
    .replace(/PPP/g, 'MMMM D, YYYY')
    .replace(/EEEE/g, 'dddd')
    .replace(/EEE/g, 'ddd')
    .replace(/MMMM/g, 'MMMM')
    .replace(/MMM/g, 'MMM')
    .replace(/p/g, 'h:mm A')
    .replace(/\bd\b/g, 'D');
  return dayjs(date).format(dayjsFormat);
}

export function formatLocalDate(date: Date | string, formatStr: string = 'MMM D, YYYY'): string {
  // Convert date-fns format strings to dayjs format strings
  const dayjsFormat = formatStr
    .replace(/yyyy/g, 'YYYY')
    .replace(/dd/g, 'DD')
    .replace(/MM/g, 'MM')
    .replace(/HH/g, 'HH')
    .replace(/mm/g, 'mm')
    .replace(/ss/g, 'ss')
    .replace(/PPPP/g, 'dddd, MMMM D, YYYY')
    .replace(/PPP/g, 'MMMM D, YYYY')
    .replace(/EEEE/g, 'dddd')
    .replace(/EEE/g, 'ddd')
    .replace(/MMMM/g, 'MMMM')
    .replace(/MMM/g, 'MMM')
    .replace(/p/g, 'h:mm A')
    .replace(/\bd\b/g, 'D');
  return dayjs(date).format(dayjsFormat);
}

// Re-export our dayjs instance for direct use
export { dayjs };