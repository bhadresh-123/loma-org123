import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { format } from "@/utils/dateFnsCompat";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/contexts/ToastContext";
import { useParams } from "wouter";
import { useClients } from "@/hooks/use-clients";
import type { Session } from "@/types/schema";
import { DocumentTextIcon, XMarkIcon, CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { PhotoIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import SessionNotes from "@/components/SessionNotes";
import Timeline, { type TimelineEvent } from "@/components/Timeline";
import ClientAuditLogs from "@/components/ClientAuditLogs";

interface ClientDetailsProps {
  id?: string;
}

export default function ClientDetails({ id: propId }: ClientDetailsProps = {}) {
  const params = useParams();
  const { toast } = useToast();
  // Use the prop id if provided, otherwise use the route param
  const idToUse = propId || params.id;
  const patientId = parseInt(idToUse || "0");
  // Fetch individual patient details - triggers audit logging for individual access
  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: ['/api/patients', patientId],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${patientId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        console.error(`Failed to fetch patient ${patientId}:`, response.status, response.statusText);
        throw new Error('Failed to fetch patient details');
      }
      const data = await response.json();
      // Handle HIPAA response format
      return data.success ? data.data : data;
    },
    enabled: !!patientId && patientId > 0,
    staleTime: 30000,
    retry: false
  });

  // Update patient function using direct API call
  const updateClientMutation = useMutation({
    mutationFn: async (updateData: Record<string, unknown>) => {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to update patient');
      const data = await response.json();
      return data.success ? data.data : data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      toast({ title: "Patient updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to update patient", description: error.message, variant: "destructive" });
    }
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingInsurance, setIsEditingInsurance] = useState(false);
  const [currentBillingType, setCurrentBillingType] = useState(client?.billingType || 'private_pay');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    client?.photoFilename ? `/api/patients/photos/${client.photoFilename}` : null
  );
  const [selectedDiagnosisCodes, setSelectedDiagnosisCodes] = useState<string[]>([]);
  const [openDiagnosisPopover, setOpenDiagnosisPopover] = useState(false);
  const [relationshipToInsured, setRelationshipToInsured] = useState<string>('self');
  const queryClient = useQueryClient();

  // Fetch sessions for this patient
  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery<Session[]>({
    queryKey: ["/api/clinical-sessions", patientId],
    queryFn: async () => {
      const response = await fetch(`/api/clinical-sessions/patient/${patientId}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch clinical sessions");
      const data = await response.json();
      // Handle HIPAA response format
      return data.success ? data.data : data;
    },
    enabled: !!patientId,
  });



  // Fetch client insurance details
  const { data: insuranceDetails, isLoading: isLoadingInsurance } = useQuery({
    queryKey: ["/api/client-insurance", patientId],
    queryFn: async () => {
      if (!patientId) return null;
      const response = await fetch(`/api/client-insurance/${patientId}`, {
        credentials: "include"
      });
      if (!response.ok) {
        if (response.status === 404) return null; // No insurance details yet
        throw new Error("Failed to fetch insurance details");
      }
      return response.json();
    },
    enabled: !!patientId,
  });

  // Fetch diagnosis codes
  const { data: diagnosisCodes = [] } = useQuery({
    queryKey: ["/api/medical-codes/diagnosis"],
    queryFn: async () => {
      const response = await fetch("/api/medical-codes/diagnosis", {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch diagnosis codes");
      return response.json();
    },
  });

  // Update currentBillingType when client data changes
  useEffect(() => {
    if (client?.billingType) {
      setCurrentBillingType(client.billingType);
    }
  }, [client]);

  // Update diagnosis codes and relationship when insurance details are loaded
  useEffect(() => {
    if (insuranceDetails?.diagnosisCodes && Array.isArray(insuranceDetails.diagnosisCodes)) {
      setSelectedDiagnosisCodes(insuranceDetails.diagnosisCodes);
    }
    if (insuranceDetails?.relationshipToInsured) {
      setRelationshipToInsured(insuranceDetails.relationshipToInsured);
    }
  }, [insuranceDetails]);

  // Auto-populate when relationship changes to 'self' - clear primary insured fields
  useEffect(() => {
    if (relationshipToInsured === 'self') {
      // Clear primary insured fields when self is selected
      const primaryInsuredNameField = document.querySelector('input[name="primaryInsuredName"]') as HTMLInputElement;
      const primaryInsuredDobField = document.querySelector('input[name="primaryInsuredDob"]') as HTMLInputElement;
      
      if (primaryInsuredNameField) primaryInsuredNameField.value = '';
      if (primaryInsuredDobField) primaryInsuredDobField.value = '';
    }
  }, [relationshipToInsured]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handlePhotoDelete = async () => {
    try {
      if (client?.photoFilename) {
        // Make API call to delete the photo
        const response = await fetch(`/api/patients/${patientId}/photo`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to delete photo');
        }
      }

      // Clear the file input
      const fileInput = document.querySelector('input[name="photo"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      setPreviewUrl(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete photo",
        variant: "destructive",
      });
    }
  };

  const handleClientSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const photoFile = (e.currentTarget.querySelector('input[name="photo"]') as HTMLInputElement)?.files?.[0];

      if (photoFile) {
        const photoFormData = new FormData();
        photoFormData.append('photo', photoFile);

        const photoResponse = await fetch(`/api/patients/${patientId}/photo`, {
          method: 'PUT',
          body: photoFormData,
          credentials: 'include'
        });

        if (!photoResponse.ok) {
          throw new Error('Failed to upload photo');
        }
      }

      // Update basic client information using direct API call for audit logging
      await updateClientMutation.mutateAsync({
        name: formData.get('name') as string,
        email: formData.get('email') as string || null,
        phone: formData.get('phone') as string || null,
        race: formData.get('race') as string || null,
        age: parseInt(formData.get('age') as string) || null,
        hometown: formData.get('hometown') as string || null,
        pronouns: formData.get('pronouns') as string || null,
      });

      // Update demographic information in insurance details
      const demographicData = {
        patientId: patientId.toString(),
        dateOfBirth: formData.get('dateOfBirth') as string || null,
        gender: formData.get('gender') as string || null,
        address: formData.get('address') as string || null,
        city: formData.get('city') as string || null,
        state: formData.get('state') as string || null,
        zip: formData.get('zip') as string || null,
      };

      // Only include non-null demographic fields
      const filteredDemographicData = Object.fromEntries(
        Object.entries(demographicData).filter(([_, value]) => value !== null && value !== '')
      );

      if (Object.keys(filteredDemographicData).length > 1) { // More than just patientId
        const response = await fetch(`/api/client-insurance/${patientId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(filteredDemographicData),
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to update demographic information');
        }
        
        // Invalidate insurance details query to refresh the form
        queryClient.invalidateQueries({ queryKey: ["/api/client-insurance", patientId] });
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Client update error:', error);
      // Don't show toast here - the mutation already handles error toasts
      // Unless it's a non-mutation error (like photo upload)
      if (error instanceof Error && !error.message.includes('Failed to update client')) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleInsuranceSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Debug logging for form data
    const billingData = {
      billingType: currentBillingType,
      sessionCost: currentBillingType === 'private_pay' && formData.get('sessionCost') 
        ? parseFloat(formData.get('sessionCost') as string) 
        : null,
      noShowFee: currentBillingType === 'private_pay' && formData.get('noShowFee') 
        ? parseFloat(formData.get('noShowFee') as string) 
        : null,
      placeOfService: formData.get('placeOfService') as string || null,
      // Insurance billing fields that should be stored in clients table
      copayAmount: currentBillingType === 'insurance' && formData.get('copayAmount') 
        ? parseFloat(formData.get('copayAmount') as string) 
        : null,
      deductibleAmount: currentBillingType === 'insurance' && formData.get('deductibleAmount') 
        ? parseFloat(formData.get('deductibleAmount') as string) 
        : null,
      priorAuthNumber: currentBillingType === 'insurance' ? formData.get('priorAuthNumber') as string : null,
      authorizationRequired: currentBillingType === 'insurance' ? formData.get('authorizationRequired') === 'true' : null,
    };
    
    console.log('Frontend billing data being sent:', billingData);

    try {
      // Update client billing information
      await updateClientMutation.mutateAsync(billingData);

      // Update client insurance details including diagnosis codes
      if (currentBillingType === 'insurance') {
        const insuranceData = {
          patientId: patientId.toString(),
          insuranceProvider: formData.get('insuranceProvider') as string,
          memberId: formData.get('memberId') as string,
          groupNumber: formData.get('groupNumber') as string,
          relationshipToInsured: formData.get('relationshipToInsured') as string,
          primaryInsuredName: formData.get('primaryInsuredName') as string,
          primaryInsuredDob: formData.get('primaryInsuredDob') as string,
          dateOfBirth: formData.get('patientDob') as string,
          gender: formData.get('patientGender') as string,
          address: formData.get('patientAddress') as string,
          city: formData.get('patientCity') as string,
          state: formData.get('patientState') as string,
          zip: formData.get('patientZip') as string,
          diagnosisCodes: selectedDiagnosisCodes,
        };

        // Use PUT to update existing insurance details
        const response = await fetch(`/api/client-insurance/${patientId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(insuranceData),
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to update insurance information');
        }
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/client-insurance", patientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      
      setIsEditingInsurance(false);
      toast({
        title: "Success",
        description: "Billing information updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update billing information",
        variant: "destructive",
      });
    }
  };

  const updateSessionMutation = useMutation({
    mutationFn: async ({ sessionId, notes }: { sessionId: number; notes: string }) => {
      const response = await fetch(`/api/clinical-sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, action: "notes" }),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical-sessions", patientId] });
      toast({
        title: "Success",
        description: "Session notes updated successfully",
      });
      setSelectedSession(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNotesSubmit = async (notes: string) => {
    if (!selectedSession) return;
    await updateSessionMutation.mutateAsync({
      sessionId: selectedSession.id,
      notes
    });
  };

  const handleTimelineSessionClick = (eventId: string) => {
    // Extract session ID from the event ID (format: "session-{id}")
    const sessionId = parseInt(eventId.split('-')[1]);
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setSelectedSession(session);
    }
  };

  // Show loading state while fetching client data
  if (isLoadingClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardHeader>
            <CardTitle>Loading Client Details...</CardTitle>
            <CardDescription>
              Please wait while we fetch the client information.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Only show "not found" after loading is complete and there's no client data
  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardHeader>
            <CardTitle>Client Not Found</CardTitle>
            <CardDescription>
              The client you're looking for doesn't exist.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Convert sessions to timeline events
  const timelineEvents: TimelineEvent[] = [
    // Add client creation event
    {
      id: `client-${client.id}-creation`,
      type: 'creation',
      date: new Date(client.createdAt || Date.now()),
      title: 'Client Profile Created',
      description: `${client.name} was added as a client`
    },
    // Add session events
    ...sessions.map(session => ({
      id: `session-${session.id}`,
      type: 'session' as const,
      date: new Date(session.date),
      title: `${session.type.charAt(0).toUpperCase() + session.type.slice(1)} Session`,
      status: session.status || undefined,
      description: session.notes || undefined
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Split sessions into upcoming and past
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingSessions = sessions
    .filter(session => new Date(session.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastSessions = sessions
    .filter(session => new Date(session.date) < today)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">{client.name}</h1>
      </div>

      {selectedSession && (
        <SessionNotes
          session={selectedSession}
          open={!!selectedSession}
          onClose={() => setSelectedSession(null)}
          onSubmit={handleNotesSubmit}
        />
      )}

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Client Information</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="sessions">Sessions & Notes</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="audit">HIPAA Audit</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
              <CardDescription>Update basic client information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleClientSubmit} className="space-y-4" encType="multipart/form-data">
                <div className="flex justify-end mb-4">
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} type="button">
                      Edit Information
                    </Button>
                  ) : (
                    <div className="space-x-2">
                      <Button onClick={() => setIsEditing(false)} type="button" variant="outline">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={updateClientMutation.isPending}>
                        {updateClientMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Basic Information</h3>

                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={client.name}
                        required
                        disabled={!isEditing}
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={client.email || ''}
                        disabled={!isEditing}
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        defaultValue={client.phone || ''}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>

                  {/* Photo Upload Section */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Client Photo</h3>

                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        {previewUrl && (
                          <div className="relative w-24 h-24">
                            <img
                              src={previewUrl}
                              alt="Client preview"
                              className="w-full h-full object-cover rounded-lg"
                            />
                            {isEditing && (
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                onClick={handlePhotoDelete}
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                        {isEditing && (
                          <div className="flex-1">
                            <Label htmlFor="photo" className="block mb-2">
                              Upload Photo (Max 5MB)
                            </Label>
                            <Input
                              id="photo"
                              name="photo"
                              type="file"
                              accept="image/jpeg,image/png,image/gif"
                              onChange={handlePhotoChange}
                              disabled={!isEditing}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Accepted formats: JPEG, PNG, GIF
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Demographic Information */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Demographic Information</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input
                          id="dateOfBirth"
                          name="dateOfBirth"
                          type="date"
                          defaultValue={insuranceDetails?.dateOfBirth ? new Date(insuranceDetails.dateOfBirth).toISOString().split('T')[0] : ''}
                          disabled={!isEditing}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="gender">Gender</Label>
                        <Select name="gender" disabled={!isEditing} defaultValue={insuranceDetails?.gender || ''}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        name="address"
                        placeholder="123 Main Street"
                        defaultValue={insuranceDetails?.address || ''}
                        disabled={!isEditing}
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          name="city"
                          placeholder="City"
                          defaultValue={insuranceDetails?.city || ''}
                          disabled={!isEditing}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          name="state"
                          placeholder="CA"
                          defaultValue={insuranceDetails?.state || ''}
                          disabled={!isEditing}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="zip">ZIP Code</Label>
                        <Input
                          id="zip"
                          name="zip"
                          placeholder="90210"
                          defaultValue={insuranceDetails?.zip || ''}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="race">Race/Ethnicity</Label>
                        <Select name="race" defaultValue={client.race || "prefer_not_to_say"} disabled={!isEditing}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select race/ethnicity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="white">White</SelectItem>
                            <SelectItem value="black_african_american">Black or African American</SelectItem>
                            <SelectItem value="asian">Asian</SelectItem>
                            <SelectItem value="hispanic_latino">Hispanic or Latino</SelectItem>
                            <SelectItem value="native_american">American Indian or Alaska Native</SelectItem>
                            <SelectItem value="pacific_islander">Native Hawaiian or Other Pacific Islander</SelectItem>
                            <SelectItem value="middle_eastern">Middle Eastern or North African</SelectItem>
                            <SelectItem value="multiracial">Two or More Races</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="age">Age</Label>
                        <Input
                          id="age"
                          name="age"
                          type="number"
                          min="0"
                          max="150"
                          defaultValue={client.age || ''}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="hometown">Hometown</Label>
                        <Input
                          id="hometown"
                          name="hometown"
                          defaultValue={client.hometown || ''}
                          disabled={!isEditing}
                        />
                      </div>

                      <div>
                        <Label htmlFor="pronouns">Pronouns</Label>
                        <Input
                          id="pronouns"
                          name="pronouns"
                          defaultValue={client.pronouns || ''}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </div>


                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
              <CardDescription>Manage billing details and payment method</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInsuranceSubmit} className="space-y-6">
                <div className="flex justify-end mb-4">
                  {!isEditingInsurance ? (
                    <Button onClick={() => setIsEditingInsurance(true)} type="button">
                      Edit Billing Information
                    </Button>
                  ) : (
                    <div className="space-x-2">
                      <Button onClick={() => setIsEditingInsurance(false)} type="button" variant="outline">
                        Cancel
                      </Button>
                      <Button type="submit">
                        Save Billing Information
                      </Button>
                    </div>
                  )}
                </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Payment Method</h3>
                  
                  <div>
                    <Label htmlFor="billingType">Billing Type</Label>
                    <Select 
                      name="billingType" 
                      value={currentBillingType} 
                      onValueChange={setCurrentBillingType}
                      disabled={!isEditingInsurance}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select billing type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private_pay">Private Pay</SelectItem>
                        <SelectItem value="insurance">Insurance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {currentBillingType === 'private_pay' && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Private Pay Details</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sessionCost">Session Cost</Label>
                        <Input
                          id="sessionCost"
                          name="sessionCost"
                          type="number"
                          step="0.01"
                          defaultValue={client.sessionCost?.toString() || ''}
                          required
                          disabled={!isEditingInsurance}
                        />
                      </div>

                      <div>
                        <Label htmlFor="noShowFee">No-Show Fee</Label>
                        <Input
                          id="noShowFee"
                          name="noShowFee"
                          type="number"
                          step="0.01"
                          defaultValue={client.noShowFee?.toString() || ''}
                          disabled={!isEditingInsurance}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {currentBillingType === 'insurance' && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-medium text-lg">Insurance Information</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                          <Select name="insuranceProvider" disabled={!isEditingInsurance} defaultValue={insuranceDetails?.insuranceProvider || ""}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select insurance provider" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="custom">Enter Custom Provider</SelectItem>
                              {/* Major National Insurance Providers */}
                              <SelectItem value="aetna">Aetna</SelectItem>
                              <SelectItem value="anthem">Anthem Blue Cross Blue Shield</SelectItem>
                              <SelectItem value="bcbs">Blue Cross Blue Shield</SelectItem>
                              <SelectItem value="cigna">Cigna</SelectItem>
                              <SelectItem value="humana">Humana</SelectItem>
                              <SelectItem value="united">UnitedHealthcare</SelectItem>
                              <SelectItem value="kaiser">Kaiser Permanente</SelectItem>
                              <SelectItem value="molina">Molina Healthcare</SelectItem>
                              <SelectItem value="wellcare">WellCare</SelectItem>
                              <SelectItem value="amerigroup">Amerigroup</SelectItem>
                              <SelectItem value="centene">Centene Corporation</SelectItem>
                              <SelectItem value="health-net">Health Net</SelectItem>
                              <SelectItem value="medicaid">Medicaid</SelectItem>
                              <SelectItem value="medicare">Medicare</SelectItem>
                              <SelectItem value="tricare">TRICARE</SelectItem>
                              <SelectItem value="oscar">Oscar Health</SelectItem>
                              <SelectItem value="ambetter">Ambetter</SelectItem>
                              <SelectItem value="bright-health">Bright Health</SelectItem>
                              <SelectItem value="friday-health">Friday Health Plans</SelectItem>
                              <SelectItem value="independence">Independence Blue Cross</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="memberId">Member ID</Label>
                          <Input
                            id="memberId"
                            name="memberId"
                            placeholder="ABC123456789"
                            defaultValue={insuranceDetails?.memberId || ""}
                            disabled={!isEditingInsurance}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="groupNumber">Group Number</Label>
                          <Input
                            id="groupNumber"
                            name="groupNumber"
                            placeholder="GRP001234"
                            defaultValue={insuranceDetails?.groupNumber || ""}
                            disabled={!isEditingInsurance}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="relationshipToInsured">Relationship to Insured</Label>
                          <Select 
                            name="relationshipToInsured" 
                            value={relationshipToInsured}
                            onValueChange={setRelationshipToInsured}
                            disabled={!isEditingInsurance}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select relationship" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="self">Self</SelectItem>
                              <SelectItem value="spouse">Spouse</SelectItem>
                              <SelectItem value="child">Child</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {relationshipToInsured !== 'self' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="primaryInsuredName">Primary Insured Name</Label>
                            <Input
                              id="primaryInsuredName"
                              name="primaryInsuredName"
                              placeholder="If different from patient"
                              defaultValue={insuranceDetails?.primaryInsuredName || ''}
                              disabled={!isEditingInsurance}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="primaryInsuredDob">Primary Insured Date of Birth</Label>
                            <Input
                              id="primaryInsuredDob"
                              name="primaryInsuredDob"
                              type="date"
                              defaultValue={insuranceDetails?.primaryInsuredDob ? new Date(insuranceDetails.primaryInsuredDob).toISOString().split('T')[0] : ''}
                              disabled={!isEditingInsurance}
                            />
                          </div>
                        </div>
                      )}
                    </div>



                    {/* Medical Coding Section */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-base">Medical Coding & Claims</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <Label>Diagnosis Codes (ICD-10)</Label>
                          <Popover open={openDiagnosisPopover} onOpenChange={setOpenDiagnosisPopover}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openDiagnosisPopover}
                                className="w-full justify-between"
                                disabled={!isEditingInsurance}
                              >
                                {selectedDiagnosisCodes.length > 0
                                  ? `${selectedDiagnosisCodes.length} diagnosis code${selectedDiagnosisCodes.length > 1 ? 's' : ''} selected`
                                  : "Select diagnosis codes..."}
                                <ChevronUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                              <Command>
                                <CommandInput placeholder="Search diagnosis codes..." />
                                <CommandEmpty>No diagnosis codes found.</CommandEmpty>
                                <CommandGroup className="max-h-64 overflow-auto">
                                  {diagnosisCodes.map((code: { code: string; description: string }) => (
                                    <CommandItem
                                      key={code.code}
                                      value={code.code}
                                      onSelect={() => {
                                        setSelectedDiagnosisCodes(prev => 
                                          prev.includes(code.code)
                                            ? prev.filter(c => c !== code.code)
                                            : [...prev, code.code]
                                        );
                                      }}
                                    >
                                      <CheckIcon
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedDiagnosisCodes.includes(code.code) ? "opacity-100" : "opacity-0"
                                        )} />
                                      {code.code} - {code.description}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {selectedDiagnosisCodes.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {selectedDiagnosisCodes.map((code) => {
                                const diagnosisCode = diagnosisCodes.find((c: { code: string; description: string }) => c.code === code);
                                return (
                                  <Badge key={code} variant="secondary" className="text-xs">
                                    {code}
                                    <button
                                      type="button"
                                      className="ml-1 hover:bg-gray-200 rounded-full"
                                      onClick={() => setSelectedDiagnosisCodes(prev => prev.filter(c => c !== code))}
                                      disabled={!isEditingInsurance}
                                    >
                                      <XMarkIcon className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="placeOfService">Place of Service</Label>
                          <Select 
                            name="placeOfService" 
                            defaultValue={client.placeOfService || '11'}
                            disabled={!isEditingInsurance}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select place of service" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="11">Office (11)</SelectItem>
                              <SelectItem value="02">Telehealth (02)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>



                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="authorizationRequired">Authorization Required</Label>
                          <Select 
                            name="authorizationRequired" 
                            defaultValue={client.authorizationRequired ? 'true' : 'false'}
                            disabled={!isEditingInsurance}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="false">No</SelectItem>
                              <SelectItem value="true">Yes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="priorAuthNumber">Prior Authorization Number</Label>
                          <Input
                            id="priorAuthNumber"
                            name="priorAuthNumber"
                            placeholder="AUTH123456"
                            defaultValue={client.priorAuthNumber || ''}
                            disabled={!isEditingInsurance}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="copayAmount">Copay Amount</Label>
                          <Input
                            id="copayAmount"
                            name="copayAmount"
                            type="number"
                            step="0.01"
                            placeholder="25.00"
                            defaultValue={client.copayAmount?.toString() || ''}
                            disabled={!isEditingInsurance}
                          />
                        </div>

                        <div>
                          <Label htmlFor="deductibleAmount">Deductible Amount</Label>
                          <Input
                            id="deductibleAmount"
                            name="deductibleAmount"
                            type="number"
                            step="0.01"
                            placeholder="500.00"
                            defaultValue={client.deductibleAmount?.toString() || ''}
                            disabled={!isEditingInsurance}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <div className="space-y-6">
            <Tabs defaultValue="upcoming" className="mb-6">
              <TabsList className="grid grid-cols-3 mb-2">
                <TabsTrigger value="today">Today's Schedule</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming Sessions</TabsTrigger>
                <TabsTrigger value="past">Past Sessions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="today">
                <Card>
                  <CardHeader>
                    <CardTitle>Today's Schedule</CardTitle>
                    <CardDescription>
                      Today's scheduled sessions for {client.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingSessions ? (
                      <div className="space-y-2">
                        <div className="h-16 animate-pulse bg-muted rounded-lg" />
                      </div>
                    ) : upcomingSessions.filter(session => 
                        new Date(session.date).toDateString() === today.toDateString()
                      ).length > 0 ? (
                      <div className="space-y-3">
                        {upcomingSessions
                          .filter(session => new Date(session.date).toDateString() === today.toDateString())
                          .map((session) => (
                            <div
                              key={session.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(session.date), 'PPP p')}
                                </p>
                                {session.notes && (
                                  <p className="text-sm mt-1 text-muted-foreground line-clamp-2">
                                    {session.notes}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={session.status === 'scheduled' ? 'default' : 'secondary'}>
                                  {session.status}
                                </Badge>
                                <Badge variant="outline">{session.duration} minutes</Badge>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <EllipsisVerticalIcon className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setSelectedSession(session)}>
                                      <DocumentTextIcon className="h-4 w-4 mr-2" />
                                      Add Note
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No sessions scheduled for today
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="upcoming">
                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Sessions</CardTitle>
                    <CardDescription>
                      Future scheduled sessions for {client.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                {isLoadingSessions ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-16 animate-pulse bg-muted rounded-lg" />
                    ))}
                  </div>
                ) : upcomingSessions.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(session.date), 'PPP p')}
                          </p>
                          {session.notes && (
                            <p className="text-sm mt-1 text-muted-foreground line-clamp-2">
                              {session.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge>{session.type}</Badge>
                          <Badge variant="outline">{session.duration} minutes</Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <EllipsisVerticalIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedSession(session)}>
                                <DocumentTextIcon className="h-4 w-4 mr-2" />
                                Add Note
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No upcoming sessions scheduled
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Past Sessions</CardTitle>
                <CardDescription>
                  Previous sessions and their notes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSessions ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 animate-pulse bg-muted rounded-lg" />
                    ))}
                  </div>
                ) : pastSessions.length > 0 ? (
                  <div className="space-y-3">
                    {pastSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(session.date), 'PPP p')}
                          </p>
                          {session.notes && (
                            <p className="text-sm mt-1 text-muted-foreground line-clamp-2">
                              {session.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={session.status === 'no_show' ? 'destructive' : 'default'}>
                            {session.status}
                          </Badge>
                          <Badge variant="outline">{session.duration} minutes</Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <EllipsisVerticalIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedSession(session)}>
                                <DocumentTextIcon className="h-4 w-4 mr-2" />
                                Add Note
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No upcoming sessions found
                  </p>
                )}
              </CardContent>
            </Card>
              </TabsContent>
              
              <TabsContent value="past">
                <Card>
                  <CardHeader>
                    <CardTitle>Past Sessions</CardTitle>
                    <CardDescription>
                      Previous sessions with {client.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingSessions ? (
                      <div className="space-y-2">
                        {[1, 2].map((i) => (
                          <div key={i} className="h-16 animate-pulse bg-muted rounded-lg" />
                        ))}
                      </div>
                    ) : pastSessions.length > 0 ? (
                      <div className="space-y-3">
                        {pastSessions.map((session) => (
                          <div
                            key={session.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(session.date), 'PPP p')}
                              </p>
                              {session.notes && (
                                <p className="text-sm mt-1 text-muted-foreground line-clamp-2">
                                  {session.notes}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={session.status === 'completed' ? 'success' : 'secondary'}>
                                {session.status}
                              </Badge>
                              <Badge variant="outline">{session.duration} minutes</Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <EllipsisVerticalIcon className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setSelectedSession(session)}>
                                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                                    View/Edit Notes
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No past sessions found
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Client Timeline</CardTitle>
              <CardDescription>
                View all events and interactions with {client.name} in chronological order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Timeline
                events={timelineEvents}
                onSessionClick={handleTimelineSessionClick}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <ClientAuditLogs patientId={parseInt(params.id!)} clientName={client.name} />
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Document management will be implemented in the next phase
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No documents found</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}