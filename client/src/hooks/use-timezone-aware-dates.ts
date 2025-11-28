import { useMemo } from 'react';
import { useTimezone } from '@/contexts/TimezoneContext';
import { 
  convertFromUtc, 
  convertToUtc, 
  formatTimeInUserTimezone, 
  formatDateInUserTimezone,
  formatInUserTimezone 
} from '@/utils/timezoneUtils';

/**
 * Hook that provides timezone-aware date utilities
 * Automatically uses the user's timezone from context
 */
export function useTimezoneAwareDates() {
  const { userTimezone } = useTimezone();

  return useMemo(() => ({
    /**
     * Convert UTC date to user's timezone
     */
    fromUtc: (utcDate: Date | string) => convertFromUtc(utcDate, userTimezone),

    /**
     * Convert local date to UTC for storage
     */
    toUtc: (localDate: Date) => convertToUtc(localDate, userTimezone),

    /**
     * Format time in user's timezone
     */
    formatTime: (date: Date | string, format = 'p') => 
      formatTimeInUserTimezone(date, userTimezone, format),

    /**
     * Format date in user's timezone
     */
    formatDate: (date: Date | string, format = 'PPP') => 
      formatDateInUserTimezone(date, userTimezone, format),

    /**
     * Format date and time in user's timezone
     */
    formatDateTime: (date: Date | string, format = 'PPP p') => 
      formatInUserTimezone(date, userTimezone, format),

    /**
     * Get current user timezone
     */
    timezone: userTimezone,

  }), [userTimezone]);
}