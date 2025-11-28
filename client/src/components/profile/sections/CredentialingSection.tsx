import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ProfileFormData } from '../types/ProfileTypes';
import { ShieldCheckIcon, DocumentArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ExclamationTriangleIcon, PencilIcon } from '@heroicons/react/24/outline';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CVParser } from '@/components/CVParser';

interface CredentialingSectionProps {
  form: UseFormReturn<ProfileFormData>;
  isLoading?: boolean;
  onSaveComplete?: () => void;
  onSubmit?: (data: ProfileFormData) => void;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export function CredentialingSection({ form, isLoading, onSaveComplete, onSubmit }: CredentialingSectionProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
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
            <ShieldCheckIcon className="h-5 w-5" />
            Credentialing Information
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
        <Alert>
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            This information is required for insurance credentialing and billing. All data is encrypted and HIPAA compliant.
          </AlertDescription>
        </Alert>

        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Personal Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="credentialing.ssn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Social Security Number *</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="XXX-XX-XXXX"
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
              name="credentialing.dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      disabled={isLoading || !isEditing}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Birth Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Birth Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="credentialing.birthCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Birth City *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="City"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="credentialing.birthState"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Birth State *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
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
              name="credentialing.birthCountry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Birth Country *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Country"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Citizenship */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="credentialing.isUsCitizen"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>US Citizen</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Are you a US citizen?
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {!form.watch('credentialing.isUsCitizen') && (
            <FormField
              control={form.control}
              name="credentialing.workPermitVisa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work Permit/Visa Information</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter work permit or visa details"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Professional Numbers */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Professional Identifiers</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="credentialing.npiNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NPI Number *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="10-digit NPI number"
                      maxLength={10}
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="credentialing.taxonomyCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taxonomy Code *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 101YP2500X"
                      disabled={isLoading}
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
              name="credentialing.einNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EIN Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="XX-XXXXXXX"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="credentialing.legalBusinessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Legal Business Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Legal name of your practice"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* AI CV Parser for Credentialing */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">CV Parser for Credentialing</h3>
          <CVParser />
        </div>
      </CardContent>
    </Card>
  );
}