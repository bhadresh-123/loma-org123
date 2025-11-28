import { queryClient } from "./queryClient";

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...options.headers,
    };

    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`/api${endpoint}`, {
      method: options.method || 'GET',
      credentials: 'include', // Always include credentials for session handling
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const error = await response.json();
        throw new Error(error.message || `API request failed: ${response.status}`);
      }
      throw new Error(`API request failed: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    return response.text() as unknown;
  } catch (error) {
    console.error('API request error:', error);
    throw error instanceof Error ? error : new Error('Unknown error occurred');
  }
}

// Common mutations helper
export function createMutation<TData, TVariables>(
  endpoint: string,
  options: {
    method?: string;
    onSuccess?: (data: TData) => void;
    invalidateQueries?: string[];
  } = {}
) {
  return {
    mutationFn: async (variables: TVariables) => {
      return apiRequest<TData>(endpoint, {
        method: options.method || 'POST',
        body: variables,
      });
    },
    onSuccess: (data: TData) => {
      if (options.invalidateQueries) {
        options.invalidateQueries.forEach(query => {
          queryClient.invalidateQueries({ queryKey: [query] });
        });
      }
      if (options.onSuccess) {
        options.onSuccess(data);
      }
    },
  };
}