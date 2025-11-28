import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProfileFormData } from '../types/ProfileTypes';
import { UserIcon, DocumentArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { PencilIcon } from '@heroicons/react/24/outline';

interface BasicInfoSectionProps {
  form: UseFormReturn<ProfileFormData>;
  isLoading?: boolean;
  onSaveComplete?: () => void;
  onSubmit?: (data: ProfileFormData) => void;
}

export function BasicInfoSection({ form, isLoading, onSaveComplete, onSubmit }: BasicInfoSectionProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    // Trigger form submission with current form data
    if (onSubmit) {
      onSubmit(form.getValues());
    }
    setIsEditing(false);
    onSaveComplete?.();
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Basic Information
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
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your full name"
                    disabled={isLoading || !isEditing}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Professional Title *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Licensed Clinical Social Worker"
                    disabled={isLoading || !isEditing}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="license"
            render={({ field }) => (
              <FormItem>
                <FormLabel>License Number *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your license number"
                    disabled={isLoading || !isEditing}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address *</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    disabled={isLoading || !isEditing}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number *</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="Enter your phone number"
                  disabled={isLoading || !isEditing}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}