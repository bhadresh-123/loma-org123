import { useQuery } from '@tanstack/react-query';
import { useAuth } from './use-auth';

interface Organization {
  id: number;
  name: string;
  type: string;
  businessEin?: string;
  businessAddress?: string;
  businessCity?: string;
  businessState?: string;
  businessZip?: string;
  businessPhone?: string;
  businessEmail?: string;
  defaultSessionDuration?: number;
  timezone?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrganizationMembership {
  id: number;
  organizationId: number;
  userId: number;
  role: 'business_owner' | 'admin' | 'therapist' | 'contractor_1099';
  canViewAllPatients: boolean;
  canViewSelectedPatients: number[];
  canViewAllCalendars: boolean;
  canViewSelectedCalendars: number[];
  canManageBilling: boolean;
  canManageStaff: boolean;
  canManageSettings: boolean;
  canCreatePatients: boolean;
  employmentStartDate: string | null;
  employmentEndDate: string | null;
  isActive: boolean;
  isPrimaryOwner: boolean;
  createdAt: string;
  updatedAt: string;
  organization: Organization;
}

interface OrganizationsResponse {
  success: boolean;
  data: OrganizationMembership[];
  count: number;
}

/**
 * Hook to fetch user's organizations
 */
export function useOrganizations() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['organizations', user?.id],
    queryFn: async (): Promise<OrganizationMembership[]> => {
      const response = await fetch('/api/organizations', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required - please log in again');
        } else if (response.status === 500) {
          throw new Error('Server error - please try again later');
        } else {
          throw new Error(`Failed to fetch organizations: ${response.status} ${response.statusText}`);
        }
      }
      
      const data: OrganizationsResponse = await response.json();
      return data.success ? data.data : [];
    },
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error.message.includes('Authentication required') || 
          error.message.includes('Server error')) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!user?.id, // Only run query when user is authenticated
  });
}

/**
 * Hook to get the user's primary organization (first one)
 */
export function usePrimaryOrganization() {
  const { user, isLoading: userLoading } = useAuth();
  
  // Get organization data from user's organizationMembership
  const organizationMembership = user?.organizationMembership;
  const organization = organizationMembership?.organization;
  
  return {
    organization: organization || null,
    membership: organizationMembership || null,
    isLoading: userLoading, // Use user loading state
    error: null,
  };
}
