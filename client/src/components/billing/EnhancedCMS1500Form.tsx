import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, CheckCircleIcon, ExclamationCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "@/utils/dateFnsCompat";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/contexts/ToastContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

const enhancedCMS1500Schema = z.object({
  patientId: z.string().min(1, "Client selection is required"),
  sessionId: z.string().optional(),
  dateOfService: z.date({
    required_error: "Service date is required",
    invalid_type_error: "Invalid service date",
  }),
  cptCode: z.string().min(5, "CPT code is required"),
  diagnosisCode: z.string().min(3, "Diagnosis code is required"),
  placeOfService: z.string().min(2, "Place of service is required"),
  chargeAmount: z.string().regex(/^\d+\.\d{2}$/, "Amount must be in format 00.00"),
  
  // Optional overrides
  insuranceType: z.string().optional(),
  insuranceIdNumber: z.string().optional(),
  insuranceGroupNumber: z.string().optional(),
  renderingProviderNpi: z.string().optional(),
  federalTaxId: z.string().optional(),
});

type EnhancedCMS1500Form = z.infer<typeof enhancedCMS1500Schema>;

export default function EnhancedCMS1500Form() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [npiValidation, setNpiValidation] = useState<any>(null);
  const [isValidatingNPI, setIsValidatingNPI] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const form = useForm<EnhancedCMS1500Form>({
    resolver: zodResolver(enhancedCMS1500Schema),
    defaultValues: {
      cptCode: "90834",
      diagnosisCode: "F41.1",
      placeOfService: "11",
    },
  });

  // Fetch validation data
  const { data: validationData } = useQuery({
    queryKey: ['/api/cms1500-enhanced/validation-data'],
    queryFn: async () => {
      const response = await fetch('/api/cms1500-enhanced/validation-data', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch validation data');
      return response.json();
    },
  });

  // Fetch clients
  const { data: clientsData = [], isLoading: loadingClients, error: clientsError } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/patients', {
          credentials: 'include',
        });
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Not authenticated");
          }
          throw new Error('Failed to fetch clients');
        }
        const data = await response.json();
        // Handle HIPAA response format
        const patients = data.success ? data.data : data;
        return Array.isArray(patients) ? patients : [];
      } catch (error) {
        console.error('EnhancedCMS1500Form clients fetch error:', error);
        return []; // Always return empty array on error
      }
    },
  });

  // Ensure clients is always an array
  const clients = Array.isArray(clientsData) ? clientsData : [];

  // Fetch client insurance data when client is selected
  const { data: clientInsuranceData, isLoading: isLoadingInsurance } = useQuery({
    queryKey: ['/api/cms1500-enhanced/client-insurance', selectedClient],
    queryFn: async () => {
      const response = await fetch(`/api/cms1500-enhanced/client-insurance/${selectedClient}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch client insurance data');
      return response.json();
    },
    enabled: !!selectedClient,
  });

  // Auto-populate form when client insurance data is loaded
  useEffect(() => {
    if (clientInsuranceData) {
      const { client, insurance, provider } = clientInsuranceData;
      
      // Auto-populate CPT and diagnosis codes
      if (client.defaultCptCode) {
        form.setValue('cptCode', client.defaultCptCode);
      }
      if (client.primaryDiagnosisCode) {
        form.setValue('diagnosisCode', client.primaryDiagnosisCode);
      }
      if (client.placeOfService) {
        form.setValue('placeOfService', client.placeOfService);
      }
      
      // Auto-populate insurance information if available
      if (insurance) {
        if (insurance.memberId) {
          form.setValue('insuranceIdNumber', insurance.memberId);
        }
        if (insurance.groupNumber) {
          form.setValue('insuranceGroupNumber', insurance.groupNumber);
        }
        
        // Set insurance type based on provider
        if (insurance.provider.toLowerCase().includes('medicare')) {
          form.setValue('insuranceType', 'Medicare');
        } else if (insurance.provider.toLowerCase().includes('medicaid')) {
          form.setValue('insuranceType', 'Medicaid');
        } else {
          form.setValue('insuranceType', 'Group Health Plan');
        }
      }
      
      // Auto-populate provider information
      if (provider.npi) {
        form.setValue('renderingProviderNpi', provider.npi);
      }
      if (provider.federalTaxId) {
        form.setValue('federalTaxId', provider.federalTaxId);
      }
    }
  }, [clientInsuranceData, form]);

  // Validate NPI when provider NPI changes
  const validateNPI = async (npi: string) => {
    if (!npi || npi.length !== 10) return;
    
    setIsValidatingNPI(true);
    try {
      const response = await fetch('/api/cms1500-enhanced/validate-npi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          npi,
          expectedTaxonomy: clientInsuranceData?.provider.taxonomyCode 
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setNpiValidation(result);
      }
    } catch (error) {
      console.error('NPI validation error:', error);
    } finally {
      setIsValidatingNPI(false);
    }
  };

  // Watch for NPI changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'renderingProviderNpi' && value.renderingProviderNpi) {
        validateNPI(value.renderingProviderNpi);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, clientInsuranceData]);

  // Create enhanced claim
  const createClaimMutation = useMutation({
    mutationFn: async (data: EnhancedCMS1500Form) => {
      const response = await fetch('/api/cms1500-enhanced/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          dateOfService: data.dateOfService.toISOString().split('T')[0],
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create claim');
      }
      return await response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cms1500-claims'] });
      form.reset();
      setSelectedClient("");
      setNpiValidation(null);
      toast({
        title: "Enhanced CMS-1500 claim created",
        description: `Claim ${result.claim.claimNumber} generated with comprehensive validation.`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error creating claim",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EnhancedCMS1500Form) => {
    createClaimMutation.mutate(data);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheckIconCheckIconCheckIcon className="h-5 w-5" />
          Enhanced CMS-1500 Claim Form
        </CardTitle>
        <CardDescription>
          Create CMS-1500 claims with automatic insurance data integration and comprehensive validation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Client Selection */}
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client *</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedClient(value);
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients && Array.isArray(clients) ? clients.map((client: any) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name} - {client.billingType}
                        </SelectItem>
                      )) : (
                        <SelectItem value="no-clients" disabled>
                          No clients available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Insurance Data Preview */}
            {isLoadingInsurance && (
              <Alert>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                <AlertDescription>Loading insurance data...</AlertDescription>
              </Alert>
            )}

            {clientInsuranceData && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Insurance Data Integration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Provider</Label>
                      <p>{clientInsuranceData.insurance?.provider || 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Member ID</Label>
                      <p>{clientInsuranceData.insurance?.memberId || 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Group Number</Label>
                      <p>{clientInsuranceData.insurance?.groupNumber || 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Relationship</Label>
                      <p>{clientInsuranceData.insurance?.relationshipToInsured || 'Self'}</p>
                    </div>
                  </div>
                  {!clientInsuranceData.insurance && (
                    <Alert className="mt-2">
                      <ExclamationCircleIcon className="h-4 w-4" />
                      <AlertDescription>
                        No insurance data found. Please add client insurance details first.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="service" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="service">Service Details</TabsTrigger>
                <TabsTrigger value="insurance">Insurance</TabsTrigger>
                <TabsTrigger value="provider">Provider</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
              </TabsList>

              {/* Service Details Tab */}
              <TabsContent value="service" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dateOfService"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date of Service *</FormLabel>
                        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                setIsDatePickerOpen(false);
                              }}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="placeOfService"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Place of Service *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select place of service" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {validationData?.placeOfServiceCodes?.map((pos: any) => (
                              <SelectItem key={pos.code} value={pos.code}>
                                {pos.code} - {pos.description}
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
                    name="cptCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPT Code *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select CPT code" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {validationData?.cptCodes?.map((cpt: any) => (
                              <SelectItem key={cpt.code} value={cpt.code}>
                                {cpt.code} - {cpt.description} ({cpt.duration} min)
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
                    name="diagnosisCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Diagnosis Code *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select diagnosis code" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {validationData?.diagnosisCodes?.map((dx: any) => (
                              <SelectItem key={dx.code} value={dx.code}>
                                {dx.code} - {dx.description}
                                <Badge variant="secondary" className="ml-2">{dx.category}</Badge>
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
                  name="chargeAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Charge Amount *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="150.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Provider Tab */}
              <TabsContent value="provider" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="renderingProviderNpi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rendering Provider NPI</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input {...field} placeholder="10-digit NPI number" maxLength={10} />
                            {isValidatingNPI && (
                              <ArrowPathIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                            )}
                          </div>
                        </FormControl>
                        {npiValidation && (
                          <div className="mt-2">
                            {npiValidation.isValid ? (
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircleIcon className="h-4 w-4" />
                                <span className="text-sm">Valid NPI - {npiValidation.provider?.name}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-red-600">
                                <ExclamationCircleIcon className="h-4 w-4" />
                                <span className="text-sm">{npiValidation.errors?.[0] || 'Invalid NPI'}</span>
                              </div>
                            )}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="federalTaxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Federal Tax ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="12-3456789" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Billing Tab */}
              <TabsContent value="billing" className="space-y-4">
                <Alert>
                  <CheckCircleIcon className="h-4 w-4" />
                  <AlertDescription>
                    This claim will be created with comprehensive CMS-1500 validation including:
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li>Real-time NPI verification against NPPES registry</li>
                      <li>Insurance data integration from client records</li>
                      <li>CPT and diagnosis code validation</li>
                      <li>Cross-field dependency validation</li>
                      <li>Regulatory compliance checking</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <Button
                  type="submit"
                  disabled={createClaimMutation.isPending}
                  className="w-full"
                >
                  {createClaimMutation.isPending ? (
                    <>
                      <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                      Creating Claim...
                    </>
                  ) : (
                    "Create Enhanced CMS-1500 Claim"
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}