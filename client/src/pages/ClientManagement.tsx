import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { MagnifyingGlassIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/contexts/ToastContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ClientCard from "@/components/ClientCard";
import type { Client } from "@/types/schema";
import { useClients } from "@/hooks/use-clients";

const CLIENT_STATUSES = [
  { value: 'inquiry', label: 'Inquiry' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'terminated', label: 'Terminated' },
] as const;

const BILLING_TYPES = [
  { value: 'private_pay', label: 'Private Pay' },
  { value: 'insurance', label: 'Insurance' },
] as const;

const RACE_ETHNICITY_OPTIONS = [
  { value: 'white', label: 'White' },
  { value: 'black_african_american', label: 'Black or African American' },
  { value: 'asian', label: 'Asian' },
  { value: 'hispanic_latino', label: 'Hispanic or Latino' },
  { value: 'native_american', label: 'American Indian or Alaska Native' },
  { value: 'pacific_islander', label: 'Native Hawaiian or Other Pacific Islander' },
  { value: 'middle_eastern', label: 'Middle Eastern or North African' },
  { value: 'multiracial', label: 'Two or More Races' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

const CLIENT_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'couple', label: 'Couple' },
] as const;

export default function ClientManagement() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    clients: clientsData = [],
    isLoading: isClientsLoading,
    createClient,
    updateClient,
    isCreating,
    isUpdating
  } = useClients();

  // Ensure clients is always an array
  const clients = Array.isArray(clientsData) ? clientsData : [];

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError(null);
    const formData = new FormData(e.currentTarget);

    // Validate required fields
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const billingType = formData.get('billingType') as string;

    if (!name?.trim()) {
      setValidationError('Name is required');
      return;
    }

    if (!type) {
      setValidationError('Client type is required');
      return;
    }

    if (!billingType) {
      setValidationError('Billing type is required');
      return;
    }

    try {
      if (selectedClient) {
        // Handle client update
        const photoFile = (e.currentTarget.querySelector('input[name="photo"]') as HTMLInputElement)?.files?.[0];

        if (photoFile) {
          const photoFormData = new FormData();
          photoFormData.append('photo', photoFile);

          const photoResponse = await fetch(`/api/patients/${selectedClient.id}/photo`, {
            method: 'PUT',
            body: photoFormData,
            credentials: 'include'
          });

          if (!photoResponse.ok) {
            throw new Error('Failed to upload photo');
          }
        }

        await updateClient({
          id: selectedClient.id,
          data: {
            name: formData.get('name') as string,
            email: formData.get('email') as string || null,
            phone: formData.get('phone') as string || null,
            billingType: formData.get('billingType') as string,
            sessionCost: formData.get('billingType') === 'private_pay' && formData.get('sessionCost') 
              ? parseFloat(formData.get('sessionCost') as string) 
              : null,
            noShowFee: formData.get('billingType') === 'private_pay' && formData.get('noShowFee') 
              ? parseFloat(formData.get('noShowFee') as string) 
              : null,
            race: formData.get('race') as string || null,
            age: formData.get('age') as string || null,
            hometown: formData.get('hometown') as string || null,
            pronouns: formData.get('pronouns') as string || null,
          }
        });
        setIsEditOpen(false);
        setSelectedClient(null);
      } else {
        // Handle client creation
        const clientData = {
          name: name.trim(),
          type,
          billingType,
          email: (formData.get('email') as string) || null,
          phone: (formData.get('phone') as string) || null,
          notes: (formData.get('notes') as string) || null,
          sessionCost: formData.get('sessionCost') 
            ? parseFloat(formData.get('sessionCost') as string) 
            : null,
          noShowFee: formData.get('noShowFee') 
            ? parseFloat(formData.get('noShowFee') as string) 
            : null,
          race: (formData.get('race') as string) || null,
          age: formData.get('age') ? parseInt(formData.get('age') as string, 10) : null,
          hometown: (formData.get('hometown') as string) || null,
          pronouns: (formData.get('pronouns') as string) || null
        };
        await createClient(clientData);
        setIsAddOpen(false);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setValidationError(error instanceof Error ? error.message : 'Failed to submit form');
    }
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsEditOpen(true);
  };

  const filteredClients = clients.filter((client) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      client.name?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.phone?.toLowerCase().includes(query)
    );

    const clientStatus = (client.status || 'inquiry').toLowerCase();
    const matchesStatus = statusFilter === "all" || clientStatus === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const ClientFormContent = ({ client }: { client?: Client }) => {
    const [billingType, setBillingType] = useState(client?.billingType ?? 'private_pay');
    const [previewUrl, setPreviewUrl] = useState<string | null>(
      client?.photoFilename ? `/api/patients/photos/${client.photoFilename}` : null
    );

    const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    };

    const handlePhotoDelete = () => {
      const fileInput = document.querySelector('input[name="photo"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      setPreviewUrl(null);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
        <div>
          <Label htmlFor="type">Client Type</Label>
          <Select name="type" defaultValue={client?.type ?? "individual"}>
            <SelectTrigger>
              <SelectValue placeholder="Select client type" />
            </SelectTrigger>
            <SelectContent>
              {CLIENT_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={client?.name} required />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={client?.email ?? ""} />
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={client?.phone ?? ""} />
        </div>

        {/* Demographics Section */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium text-lg">Demographics</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="race">Race/Ethnicity</Label>
              <Select name="race" defaultValue={client?.race ?? "prefer_not_to_say"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select race/ethnicity" />
                </SelectTrigger>
                <SelectContent>
                  {RACE_ETHNICITY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
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
                defaultValue={client?.age ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hometown">Hometown</Label>
              <Input id="hometown" name="hometown" defaultValue={client?.hometown ?? ""} />
            </div>

            <div>
              <Label htmlFor="pronouns">Pronouns</Label>
              <Input id="pronouns" name="pronouns" defaultValue={client?.pronouns ?? ""} />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
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
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={handlePhotoDelete}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}
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
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Accepted formats: JPEG, PNG, GIF
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium text-lg">Billing Information</h3>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={client?.status ?? "inquiry"}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_STATUSES.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="billingType">Billing Type</Label>
            <Select
              name="billingType"
              defaultValue={billingType}
              onValueChange={setBillingType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select billing type" />
              </SelectTrigger>
              <SelectContent>
                {BILLING_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {billingType === 'private_pay' && (
            <>
              <div>
                <Label htmlFor="sessionCost">Session Cost ($)</Label>
                <Input
                  id="sessionCost"
                  name="sessionCost"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={client?.sessionCost ?? ""}
                  required={billingType === 'private_pay'}
                />
              </div>
              <div>
                <Label htmlFor="noShowFee">No-Show Fee ($)</Label>
                <Input
                  id="noShowFee"
                  name="noShowFee"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={client?.noShowFee ?? ""}
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={client?.notes ?? ""} />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isCreating || isUpdating}
          >
            {client ?
              (isUpdating ? "Updating..." : "Update Client") :
              (isCreating ? "Adding..." : "Add Client")
            }
          </Button>
        </div>
      </form>
    );
  };

  if (isClientsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">Client Management</h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>
            {validationError && (
              <div className="bg-destructive/15 text-destructive px-4 py-2 rounded-md text-sm">
                {validationError}
              </div>
            )}
            <ClientFormContent />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={setStatusFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {CLIENT_STATUSES.map(status => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          {selectedClient && <ClientFormContent client={selectedClient} />}
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        {filteredClients.map((client) => (
          <ClientCard key={client.id} client={client} onEdit={() => handleEdit(client)} />
        ))}
        {filteredClients.length === 0 && (
          <p className="text-center text-muted-foreground">
            {clients.length === 0
              ? "No clients found. Add your first client using the button above."
              : "No clients match your search criteria."}
          </p>
        )}
      </div>
    </div>
  );
}