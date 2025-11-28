import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ProfileFormData } from '../types/ProfileTypes';
import { CreditCardIcon, DocumentArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { PencilIcon } from '@heroicons/react/24/outline';

interface InsuranceSectionProps {
  form: UseFormReturn<ProfileFormData>;
  isLoading?: boolean;
  onSaveComplete?: () => void;
  onSubmit?: (data: ProfileFormData) => void;
}

const COMMON_INSURANCE_PROVIDERS = [
  'Aetna',
  'Anthem',
  'Blue Cross Blue Shield',
  'Cigna',
  'Humana',
  'Kaiser Permanente',
  'Medicaid',
  'Medicare',
  'Tricare',
  'UnitedHealthcare',
];

export function InsuranceSection({ form, isLoading, onSaveComplete, onSubmit }: InsuranceSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const acceptedProviders = form.watch('insurance.acceptedProviders') || [];

  const handleSave = () => {
    if (onSubmit) {
      onSubmit(form.getValues());
    }
    setIsEditing(false);
    onSaveComplete?.();
  };

  const handleProviderChange = (provider: string, checked: boolean) => {
    const current = acceptedProviders;
    if (checked) {
      form.setValue('insurance.acceptedProviders', [...current, provider]);
    } else {
      form.setValue('insurance.acceptedProviders', current.filter(p => p !== provider));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5" />
            Insurance & Billing
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
        {/* Insurance Provider Status */}
        <FormField
          control={form.control}
          name="insurance.isInsuranceProvider"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Insurance Provider</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Do you accept insurance payments?
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

        {/* Accepted Insurance Providers */}
        {form.watch('insurance.isInsuranceProvider') && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Accepted Insurance Providers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {COMMON_INSURANCE_PROVIDERS.map((provider) => (
                <div key={provider} className="flex items-center space-x-2">
                  <Checkbox
                    id={provider}
                    checked={acceptedProviders.includes(provider)}
                    onCheckedChange={(checked) => 
                      handleProviderChange(provider, checked as boolean)
                    }
                    disabled={isLoading || !isEditing}
                  />
                  <label
                    htmlFor={provider}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {provider}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}



        {/* Billing Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Billing Information</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Insurance billing and claim generation features will be available based on your 
              credentialing information and accepted providers. Make sure to complete the 
              Credentialing section for full billing functionality.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}