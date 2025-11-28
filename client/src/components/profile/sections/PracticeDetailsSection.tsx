import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ProfileFormData } from '../types/ProfileTypes';
import { DocumentArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BuildingOfficeIcon, PencilIcon } from '@heroicons/react/24/outline';

interface PracticeDetailsSectionProps {
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

export function PracticeDetailsSection({ form, isLoading, onSaveComplete, onSubmit }: PracticeDetailsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    // Trigger form submission with current form data
    if (onSubmit) {
      const formData = form.getValues();
      onSubmit(formData);
    }
    setIsEditing(false);
    onSaveComplete?.();
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BuildingOfficeIcon className="h-5 w-5" />
            Practice Details
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
        {/* Practice Name */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Practice Information</h3>
          
          <FormField
            control={form.control}
            name="practiceDetails.practiceName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Practice Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your practice name"
                    disabled={isLoading || !isEditing}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Address Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Practice Address</h3>
          
          <FormField
            control={form.control}
            name="practiceDetails.address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street Address *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your practice address"
                    disabled={isLoading || !isEditing}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="practiceDetails.city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="City"
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
              name="practiceDetails.state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State *</FormLabel>
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
              name="practiceDetails.zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP Code *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ZIP Code"
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

        {/* Professional Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Professional Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="practiceDetails.yearsOfExperience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Years of Experience *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      disabled={isLoading || !isEditing}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="practiceDetails.sessionFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Format</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || !isEditing}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="in_person">In Person</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="practiceDetails.baseRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Rate ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      disabled={isLoading || !isEditing}
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="practiceDetails.slidingScale"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Sliding Scale</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Offer sliding scale pricing
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading || !isEditing}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Biography */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Biography</h3>
          
          <FormField
            control={form.control}
            name="practiceDetails.biography"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Professional Biography</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell clients about your background, approach, and specialties..."
                    className="min-h-[100px]"
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
            name="practiceDetails.qualifications"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qualifications & Certifications</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="List your degrees, certifications, and other qualifications..."
                    className="min-h-[80px]"
                    disabled={isLoading || !isEditing}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}