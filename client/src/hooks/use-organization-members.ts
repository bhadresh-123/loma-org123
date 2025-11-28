import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';
import type { 
  OrganizationMember, 
  AddMemberData, 
  UpdateMemberData, 
  AvailableTherapist 
} from '@/types/organization';

interface OrganizationMembersResponse {
  success: boolean;
  data: OrganizationMember[];
  count: number;
}

interface AvailableTherapistsResponse {
  success: boolean;
  data: AvailableTherapist[];
  count: number;
}

/**
 * Hook to fetch organization members
 */
export function useOrganizationMembers(organizationId: number) {
  return useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: async (): Promise<OrganizationMember[]> => {
      const response = await fetch(`/api/organizations/${organizationId}/members`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required - please log in again');
        } else if (response.status === 403) {
          throw new Error('Insufficient permissions to view organization members');
        } else if (response.status === 500) {
          throw new Error('Server error - please try again later');
        } else {
          throw new Error(`Failed to fetch organization members: ${response.status} ${response.statusText}`);
        }
      }
      
      const data: OrganizationMembersResponse = await response.json();
      return data.success ? data.data : [];
    },
    retry: (failureCount, error) => {
      // Don't retry on authentication or permission errors
      if (error.message.includes('Authentication required') || 
          error.message.includes('Insufficient permissions') ||
          error.message.includes('Server error')) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!organizationId,
  });
}

/**
 * Hook to fetch available therapists for adding to organization
 */
export function useAvailableTherapists(organizationId: number) {
  return useQuery({
    queryKey: ['available-therapists', organizationId],
    queryFn: async (): Promise<AvailableTherapist[]> => {
      const response = await fetch(`/api/organizations/${organizationId}/available-therapists`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required - please log in again');
        } else if (response.status === 403) {
          throw new Error('Insufficient permissions to view available therapists');
        } else if (response.status === 500) {
          throw new Error('Server error - please try again later');
        } else {
          throw new Error(`Failed to fetch available therapists: ${response.status} ${response.statusText}`);
        }
      }
      
      const data: AvailableTherapistsResponse = await response.json();
      return data.success ? data.data : [];
    },
    retry: (failureCount, error) => {
      // Don't retry on authentication or permission errors
      if (error.message.includes('Authentication required') || 
          error.message.includes('Insufficient permissions') ||
          error.message.includes('Server error')) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!organizationId,
  });
}

/**
 * Hook to add a member to organization
 */
export function useAddMember() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ organizationId, memberData }: { 
      organizationId: number; 
      memberData: AddMemberData 
    }) => {
      return await apiRequest<OrganizationMember>(`/api/organizations/${organizationId}/members`, {
        method: 'POST',
        body: memberData,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch organization members
      queryClient.invalidateQueries({ 
        queryKey: ['organization-members', variables.organizationId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['available-therapists', variables.organizationId] 
      });
      
      toast({
        title: 'Success',
        description: 'Team member added successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}

/**
 * Hook to update organization member
 */
export function useUpdateMember() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      organizationId, 
      memberId, 
      updateData 
    }: { 
      organizationId: number; 
      memberId: number; 
      updateData: UpdateMemberData 
    }) => {
      return await apiRequest<OrganizationMember>(`/api/organizations/${organizationId}/members/${memberId}`, {
        method: 'PUT',
        body: updateData,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch organization members
      queryClient.invalidateQueries({ 
        queryKey: ['organization-members', variables.organizationId] 
      });
      
      toast({
        title: 'Success',
        description: 'Member updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}

/**
 * Hook to send invite to therapist by email
 */
export function useSendInvite() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      organizationId, 
      email, 
      role, 
      permissions 
    }: { 
      organizationId: number; 
      email: string; 
      role: string;
      permissions?: any;
    }) => {
      return await apiRequest(`/organizations/${organizationId}/invites`, {
        method: 'POST',
        body: { email, role, permissions },
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate invites list
      queryClient.invalidateQueries({ 
        queryKey: ['organization-invites', variables.organizationId] 
      });
      
      toast({
        title: 'Success',
        description: 'Invitation sent successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}

/**
 * Hook to remove/deactivate organization member
 */
export function useRemoveMember() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      organizationId, 
      memberId 
    }: { 
      organizationId: number; 
      memberId: number 
    }) => {
      return await apiRequest(`/organizations/${organizationId}/members/${memberId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch organization members
      queryClient.invalidateQueries({ 
        queryKey: ['organization-members', variables.organizationId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['available-therapists', variables.organizationId] 
      });
      
      toast({
        title: 'Success',
        description: 'Member deactivated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });
}
