import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, DocumentArrowDownIcon, UserIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { UsersIcon } from '@heroicons/react/24/outline';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "@/utils/dateFnsCompat";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/contexts/ToastContext";

const clientInsuranceSchema = z.object({
  patientId: z.string(),
  dateOfBirth: z.date().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  memberId: z.string().optional(),
  groupNumber: z.string().optional(),
  relationshipToInsured: z.string().optional(),
  gender: z.string().optional(),
  primaryInsuredName: z.string().optional(),
  primaryInsuredDob: z.date().optional(),
  // Mental health specific fields
  primaryCptCode: z.string().optional(),
  diagnosisCodes: z.array(z.string()).optional(),
});

type ClientInsuranceForm = z.infer<typeof clientInsuranceSchema>;

interface Client {
  id: number;
  name: string;
  billingType: string;
}

interface ClientInsuranceDetails {
  id: number;
  patientId: number;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  memberId: string;
  groupNumber: string;
  relationshipToInsured: string;
  gender: string;
  primaryInsuredName: string;
  primaryInsuredDob: string;
  primaryCptCode?: string;
  diagnosisCodes?: string[];
}

interface MedicalCode {
  id: number;
  code: string;
  description: string;
  category?: string;
  duration?: number;
}

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

export default function ClientInsuranceSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDobPickerOpen, setIsDobPickerOpen] = useState(false);
  const [isInsuredDobPickerOpen, setIsInsuredDobPickerOpen] = useState(false);

  const form = useForm<ClientInsuranceForm>({
    resolver: zodResolver(clientInsuranceSchema),
    defaultValues: {
      relationshipToInsured: "self",
      diagnosisCodes: [],
    },
  });

  // Fetch clients with insurance billing
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

  // Fetch client insurance details for selected client
  const { data: insuranceDetails, isLoading } = useQuery({
    queryKey: ['/api/client-insurance', selectedClient],
    queryFn: async () => {
      if (!selectedClient) return null;
      const response = await fetch(`/api/client-insurance/${selectedClient}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch insurance details');
      return response.json();
    },
    enabled: !!selectedClient,
  });

  // Fetch CPT codes for mental health
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

  // Update form when insurance details load
  useState(() => {
    if (insuranceDetails) {
      form.reset({
        ...insuranceDetails,
        patientId: selectedClient,
        dateOfBirth: insuranceDetails.dateOfBirth ? new Date(insuranceDetails.dateOfBirth) : undefined,
        primaryInsuredDob: insuranceDetails.primaryInsuredDob ? new Date(insuranceDetails.primaryInsuredDob) : undefined,
        diagnosisCodes: insuranceDetails.diagnosisCodes || [],
      });
    }
  });

  // Update insurance details mutation
  const updateInsuranceMutation = useMutation({
    mutationFn: async (data: ClientInsuranceForm) => {
      const response = await fetch(`/api/client-insurance/${data.patientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          dateOfBirth: data.dateOfBirth?.toISOString(),
          primaryInsuredDob: data.primaryInsuredDob?.toISOString(),
        }),
      });
      if (!response.ok) throw new Error('Failed to update insurance details');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-insurance', selectedClient] });
      toast({
        title: "Insurance details updated",
        description: "Client insurance information has been saved successfully.",
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

  const onSubmit = (data: ClientInsuranceForm) => {
    updateInsuranceMutation.mutate(data);
  };

  const insuranceClients = clients.filter((client: Client) => client.billingType === 'insurance');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Client Insurance Setup</h1>
          <p className="text-muted-foreground">
            Configure insurance details for clients with insurance billing
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserIcon className="h-4 w-4 mr-2" />
              Select Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Client</DialogTitle>
              <DialogDescription>
                Choose a client with insurance billing to configure their details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {insuranceClients.map((client: Client) => (
                <Card 
                  key={client.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedClient(client.id.toString());
                    setIsDialogOpen(false);
                  }}
                >
                  <CardContent className="p-4">
                    <h3 className="font-semibold">{client.name}</h3>
                    <p className="text-sm text-muted-foreground">Insurance Billing</p>
                  </CardContent>
                </Card>
              ))}
              {insuranceClients.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No clients with insurance billing found
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {selectedClient && (
        <Card>
          <CardHeader>
            <CardTitle>
              Insurance Details for {clients.find((c: Client) => c.id.toString() === selectedClient)?.name}
            </CardTitle>
            <CardDescription>
              Complete insurance information required for CMS-1500 claims
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div>Loading insurance details...</div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <input type="hidden" {...form.register("patientId")} value={selectedClient} />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Patient Information</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Date of Birth</FormLabel>
                            <Popover open={isDobPickerOpen} onOpenChange={setIsDobPickerOpen}>
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
                                    setIsDobPickerOpen(false);
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
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
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
                        name="city"
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
                        name="state"
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
                        name="zip"
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
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Insurance Information</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="memberId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Member ID</FormLabel>
                            <FormControl>
                              <Input placeholder="ABC1234567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="groupNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Group Number</FormLabel>
                            <FormControl>
                              <Input placeholder="G78901" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="relationshipToInsured"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship to Insured</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
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

                  {form.watch("relationshipToInsured") !== "self" && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Primary Insured Information</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="primaryInsuredName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Primary Insured Name</FormLabel>
                              <FormControl>
                                <Input placeholder="John Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="primaryInsuredDob"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Primary Insured Date of Birth</FormLabel>
                              <Popover open={isInsuredDobPickerOpen} onOpenChange={setIsInsuredDobPickerOpen}>
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
                                      setIsInsuredDobPickerOpen(false);
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
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Mental Health Treatment Information</h3>
                    
                    <FormField
                      control={form.control}
                      name="primaryCptCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary CPT Code</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select most common CPT code for this client" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {cptCodes.map((code: MedicalCode) => (
                                <SelectItem key={code.id} value={code.code}>
                                  {code.code} - {code.description} {code.duration && `(${code.duration} min)`}
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
                          <FormLabel>Diagnosis Codes (ICD-10)</FormLabel>
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
                                        <XMarkIcon className="h-3 w-3" />
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

                  <div className="flex justify-end">
                    <Button type="submit" disabled={updateInsuranceMutation.isPending}>
                      <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                      {updateInsuranceMutation.isPending ? 'Saving...' : 'Save Insurance Details'}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedClient && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <UserIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a client to configure their insurance details</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}