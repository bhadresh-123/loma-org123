import { useQuery } from '@tanstack/react-query';
import { useTimezone } from '@/contexts/TimezoneContext';
import { convertFromUtc } from '@/utils/timezoneUtils';
import type { Session } from '@/types/schema';

/**
 * Hook to fetch sessions with timezone-aware formatting
 * Converts UTC timestamps to user's timezone for display
 */
export function useTimezoneAwareSessions() {
  const { userTimezone } = useTimezone();

  return useQuery<Session[]>({
    queryKey: ['/api/clinical-sessions', userTimezone],
    queryFn: async () => {
      const response = await fetch('/api/clinical-sessions', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      
      const sessions = await response.json();
      
      // Convert UTC dates to user timezone for all sessions
      return sessions.map((session: Session) => ({
        ...session,
        // Keep original date for API operations, add display version
        displayDate: convertFromUtc(session.date, userTimezone),
      }));
    },
    staleTime: 30000,
  });
}