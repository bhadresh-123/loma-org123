import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownTrayIcon, CalendarIcon, CreditCardIcon, DocumentTextIcon, EyeIcon, PlusIcon, ReceiptPercentIcon } from '@heroicons/react/24/outline';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "@/utils/dateFnsCompat";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/contexts/ToastContext";

const createBillSchema = z.object({
  patientId: z.string(),
  sessionId: z.string().optional(),
  amount: z.string(),
  dateOfService: z.date(),
  description: z.string().optional(),
});

type CreateBillForm = z.infer<typeof createBillSchema>;

interface Client {
  id: number;
  name: string;
  billingType: string;
  email?: string;
  sessionCost?: string;
}

interface Session {
  id: number;
  patientId: number;
  date: string;
  type?: string;
  cptCode?: string;
  duration?: number;
}

interface Bill {
  id: number;
  client: { id: number; name: string; billingType: string };
  amount: string;
  dateOfService: string;
  status: string;
  type: 'insurance' | 'private_pay';
  createdAt: string;
  claimNumber?: string;
  invoiceId?: string;
  stripeHostedUrl?: string;
}

export default function Billing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [missingDataClaim, setMissingDataClaim] = useState<{ id: number; validation: any } | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const form = useForm<CreateBillForm>({
    resolver: zodResolver(createBillSchema),
    defaultValues: {
      amount: "", // Don't pre-populate amount until client is selected
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
        console.error('Billing clients fetch error:', error);
        return []; // Always return empty array on error
      }
    },
  });

  // Ensure clients is always an array
  const clients = Array.isArray(clientsData) ? clientsData : [];

  // Get selected client data for conditional rendering
  const selectedClientData = Array.isArray(clients) ? clients.find((c: Client) => c.id.toString() === selectedClient) : undefined;

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

  // Fetch all bills (both claims and invoices)
  const { data: bills = [], isLoading: billsLoading } = useQuery({
    queryKey: ['/api/billing'],
    queryFn: async () => {
      // Fetch both claims and invoices and combine them
      const [claimsResponse, invoicesResponse] = await Promise.all([
        fetch('/api/cms1500-claims', { credentials: 'include' }),
        fetch('/api/invoices', { credentials: 'include' })
      ]);
      
      const claims = claimsResponse.ok ? await claimsResponse.json() : [];
      const invoices = invoicesResponse.ok ? await invoicesResponse.json() : [];
      
      // Transform and combine the data
      const transformedClaims = claims.map((claim: any) => ({
        id: claim.id,
        client: claim.client || { id: claim.patientId, name: 'Unknown', billingType: 'insurance' },
        amount: claim.chargeAmount || '0.00',
        dateOfService: claim.dateOfService,
        status: claim.status || 'draft',
        type: 'insurance' as const,
        createdAt: claim.createdAt,
        claimNumber: claim.claimNumber,
      }));
      
      const transformedInvoices = invoices.map((invoice: any) => ({
        id: invoice.id,
        client: invoice.client || { id: invoice.patientId, name: 'Unknown', billingType: 'private_pay' },
        amount: invoice.total || invoice.subtotal || '0.00',
        dateOfService: invoice.createdAt,
        status: invoice.status || 'pending',
        type: 'private_pay' as const,
        createdAt: invoice.createdAt,
        invoiceId: invoice.stripeInvoiceId,
        invoiceNumber: invoice.invoiceNumber,
        stripeHostedUrl: invoice.stripeHostedUrl,
      }));
      
      return [...transformedClaims, ...transformedInvoices].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
  });

  // Handle client selection and auto-population
  const handleClientSelect = (patientId: string) => {
    setSelectedClient(patientId);
    const selectedClientData = clients.find((c: Client) => c.id.toString() === patientId);
    
    if (selectedClientData) {
      // Auto-populate amount based on client's billing type and session cost
      let defaultAmount = '150.00'; // Default for insurance
      
      if (selectedClientData.billingType === 'private_pay') {
        // Use client's session cost for private pay, fallback to 150.00 if not set
        defaultAmount = selectedClientData.sessionCost || '150.00';
      }
      
      form.setValue('amount', defaultAmount);
    }
  };

  // Handle session selection and auto-population
  const handleSessionSelect = (sessionId: string) => {
    const selectedSession = sessions.find((s: Session) => s.id.toString() === sessionId);
    
    if (selectedSession) {
      // Auto-populate date of service from session
      form.setValue('dateOfService', new Date(selectedSession.date));
      
      // Auto-populate description
      const sessionType = selectedSession.type || 'individual';
      const duration = selectedSession.duration || 50;
      const description = `${sessionType} therapy session (${duration} min)`;
      form.setValue('description', description);
    }
  };

  // Create claim for insurance clients
  const createClaimMutation = useMutation({
    mutationFn: async (data: CreateBillForm) => {
      const selectedClientData = clients.find((c: Client) => c.id.toString() === data.patientId);
      
      if (!selectedClientData) {
        throw new Error('Client not found');
      }

      // Create CMS-1500 claim
      const response = await fetch('/api/cms1500-claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          patientId: data.patientId,
          sessionId: data.sessionId || undefined,
          dateOfService: data.dateOfService.toISOString().split('T')[0],
          chargeAmount: data.amount || '150.00',
          patientName: selectedClientData.name,
          cptCode: '90834', // Default - will be overridden by session if available
          primaryDiagnosisCode: 'F41.1', // Default diagnosis
          placeOfService: '11', // Office
          renderingProviderNpi: '', // Will be auto-populated from billing info
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create claim');
      }
      return await response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/billing'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cms1500-claims'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Insurance claim created",
        description: "Your CMS-1500 claim has been generated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating claim",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create invoice for private pay clients
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: CreateBillForm) => {
      const selectedClientData = clients.find((c: Client) => c.id.toString() === data.patientId);
      
      if (!selectedClientData) {
        throw new Error('Client not found');
      }

      // Create Stripe invoice for private pay
      const response = await fetch('/api/stripe/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          patientId: parseInt(data.patientId),
          sessionId: data.sessionId ? parseInt(data.sessionId) : undefined,
          amount: parseFloat(data.amount),
          description: data.description || 'Therapy session',
          serviceDate: data.dateOfService.toISOString(),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        // Handle business banking setup errors with more context
        if (errorData.error === 'Business banking account required' || 
            errorData.error === 'Business banking setup incomplete' ||
            errorData.error === 'Business banking account invalid') {
          throw new Error(errorData.message || errorData.error);
        }
        throw new Error(errorData.error || 'Failed to create invoice');
      }
      return await response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/billing'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Invoice sent",
        description: "Your invoice has been sent via Stripe.",
      });
    },
    onError: (error) => {
      const isBusinessBankingError = error.message.includes('business banking') || 
                                   error.message.includes('Business banking');
      
      toast({
        title: isBusinessBankingError ? "Business Banking Setup Required" : "Error creating invoice",
        description: error.message,
        variant: "destructive",
        action: isBusinessBankingError ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.href = '/financials'}
          >
            Set Up Banking
          </Button>
        ) : undefined,
      });
    },
  });

  const onSubmit = (data: CreateBillForm) => {
    const selectedClientData = clients.find((c: Client) => c.id.toString() === data.patientId);
    
    if (selectedClientData?.billingType === 'insurance') {
      createClaimMutation.mutate(data);
    } else {
      createInvoiceMutation.mutate(data);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'submitted': return 'bg-blue-500';
      case 'paid': return 'bg-green-500';
      case 'denied': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      case 'overdue': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getBillTypeIcon = (type: string) => {
    return type === 'insurance' ? <DocumentTextIcon className="h-4 w-4" /> : <CreditCardIcon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground">
            Manage insurance claims and private pay invoices
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              New Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Bill</DialogTitle>
              <DialogDescription>
                Generate an insurance claim or send a private pay invoice
              </DialogDescription>
            </DialogHeader>
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
                            {clients && Array.isArray(clients) ? clients.map((client: Client) => (
                              <SelectItem key={client.id} value={client.id.toString()}>
                                <div className="flex items-center gap-2">
                                  {getBillTypeIcon(client.billingType)}
                                  {client.name}
                                  <Badge variant="outline" className="text-xs">
                                    {client.billingType === 'insurance' ? 'Insurance' : 'Private Pay'}
                                  </Badge>
                                </div>
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

                  {/* Only show Amount field for private pay clients */}
                  {selectedClientData?.billingType !== 'insurance' && (
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="150.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Only show Description field for private pay clients */}
                {selectedClientData?.billingType !== 'insurance' && (
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Therapy session description"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Show insurance information for insurance clients */}
                {selectedClientData?.billingType === 'insurance' && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <DocumentTextIcon className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Insurance Claim Generation</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      A CMS-1500 claim will be automatically generated using session data and client insurance information. 
                      You'll be prompted for any missing required information.
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createClaimMutation.isPending || createInvoiceMutation.isPending}>
                    {(createClaimMutation.isPending || createInvoiceMutation.isPending) ? 'Creating...' : 
                     (selectedClientData?.billingType === 'insurance' ? 'Auto-Generate Claim' : 'Send Invoice')}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Bills</TabsTrigger>
          <TabsTrigger value="insurance">Insurance Claims</TabsTrigger>
          <TabsTrigger value="private_pay">Private Pay</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <BillsTable 
            bills={bills} 
            isLoading={billsLoading} 
            missingDataClaim={missingDataClaim}
            setMissingDataClaim={setMissingDataClaim}
          />
        </TabsContent>

        <TabsContent value="insurance" className="space-y-4">
          <BillsTable 
            bills={bills.filter((bill: Bill) => bill.type === 'insurance')} 
            isLoading={billsLoading} 
            missingDataClaim={missingDataClaim}
            setMissingDataClaim={setMissingDataClaim}
          />
        </TabsContent>

        <TabsContent value="private_pay" className="space-y-4">
          <BillsTable 
            bills={bills.filter((bill: Bill) => bill.type === 'private_pay')} 
            isLoading={billsLoading} 
            missingDataClaim={missingDataClaim}
            setMissingDataClaim={setMissingDataClaim}
          />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <BillsTable 
            bills={bills.filter((bill: Bill) => 
              ['draft', 'submitted', 'pending'].includes(bill.status)
            )} 
            isLoading={billsLoading} 
            missingDataClaim={missingDataClaim}
            setMissingDataClaim={setMissingDataClaim}
          />
        </TabsContent>

        <TabsContent value="paid" className="space-y-4">
          <BillsTable 
            bills={bills.filter((bill: Bill) => bill.status === 'paid')} 
            isLoading={billsLoading} 
            missingDataClaim={missingDataClaim}
            setMissingDataClaim={setMissingDataClaim}
          />
        </TabsContent>
      </Tabs>

      {/* Missing Data Dialog */}
      {missingDataClaim && (
        <Dialog open={!!missingDataClaim} onOpenChange={() => setMissingDataClaim(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Complete Required Information</DialogTitle>
              <DialogDescription>
                Please complete the following information before generating the CMS-1500 claim form.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Missing Information</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                  {missingDataClaim.validation?.missingFields?.map((field: string, index: number) => (
                    <li key={index}>{field}</li>
                  )) || <li>Unable to load missing fields</li>}
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Next Steps</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
                  {missingDataClaim.validation?.recommendations?.map((rec: string, index: number) => (
                    <li key={index}>{rec}</li>
                  )) || <li>Unable to load recommendations</li>}
                </ul>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setMissingDataClaim(null)}>
                  Cancel
                </Button>
                <div className="space-x-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      // Navigate to profile settings
                      window.location.href = '/profile';
                    }}
                  >
                    Complete Profile
                  </Button>
                  <Button 
                    onClick={() => {
                      // Generate PDF anyway with a warning
                      window.open(`/api/cms1500-pdf/${missingDataClaim.id}/pdf`, '_blank');
                      setMissingDataClaim(null);
                      toast({
                        title: "PDF Generated",
                        description: "Note: Some fields may be incomplete due to missing information.",
                        variant: "default"
                      });
                    }}
                  >
                    Generate Anyway
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function BillsTable({ 
  bills, 
  isLoading, 
  missingDataClaim, 
  setMissingDataClaim 
}: { 
  bills: Bill[]; 
  isLoading: boolean;
  missingDataClaim?: { id: number; validation: any } | null;
  setMissingDataClaim?: (claim: { id: number; validation: any } | null) => void;
}) {
  const { toast } = useToast();
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'submitted': return 'bg-blue-500';
      case 'paid': return 'bg-green-500';
      case 'denied': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      case 'overdue': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getBillTypeIcon = (type: string) => {
    return type === 'insurance' ? <DocumentTextIcon className="h-4 w-4" /> : <CreditCardIcon className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (bills.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <ReceiptPercentIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No bills found</p>
          <p className="text-sm text-gray-400">Create your first bill to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bills.map((bill) => (
        <Card key={`${bill.type}-${bill.id}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {getBillTypeIcon(bill.type)}
                <div>
                  <p className="font-medium">{bill.client.name}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(bill.dateOfService), 'PPP')} • ${bill.amount}
                  </p>
                  {bill.claimNumber && (
                    <p className="text-xs text-gray-400">Claim: {bill.claimNumber}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge 
                  className={`${getStatusColor(bill.status)} text-white`}
                >
                  {bill.status}
                </Badge>
                <Badge variant="outline">
                  {bill.type === 'insurance' ? 'Insurance' : 'Private Pay'}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={async () => {
                    if (bill.type === 'insurance') {
                      // Check data completeness before generating PDF
                      try {
                        const response = await fetch(`/api/cms1500-validation/${bill.id}`);
                        const validation = await response.json();
                        
                        if (validation.isValid) {
                          window.open(`/api/cms1500-pdf/${bill.id}/pdf`, '_blank');
                        } else {
                          // Show missing data dialog
                          if (setMissingDataClaim) {
                            setMissingDataClaim({ id: bill.id, validation });
                          }
                        }
                      } catch (error) {
                        console.error('Validation error:', error);
                        // Fallback to direct PDF generation
                        window.open(`/api/cms1500-pdf/${bill.id}/pdf`, '_blank');
                      }
                    } else {
                      // For private pay invoices, open Stripe hosted invoice URL
                      if (bill.stripeHostedUrl) {
                        window.open(bill.stripeHostedUrl, '_blank');
                      } else {
                        toast({
                          title: "Invoice not available",
                          description: "This invoice does not have a Stripe hosted URL yet.",
                          variant: "destructive",
                        });
                      }
                    }
                  }}
                >
                  <EyeIcon className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    if (bill.type === 'insurance') {
                      const link = document.createElement('a');
                      link.href = `/api/cms1500-pdf/${bill.id}/pdf?download=true`;
                      link.download = `CMS1500_${bill.claimNumber || bill.id}.pdf`;
                      link.click();
                    }
                  }}
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}