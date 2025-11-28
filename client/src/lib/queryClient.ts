import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        console.log('Making query request:', { queryKey });
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
        });

        console.log('Query response:', {
          url: queryKey[0],
          status: res.status,
          ok: res.ok,
        });

        if (!res.ok) {
          if (res.status === 401) {
            // Only redirect if we're not already on auth page and not fetching auth-related data
            const url = queryKey[0] as string;
            const currentPath = window.location.pathname;
            const isAuthEndpoint = url.includes('/api/login') || 
                               url.includes('/api/register') || 
                               url.includes('/api/user');
            const isAuthPage = currentPath === '/auth-page';

            // Don't log 401 errors when on auth page - this is expected behavior
            if (!isAuthPage) {
              console.log('Session expired, redirecting to auth page');
            }

            if (!isAuthEndpoint && !isAuthPage && !url.includes('/api/auth/check')) {
              queryClient.setQueryData(['user'], null);
              window.location.href = '/auth-page';
            }
            throw new Error("Not authenticated");
          }

          const errorText = await res.text();
          let message;
          try {
            const errorJson = JSON.parse(errorText);
            message = errorJson.message || errorText;
          } catch {
            message = errorText;
          }
          throw new Error(message);
        }

        const data = await res.json();

        // Check if the response includes clearCache flag
        if (data.clearCache) {
          console.log('Clearing query cache due to server request');
          queryClient.clear();
        }

        console.log('Query success data:', { 
          queryKey, 
          dataLength: Array.isArray(data) ? data.length : 'not array',
          type: typeof data 
        });
        return data;
      },
      // Don't cache data
      staleTime: 0,
      // Keep data in cache briefly for immediate re-renders
      gcTime: 1000,
      // Don't refetch on window focus
      refetchOnWindowFocus: false,
      // Don't retry on 401 errors
      retry: (failureCount, error) => {
        if (error.message === "Not authenticated") {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    }
  },
});