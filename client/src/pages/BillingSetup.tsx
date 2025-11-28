import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/contexts/ToastContext";
import { DocumentArrowDownIcon, ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const therapistBillingSchema = z.object({
  npi: z.string().optional(),
  licenseType: z.string().optional(),
  licenseState: z.string().optional(),
  taxonomyCode: z.string().optional(),
  ssnOrEin: z.string().optional(),
  practiceName: z.string().optional(),
  billingAddress: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZip: z.string().optional(),
  phoneNumber: z.string().optional(),
  groupNpi: z.string().optional(),
  blueShieldPayerId: z.string().optional(),
  signatureOnFile: z.boolean().optional(),
  acceptAssignment: z.boolean().optional(),
  supervisorName: z.string().optional(),
  supervisorNpi: z.string().optional(),
});

type TherapistBillingForm = z.infer<typeof therapistBillingSchema>;

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

const LICENSE_TYPES = [
  "LCSW", "LPC", "LMFT", "LMHC", "LPCC", "LCP", "LCPC", "LCMHC", "LCMHCA"
];

const TAXONOMY_CODES = [
  { code: "1041C0700X", description: "Social Worker - Clinical" },
  { code: "101YP2500X", description: "Professional Counselor - Mental Health" },
  { code: "106H00000X", description: "Marriage & Family Therapist" },
  { code: "103T00000X", description: "Psychologist" },
  { code: "2084P0800X", description: "Psychiatrist" },
];

export default function BillingSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TherapistBillingForm>({
    resolver: zodResolver(therapistBillingSchema),
    defaultValues: {
      signatureOnFile: false,
      acceptAssignment: true,
    },
  });

  // Fetch existing billing info
  const { data: billingInfo, isLoading } = useQuery({
    queryKey: ['/api/therapist-billing'],
    queryFn: async () => {
      const response = await fetch('/api/therapist-billing', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch billing info');
      return response.json();
    },
  });

  // Update form when data loads
  useState(() => {
    if (billingInfo) {
      form.reset(billingInfo);
    }
  });

  // Update billing info mutation
  const updateBillingMutation = useMutation({
    mutationFn: async (data: TherapistBillingForm) => {
      const response = await fetch('/api/therapist-billing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update billing info');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapist-billing'] });
      toast({
        title: "Billing information updated",
        description: "Your billing setup has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TherapistBillingForm) => {
    updateBillingMutation.mutate(data);
  };

  const isSetupComplete = billingInfo?.npi && billingInfo?.licenseType && billingInfo?.practiceName;

  if (isLoading) {
    return <div>Loading billing setup...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Billing Setup</h1>
          <p className="text-muted-foreground">
            Configure your billing information for CMS-1500 claim generation
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSetupComplete ? (
            <>
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-600">Setup Complete</span>
            </>
          ) : (
            <>
              <ExclamationCircleIcon className="h-5 w-5 text-amber-500" />
              <span className="text-sm text-amber-600">Setup Required</span>
            </>
          )}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="provider" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="provider">Provider Info</TabsTrigger>
              <TabsTrigger value="practice">Practice Info</TabsTrigger>
              <TabsTrigger value="supervision">Supervision</TabsTrigger>
            </TabsList>

            <TabsContent value="provider" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Provider Information</CardTitle>
                  <CardDescription>
                    Your professional credentials and licensing information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="npi"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>National Provider Identifier (NPI) *</FormLabel>
                          <FormControl>
                            <Input placeholder="1234567890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="taxonomyCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taxonomy Code</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select taxonomy code" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TAXONOMY_CODES.map((code) => (
                                <SelectItem key={code.code} value={code.code}>
                                  {code.code} - {code.description}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="licenseType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select license type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {LICENSE_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
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
                      name="licenseState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License State *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {US_STATES.map((state) => (
                                <SelectItem key={state.value} value={state.value}>
                                  {state.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="ssnOrEin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SSN or EIN (for Box 25)</FormLabel>
                        <FormControl>
                          <Input placeholder="123-45-6789 or 12-3456789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="practice" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Practice Information</CardTitle>
                  <CardDescription>
                    Your practice details and billing preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="practiceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Practice Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Practice Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="billingAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Billing Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main Street" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="billingCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="San Francisco" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="billingState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {US_STATES.map((state) => (
                                <SelectItem key={state.value} value={state.value}>
                                  {state.label}
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
                      name="billingZip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input placeholder="12345" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="groupNpi"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Group NPI (if applicable)</FormLabel>
                          <FormControl>
                            <Input placeholder="1234567890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="blueShieldPayerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Blue Shield Payer ID</FormLabel>
                          <FormControl>
                            <Input placeholder="47198" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="signatureOnFile"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <CheckIcon
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Signature on File
                            </FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Check if you have patient signatures on file for claims
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="acceptAssignment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <CheckIcon
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Accept Assignment
                            </FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Accept direct payment from insurance companies
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="supervision" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Supervision Information</CardTitle>
                  <CardDescription>
                    Required for pre-licensed clinicians only
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="supervisorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supervisor Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Dr. Jane Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="supervisorNpi"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supervisor NPI</FormLabel>
                          <FormControl>
                            <Input placeholder="1234567890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateBillingMutation.isPending}>
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              {updateBillingMutation.isPending ? 'Saving...' : 'Save Billing Information'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}