import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/contexts/ToastContext";
import { formatCurrency } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

interface InvoicePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: number;
  patientId: number;
  isNoShow?: boolean;
}

export function InvoicePreviewModal({
  open,
  onOpenChange,
  sessionId,
  patientId,
  isNoShow = false,
}: InvoicePreviewModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceData, setInvoiceData] = useState<{
    amount: number;
    description: string;
    dueDate: string;
  } | null>(null);
  const { toast } = useToast();

  const handleConfirm = async () => {
    if (!invoiceData) return;

    try {
      setIsSubmitting(true);
      console.log("Generating invoice for client:", patientId);
      console.log("Making invoice API request with:", {
        sessionId,
        action: isNoShow ? "no-show" : "invoice",
        shouldInvoice: true,
        invoice: {
          amount: invoiceData.amount,
          description: invoiceData.description,
          dueDate: invoiceData.dueDate,
        },
      });

      const response = await fetch(`/api/clinical-sessions/${sessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: isNoShow ? "no-show" : "invoice",
          shouldInvoice: true,
          invoice: {
            amount: invoiceData.amount,
            description: invoiceData.description,
            dueDate: invoiceData.dueDate,
          },
        }),
      });

      console.log("Invoice API response status:", response.status);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate invoice");
      }

      toast({
        title: "Success",
        description: isNoShow
          ? "Session marked as no-show and invoice generated"
          : "Invoice generated successfully",
      });

      // Refresh the sessions data after successful invoice creation
      queryClient.invalidateQueries({ queryKey: ["/api/clinical-sessions"] });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate invoice",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const queryClient = useQueryClient();
  
  // Fetch client billing info when modal opens
  useEffect(() => {
    const fetchClientInfo = async () => {
      try {
        const response = await fetch(`/api/patients/${patientId}`);
        if (!response.ok) throw new Error("Failed to fetch client info");

        const clientData = await response.json();
        setInvoiceData({
          amount: isNoShow
            ? parseFloat(clientData.noShowFee || "75.00")
            : parseFloat(clientData.sessionCost || "150.00"),
          description: isNoShow
            ? "Missed Appointment Fee"
            : "Therapy Session",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      } catch (error) {
        console.error("Error fetching client info:", error);
        toast({
          title: "Error",
          description: "Failed to load client billing information",
          variant: "destructive",
        });
      }
    };

    if (open && patientId) {
      fetchClientInfo();
    }
  }, [open, patientId, isNoShow, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Invoice</DialogTitle>
          <DialogDescription>
            Review the invoice details before sending
          </DialogDescription>
        </DialogHeader>

        {!invoiceData ? (
          <div className="py-6 flex justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <h3 className="font-medium">Amount</h3>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(invoiceData.amount)}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Description</h3>
              <p className="text-sm text-muted-foreground">
                {invoiceData.description}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Due Date</h3>
              <p className="text-sm text-muted-foreground">
                {new Date(invoiceData.dueDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !invoiceData}
          >
            {isSubmitting ? "Generating..." : "Generate Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}