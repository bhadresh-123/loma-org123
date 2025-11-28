import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Button } from "@/components/ui/button";
import { useToast } from "@/contexts/ToastContext";
import type { Client, Session, CalendarBlock, Meeting, MeetingType } from "@/types/schema";
import TimezoneAwareSessionCalendar from "@/components/TimezoneAwareSessionCalendar";
import AddEventDialog from "@/components/AddEventDialog";
import CalendarLegend from "@/components/CalendarLegend";

import { parseISO, format, isBefore, addWeeks, addMonths, isValid, areIntervalsOverlapping } from "@/utils/dateFnsCompat";

export default function Calendar() {
  // Parse the date from URL query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const dateParam = searchParams.get('date');
  // Simply parse the date string directly
  const initialDate = dateParam ? parseISO(dateParam) : new Date();
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (dateParam) {
      const parsedDate = parseISO(dateParam);
      if (isValid(parsedDate)) {
        setSelectedDateTime(parsedDate);
        setDialogOpen(true);
      }
    }
  }, [dateParam]);

  const { data: clientsData = [], isLoading: loadingClients, error: clientError, refetch: refetchClients } = useQuery<Client[]>({
    queryKey: ["/api/patients"],
    staleTime: 30000,
    retry: (failureCount, error: unknown) => {
      if (error?.message?.includes("Not authenticated")) {
        return false;
      }
      return failureCount < 3;
    },
    onError: (error: unknown) => {
      console.error('Failed to fetch clients:', error);
      if (!error?.message?.includes("Not authenticated")) {
        toast({
          title: "Error",
          description: "Failed to load client list. Please try again.",
          variant: "destructive",
        });
      }
    },
    // Always return empty array on error to prevent production crashes
    queryFn: async () => {
      try {
        const response = await fetch("/api/patients", {
          credentials: "include",
        });
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Not authenticated");
          }
          throw new Error("Failed to fetch patients");
        }
        const data = await response.json();
        // Handle HIPAA response format
        const patients = data.success ? data.data : data;
        return Array.isArray(patients) ? patients : [];
      } catch (error) {
        console.error('Calendar clients fetch error:', error);
        return []; // Always return empty array on error
      }
    }
  });

  // Ensure clients is always an array
  const clients = Array.isArray(clientsData) ? clientsData : [];

  const { data: sessionsData = [], isLoading: loadingSessions } = useQuery<Session[]>({
    queryKey: ["/api/clinical-sessions"],
    staleTime: 30000,
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
        console.error('Calendar sessions fetch error:', error);
        return []; // Always return empty array on error
      }
    }
  });

  const { data: calendarBlocksData = [], isLoading: loadingBlocks } = useQuery<CalendarBlock[]>({
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

  const { data: meetingsData = [], isLoading: loadingMeetings } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
    staleTime: 30000,
    queryFn: async () => {
      try {
        const response = await fetch("/api/meetings", {
          credentials: "include",
        });
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Not authenticated");
          }
          throw new Error("Failed to fetch meetings");
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.warn('Meetings API not available, using empty meetings');
        return []; // Return empty array when API is not available
      }
    },
    onError: (error: unknown) => {
      console.warn('Meetings not available:', error);
    }
  });

  const { data: meetingTypesData = [] } = useQuery({
    queryKey: ["/api/meetings/types"],
    staleTime: 30000,
    queryFn: async () => {
      try {
        const response = await fetch("/api/meetings/types", {
          credentials: "include",
        });
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Not authenticated");
          }
          throw new Error("Failed to fetch meeting types");
        }
        return response.json();
      } catch (error) {
        console.warn('Meeting types API not available');
        return [];
      }
    }
  });

  // Ensure all data is always an array, even if cache is corrupted with HIPAA response format
  const sessions = Array.isArray(sessionsData) ? sessionsData : (sessionsData?.data || []);
  const calendarBlocks = Array.isArray(calendarBlocksData) ? calendarBlocksData : [];
  const meetings = Array.isArray(meetingsData) ? meetingsData : [];
  const meetingTypes = Array.isArray(meetingTypesData) ? meetingTypesData : [];

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

  const handleRetryClientLoad = () => {
    refetchClients();
  };

  const handleAddSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    let sessionDateTime: Date | null = selectedDateTime;

    try {
      if (!sessionDateTime) {
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

        if (isBefore(parsedDate, new Date())) {
          throw new Error('Cannot schedule sessions in the past');
        }

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
        sessionDateTime = parsedDate;

        if (isBefore(sessionDateTime, new Date())) {
          throw new Error('Cannot schedule sessions in the past');
        }
      }

      if (!sessionDateTime) {
        throw new Error('Failed to create valid session date/time');
      }

      if (!data.patientId) {
        throw new Error('Please select a client');
      }

      if (!data.duration) {
        throw new Error('Please select session duration');
      }

      const recurrence = data.recurrence as string;
      const occurrences = recurrence === 'none' ? 1 : parseInt(data.occurrences as string) || 1;

      const sessions: unknown[] = []; // Initialize sessions array
      for (let i = 0; i < occurrences; i++) {
        const sessionDate = sessionDateTime;
        const sessionStartDate = sessionDate.toISOString();
        // Added necessary variables and corrected the logic
        const client = clients.find((c) => c.id === parseInt(data.patientId as string));
        if (!client) {
          throw new Error("Client not found");
        }

        sessions.push({
          patientId: parseInt(data.patientId as string),
          date: sessionStartDate,
          duration: parseInt(data.duration as string),
          status: 'scheduled',
          type: data.type as string,
        });
        if (recurrence !== 'none') {
          if (recurrence === 'weekly') {
            sessionDateTime = addWeeks(sessionDateTime, 1);
          } else if (recurrence === 'monthly') {
            sessionDateTime = addMonths(sessionDateTime, 1);
          }
        }
      }

      await addSessionMutation.mutateAsync(sessions);

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
    // Check for time slot conflicts first
    const hasConflict = checkTimeSlotConflicts(date);
    
    if (hasConflict) {
      toast({
        title: "Scheduling Conflict",
        description: "This time slot conflicts with an existing session or meeting",
        variant: "destructive",
      });
      return;
    }
    
    if (isRescheduling && sessionToReschedule) {
      // Handle session rescheduling
      rescheduleSession(sessionToReschedule.id, date);
    } else {
      // Regular time slot click opens the add event dialog
      setSelectedDateTime(date);
      setDialogOpen(true);
    }
  };
  
  // Check for conflicting events with this time slot
  const checkTimeSlotConflicts = (selectedDateTime: Date, duration: number = 60) => {
    const selectedStart = new Date(selectedDateTime);
    const selectedEnd = new Date(selectedDateTime);
    selectedEnd.setMinutes(selectedEnd.getMinutes() + duration);
    
    // If we're rescheduling, exclude the session being rescheduled
    const hasSessionConflict = sessions.some(session => {
      if (sessionToReschedule && session.id === sessionToReschedule.id) return false;
      
      const sessionStart = new Date(session.date);
      const sessionEnd = new Date(sessionStart);
      sessionEnd.setMinutes(sessionEnd.getMinutes() + (session.duration || 60));
      
      return areIntervalsOverlapping(
        { start: selectedStart, end: selectedEnd },
        { start: sessionStart, end: sessionEnd }
      );
    });
    
    const hasMeetingConflict = meetings.some(meeting => {
      const meetingStart = new Date(meeting.date);
      const meetingEnd = new Date(meetingStart);
      meetingEnd.setMinutes(meetingEnd.getMinutes() + (meeting.duration || 60));
      
      return areIntervalsOverlapping(
        { start: selectedStart, end: selectedEnd },
        { start: meetingStart, end: meetingEnd }
      );
    });
    
    return hasSessionConflict || hasMeetingConflict;
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedDateTime(null);
  };

  const [isRescheduling, setIsRescheduling] = useState(false);
  const [sessionToReschedule, setSessionToReschedule] = useState<Session | null>(null);

  const handleSessionAction = (session: Session, action?: string) => {
    if (action === 'reschedule') {
      // Enable rescheduling mode
      setIsRescheduling(true);
      setSessionToReschedule(session);
      
      toast({
        title: "Reschedule Mode",
        description: "Click on a new time slot to reschedule this session",
      });
    } else if (action) {
      // For other actions specified, redirect to the session details page
      window.location.href = `/sessions/${session.id}?action=${action}`;
    } else {
      // Default case when no action is specified (e.g., when clicking on a session directly)
      window.location.href = `/sessions/${session.id}`;
    }
  };
  
  // Mutation for rescheduling with optimistic updates
  const rescheduleMutation = useMutation({
    mutationFn: async ({ sessionId, newDate }: { sessionId: number; newDate: Date }) => {
      const response = await fetch(`/api/clinical-sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date: newDate.toISOString() })
      });
      
      if (!response.ok) {
        throw new Error('Failed to reschedule session');
      }
      
      return response.json();
    },
    onMutate: async ({ sessionId, newDate }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/clinical-sessions'] });
      
      // Snapshot the previous value
      const previousSessions = queryClient.getQueryData(['/api/clinical-sessions']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['/api/clinical-sessions'], (old: any) => {
        if (!old) return old;
        
        // The queryFn always normalizes to a plain array, so cache should always be an array
        // However, handle edge cases where cache might be corrupted
        let sessionsArray: any[];
        if (Array.isArray(old)) {
          sessionsArray = old;
        } else if (old.data && Array.isArray(old.data)) {
          // Cache was corrupted with HIPAA format, extract the array
          sessionsArray = old.data;
        } else {
          // Unknown format, return as-is to avoid breaking
          console.error('Unexpected cache format for sessions:', old);
          return old;
        }
        
        // Update the session and ALWAYS return as plain array (matching queryFn format)
        return sessionsArray.map((session: any) => 
          session.id === sessionId 
            ? { ...session, date: newDate.toISOString() }
            : session
        );
      });
      
      // Return a context object with the snapshotted value
      return { previousSessions };
    },
    onError: (error, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousSessions) {
        queryClient.setQueryData(['/api/clinical-sessions'], context.previousSessions);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to reschedule session",
        variant: "destructive"
      });
    },
    onSuccess: async () => {
      // Refetch to ensure we have the latest data from the server
      await queryClient.invalidateQueries({ queryKey: ['/api/clinical-sessions'] });
      
      toast({
        title: "Success",
        description: "Session rescheduled successfully",
      });
      
      // Reset rescheduling state
      setIsRescheduling(false);
      setSessionToReschedule(null);
    }
  });
  
  // Function to update a session with a new date/time
  const rescheduleSession = (sessionId: number, newDate: Date) => {
    rescheduleMutation.mutate({ sessionId, newDate });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Calendar</h1>
          {isRescheduling && sessionToReschedule && (
            <div className="flex items-center mt-2 bg-amber-50 border border-amber-200 p-2 rounded-md">
              <p className="text-sm text-amber-700">
                Rescheduling session • Click on a time slot to move this session
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                onClick={() => {
                  setIsRescheduling(false);
                  setSessionToReschedule(null);
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
        {!isRescheduling ? (
          <Button onClick={() => setDialogOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        ) : null}
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
        meetingTypes={meetingTypes}
        onSelectTimeSlot={handleTimeSlotClick}
        onSessionClick={handleSessionAction}
        calendarBlocks={calendarBlocks}
        initialDate={initialDate}
        initialView={dateParam ? 'day' : 'week'}
      />

      <AddEventDialog
        selectedDateTime={selectedDateTime}
        open={dialogOpen}
        onOpenChange={handleDialogClose}
      />
    </div>
  );
}