import { useQuery } from '@tanstack/react-query';

interface AuthStatus {
  isAuthenticated: boolean;
  user: {
    id: number;
    username: string;
    email: string;
  } | null;
}

/**
 * Hook to check authentication status without profile data
 * This separates auth checking from profile fetching to avoid circular dependencies
 */
export function useAuthStatus() {
  return useQuery({
    queryKey: ['auth-status'],
    queryFn: async (): Promise<AuthStatus> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      try {
        const response = await fetch('/api/auth/status', {
          signal: controller.signal,
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          if (response.status === 401) {
            return { isAuthenticated: false, user: null };
          } else if (response.status === 500) {
            throw new Error('Server error - please try again later');
          } else {
            throw new Error(`Failed to check auth status: ${response.status} ${response.statusText}`);
          }
        }
        
        return response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - auth check is taking too long');
        }
        
        // If there's a network error, assume not authenticated
        if (error.message.includes('fetch')) {
          return { isAuthenticated: false, user: null };
        }
        
        throw error;
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on authentication errors or timeouts
      if (error.message.includes('timeout') ||
          error.message.includes('Server error')) {
        return false;
      }
      return failureCount < 1; // Only retry once for network issues
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}