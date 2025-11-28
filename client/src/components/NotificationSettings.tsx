import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useNotificationSettings } from '@/hooks/use-notification-settings';

export function NotificationSettings() {
  const { settings, isLoading, updateSettings, isUpdating } = useNotificationSettings();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>Configure which notifications you'd like to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between space-y-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-10" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const handleToggle = (field: string, value: boolean) => {
    updateSettings({ [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>Configure which notifications you'd like to receive</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between space-y-0.5">
            <Label htmlFor="session-reminder" className="flex flex-col">
              <span className="text-base">Session Reminders</span>
              <span className="text-sm text-muted-foreground">
                Get notified 15 minutes before your sessions start
              </span>
            </Label>
            <Switch
              id="session-reminder"
              checked={settings?.sessionReminder || false}
              onCheckedChange={(checked) => handleToggle('sessionReminder', checked)}
              disabled={isUpdating}
            />
          </div>
          
          <div className="flex items-center justify-between space-y-0.5">
            <Label htmlFor="task-automation" className="flex flex-col">
              <span className="text-base">Task Automation</span>
              <span className="text-sm text-muted-foreground">
                Get notified when tasks are automatically created
              </span>
            </Label>
            <Switch
              id="task-automation"
              checked={settings?.taskAutomation || false}
              onCheckedChange={(checked) => handleToggle('taskAutomation', checked)}
              disabled={isUpdating}
            />
          </div>
          
          <div className="flex items-center justify-between space-y-0.5">
            <Label htmlFor="task-completed" className="flex flex-col">
              <span className="text-base">Task Completion</span>
              <span className="text-sm text-muted-foreground">
                Get notified when tasks are automatically completed
              </span>
            </Label>
            <Switch
              id="task-completed"
              checked={settings?.taskCompleted || false}
              onCheckedChange={(checked) => handleToggle('taskCompleted', checked)}
              disabled={isUpdating}
            />
          </div>
          
          <div className="flex items-center justify-between space-y-0.5">
            <Label htmlFor="document-uploaded" className="flex flex-col">
              <span className="text-base">Document Updates</span>
              <span className="text-sm text-muted-foreground">
                Get notified when documents are uploaded or shared
              </span>
            </Label>
            <Switch
              id="document-uploaded"
              checked={settings?.documentUploaded || false}
              onCheckedChange={(checked) => handleToggle('documentUploaded', checked)}
              disabled={isUpdating}
            />
          </div>
          
          <div className="flex items-center justify-between space-y-0.5">
            <Label htmlFor="invoice-generated" className="flex flex-col">
              <span className="text-base">Invoice Notifications</span>
              <span className="text-sm text-muted-foreground">
                Get notified when invoices are generated
              </span>
            </Label>
            <Switch
              id="invoice-generated"
              checked={settings?.invoiceGenerated || false}
              onCheckedChange={(checked) => handleToggle('invoiceGenerated', checked)}
              disabled={isUpdating}
            />
          </div>
        </div>
        
        {isUpdating && (
          <div className="flex justify-end">
            <Button disabled variant="outline">
              <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}