import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface InvoiceConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  invoiceData: {
    clientName: string;
    amount: number;
    description: string;
    dueDate: Date;
  };
}

export function InvoiceConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  invoiceData = {
    clientName: "N/A",
    amount: 0,
    description: "",
    dueDate: new Date()
  }
}: InvoiceConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending invoice:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Confirm Invoice</DialogTitle>
          <DialogDescription>
            Review the invoice details before sending to the client.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <h3 className="font-medium">Client</h3>
            <p className="text-sm text-muted-foreground">{invoiceData?.clientName || "N/A"}</p>
          </div>

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
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}