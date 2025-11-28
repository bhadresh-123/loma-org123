import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Button } from "@/components/ui/button";
import { useToast } from "@/contexts/ToastContext";
import type { Client, Session, CalendarBlock, Meeting } from "@/types/schema";
import TimezoneAwareSessionCalendar from "@/components/TimezoneAwareSessionCalendar";
import AddEventDialog from "@/components/AddEventDialog";
import CalendarLegend from "@/components/CalendarLegend";
import { format, addWeeks, addMonths, parseISO, isValid, isBefore, startOfDay } from "@/utils/dateFnsCompat";

export default function Scheduling() {
  const searchParams = new URLSearchParams(window.location.search);
  const dateParam = searchParams.get('date');
  const rescheduleSessionId = searchParams.get('reschedule');
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [sessionToReschedule, setSessionToReschedule] = useState<Session | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/patients"],
    staleTime: 30000,
  });

  const { data: sessionsData = [] } = useQuery<Session[]>({
    queryKey: ["/api/clinical-sessions"],
    staleTime: 30000,
    queryFn: async () => {
      const response = await fetch("/api/clinical-sessions", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch clinical sessions");
      }
      const data = await response.json();
      // Handle HIPAA response format
      const sessions = data.success ? data.data : data;
      return Array.isArray(sessions) ? sessions : [];
    },
  });

  // Ensure sessions is always an array, even if cache is corrupted
  const sessions = Array.isArray(sessionsData) ? sessionsData : (sessionsData?.data || []);

  const { data: calendarBlocks = [] } = useQuery<CalendarBlock[]>({
    queryKey: ["/api/calendar/blocks"],
    staleTime: 30000,
    queryFn: async () => {
      try {
        const response = await fetch("/api/calendar/blocks", {
          credentials: "include",
        });
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Not authenticated");
          }
          throw new Error("Failed to fetch calendar blocks");
        }
        const data = await response.json();
        // Handle API response format: { success: true, data: [...] }
        const blocks = data.success ? data.data : data;
        return Array.isArray(blocks) ? blocks : [];
      } catch (error) {
        console.warn('Calendar blocks API not available, using empty blocks');
        return []; // Return empty array when API is not available
      }
    },
    onError: (error: unknown) => {
      console.warn('Calendar blocks not available:', error);
    }
  });

  const { data: meetings = [] } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
    staleTime: 30000,
  });

  const addSessionMutation = useMutation({
    mutationFn: async (sessions: unknown[]) => {
      const responses = await Promise.all(
        sessions.map(session =>
          fetch("/api/clinical-sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(session),
            credentials: "include",
          })
        )
      );

      const failedResponse = responses.find(res => !res.ok);
      if (failedResponse) {
        const errorText = await failedResponse.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || 'Failed to schedule session');
        } catch {
          throw new Error(errorText || 'Failed to schedule session');
        }
      }

      return await Promise.all(responses.map(res => res.json()));
    },
    onSuccess: async () => {
      // Invalidate and explicitly refetch to ensure fresh data is loaded
      await queryClient.invalidateQueries({ queryKey: ["/api/clinical-sessions"] });
      // Explicitly refetch to avoid race conditions with database commits
      await queryClient.refetchQueries({ queryKey: ["/api/clinical-sessions"] });
      toast({
        title: "Success",
        description: "Sessions scheduled successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule sessions",
        variant: "destructive",
      });
    },
  });



  const handleAddSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      // Parse and validate base session date/time
      let baseDateTime: Date;

      if (selectedDateTime) {
        baseDateTime = selectedDateTime;
      } else {
        const date = data.date as string;
        const hour = parseInt(data.hour as string);
        const minute = parseInt(data.minute as string);
        const period = data.period as string;

        if (!date || isNaN(hour) || isNaN(minute)) {
          throw new Error('Please fill in all date and time fields');
        }

        const parsedDate = parseISO(date);
        if (!isValid(parsedDate)) {
          throw new Error('Invalid date format');
        }

        // Convert to 24-hour format
        let hour24 = hour;
        if (period === 'PM' && hour !== 12) {
          hour24 += 12;
        } else if (period === 'AM' && hour === 12) {
          hour24 = 0;
        }

        if (hour24 < 0 || hour24 > 23) {
          throw new Error('Invalid hour');
        }

        if (minute < 0 || minute > 59) {
          throw new Error('Invalid minutes');
        }

        parsedDate.setHours(hour24, minute, 0, 0);
        baseDateTime = parsedDate;
      }

      if (isBefore(startOfDay(baseDateTime), startOfDay(new Date()))) {
        throw new Error('Cannot schedule sessions in the past');
      }

      // Validate required fields
      if (!data.patientId) {
        throw new Error('Please select a client');
      }

      if (!data.duration) {
        throw new Error('Please select session duration');
      }


      const session = {
        patientId: parseInt(data.patientId as string),
        date: baseDateTime.toISOString(),
        duration: parseInt(data.duration as string),
        status: 'scheduled',
        type: data.type as string
      };

      await addSessionMutation.mutateAsync([session]);
      setDialogOpen(false);
      setSelectedDateTime(null);

    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule session",
        variant: "destructive",
      });
      return;
    }
  };

  const handleTimeSlotClick = (date: Date) => {
    if (isRescheduling) {
      handleReschedule(date);
    } else {
      setSelectedDateTime(date);
      setDialogOpen(true);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedDateTime(null);
  };

  // Find the session to reschedule if rescheduleSessionId is provided
  useEffect(() => {
    if (rescheduleSessionId && sessions.length > 0) {
      const sessionId = parseInt(rescheduleSessionId);
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        // Find the associated client if available
        const client = clients.find(c => c.id === session.patientId);
        const clientName = client?.name || 'client';
        
        // Set the session with manually attached client if needed
        setSessionToReschedule({
          ...session,
          client: client || undefined
        });
        setIsRescheduling(true);
        
        // Use toast to indicate rescheduling mode
        toast({
          title: "Rescheduling Session",
          description: `Select a new time slot for the session with ${clientName}`,
          duration: 5000,
        });
      }
    }
  }, [rescheduleSessionId, sessions, clients]);

  const initialDate = dateParam ? new Date(dateParam) : new Date();

  // Handle rescheduling a session
  const handleReschedule = async (date: Date) => {
    if (!sessionToReschedule) return;
    
    try {
      // Use the correct API endpoint format - use PUT endpoint instead of POST /update
      const response = await fetch(`/api/clinical-sessions/${sessionToReschedule.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: date.toISOString(),
        }),
      });

      if (!response.ok) {
        console.error('Failed to reschedule session:', await response.json());
        throw new Error("Failed to reschedule session");
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/clinical-sessions"] });
      await queryClient.refetchQueries({ queryKey: ["/api/clinical-sessions"] });
      
      // Show success toast
      toast({
        title: "Success",
        description: "Session rescheduled successfully",
      });
      
      // Clear rescheduling state and redirect back to sessions after a short delay
      // This ensures the toast is visible before redirect
      setIsRescheduling(false);
      setSessionToReschedule(null);
      
      setTimeout(() => {
        window.location.href = "/sessions";
      }, 1500); // 1.5 second delay to show the toast
      
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error.message || "Failed to reschedule session",
        variant: "destructive",
      });
    }
  };

  // The main handleTimeSlotClick is defined below, we'll just update it to handle rescheduling

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Calendar</h1>
          {isRescheduling && sessionToReschedule && (
            <p className="text-sm text-muted-foreground">
              Rescheduling session with {sessionToReschedule.client?.name || 'client'} • Click on a time slot to reschedule
            </p>
          )}
        </div>
        {!isRescheduling ? (
          <Button onClick={() => setDialogOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        ) : (
          <Button variant="outline" onClick={() => window.location.href = "/sessions"}>
            Cancel
          </Button>
        )}
      </div>

      <div className="flex items-center justify-end">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Scheduled</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-300 rounded"></div>
            <span>Available</span>
          </div>
        </div>
      </div>

      <TimezoneAwareSessionCalendar
        sessions={sessions}
        meetings={meetings}
        onSelectTimeSlot={handleTimeSlotClick}
        onSessionClick={(session) => {
          // In scheduling view, clicking a session will take you to session details
          window.location.href = `/sessions/${session.id}`;
        }}
        calendarBlocks={calendarBlocks}
        initialDate={initialDate}
        initialView="day"
      />

      <AddEventDialog
        selectedDateTime={selectedDateTime}
        open={dialogOpen}
        onOpenChange={handleDialogClose}
      />
    </div>
  );
}