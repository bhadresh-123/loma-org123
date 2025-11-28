import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export type Notification = {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  entityId?: number | null;
  entityType?: string | null;
  isRead: boolean;
  isAutomated: boolean;
  readAt?: string | null;
  createdAt: string;
};

export function useNotifications() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications
  const { data: notifications, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/notifications');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch notifications');
        }
        
        const data = await response.json();
        return data as Notification[];
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        throw err;
      }
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Mark a notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark notification as read');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the notifications cache to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Unknown error');
    },
  });

  // Mark all notifications as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark all notifications as read');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the notifications cache to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Unknown error');
    },
  });

  // Ensure notifications is always an array before using filter
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter(n => !n.isRead).length;

  return {
    notifications: safeNotifications,
    unreadCount,
    isLoading,
    isError,
    error,
    markAsRead,
    markAllAsRead,
    refetch,
  };
}