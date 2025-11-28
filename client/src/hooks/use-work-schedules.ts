import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import axios from 'axios';

const LOCAL_STORAGE_KEY = 'practice_management_work_schedules';

interface WorkSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  // Database fields might include these, but they're optional for client side
  id?: number;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Fallback to load schedules from localStorage if API fails
const loadSchedulesFromStorage = (): WorkSchedule[] => {
  const storedSchedules = localStorage.getItem(LOCAL_STORAGE_KEY);
  return storedSchedules ? JSON.parse(storedSchedules) : [];
};

// Save work schedules to localStorage as a backup
const saveSchedulesToStorage = (schedules: WorkSchedule[]) => {
  // Store a simplified version without database fields
  const simplifiedSchedules = schedules.map(({ dayOfWeek, startTime, endTime }) => ({
    dayOfWeek, startTime, endTime
  }));
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(simplifiedSchedules));
};

export function useWorkSchedules() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading } = useQuery<WorkSchedule[]>({
    queryKey: ['/api/work-schedules'],
    queryFn: async () => {
      try {
        // Try to fetch schedules from the API
        const response = await axios.get('/api/work-schedules');
        
        // Handle the API response structure - check if it's wrapped in a success object
        const schedulesData = response.data?.data || response.data;
        
        // If successful, also update the local storage backup
        saveSchedulesToStorage(schedulesData);
        
        return schedulesData;
      } catch (error) {
        console.warn('Work schedules API not available, using default schedule');
        
        // Return default work schedule (9 AM to 6 PM, Monday-Friday)
        const defaultSchedule = [
          { dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }, // Monday
          { dayOfWeek: 2, startTime: '09:00', endTime: '18:00' }, // Tuesday
          { dayOfWeek: 3, startTime: '09:00', endTime: '18:00' }, // Wednesday
          { dayOfWeek: 4, startTime: '09:00', endTime: '18:00' }, // Thursday
          { dayOfWeek: 5, startTime: '09:00', endTime: '18:00' }, // Friday
        ];
        
        // Save default schedule to localStorage
        saveSchedulesToStorage(defaultSchedule);
        
        return defaultSchedule;
      }
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const updateSchedulesMutation = useMutation({
    mutationFn: async ({
      schedules,
      onSuccess
    }: {
      schedules: WorkSchedule[];
      onSuccess?: () => void;
    }) => {
      try {
        // Save to API
        const response = await axios.post('/api/work-schedules', schedules);
        
        // Handle the API response structure - check if it's wrapped in a success object
        const schedulesData = response.data?.data || response.data;
        
        // Also update local storage as a backup
        saveSchedulesToStorage(schedulesData);
        
        return { schedules: schedulesData, onSuccess };
      } catch (error) {
        console.error('Failed to save work schedules to API', error);
        
        // If API fails, at least save to localStorage
        saveSchedulesToStorage(schedules);
        
        throw new Error('Failed to save work schedules. Please try again.');
      }
    },
    onSuccess: (data) => {
      // Invalidate the work schedules query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/work-schedules'] });
      
      // Also invalidate any calendar related queries to force a refresh
      queryClient.invalidateQueries({ queryKey: ['/api/clinical-sessions'] });
      
      // Dispatch a custom event that other components can listen for
      window.dispatchEvent(new CustomEvent('workSchedulesUpdated', { 
        detail: { schedules: data.schedules } 
      }));
      
      toast({
        title: 'Success',
        description: 'Work schedule updated successfully',
      });
      
      // Call the success callback if provided
      data.onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  return {
    schedules,
    isLoading,
    updateSchedules: updateSchedulesMutation.mutate,
    isUpdating: updateSchedulesMutation.isPending,
  };
}