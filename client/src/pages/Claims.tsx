import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowDownTrayIcon, CalendarIcon, DocumentTextIcon, EyeIcon, PlusIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "@/utils/dateFnsCompat";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/contexts/ToastContext";

const createClaimSchema = z.object({
  patientId: z.string(),
  sessionId: z.string().optional(),
  
  // Patient Information (Boxes 1-13)
  insuranceType: z.string().optional(),
  patientName: z.string(),
  patientDateOfBirth: z.date().optional(),
  patientGender: z.string().optional(),
  patientAddress: z.string().optional(),
  patientCity: z.string().optional(),
  patientState: z.string().optional(),
  patientZip: z.string().optional(),
  patientPhone: z.string().optional(),
  patientRelationshipToInsured: z.string().default("self"),
  
  // Insurance Information (Boxes 1a-11d)
  insuranceIdNumber: z.string().optional(),
  insuranceGroupNumber: z.string().optional(),
  insurancePlanName: z.string().optional(),
  primaryInsuredName: z.string().optional(),
  primaryInsuredDateOfBirth: z.date().optional(),
  primaryInsuredGender: z.string().optional(),
  primaryInsuredAddress: z.string().optional(),
  primaryInsuredCity: z.string().optional(),
  primaryInsuredState: z.string().optional(),
  primaryInsuredZip: z.string().optional(),
  
  // Other Insurance (Box 9)
  otherInsuredName: z.string().optional(),
  otherInsuredPolicyNumber: z.string().optional(),
  otherInsuredDateOfBirth: z.date().optional(),
  otherInsuredGender: z.string().optional(),
  otherInsuredEmployerOrSchool: z.string().optional(),
  otherInsurancePlanName: z.string().optional(),
  
  // Condition Related Information (Boxes 10a-10d, 14-19)
  conditionRelatedToEmployment: z.boolean().default(false),
  conditionRelatedToAutoAccident: z.boolean().default(false),
  autoAccidentState: z.string().optional(),
  conditionRelatedToOtherAccident: z.boolean().default(false),
  dateOfCurrentIllness: z.date().optional(),
  dateOfSimilarIllness: z.date().optional(),
  datePatientUnableToWork: z.date().optional(),
  datePatientReturnToWork: z.date().optional(),
  
  // Hospitalization Dates (Box 18)
  hospitalizationDateFrom: z.date().optional(),
  hospitalizationDateTo: z.date().optional(),
  
  // Lab Charges (Box 20)
  outsideLab: z.boolean().default(false),
  labCharges: z.string().optional(),
  
  // Service Information (Boxes 21-24J)
  dateOfService: z.date(),
  placeOfService: z.string(),
  emergencyCode: z.string().optional(),
  cptCode: z.string(),
  modifier1: z.string().optional(),
  modifier2: z.string().optional(),
  modifier3: z.string().optional(),
  modifier4: z.string().optional(),
  diagnosisCodes: z.array(z.string()).min(1),
  units: z.number().min(1),
  chargeAmount: z.string(),
  daysOrUnits: z.number().min(1).default(1),
  
  // Provider Information (Boxes 24J-33a)
  renderingProviderNpi: z.string(),
  renderingProviderQualifier: z.string().default("1D"),
  
  // Federal Tax ID (Box 25)
  federalTaxId: z.string().optional(),
  ssnOrEin: z.string().optional(),
  
  // Patient Account Number (Box 26)
  patientAccountNumber: z.string().optional(),
  
  // Accept Assignment (Box 27)
  acceptAssignment: z.boolean().default(true),
  
  // Total Charge (Box 28)
  totalCharge: z.string().optional(),
  
  // Amount Paid (Box 29)
  amountPaid: z.string().optional(),
  
  // Balance Due (Box 30)
  balanceDue: z.string().optional(),
  
  // Signature Information (Box 31)
  signatureOnFile: z.boolean().default(false),
  signatureDate: z.date().optional(),
  
  // Service Facility Information (Box 32)
  serviceFacilityName: z.string().optional(),
  serviceFacilityAddress: z.string().optional(),
  serviceFacilityCity: z.string().optional(),
  serviceFacilityState: z.string().optional(),
  serviceFacilityZip: z.string().optional(),
  serviceFacilityNpi: z.string().optional(),
  
  // Billing Provider Information (Box 33)
  billingProviderName: z.string().optional(),
  billingProviderAddress: z.string().optional(),
  billingProviderCity: z.string().optional(),
  billingProviderState: z.string().optional(),
  billingProviderZip: z.string().optional(),
  billingProviderPhone: z.string().optional(),
  billingProviderNpi: z.string().optional(),
  
  // Prior Authorization (Additional)
  priorAuthNumber: z.string().optional(),
});

