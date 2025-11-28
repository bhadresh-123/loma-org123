import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isToday, isAfter, isBefore, startOfDay, endOfDay, formatLocalDate, formatLocalTime } from "@/utils/dateFnsCompat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { CalendarIcon, ClockIcon, DocumentTextIcon, XCircleIcon, PlusIcon, CheckCircleIcon, ReceiptPercentIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import AddEventDialog from "@/components/AddEventDialog";
import type { Session } from "@/types/schema";
import SessionNotes from "@/components/SessionNotes";
import { InvoicePreviewModal } from "@/components/InvoicePreviewModal";
import { useToast } from "@/contexts/ToastContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


interface SessionWithClient extends Session {
  client?: {
    id: number;
    name: string;
    noShowFee: string | null;
    sessionCost: string | null;
    email: string | null;
    photo?: string | null;
    photoFilename?: string | null;
    age?: number | null;
    gender?: string | null;
    pronouns?: string | null;
    occupation?: string | null;
    race?: string | null;
    ethnicity?: string | null;
    city?: string | null;
    state?: string | null;
    hometown?: string | null;
  };
  isPaid?: boolean;
  type?: string;
}

interface UpdateSessionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export default function Sessions() {
  const [open, setOpen] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionWithClient | null>(null);
  const [selectedAction, setSelectedAction] = useState<"notes" | "invoice" | "reschedule" | "no-show" | "complete" | null>(null);
  const [showNoShowDialog, setShowNoShowDialog] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [noShowWithInvoice, setNoShowWithInvoice] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sessionsData = [], isLoading } = useQuery<SessionWithClient[]>({
    queryKey: ["/api/clinical-sessions"],
    staleTime: 30000,
    retry: (failureCount, error: unknown) => {
      if (error?.message?.includes("Not authenticated")) {
        return false;
      }
      return failureCount < 3;
    },
    onError: (error: unknown) => {
      console.error('Failed to fetch sessions:', error);
      if (!error?.message?.includes("Not authenticated")) {
        toast({
          title: "Error",
          description: "Failed to load sessions. Please try again.",
          variant: "destructive",
        });
      }
    },
    // Always return empty array on error to prevent production crashes
    queryFn: async () => {
      try {
        const response = await fetch("/api/clinical-sessions", {
          credentials: "include",
        });
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Not authenticated");
          }
          throw new Error("Failed to fetch clinical sessions");
        }
        const data = await response.json();
        // Handle HIPAA response format
        const sessions = data.success ? data.data : data;
        return Array.isArray(sessions) ? sessions : [];
      } catch (error) {
        console.error('Sessions fetch error:', error);
        return []; // Always return empty array on error
      }
    },
    refetchOnWindowFocus: true,
  });

  // Ensure sessions is always an array, even if cache is corrupted
  const sessions = Array.isArray(sessionsData) ? sessionsData : (sessionsData?.data || []);

  const handleSessionAction = (session: SessionWithClient, action: "notes" | "invoice" | "no-show" | "reschedule" | "complete") => {
    if (action === "reschedule") {
      // Navigate to Scheduling page with session ID for rescheduling
      window.location.href = `/scheduling?reschedule=${session.id}`;
      return;
    }

    setSelectedSession(session);
    setSelectedAction(action);

    if (action === "notes") {
      // No additional action required - notes dialog is shown based on state
    } else if (action === "reschedule") {
      // Implementation for reschedule action
    } else if (action === "complete") {
      // Call the status update API directly
      updateSession(session.id, "completed")
        .then(() => {
          toast({
            title: "Session completed",
            description: "The session has been marked as completed.",
            variant: "success",
          });
          // Refresh sessions data
          queryClient.invalidateQueries({ queryKey: ["/api/clinical-sessions"] });
        })
        .catch((error) => {
          console.error("Failed to complete session:", error);
          toast({
            title: "Failed to complete session",
            description: "An error occurred while completing the session.",
            variant: "destructive",
          });
        });
    } else if (action === "no-show") {
      setShowNoShowDialog(true);
    } else if (action === "invoice") {
      setShowInvoicePreview(true);
    }
  };

  const handleNoShowInitialConfirm = async (shouldInvoice: boolean) => {
    setNoShowWithInvoice(shouldInvoice);
    if (shouldInvoice && selectedSession?.client?.id) {
      setShowNoShowDialog(false);
      setShowInvoicePreview(true);
    } else {
      await handleNoShow(false);
    }
  };

  const handleNoShow = async (shouldInvoice: boolean) => {
    if (!selectedSession) return;

    await updateSessionMutation.mutateAsync({
      sessionId: selectedSession.id,
      action: "no-show",
      shouldInvoice
    });
  };

  const handleReschedule = async (newDate: Date) => {
    if (!selectedSession) return;

    await updateSessionMutation.mutateAsync({
      sessionId: selectedSession.id,
      action: "reschedule",
      newDate: newDate,
    });
  };

  const handleNotesSubmit = async (notes: string) => {
    if (!selectedSession) return;

    await updateSessionMutation.mutateAsync({
      sessionId: selectedSession.id,
      action: "notes",
      notes
    });
  };

  const updateSessionMutation = useMutation({
    mutationFn: async ({ sessionId, action, notes, shouldInvoice, newDate }: {
      sessionId: number;
      action: string;
      notes?: string;
      shouldInvoice?: boolean;
      newDate?: Date;
    }): Promise<UpdateSessionResponse> => {
      try {
        const response = await fetch(`/api/clinical-sessions/${sessionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            notes,
            status: action === 'no-show' ? 'no_show' : 'scheduled',
            date: newDate?.toISOString(),
            invoice: action === 'invoice' || (action === 'no-show' && shouldInvoice) ? {
              amount: selectedSession?.client?.sessionCost || "150.00",
              description: `Therapy Session on ${selectedSession ? formatLocalDate(selectedSession.date) : new Date().toLocaleDateString()}`
            } : undefined,
            shouldInvoice
          }),
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update session');
        }

        const data = await response.json();
        return {
          success: true,
          data
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to update session"
        };
      }
    },
    onSuccess: (result, variables) => {
      if (!result.success) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/clinical-sessions"] });

      let message = "";
      switch (variables.action) {
        case "no-show":
          message = variables.shouldInvoice
            ? "Session marked as no-show and invoice generated"
            : "Session marked as no-show";
          break;
        case "invoice":
          message = "Invoice generated and sent to client";
          break;
        case "notes":
          message = "Session notes updated successfully";
          break;
        case "reschedule":
          message = "Session rescheduled successfully";
          break;
        case "complete":
          message = "Session completed successfully";
          break;
      }

      toast({
        title: "Success",
        description: message,
      });

      setSelectedSession(null);
      setSelectedAction(null);
      setShowNoShowDialog(false);
      setShowInvoicePreview(false);
      setNoShowWithInvoice(false);
    },
    onError: (error) => {
      console.error('Session update error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  const getClientDescription = (client?: SessionWithClient['client']) => {
    if (!client) return null;

    const parts = [];
    if (client.age) parts.push(`${client.age} year old`);
    if (client.race?.toLowerCase()) parts.push(client.race.toLowerCase());

    let gender = 'male';
    if (client.pronouns) {
      if (client.pronouns.toLowerCase().includes('she') || client.pronouns.toLowerCase().includes('her')) {
        gender = 'female';
      }
    }
    parts.push(gender);

    if (client.hometown) parts.push(`from ${client.hometown}`);

    return parts.length > 0 ? parts.join(' ') : null;
  };

  // Helper function to update session status
  const updateSession = async (sessionId: number, status: string) => {
    const response = await fetch(`/api/clinical-sessions/${sessionId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Session status update failed:", errorText);
      throw new Error(errorText);
    }

    return response.json();
  };

  useEffect(() => {
    // Set the date from URL if present
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');
    const sessionIdParam = params.get('sessionId');
    const actionParam = params.get('action');

    if (dateParam) {
      setSelectedDateTime(new Date(dateParam));
    }

    // If sessionId and action are provided, handle the action
    if (sessionIdParam && actionParam) {
      const sessionId = parseInt(sessionIdParam);
      const session = sessions.find(s => s.id === sessionId);
      if (session && actionParam === "notes") {
        handleSessionAction(session, actionParam);
      }
    }
  }, [window.location.search, sessions]);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Sessions</h1>
          <p className="text-muted-foreground mt-1">Manage your therapy sessions and client interactions</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Schedule Session
        </Button>
      </div>

      <AddEventDialog
        selectedDateTime={selectedDateTime}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      {selectedSession && selectedAction === "notes" && (
        <SessionNotes
          session={selectedSession}
          open={!!selectedSession}
          onClose={() => {
            setSelectedSession(null);
            setSelectedAction(null);
          }}
          onSubmit={handleNotesSubmit}
        />
      )}

      {selectedSession && showInvoicePreview && (
        <InvoicePreviewModal
          open={showInvoicePreview}
          onOpenChange={(open) => {
            setShowInvoicePreview(open);
            if (!open) {
              setSelectedSession(null);
              setSelectedAction(null);
              setNoShowWithInvoice(false);
            }
          }}
          sessionId={selectedSession.id}
          patientId={selectedSession.client?.id || 0}
          isNoShow={noShowWithInvoice}
        />
      )}


      <AlertDialog open={showNoShowDialog} onOpenChange={setShowNoShowDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as No-Show</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to mark this session as a no-show?</p>
              {selectedSession?.client?.noShowFee && (
                <p>Invoice no-show fee of ${selectedSession.client.noShowFee}?</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="sm:w-auto w-full">Cancel</AlertDialogCancel>
            {selectedSession?.client?.noShowFee ? (
              <>
                <AlertDialogAction
                  className="sm:w-auto w-full"
                  onClick={() => handleNoShowInitialConfirm(true)}
                >
                  Invoice Fee
                </AlertDialogAction>
                <Button
                  className="sm:w-auto w-full"
                  variant="secondary"
                  onClick={() => handleNoShowInitialConfirm(false)}
                >
                  Skip Fee
                </Button>
              </>
            ) : (
              <AlertDialogAction
                className="sm:w-auto w-full"
                onClick={() => handleNoShowInitialConfirm(false)}
              >
                Confirm
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse bg-muted rounded-lg" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="today">
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>
          <TabsContent value="today">
            <div className="space-y-4">
              {sessions.filter(session => isToday(new Date(session.date))).length > 0 ? (
                sessions
                  .filter(session => isToday(new Date(session.date)))
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map(session => (
                    <div key={session.id} className="border rounded-lg overflow-hidden">
                      <div className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border">
                              <AvatarFallback>{session.patient?.name.charAt(0)}</AvatarFallback>
                              {session.patient?.photoFilename && (
                                <AvatarImage
                                  src={`/api/patients/${session.patient.id}/photo`}
                                  alt={session.patient?.name}
                                />
                              )}
                            </Avatar>
                            <div>
                              <div className="font-semibold">{session.patient?.name}</div>
                              <div className="flex items-center flex-wrap gap-2 mt-1">
                                <Badge variant="outline">{session.type}</Badge>
                                {session.notes && (
                                  <Badge variant="secondary" className="gap-1">
                                    <CheckCircleIcon className="h-3 w-3" />
                                    Note Added
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                  <ClockIcon className="h-4 w-4 flex-shrink-0" />
                                  <span>{formatLocalTime(session.date)}</span>
                                </div>
                                <div className="flex items-center whitespace-nowrap">
                                  <span>({session.duration} min)</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="hidden sm:flex"
                                  onClick={() => handleSessionAction(session, "notes")}
                                >
                                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                                  Add Note
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <EllipsisVerticalIcon className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleSessionAction(session, "reschedule")}>
                                      <CalendarIcon className="h-4 w-4 mr-2" />
                                      Reschedule
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSessionAction(session, "complete")}>
                                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                                      Complete Session
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSessionAction(session, "notes")}>
                                      <DocumentTextIcon className="h-4 w-4 mr-2" />
                                      Add Note
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSessionAction(session, "invoice")}>
                                      <ReceiptPercentIcon className="h-4 w-4 mr-2" />
                                      Invoice Client
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSessionAction(session, "no-show")}>
                                      <XCircleIcon className="h-4 w-4 mr-2" />
                                      No-show
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No sessions scheduled for today
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upcoming">
            <div className="space-y-4">
              {sessions.filter(session => {
                const sessionDate = new Date(session.date);
                return isAfter(sessionDate, startOfDay(new Date())) && !isToday(sessionDate);
              }).length > 0 ? (
                Object.entries(
                  sessions
                    .filter(session => {
                      const sessionDate = new Date(session.date);
                      return isAfter(sessionDate, startOfDay(new Date())) && !isToday(sessionDate);
                    })
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .reduce((acc, session) => {
                      const dateKey = format(new Date(session.date), 'yyyy-MM-dd');
                      if (!acc[dateKey]) {
                        acc[dateKey] = [];
                      }
                      acc[dateKey].push(session);
                      return acc;
                    }, {} as Record<string, typeof sessions>)
                ).map(([dateKey, dateSessions]) => {
                  const dateKeyDate = new Date(dateKey);
                  const isDateToday = isToday(dateKeyDate);
                  return (
                  <div key={dateKey} className="space-y-2">
                    <h3 className="text-lg font-semibold pt-4 pb-2">
                      {isDateToday ? 'Today' : formatLocalDate(dateKey, 'PPPP')}
                    </h3>
                    {dateSessions.map(session => (
                      <div key={session.id} className="border rounded-lg overflow-hidden">
                        <div className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border">
                              <AvatarFallback>{session.patient?.name.charAt(0)}</AvatarFallback>
                              {session.patient?.photoFilename && (
                                <AvatarImage
                                  src={`/api/patients/${session.patient.id}/photo`}
                                  alt={session.patient?.name}
                                />
                              )}
                            </Avatar>
                            <div>
                              <div className="font-semibold">{session.patient?.name}</div>
                              <div className="flex items-center flex-wrap gap-2 mt-1">
                                <Badge variant="outline">{session.type}</Badge>
                                {session.notes && (
                                  <Badge variant="secondary" className="gap-1">
                                    <CheckCircleIcon className="h-3 w-3" />
                                    Note Added
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                  <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                                  <span>{formatLocalDate(session.date)}</span>
                                </div>
                                <div className="flex items-center whitespace-nowrap">
                                  <ClockIcon className="h-4 w-4 flex-shrink-0" />
                                  <span>{formatLocalTime(session.date)}</span>
                                </div>
                                <div className="flex items-center whitespace-nowrap">
                                  <span>({session.duration} min)</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="hidden sm:flex"
                                  onClick={() => handleSessionAction(session, "notes")}
                                >
                                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                                  Add Note
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <EllipsisVerticalIcon className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleSessionAction(session, "reschedule")}>
                                      <CalendarIcon className="h-4 w-4 mr-2" />
                                      Reschedule
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSessionAction(session, "complete")}>
                                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                                      Complete Session
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSessionAction(session, "notes")}>
                                      <DocumentTextIcon className="h-4 w-4 mr-2" />
                                      Add Note
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSessionAction(session, "invoice")}>
                                      <ReceiptPercentIcon className="h-4 w-4 mr-2" />
                                      Invoice Client
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSessionAction(session, "no-show")}>
                                      <XCircleIcon className="h-4 w-4 mr-2" />
                                      No-show
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No upcoming sessions scheduled
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="past">
            <div className="space-y-4">
              {sessions.filter(session => {
                const sessionDate = new Date(session.date);
                return isBefore(sessionDate, startOfDay(new Date())) || session.status === 'completed' || session.status === 'no_show';
              }).length > 0 ? (
                sessions
                  .filter(session => {
                    const sessionDate = new Date(session.date);
                    return isBefore(sessionDate, startOfDay(new Date())) || session.status === 'completed' || session.status === 'no_show';
                  })
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(session => (
                    <div key={session.id} className="border rounded-lg overflow-hidden">
                      <div className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border">
                              <AvatarFallback>{session.patient?.name.charAt(0)}</AvatarFallback>
                              {session.patient?.photoFilename && (
                                <AvatarImage
                                  src={`/api/patients/${session.patient.id}/photo`}
                                  alt={session.patient?.name}
                                />
                              )}
                            </Avatar>
                            <div>
                              <div className="font-semibold">{session.patient?.name}</div>
                              <div className="flex items-center flex-wrap gap-2 mt-1">
                                <Badge variant="outline">{session.type}</Badge>
                                <Badge variant={session.status === 'no_show' ? 'destructive' : 'default'}>
                                  {session.status === 'no_show' ? 'No-show' : 'Completed'}
                                </Badge>
                                {session.notes && (
                                  <Badge variant="secondary" className="gap-1">
                                    <CheckCircleIcon className="h-3 w-3" />
                                    Note Added
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                  <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                                  <span>{formatLocalDate(session.date)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="hidden sm:flex"
                                  onClick={() => handleSessionAction(session, "notes")}
                                >
                                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                                  {session.notes ? "Edit Note" : "Add Note"}
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <EllipsisVerticalIcon className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleSessionAction(session, "notes")}>
                                      <DocumentTextIcon className="h-4 w-4 mr-2" />
                                      {session.notes ? "Edit Note" : "Add Note"}
                                    </DropdownMenuItem>
                                    {!session.isPaid && (
                                      <DropdownMenuItem onClick={() => handleSessionAction(session, "invoice")}>
                                        <ReceiptPercentIcon className="h-4 w-4 mr-2" />
                                        Invoice Client
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No past sessions found
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}