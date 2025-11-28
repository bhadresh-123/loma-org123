import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { DocumentArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { CogIcon, PencilIcon, BellIcon, BoltIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { ProfileFormData } from '../types/ProfileTypes';
import { useNotificationSettings } from '@/hooks/use-notification-settings';
import { useTheme } from '@/contexts/ThemeContext';

interface LomaSettingsSectionProps {
  form: UseFormReturn<ProfileFormData>;
  isLoading?: boolean;
  onSaveComplete?: () => void;
  onSubmit?: (data: ProfileFormData) => void;
}

const NOTE_FORMATS = ['SOAP', 'DAP', 'FIRP', 'GIRP', 'BIRP'] as const;
import { SUPPORTED_TIMEZONES, getTimezoneDisplayName } from '@/utils/timezoneUtils';

const TIME_ZONES = SUPPORTED_TIMEZONES;

export function LomaSettingsSection({ form, isLoading, onSaveComplete, onSubmit }: LomaSettingsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { settings: notificationSettings, updateSettings, isUpdating } = useNotificationSettings();
  const { theme, setTheme } = useTheme();

  const handleSave = () => {
    if (onSubmit) {
      onSubmit(form.getValues());
    }
    setIsEditing(false);
    onSaveComplete?.();
  };

  const handleNotificationToggle = (field: string, value: boolean) => {
    updateSettings({ [field]: value });
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CogIcon className="h-5 w-5" />
            LOMA Settings
          </CardTitle>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={isLoading}
                >
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading}
                  onClick={handleSave}
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="lomaSettings.defaultNoteFormat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Note Format</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || !isEditing}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select note format" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {NOTE_FORMATS.map((format) => (
                      <SelectItem key={format} value={format}>
                        {format}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lomaSettings.sessionDuration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Session Duration (minutes)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="15"
                    max="180"
                    placeholder="50"
                    disabled={isLoading || !isEditing}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 50)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="lomaSettings.timeZone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Time Zone</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || !isEditing}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time zone" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TIME_ZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {getTimezoneDisplayName(tz)} ({tz})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator className="my-6" />

        {/* Appearance Settings Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            {theme === 'dark' ? (
              <MoonIcon className="h-5 w-5" />
            ) : (
              <SunIcon className="h-5 w-5" />
            )}
            <h3 className="text-lg font-semibold">Appearance</h3>
          </div>
          
          <div className="flex items-center justify-between space-y-0.5">
            <Label htmlFor="dark-mode" className="flex flex-col">
              <span className="text-base">Dark Mode</span>
              <span className="text-sm text-muted-foreground">
                Switch between light and dark theme
              </span>
            </Label>
            <Switch
              id="dark-mode"
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </div>

        <Separator className="my-6" />

        {/* Notification Settings Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <BellIcon className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Notification Settings</h3>
          </div>
          
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
                checked={notificationSettings?.sessionReminder || false}
                onCheckedChange={(checked) => handleNotificationToggle('sessionReminder', checked)}
                disabled={isUpdating || !isEditing}
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
                checked={notificationSettings?.taskAutomation || false}
                onCheckedChange={(checked) => handleNotificationToggle('taskAutomation', checked)}
                disabled={isUpdating || !isEditing}
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
                checked={notificationSettings?.taskCompleted || false}
                onCheckedChange={(checked) => handleNotificationToggle('taskCompleted', checked)}
                disabled={isUpdating || !isEditing}
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
                checked={notificationSettings?.documentUploaded || false}
                onCheckedChange={(checked) => handleNotificationToggle('documentUploaded', checked)}
                disabled={isUpdating || !isEditing}
              />
            </div>
            
            <div className="flex items-center justify-between space-y-0.5">
              <Label htmlFor="invoice-generated" className="flex flex-col">
                <span className="text-base">Invoice Generation</span>
                <span className="text-sm text-muted-foreground">
                  Get notified when invoices are generated
                </span>
              </Label>
              <Switch
                id="invoice-generated"
                checked={notificationSettings?.invoiceGenerated || false}
                onCheckedChange={(checked) => handleNotificationToggle('invoiceGenerated', checked)}
                disabled={isUpdating || !isEditing}
              />
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Task Automation Settings Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <BoltIcon className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Task Automation Settings</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Session Note Tasks</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create note-taking tasks after sessions are completed
              </p>
              <Switch
                checked={notificationSettings?.taskAutomation || false}
                onCheckedChange={(checked) => handleNotificationToggle('taskAutomation', checked)}
                disabled={isUpdating || !isEditing}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Invoice Tasks</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create billing tasks for completed sessions
              </p>
              <Switch
                checked={notificationSettings?.invoiceGenerated || false}
                onCheckedChange={(checked) => handleNotificationToggle('invoiceGenerated', checked)}
                disabled={isUpdating || !isEditing}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Document Tasks</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create tasks for intake forms and documentation
              </p>
              <Switch
                checked={notificationSettings?.documentUploaded || false}
                onCheckedChange={(checked) => handleNotificationToggle('documentUploaded', checked)}
                disabled={isUpdating || !isEditing}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Task Completion</Label>
              <p className="text-sm text-muted-foreground">
                Automatically mark tasks as complete when requirements are met
              </p>
              <Switch
                checked={notificationSettings?.taskCompleted || false}
                onCheckedChange={(checked) => handleNotificationToggle('taskCompleted', checked)}
                disabled={isUpdating || !isEditing}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}