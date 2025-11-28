import { ReactNode, createContext, useContext } from "react";
import {
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { useToast } from "@/contexts/ToastContext";
import { useAuthStatus } from "./useAuthStatus";
import { useProfile } from "./useProfile";

import { UserProfile } from "../types/user";

// Use the standardized UserProfile type
type SelectUser = UserProfile;

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, RegisterData>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
  name: string;
  email?: string;
  title?: string;
  license?: string;
  specialties?: string;
  practiceName: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Use the new separated hooks
  const { data: authStatus, isLoading: authStatusLoading } = useAuthStatus();
  const isAuthenticated = authStatus?.isAuthenticated || false;
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile(isAuthenticated);
  
  // Determine user data
  const user = isAuthenticated ? profile : null;
  const isLoading = authStatusLoading || (isAuthenticated && profileLoading);
  const error = profileError;

  const loginMutation = useMutation<SelectUser, Error, LoginData>({
    mutationFn: async (credentials) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include', // Include cookies to receive session cookie
        body: JSON.stringify(credentials),
      });
      
      if (!res.ok) {
        // Check if response is JSON
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const error = await res.json();
          throw new Error(error.message || "Login failed");
        } else {
          // Handle HTML response (like error pages)
          const text = await res.text();
          console.error("Non-JSON response from login:", text);
          throw new Error("Server returned invalid response format");
        }
      }
      
      // Ensure response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response from login:", text);
        throw new Error("Server returned invalid response format");
      }
      
      return res.json();
    },
    onSuccess: (userData) => {
      // Invalidate auth status to trigger re-check
      queryClient.invalidateQueries({ queryKey: ['auth-status'] });
      // Enable profile query for authenticated user
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: "Login successful",
        description: `Welcome, ${userData.name}!`,
      });
    },
    onError: (error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation<SelectUser, Error, RegisterData>({
    mutationFn: async (userData) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include', // Include cookies to receive session cookie
        body: JSON.stringify(userData),
      });
      
      if (!res.ok) {
        const error = await res.json();
        // Enhanced error handling for validation errors
        if (error.error === "VALIDATION_ERROR" && error.details) {
          // Handle details as either array or string
          if (Array.isArray(error.details)) {
            const passwordError = error.details.find((detail: any) => detail.field === "password");
            if (passwordError) {
              throw new Error(passwordError.message);
            }
          } else if (typeof error.details === 'string') {
            // If details is a string, use it directly
            throw new Error(error.details);
          }
        }
        throw new Error(error.message || "Registration failed");
      }
      
      return res.json();
    },
    onSuccess: (userData) => {
      console.log('[REGISTRATION] Registration successful, invalidating auth status and profile queries.');
      console.log('[REGISTRATION] User data received:', userData);
      console.log('[REGISTRATION] Current cookies after registration:', document.cookie);
      
      // Invalidate auth status to trigger re-check
      queryClient.invalidateQueries({ queryKey: ['auth-status'] });
      // Enable profile query for authenticated user
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      // Force immediate refetch to ensure auth status is updated
      queryClient.refetchQueries({ queryKey: ['auth-status'] });
      
      toast({
        title: "Registration successful",
        description: `Welcome, ${userData.name}!`,
      });
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Logout failed");
      }
    },
    onSuccess: () => {
      // Clear all auth-related cache
      queryClient.removeQueries({ queryKey: ['auth-status'] });
      queryClient.removeQueries({ queryKey: ['profile'] });
      toast({
        title: "Logout successful",
        description: "You have been logged out",
      });
    },
    onError: (error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}