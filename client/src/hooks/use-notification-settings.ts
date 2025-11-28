import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface NotificationSettings {
  sessionReminder: boolean;
  taskAutomation: boolean;
  taskCompleted: boolean;
  documentUploaded: boolean;
  invoiceGenerated: boolean;
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/notification-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        // Use default settings if none exist
        setSettings({
          sessionReminder: true,
          taskAutomation: true,
          taskCompleted: false,
          documentUploaded: true,
          invoiceGenerated: true,
        });
      }
    } catch (error) {
      console.error('Failed to fetch notification settings:', error);
      // Use default settings on error
      setSettings({
        sessionReminder: true,
        taskAutomation: true,
        taskCompleted: false,
        documentUploaded: true,
        invoiceGenerated: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<NotificationSettings>) => {
    if (!settings) return;

    setIsUpdating(true);
    const newSettings = { ...settings, ...updates };

    try {
      const response = await fetch('/api/notification-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (response.ok) {
        setSettings(newSettings);
        toast({
          title: "Settings updated",
          description: "Your notification preferences have been saved.",
        });
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      toast({
        title: "Update failed",
        description: "Failed to save your notification preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    settings,
    isLoading,
    updateSettings,
    isUpdating,
  };
}