type CreateClaimForm = z.infer<typeof createClaimSchema>;

interface Claim {
  id: number;
  claimNumber: string;
  client: { id: number; name: string };
  dateOfService: string;
  cptCode: string;
  diagnosisCode: string;
  chargeAmount: string;
  status: string;
  createdAt: string;
}

interface Client {
  id: number;
  name: string;
  billingType: string;
}

interface Session {
  id: number;
  patientId: number;
  date: string;
  type?: string;
  cptCode?: string;
}

interface MedicalCode {
  id: number;
  code: string;
  description: string;
}

export default function Claims() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const form = useForm<CreateClaimForm>({
    resolver: zodResolver(createClaimSchema),
    defaultValues: {
      units: 1,
      serviceLocationCode: "11", // Office
    },
  });

  // Auto-populate form when session is selected or client is selected
  const handleSessionSelect = (sessionId: string) => {
    const selectedSession = sessions.find((s: Session) => s.id.toString() === sessionId);
    const selectedClientData = clients.find((c: Client) => c.id.toString() === selectedClient);
    
    if (selectedSession) {
      // Auto-populate date of service from session
      form.setValue('dateOfService', new Date(selectedSession.date));
      
      // Auto-populate CPT code from session if available
      if (selectedSession.cptCode) {
        form.setValue('cptCode', selectedSession.cptCode);
      }
      
      // Auto-populate service location based on session type or default to office
      const serviceLocation = selectedSession.type === 'telehealth' ? '02' : '11';
      form.setValue('serviceLocationCode', serviceLocation);
      
      // Auto-populate place of service address for in-person sessions
      if (serviceLocation === '11' && billingInfo) {
        const addressParts = [
          billingInfo.billingAddress,
          billingInfo.billingCity,
          billingInfo.billingState + ' ' + billingInfo.billingZip
        ].filter(part => part && part.trim() !== '');
        
        if (addressParts.length > 0) {
          form.setValue('placeOfServiceAddress', addressParts.join(', '));
        }
      }
    }
    
    populateClientData(selectedClientData);
  };

  const populateClientData = (selectedClientData?: Client) => {
    if (selectedClientData) {
      // Auto-populate patient information
      form.setValue('patientName', selectedClientData.name);
      
      // Auto-populate charge amount from client profile or use default
      const chargeAmount = selectedClientData.billingType === 'insurance' ? '150.00' : '100.00';
      form.setValue('chargeAmount', chargeAmount);
      
      // Set default values for comprehensive CMS-1500 fields
      form.setValue('patientRelationshipToInsured', 'self');
      form.setValue('placeOfService', '11'); // Office
      form.setValue('units', 1);
      form.setValue('daysOrUnits', 1);
      form.setValue('acceptAssignment', true);
      form.setValue('signatureOnFile', true);
      form.setValue('renderingProviderQualifier', '1D');
      
      // Set insurance type based on billing type
      if (selectedClientData.billingType === 'insurance' || selectedClientData.billingType === 'Insurance') {
        form.setValue('insuranceType', 'group');
      }
      
      // Set default diagnosis and procedure codes
      form.setValue('primaryDiagnosisCode', 'F41.1'); // Generalized anxiety disorder
      form.setValue('cptCode', '90834'); // 45-minute psychotherapy
      
      // Populate total charge and balance due
      form.setValue('totalCharge', chargeAmount);
      form.setValue('balanceDue', chargeAmount);
      form.setValue('amountPaid', '0.00');
    }
    
    if (billingInfo) {
      // Auto-populate provider information from therapist billing data
      if (billingInfo.npi) {
        form.setValue('renderingProviderNpi', billingInfo.npi);
      }
      
      // Auto-populate federal tax ID and billing provider information
      if (billingInfo.ssnOrEin) {
        form.setValue('federalTaxId', billingInfo.ssnOrEin);
      }
      
      // Auto-populate billing provider details
      if (billingInfo.practiceName) {
        form.setValue('billingProviderName', billingInfo.practiceName);
        form.setValue('serviceFacilityName', billingInfo.practiceName);
      }
      
      if (billingInfo.billingAddress) {
        form.setValue('billingProviderAddress', billingInfo.billingAddress);
        form.setValue('serviceFacilityAddress', billingInfo.billingAddress);
      }
      
      if (billingInfo.billingCity) {
        form.setValue('billingProviderCity', billingInfo.billingCity);
        form.setValue('serviceFacilityCity', billingInfo.billingCity);
      }
      
      if (billingInfo.billingState) {
        form.setValue('billingProviderState', billingInfo.billingState);
        form.setValue('serviceFacilityState', billingInfo.billingState);
      }
      
      if (billingInfo.billingZip) {
        form.setValue('billingProviderZip', billingInfo.billingZip);
        form.setValue('serviceFacilityZip', billingInfo.billingZip);
      }
      
      if (billingInfo.phoneNumber) {
        form.setValue('billingProviderPhone', billingInfo.phoneNumber);
      }
      
      if (billingInfo.groupNpi) {
        form.setValue('billingProviderNpi', billingInfo.groupNpi);
        form.setValue('serviceFacilityNpi', billingInfo.groupNpi);
      } else if (billingInfo.npi) {
        form.setValue('billingProviderNpi', billingInfo.npi);
        form.setValue('serviceFacilityNpi', billingInfo.npi);
      }
      
      // Set signature and assignment defaults from billing preferences
      if (billingInfo.signatureOnFile !== undefined) {
        form.setValue('signatureOnFile', billingInfo.signatureOnFile);
      }
      
      if (billingInfo.acceptAssignment !== undefined) {
        form.setValue('acceptAssignment', billingInfo.acceptAssignment);
      }
    }
  };

  // Auto-populate when client is selected (even without session)
  const handleClientSelect = (patientId: string) => {
    setSelectedClient(patientId);
    const selectedClientData = clients.find((c: Client) => c.id.toString() === patientId);
    populateClientData(selectedClientData);
  };

  // Fetch claims
  const { data: claims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ['/api/cms1500-claims'],
    queryFn: async () => {
      const response = await fetch('/api/cms1500-claims', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch claims');
      return response.json();
    },
  });

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      const response = await fetch('/api/patients', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    },
  });

  // Fetch sessions for selected client
  const { data: sessions = [] } = useQuery({
    queryKey: ['/api/clinical-sessions', selectedClient],
    queryFn: async () => {
      if (!selectedClient) return [];
      const response = await fetch(`/api/clinical-sessions?client=${selectedClient}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    },
    enabled: !!selectedClient,
  });

  // Fetch therapist billing info for auto-population
  const { data: billingInfo } = useQuery({
    queryKey: ['/api/therapist-billing'],
    queryFn: async () => {
      const response = await fetch('/api/therapist-billing', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch billing info');
      return response.json();
    },
  });

  // Fetch diagnosis codes
  const { data: diagnosisCodes = [] } = useQuery({
    queryKey: ['/api/medical-codes/diagnosis'],
    queryFn: async () => {
      const response = await fetch('/api/medical-codes/diagnosis', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch diagnosis codes');
      return response.json();
    },
  });

  // Fetch CPT codes
  const { data: cptCodes = [] } = useQuery({
    queryKey: ['/api/medical-codes/cpt'],
    queryFn: async () => {
      const response = await fetch('/api/medical-codes/cpt', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch CPT codes');
      return response.json();
    },
  });

  // Create claim mutation
  const createClaimMutation = useMutation({
    mutationFn: async (data: CreateClaimForm) => {
      const response = await fetch('/api/cms1500-claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          patientId: parseInt(data.patientId),
          sessionId: data.sessionId ? parseInt(data.sessionId) : undefined,
          dateOfService: data.dateOfService.toISOString(),
          units: data.units,
        }),
      });
      if (!response.ok) throw new Error('Failed to create claim');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cms1500-claims'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Claim created",
        description: "Your CMS-1500 claim has been created successfully.",
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

  const onSubmit = (data: CreateClaimForm) => {
    createClaimMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'submitted': return 'bg-blue-500';
      case 'paid': return 'bg-green-500';
      case 'denied': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const insuranceClients = clients.filter((client: Client) => 
    client.billingType === 'insurance' || client.billingType === 'Insurance'
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">CMS-1500 Claims</h1>
          <p className="text-muted-foreground">
            Generate and manage insurance claims for your clients
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              New Claim
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Create New CMS-1500 Claim</DialogTitle>
              <DialogDescription>
                Generate a new insurance claim for a client session
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: 'calc(95vh - 120px)' }}>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="patientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleClientSelect(value);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {insuranceClients.length > 0 ? (
                              insuranceClients.map((client: Client) => (
                                <SelectItem key={client.id} value={client.id.toString()}>
                                  {client.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="" disabled>
                                No insurance clients found
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sessionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session (Optional)</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          handleSessionSelect(value);
                        }}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select session" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sessions.length > 0 ? (
                              sessions.map((session: Session) => (
                                <SelectItem key={session.id} value={session.id.toString()}>
                                  {format(new Date(session.date), 'PPP')} at {format(new Date(session.date), 'p')}
                                </SelectItem>
                              ))
                            ) : selectedClient ? (
                              <SelectItem value="no-sessions" disabled>
                                No sessions found for this client
                              </SelectItem>
                            ) : (
                              <SelectItem value="no-client" disabled>
                                Select a client first
                              </SelectItem>
                            )}
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
                    name="dateOfService"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date of Service</FormLabel>
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
                    name="serviceLocationCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Location</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="11">In-Person (11)</SelectItem>
                            <SelectItem value="02">Telehealth (02)</SelectItem>
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
                        <FormLabel>CPT Code</FormLabel>
                        <Select onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select CPT code" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cptCodes.map((code: MedicalCode) => (
                              <SelectItem key={code.id} value={code.code}>
                                {code.code} - {code.description}
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
                    name="diagnosisCodes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Diagnosis Codes</FormLabel>
                        <div className="space-y-2">
                          <Select
                            onValueChange={(value) => {
                              const currentCodes = field.value || [];
                              if (!currentCodes.includes(value)) {
                                field.onChange([...currentCodes, value]);
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Add diagnosis code" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {diagnosisCodes
                                .filter((code: MedicalCode) => 
                                  !(field.value || []).includes(code.code)
                                )
                                .map((code: MedicalCode) => (
                                  <SelectItem key={code.id} value={code.code}>
                                    {code.code} - {code.description}
                                  </SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                          
                          {(field.value || []).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {(field.value || []).map((codeValue: string) => {
                                const code = diagnosisCodes.find((c: MedicalCode) => c.code === codeValue);
                                return (
                                  <Badge key={codeValue} variant="secondary" className="gap-1">
                                    {code ? `${code.code} - ${code.description}` : codeValue}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-4 w-4 p-0 hover:bg-transparent"
                                      onClick={() => {
                                        const newCodes = (field.value || []).filter((c: string) => c !== codeValue);
                                        field.onChange(newCodes);
                                      }}
                                    >
                                      ×
                                    </Button>
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="units"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Units
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <QuestionMarkCircleIcon className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>For therapy sessions, this should typically be 1 unit</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="chargeAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Charge Amount</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="150.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="renderingProviderNpi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider NPI</FormLabel>
                        <FormControl>
                          <Input placeholder="1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Patient Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Patient Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="patientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="patientDateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "PPP") : "Select date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <CalendarIcon
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus />
                              </PopoverContent>
                            </Popover>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="patientGender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="M">Male</SelectItem>
                              <SelectItem value="F">Female</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="patientPhone"
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

                  <FormField
                    control={form.control}
                    name="patientAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main Street" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="patientCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Anytown" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="patientState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="CA" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="patientZip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input placeholder="90210" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Insurance Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Insurance Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="insuranceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select insurance type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="medicare">Medicare</SelectItem>
                              <SelectItem value="medicaid">Medicaid</SelectItem>
                              <SelectItem value="tricare">Tricare</SelectItem>
                              <SelectItem value="champva">ChampVA</SelectItem>
                              <SelectItem value="group">Group Health Plan</SelectItem>
                              <SelectItem value="feca">FECA Black Lung</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="insuranceIdNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance ID Number</FormLabel>
                          <FormControl>
                            <Input placeholder="123456789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="insuranceGroupNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Group Number</FormLabel>
                          <FormControl>
                            <Input placeholder="ABC123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="insurancePlanName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance Plan Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Blue Cross Blue Shield" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="patientRelationshipToInsured"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Patient's Relationship to Insured</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select relationship" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="self">Self</SelectItem>
                            <SelectItem value="spouse">Spouse</SelectItem>
                            <SelectItem value="child">Child</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Condition Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Condition Related Information</h3>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="conditionRelatedToEmployment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Employment Related</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Is condition related to employment?
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="conditionRelatedToAutoAccident"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Auto Accident</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Is condition related to auto accident?
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="conditionRelatedToOtherAccident"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Other Accident</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Is condition related to other accident?
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dateOfCurrentIllness"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Current Illness/Injury</FormLabel>
                          <FormControl>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "PPP") : "Select date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <CalendarIcon
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus />
                              </PopoverContent>
                            </Popover>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dateOfSimilarIllness"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Similar Illness</FormLabel>
                          <FormControl>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "PPP") : "Select date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <CalendarIcon
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus />
                              </PopoverContent>
                            </Popover>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Provider and Billing Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Provider & Billing Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="federalTaxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Federal Tax ID</FormLabel>
                          <FormControl>
                            <Input placeholder="12-3456789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="patientAccountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient Account Number</FormLabel>
                          <FormControl>
                            <Input placeholder="ACC123456" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="acceptAssignment"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Accept Assignment</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Provider accepts insurance payment assignment
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="signatureOnFile"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Signature on File</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Patient signature authorization on file
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createClaimMutation.isPending}>
                    {createClaimMutation.isPending ? 'Creating...' : 'Create Claim'}
                  </Button>
                </div>
                </form>
              </Form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Claims</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="submitted">Submitted</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="denied">Denied</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <ClaimsTable claims={claims} isLoading={claimsLoading} />
        </TabsContent>

        <TabsContent value="draft" className="space-y-4">
          <ClaimsTable 
            claims={claims.filter((claim: Claim) => claim.status === 'draft')} 
            isLoading={claimsLoading} 
          />
        </TabsContent>

        <TabsContent value="submitted" className="space-y-4">
          <ClaimsTable 
            claims={claims.filter((claim: Claim) => claim.status === 'submitted')} 
            isLoading={claimsLoading} 
          />
        </TabsContent>

        <TabsContent value="paid" className="space-y-4">
          <ClaimsTable 
            claims={claims.filter((claim: Claim) => claim.status === 'paid')} 
            isLoading={claimsLoading} 
          />
        </TabsContent>

        <TabsContent value="denied" className="space-y-4">
          <ClaimsTable 
            claims={claims.filter((claim: Claim) => claim.status === 'denied')} 
            isLoading={claimsLoading} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClaimsTable({ claims, isLoading }: { claims: Claim[]; isLoading: boolean }) {
  if (isLoading) {
    return <div>Loading claims...</div>;
  }

  if (claims.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No claims found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'submitted': return 'bg-blue-500';
      case 'paid': return 'bg-green-500';
      case 'denied': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      {claims.map((claim) => (
        <Card key={claim.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{claim.claimNumber}</h3>
                  <Badge className={getStatusColor(claim.status)}>
                    {claim.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {claim.client.name}
                </p>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Service: {format(new Date(claim.dateOfService), 'PPP')}</span>
                  <span>CPT: {claim.cptCode}</span>
                  <span>Diagnosis: {claim.diagnosisCode}</span>
                  <span>Amount: ${claim.chargeAmount}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`/api/cms1500-pdf/${claim.id}/pdf`, '_blank')}
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  View PDF
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `/api/cms1500-pdf/${claim.id}/pdf`;
                    link.download = `CMS1500_${claim.claimNumber}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}