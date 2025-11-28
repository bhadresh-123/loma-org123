import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import type { Client } from '@/types/schema';
import { apiRequest } from '@/lib/api';
import { useAuth } from './use-auth';
import { usePrimaryOrganization } from './use-organizations';

export function useClients() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { organization, isLoading: isLoadingOrg } = usePrimaryOrganization();

  const { data: clientsData = [], isLoading } = useQuery<Client[]>({
    queryKey: ['/api/patients'],
    staleTime: 0,
    cacheTime: 0,
    queryFn: async () => {
      try {
        const response = await fetch("/api/patients", {
          credentials: "include",
        });
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Not authenticated");
          }
          throw new Error("Failed to fetch patients");
        }
        const data = await response.json();
        // Handle HIPAA response format
        const patients = data.success ? data.data : data;
        return Array.isArray(patients) ? patients : [];
      } catch (error) {
        console.error('useClients fetch error:', error);
        return []; // Always return empty array on error to prevent production crashes
      }
    }
  });

  // Ensure clients is always an array to prevent production errors
  const clients = Array.isArray(clientsData) ? clientsData : [];

  const createClient = useMutation({
    mutationFn: async (newClient: Omit<Client, 'id'>) => {
      console.log('Creating patient with data:', newClient);
      
      // Validate user authentication first
      if (!user?.id) {
        throw new Error('User not authenticated. Please log in again.');
      }
      
      // Add required fields for HIPAA schema
      const patientData = {
        ...newClient,
        organizationId: organization?.id,
        primaryTherapistId: user.id,
      };
      
      // If no organization found, this is an error state
      if (!patientData.organizationId) {
        throw new Error('No organization found. Please contact support to set up your practice.');
      }
      
      return await apiRequest<Client>('/patients', {
        method: 'POST',
        body: patientData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      // Also refresh user profile to get updated organization data
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({
        title: 'Success',
        description: 'Patient created successfully',
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

  const updateClient = useMutation({
    mutationFn: async ({ id, data }: { 
      id: number; 
      data: Partial<Client> & {
        name?: string;
        email?: string | null;
        phone?: string | null;
        billingType?: string;
        sessionCost?: string | null;
        noShowFee?: string | null;
      }
    }) => {
      return await apiRequest<Client>(`/patients/${id}`, {
        method: 'PUT',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      toast({
        title: 'Success',
        description: 'Client updated successfully',
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

  const getClientById = (id: number) => {
    return clients.find(client => client.id === id) || null;
  };

  return {
    clients,
    isLoading: isLoading || isLoadingOrg,
    createClient: createClient.mutate,
    updateClient: updateClient.mutate,
    isCreating: createClient.isPending,
    isUpdating: updateClient.isPending,
    getClientById,
    organization,
  };
}