import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom"; 
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/contexts/ToastContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvoiceConfirmDialog } from "@/components/InvoiceConfirmDialog";

interface Client {
  id: number;
  name: string;
  email: string;
  sessionCost?: string;
}

export default function BillingManagement() {
  const { patientId } = useParams();
  const [, setLocation] = useLocation();
  const [selectedClient, setSelectedClient] = useState<string | undefined>(
    patientId
  );
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [clientData, setClientData] = useState<Client | null>(null);
  const [isLoadingClient, setIsLoadingClient] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const { toast } = useToast();


  // Fetch all clients
  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => apiRequest('/clients'), 
  });

  // Define getClientById function before it's used
  // Function to retrieve client from local state or cache
  const getClientById = (id: number) => {
    // Try to find client in the clients array if available
    return clients?.find(client => client.id === id) || null;
  };

  // Fetch specific client if ID is provided.  Logic updated to use apiRequest and handle potential useClients hook.
  useEffect(() => {
    if (selectedClient) {
      setIsLoadingClient(true);
      const patientId = parseInt(selectedClient);
      // Use the getClientById function from useClients hook if available
      const client = getClientById(patientId);
      if (client) {
        setClientData(client);
        setIsLoadingClient(false);
      } else {
        // If not in local state, fetch from API
        apiRequest(`/clients/${patientId}`)
          .then(data => {
            setClientData(data);
            setIsLoadingClient(false);
          })
          .catch(error => {
            console.error('Error fetching client:', error);
            setIsLoadingClient(false);
          });
      }
    } else {
      setClientData(null);
    }
  }, [selectedClient, clients]); 


  // Handle client selection
  const handleClientChange = (value: string) => {
    setSelectedClient(value);
    setLocation(`/billing/${value}`);
  };

  // Create invoice for selected client
  const createInvoice = async (amount: number, description: string) => {
    if (!selectedClient || !clientData) {
      toast({
        title: "Error",
        description: "Please select a client first",
        variant: "destructive",
      });
      return Promise.reject(new Error("No client selected"));
    }

    setIsCreatingInvoice(true);
    
    try {
      console.log("Creating invoice for client:", clientData.id, amount, description);
      
      const response = await fetch("/api/stripe/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: clientData.id,
          amount: amount.toFixed(2), 
          description,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to create invoice");
      }
      
      console.log("Invoice created:", data);
      
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
      
      // If the invoice created uses a Connect account, show special message
      if (data.businessBankingInfo?.connectedToBusinessAccount) {
        toast({
          title: "Business Account",
          description: "This invoice will be paid to your business bank account",
          variant: "default",
        });
      }
      
      return Promise.resolve(data);
    } catch (error) {
      console.error("Error creating invoice:", error);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create invoice",
        variant: "destructive",
      });
      
      return Promise.reject(error);
    } finally {
      setIsCreatingInvoice(false);
    }
  };


  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Billing Management</h1>

      <div className="mb-6">
        <Select value={selectedClient} onValueChange={handleClientChange} disabled={isLoadingClients}>
          <SelectTrigger className="w-full md:w-[300px]">
            <SelectValue placeholder="Select a client" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Clients</SelectLabel>
              {Array.isArray(clients) && clients.length > 0 ? (
                clients.map((client: Client) => (
                  <SelectItem key={client.id} value={String(client.id)}>
                    {client.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-clients" disabled>No clients available</SelectItem>
              )}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {isLoadingClient ? (
        <p>Loading client data...</p>
      ) : clientData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p><strong>Name:</strong> {clientData.name}</p>
              <p><strong>Email:</strong> {clientData.email}</p>
              {/* Add more client details as needed */}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button 
                onClick={() => setShowInvoiceDialog(true)}
                disabled={isCreatingInvoice}
              >
                {isCreatingInvoice ? "Creating Invoice..." : "Create New Invoice"}
              </Button>
              <Button variant="outline">View Payment History</Button>
            </CardContent>
          </Card>
        </div>
      )}

      <InvoiceConfirmDialog 
        open={showInvoiceDialog} 
        onOpenChange={setShowInvoiceDialog} 
        onConfirm={() => {
          // Call our invoice creation function
          const amount = parseFloat(clientData?.sessionCost || "150.00");
          return createInvoice(amount, "Therapy Session");
        }}
        invoiceData={{
          clientName: clientData?.name || "N/A",
          amount: parseFloat(clientData?.sessionCost || "150.00"),
          description: "Therapy Session",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }}
      />
    </div>
  );
}