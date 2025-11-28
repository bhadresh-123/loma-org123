import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface ProfileData {
  name: string;
  title: string;
  licenseNumber: string;
  addressEncrypted: string;
  city: string;
  state: string;
  zipCode: string;
  personalPhoneEncrypted: string;
  personalEmailEncrypted: string;
  biography: string;
  yearsOfExperience: number | null;
  qualifications: string;
  languages: string[];
  sessionFormat: string;
  baseRate: number | null;
  slidingScale: boolean;
  specialties: string[];
  therapistIdentities: string[];
  ssnEncrypted: string;
  dateOfBirthEncrypted: string;
  birthCityEncrypted: string;
  birthStateEncrypted: string;
  birthCountryEncrypted: string;
  isUsCitizen: boolean | null;
  workPermitVisa: string;
  npiNumber: string;
  taxonomyCode: string;
  einNumber: string;
  legalBusinessName: string;
  isInsuranceProvider: boolean;
  acceptedProviders: string[];
  groupSessionRate: number | null;
  defaultNoteFormat: string;
  sessionDuration: number;
  timeZone: string;
  practiceName: string;
}

/**
 * Hook to fetch profile data using the consolidated profile API
 * @param isAuthenticated - Whether the user is authenticated (from useAuthStatus)
 */
export function useProfile(isAuthenticated: boolean) {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async (): Promise<ProfileData> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch('/api/profile', {
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
            throw new Error('Authentication required - please log in again');
          } else if (response.status === 500) {
            throw new Error('Server error - please try again later');
          } else {
            throw new Error(`Failed to fetch profile: ${response.status} ${response.statusText}`);
          }
        }
        
        return response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - profile is taking too long to load');
        }
        
        throw error;
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on authentication errors or timeouts
      if (error.message.includes('Authentication required') || 
          error.message.includes('timeout') ||
          error.message.includes('Server error')) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isAuthenticated, // Only run query when user is authenticated
  });
}

/**
 * Hook to update profile data using the consolidated profile API
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<ProfileData>): Promise<ProfileData> => {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate and refetch profile data
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      toast({
        title: "Profile updated successfully",
        description: "Your changes have been saved",
      });
    },
    onError: (error: Error) => {
      console.error('Profile update failed:', error);
      
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to get profile data for integration with other services (CMS-1500, Stripe, etc.)
 */
export function useProfileIntegration() {
  return useQuery({
    queryKey: ['profile-integration'],
    queryFn: async () => {
      const response = await fetch('/api/profile-clean/integration');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch integration profile: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: false, // Only fetch when explicitly called
    retry: 1,
  });
}