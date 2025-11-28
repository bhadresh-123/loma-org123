import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ProfileFormData, OptimisticUpdateContext } from '../types/ProfileTypes';
import { ProfileLogger } from '../ProfileLogger';

export function useOptimisticUpdates() {
  const queryClient = useQueryClient();
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, OptimisticUpdateContext>>(new Map());

  /**
   * Apply optimistic update with rollback capability
   */
  const optimisticUpdate = async (
    section: string,
    data: Partial<ProfileFormData>,
    apiCall: () => Promise<any>
  ): Promise<{ success: boolean; error?: Error }> => {
    const correlationId = ProfileLogger.generateCorrelationId();
    const startTime = ProfileLogger.startTiming(`optimistic_update_${section}`);

    try {
      // Store current data for rollback
      const currentUser = queryClient.getQueryData(['user']);
      const rollbackData = currentUser ? { ...currentUser } : undefined;

      // Create update context
      const updateContext: OptimisticUpdateContext = {
        section,
        data,
        rollbackData
      };

      // Track pending update
      setPendingUpdates(prev => new Map(prev.set(correlationId, updateContext)));

      // Apply optimistic update immediately
      queryClient.setQueryData(['user'], (oldUser: any) => ({
        ...oldUser,
        ...data
      }));

      ProfileLogger.logUserAction('optimistic_update_applied', {
        userId: (currentUser as any)?.id,
        sessionId: correlationId,
        section,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });

      // Execute actual API call
      const result = await apiCall();

      // Remove from pending updates on success
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(correlationId);
        return newMap;
      });

      // Refresh data to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['user'] });

      const duration = startTime();
      
      ProfileLogger.logPerformance('optimistic_update_success', {
        section,
        action: 'update_complete',
        duration,
        timestamp: new Date().toISOString(),
        sessionId: correlationId,
        userAgent: navigator.userAgent
      });

      return { success: true };

    } catch (error) {
      // Rollback optimistic update on error
      await rollback(correlationId);

      const duration = startTime();
      
      ProfileLogger.logError('optimistic_update_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId,
        timestamp: new Date().toISOString(),
        sessionId: correlationId,
        userAgent: navigator.userAgent
      });

      return { success: false, error: error as Error };
    }
  };

  /**
   * Rollback specific optimistic update
   */
  const rollback = async (correlationId: string): Promise<void> => {
    const updateContext = pendingUpdates.get(correlationId);
    
    if (updateContext?.rollbackData) {
      queryClient.setQueryData(['user'], updateContext.rollbackData);
      
      ProfileLogger.logUserAction('optimistic_update_rollback', {
        userId: (updateContext.rollbackData as any)?.id,
        sessionId: correlationId,
        section: updateContext.section,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
    }

    // Remove from pending updates
    setPendingUpdates(prev => {
      const newMap = new Map(prev);
      newMap.delete(correlationId);
      return newMap;
    });

    // Refresh data to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['user'] });
  };

  /**
   * Rollback all pending updates
   */
  const rollbackAll = async (): Promise<void> => {
    const correlationIds = Array.from(pendingUpdates.keys());
    
    for (const id of correlationIds) {
      await rollback(id);
    }

    ProfileLogger.logUserAction('optimistic_updates_rollback_all', {
      sessionId: 'rollback-all',
      section: 'all',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
  };

  /**
   * Check if there are pending updates
   */
  const hasPendingUpdates = (): boolean => {
    return pendingUpdates.size > 0;
  };

  /**
   * Get pending updates for specific section
   */
  const getPendingUpdatesForSection = (section: string): OptimisticUpdateContext[] => {
    return Array.from(pendingUpdates.values()).filter(update => update.section === section);
  };

  /**
   * Clear completed updates (cleanup)
   */
  const clearCompletedUpdates = (): void => {
    // This would typically be called after successful server confirmations
    setPendingUpdates(new Map());
  };

  return {
    optimisticUpdate,
    rollback,
    rollbackAll,
    hasPendingUpdates,
    getPendingUpdatesForSection,
    clearCompletedUpdates,
    pendingUpdatesCount: pendingUpdates.size
  };
}