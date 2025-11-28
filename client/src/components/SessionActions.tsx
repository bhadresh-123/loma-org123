import React, { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "@/utils/dateFnsCompat";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CalendarIcon, CheckCircleIcon, DocumentTextIcon, ReceiptPercentIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, EllipsisVerticalIcon, ReceiptPercentIcon } from '@heroicons/react/24/outline';
import { useToast } from "@/contexts/ToastContext";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/contexts/ToastContext";
import type { Session } from "@/types/schema";

interface Props {
  session: Session & { patient?: { noShowFee: number | null } };
}

export default function SessionActions({ session }: Props) {
  const [showNoShowDialog, setShowNoShowDialog] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateSessionMutation = useMutation({
    mutationFn: async ({ sessionId, status, shouldInvoice }: { sessionId: number, status: string, shouldInvoice?: boolean }) => {
      console.log("Updating session status:", { id: sessionId, status, shouldInvoice });

      // For status updates only, use the dedicated endpoint
      if (status && !shouldInvoice) {
        const response = await fetch(`/api/clinical-sessions/${sessionId}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
          credentials: "include",
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Session status update failed:", errorText);
          throw new Error(errorText || "Failed to update session status");
        }

        return response.json();
      }

      // For no-show with invoice, use the original endpoint
      const response = await fetch(`/api/clinical-sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, shouldInvoice }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Session update failed:", errorText);
        throw new Error(errorText || "Failed to update session");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });

      let message = "Session status updated successfully";
      if (data.taskCreated) {
        message += " and session note task created";
      }

      toast({
        title: "Success",
        description: message,
      });
    },
    onError: (error) => {
      console.error("Update session mutation error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update session status",
        variant: "destructive",
      });
    },
  });

  const handleNoShow = (shouldInvoice: boolean) => {
    updateSessionMutation.mutate({ status: "no_show", shouldInvoice });
    setShowNoShowDialog(false);
  };

  // Handle completion of the session
  const handleCompleteSession = useCallback(() => {
    updateSessionMutation.mutate(
      { sessionId: session.id, status: "completed" },
      {
        onSuccess: (data) => {
          toast({
            title: "Session completed",
            description: "The session has been marked as completed.",
            variant: "success",
          });

          // Invalidate the sessions query to refresh data
          queryClient.invalidateQueries({ queryKey: ["/api/clinical-sessions"] });

          // Update session status in the UI immediately if needed
          if (session.status !== 'completed') {
            queryClient.setQueryData(['/api/clinical-sessions'], (oldData: any) => {
              if (!oldData) return oldData;
              
              // Handle both array format and HIPAA response format { success: true, data: [...] }
              const sessions = Array.isArray(oldData) ? oldData : (oldData.data || []);
              const updatedSessions = sessions.map((s: any) => 
                s.id === session.id ? { ...s, status: 'completed' } : s
              );
              
              // Return in the same format as received
              return Array.isArray(oldData) ? updatedSessions : { ...oldData, data: updatedSessions };
            });
          }
        },
        onError: (error) => {
          console.error("Failed to complete session:", error);
          toast({
            title: "Failed to complete session",
            description: error instanceof Error ? error.message : "An error occurred while completing the session.",
            variant: "destructive",
          });
        },
      }
    );
  }, [updateSessionMutation, queryClient, toast, session.id]);

  // Other handlers for different actions
  const handleComplete = () => {
    console.log("Completing session:", session.id);
    handleCompleteSession();
  };

  return (
    <>
      <Button variant="destructive" onClick={() => setShowNoShowDialog(true)}>
        Mark as No-Show
      </Button>

      <AlertDialog open={showNoShowDialog} onOpenChange={setShowNoShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as No-Show</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this session as a no-show?
              {session.patient?.noShowFee ? (
                <p className="mt-2">
                  Would you like to invoice the client for the no-show fee of ${session.patient.noShowFee}?
                </p>
              ) : (
                <p className="mt-2 text-muted-foreground">
                  No no-show fee is set for this client.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {session.patient?.noShowFee ? (
              <>
                <AlertDialogAction onClick={() => handleNoShow(true)}>
                  Yes, Invoice No-Show Fee
                </AlertDialogAction>
                <AlertDialogAction onClick={() => handleNoShow(false)}>
                  No, Just Mark as No-Show
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction onClick={() => handleNoShow(false)}>
                Mark as No-Show
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" aria-label="More options">
          <span className="sr-only">Open menu</span>
          <EllipsisVerticalIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => window.location.href = `/calendar?date=${format(new Date(session.date), 'yyyy-MM-dd')}`}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span>Reschedule</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleComplete}>
          <CheckCircleIcon className="mr-2 h-4 w-4" />
          <span>Complete Session</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setShowNotes(true)}>
          <DocumentTextIcon className="mr-2 h-4 w-4" />
          <span>Add Note</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setShowInvoice(true)}>
          <ReceiptPercentIcon className="mr-2 h-4 w-4" />
          <span>Invoice Client</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setShowNoShowDialog(true)}>
          <XCircleIcon className="mr-2 h-4 w-4" />
          <span>No-show</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}