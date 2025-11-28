import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, CheckIcon, ChevronUpDownIcon, PlusIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";
import type { Client, Session, CalendarBlock, Meeting, MeetingType } from "@/types/schema";
import { BLOCK_TYPES } from "./CalendarLegend";
import { format, parseISO, isValid, isBefore, startOfDay } from "@/utils/dateFnsCompat";
import { suggestCPTCode, type CPTCode, type CPTSuggestion } from "@/utils/cptSuggestions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTimezoneAwareDates } from "@/hooks/use-timezone-aware-dates";

const SESSION_TYPES = [
  { value: "consultation", label: "Consultation" },
  { value: "individual", label: "Individual" },
  { value: "couple", label: "Couple" },
  { value: "intake", label: "Intake" },
  { value: "assessment", label: "Assessment" },
  { value: "termination", label: "Termination" },
  { value: "group", label: "Group" },
  { value: "triage", label: "Triage" }
];



interface AddEventDialogProps {
  selectedDateTime?: Date | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function AddEventDialog({ selectedDateTime, open = false, onOpenChange }: AddEventDialogProps) {
  const [activeTab, setActiveTab] = useState("session");
  const [showNewMeetingType, setShowNewMeetingType] = useState(false);
  const [selectedCptCode, setSelectedCptCode] = useState<string>('');
  const [selectedAddOnCodes, setSelectedAddOnCodes] = useState<string[]>([]);
  const [authorizationRequired, setAuthorizationRequired] = useState(false);
  const [openCptPopover, setOpenCptPopover] = useState(false);
  const [selectedSessionType, setSelectedSessionType] = useState<string>('individual');
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<number>(50);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [cptSuggestion, setCptSuggestion] = useState<CPTSuggestion | null>(null);
  const { toast } = useToast();
  const { fromUtc, toUtc, timezone } = useTimezoneAwareDates();
  const queryClient = useQueryClient();

  // Fetch required data
  const { data: clientsData = [], isLoading: loadingClients, error: clientsError } = useQuery<Client[]>({
    queryKey: ["/api/patients"],
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
        console.error('AddEventDialog clients fetch error:', error);
        return []; // Always return empty array on error
      }
    },
  });

  // Ensure clients is always an array
  const clients = Array.isArray(clientsData) ? clientsData : [];

  const { data: meetingTypes = [] } = useQuery<MeetingType[]>({
    queryKey: ["/api/meetings/types"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/meetings/types", {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch meeting types");
        }
        return response.json();
      } catch (error) {
        console.warn('Meeting types API not available, using default types');
        // Return default meeting types
        return [
          { id: 1, name: 'Team Meeting', duration: 60 },
          { id: 2, name: 'Staff Meeting', duration: 90 },
          { id: 3, name: 'Training Session', duration: 120 },
        ];
      }
    },
  });

  // Fetch CPT codes
  const { data: cptCodes = [], isLoading: loadingCptCodes, error: cptCodesError } = useQuery({
    queryKey: ["/api/medical-codes/cpt"],
    queryFn: async () => {
      const response = await fetch("/api/medical-codes/cpt", {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch CPT codes");
      return response.json();
    },
  });

  // Fetch assessment categories  
  const { data: assessmentCategories = [], isLoading: loadingAssessments, error: assessmentsError } = useQuery({
    queryKey: ["/api/assessments/categories"],
    queryFn: async () => {
      const response = await fetch("/api/assessments/categories", {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch assessment categories");
      return response.json();
    },
  });

  // Get selected client's billing type
  const selectedClient = selectedClientId && Array.isArray(clients) ? clients.find(c => c.id.toString() === selectedClientId) : null;
  const isInsuranceBilling = selectedClient?.billingType === 'insurance';

  // Generate CPT code suggestion when session type or duration changes (only for insurance clients)
  useEffect(() => {
    if (cptCodes.length > 0 && isInsuranceBilling) {
      // For assessments, only show suggestion if assessment type is selected
      if (selectedSessionType === 'assessment' && !selectedAssessmentType) {
        setCptSuggestion(null);
        return;
      }
      
      const suggestion = suggestCPTCode(selectedSessionType, selectedDuration, cptCodes as CPTCode[], selectedAssessmentType);
      setCptSuggestion(suggestion);
      
      // Auto-apply recommendations as defaults for all session types
      if (suggestion && selectedSessionType && selectedDuration) {
        setSelectedCptCode(suggestion.code);
        if (suggestion.addOnCodes) {
          // Group add-on codes by code and count instances
          const addOnCounts: { [key: string]: number } = {};
          suggestion.addOnCodes.forEach(addOn => {
            if (addOn.code !== suggestion.code) {
              addOnCounts[addOn.code] = (addOnCounts[addOn.code] || 0) + 1;
            }
          });
          
          // Create array with repeated codes for multiple instances
          const autoSelectCodes: string[] = [];
          Object.entries(addOnCounts).forEach(([code, count]) => {
            for (let i = 0; i < count; i++) {
              autoSelectCodes.push(code);
            }
          });
          setSelectedAddOnCodes(autoSelectCodes);
        }
      }
    } else {
      // Clear CPT suggestion for non-insurance clients
      setCptSuggestion(null);
      setSelectedCptCode('');
      setSelectedAddOnCodes([]);
    }
  }, [selectedSessionType, selectedDuration, selectedAssessmentType, cptCodes.length, isInsuranceBilling]);

  // Mutations
  const createMeetingTypeMutation = useMutation({
    mutationFn: async (newType: { name: string; color: string }) => {
      const res = await fetch("/api/meetings/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newType),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings/types"] });
      setShowNewMeetingType(false);
      toast({
        title: "Success",
        description: "Meeting type created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create meeting type",
        variant: "destructive",
      });
    },
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
        const errorData = await failedResponse.json();
        console.error('Session creation failed:', errorData);
        
        let errorMessage = errorData.error || "Failed to add session";
        if (errorData.details && Array.isArray(errorData.details)) {
          const detailMessages = errorData.details.map(
            (d: any) => `${d.field}: ${d.message}`
          ).join(', ');
          errorMessage += ` - ${detailMessages}`;
        }
        
        throw new Error(errorMessage);
      }

      return await Promise.all(responses.map(res => res.json()));
    },
    onSuccess: async () => {
      // Invalidate and explicitly refetch to ensure fresh data is loaded
      await queryClient.invalidateQueries({ queryKey: ["/api/clinical-sessions"] });
      // Explicitly refetch to avoid race conditions with database commits
      await queryClient.refetchQueries({ queryKey: ["/api/clinical-sessions"] });
      handleClose();
      toast({
        title: "Success",
        description: "Session(s) scheduled successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to schedule session(s)",
        variant: "destructive",
      });
    },
  });

  const addMeetingMutation = useMutation({
    mutationFn: async (meeting: Partial<Meeting>) => {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meeting),
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Meeting creation failed:', errorData);
        
        let errorMessage = errorData.error || "Failed to schedule meeting";
        if (errorData.details && Array.isArray(errorData.details)) {
          const detailMessages = errorData.details.map(
            (d: any) => `${d.field}: ${d.message}`
          ).join(', ');
          errorMessage += ` - ${detailMessages}`;
        }
        
        throw new Error(errorMessage);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      handleClose();
      toast({
        title: "Success",
        description: "Meeting scheduled successfully",
      });
    },
    onError: (error) => {
      console.error('Meeting mutation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to schedule meeting",
        variant: "destructive",
      });
    },
  });

  const addCalendarBlockMutation = useMutation({
    mutationFn: async (block: Partial<CalendarBlock>) => {
      const res = await fetch("/api/calendar/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(block),
        credentials: "include",
      });
      
      if (!res.ok) {
        // Parse JSON error response
        const errorData = await res.json();
        console.error('Calendar block creation failed:', errorData);
        
        // Create detailed error message
        let errorMessage = errorData.error || "Failed to add calendar block";
        if (errorData.details && Array.isArray(errorData.details)) {
          const detailMessages = errorData.details.map(
            (d: any) => `${d.field}: ${d.message}`
          ).join(', ');
          errorMessage += ` - ${detailMessages}`;
        }
        
        throw new Error(errorMessage);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/blocks"] });
      handleClose();
      toast({
        title: "Success",
        description: "Calendar block added successfully",
      });
    },
    onError: (error) => {
      console.error('Calendar block mutation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add calendar block",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setShowNewMeetingType(false);
    setSelectedCptCode('');
    setSelectedAddOnCodes([]);
    setAuthorizationRequired(false);
    setOpenCptPopover(false);
    setSelectedSessionType('individual');
    setSelectedDuration(50);
    setSelectedClientId('');
    setCptSuggestion(null);
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      if (showNewMeetingType) {
        await createMeetingTypeMutation.mutateAsync({
          name: formData.get("typeName") as string,
          color: formData.get("typeColor") as string,
        });
        return;
      }

      switch (activeTab) {
        case "session": {
          let sessionDateTime = selectedDateTime;
          if (!sessionDateTime) {
            const date = formData.get("date") as string;
            const hour = parseInt(formData.get("hour") as string);
            const minute = parseInt(formData.get("minute") as string);
            const period = formData.get("period") as string;

            const parsedDate = parseISO(date);
            if (!isValid(parsedDate)) {
              throw new Error('Invalid date format');
            }

            let hour24 = hour;
            if (period === 'PM' && hour !== 12) hour24 += 12;
            else if (period === 'AM' && hour === 12) hour24 = 0;

            parsedDate.setHours(hour24, minute, 0, 0);
            sessionDateTime = parsedDate;
          }

          if (!sessionDateTime) {
            throw new Error('Invalid date/time');
          }

          if (isBefore(startOfDay(sessionDateTime), startOfDay(new Date()))) {
            throw new Error('Cannot schedule sessions in the past');
          }

          const recurrence = formData.get("recurrence") as string;
          const occurrences = recurrence === 'none' ? 1 : parseInt(formData.get("occurrences") as string);

          if (recurrence !== 'none' && (occurrences < 1 || occurrences > 52)) {
            throw new Error('Number of sessions must be between 1 and 52');
          }

          const sessions = [];
          for (let i = 0; i < occurrences; i++) {
            let currentSessionDate = new Date(sessionDateTime);
            
            if (recurrence === 'weekly') {
              currentSessionDate.setDate(sessionDateTime.getDate() + (i * 7));
            } else if (recurrence === 'biweekly') {
              currentSessionDate.setDate(sessionDateTime.getDate() + (i * 14));
            } else if (recurrence === 'monthly') {
              currentSessionDate.setMonth(sessionDateTime.getMonth() + i);
            }

            // Convert to UTC for storage
            const utcDate = toUtc(currentSessionDate);
            
            console.log(`[TIMEZONE TEST] Session ${i + 1} creation:`, {
              localDateTime: format(currentSessionDate, "yyyy-MM-dd HH:mm"),
              timezone: timezone,
              utcDateTime: utcDate.toISOString()
            });

            sessions.push({
              patientId: parseInt(formData.get("patientId") as string),
              date: utcDate.toISOString(),
              duration: parseInt(formData.get("duration") as string),
              type: formData.get("type") as string,
              status: 'scheduled',
              cptCode: selectedCptCode || null,
              addOnCptCodes: selectedAddOnCodes.length > 0 ? selectedAddOnCodes : [],
              authorizationRequired: authorizationRequired,
              authorizationNumber: authorizationRequired ? formData.get("authorizationNumber") as string : null
            });
          }

          await addSessionMutation.mutateAsync(sessions);
          break;
        }

        case "meeting": {
          let meetingDateTime = selectedDateTime;
          if (!meetingDateTime) {
            // datetime-local input returns "YYYY-MM-DDTHH:mm" format
            const dateTimeInput = formData.get("meetingDate") as string;
            
            if (!dateTimeInput) {
              throw new Error('Date and time are required');
            }

            // Convert datetime-local string to Date object
            meetingDateTime = new Date(dateTimeInput);
            
            if (!isValid(meetingDateTime)) {
              throw new Error('Invalid date format');
            }
          }

          if (!meetingDateTime) {
            throw new Error('Invalid date/time');
          }

          // Convert to UTC for storage
          const utcDate = toUtc(meetingDateTime);
          
          console.log(`[TIMEZONE TEST] Meeting creation:`, {
            localDateTime: format(meetingDateTime, "yyyy-MM-dd HH:mm"),
            timezone: timezone,
            utcDateTime: utcDate.toISOString()
          });

          await addMeetingMutation.mutateAsync({
            typeId: parseInt(formData.get("meetingTypeId") as string),
            title: formData.get("title") as string,
            date: utcDate.toISOString(),
            duration: parseInt(formData.get("meetingDuration") as string),
            notes: formData.get("notes") as string,
          });
          break;
        }

        case "block": {
          // Get the selected block type
          const blockType = formData.get("blockType") as string;
          const blockTypeInfo = BLOCK_TYPES.find(type => type.value === blockType);
          
          if (!blockTypeInfo) {
            throw new Error('Invalid block type selected');
          }
          
          // Convert form data to the correct API format
          const startTime = formData.get("startTime") as string;
          const endTime = formData.get("endTime") as string;
          const dayOfWeek = parseInt(formData.get("dayOfWeek") as string);
          
          // Create proper start and end dates
          const today = new Date();
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + (dayOfWeek - today.getDay() + 7) % 7);
          
          const startDate = new Date(targetDate);
          const [startHour, startMin] = startTime.split(':').map(Number);
          startDate.setHours(startHour, startMin, 0, 0);
          
          const endDate = new Date(targetDate);
          const [endHour, endMin] = endTime.split(':').map(Number);
          endDate.setHours(endHour, endMin, 0, 0);
          
          const blockRecurrence = formData.get("blockRecurrence") as string;
          const blockOccurrences = blockRecurrence === 'none' ? 1 : parseInt(formData.get("blockOccurrences") as string) || 1;
          
          if (blockRecurrence !== 'none' && (blockOccurrences < 1 || blockOccurrences > 52)) {
            throw new Error('Number of occurrences must be between 1 and 52');
          }

          // Create multiple blocks for recurrence
          const blocks: any[] = [];
          let currentDate = new Date(startDate);
          
          for (let i = 0; i < blockOccurrences; i++) {
            const blockStart = new Date(currentDate);
            const blockEnd = new Date(endDate);
            
            // Adjust end date to maintain duration
            const duration = endDate.getTime() - startDate.getTime();
            blockEnd.setTime(blockStart.getTime() + duration);

            blocks.push({
              startDate: blockStart.toISOString(),
              endDate: blockEnd.toISOString(),
              blockType: blockType,
              reason: formData.get("blockTitle") as string,
              isRecurring: blockRecurrence !== 'none',
              recurringPattern: blockRecurrence !== 'none' ? {
                frequency: blockRecurrence === 'biweekly' ? 'weekly' : blockRecurrence,
                interval: blockRecurrence === 'biweekly' ? 2 : 1
              } : undefined
            });

            // Calculate next occurrence
            if (blockRecurrence !== 'none' && i < blockOccurrences - 1) {
              if (blockRecurrence === 'weekly') {
                currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
              } else if (blockRecurrence === 'biweekly') {
                currentDate = new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000);
              } else if (blockRecurrence === 'monthly') {
                currentDate = new Date(currentDate);
                currentDate.setMonth(currentDate.getMonth() + 1);
              }
            }
          }
          
          console.log('Creating calendar blocks:', blocks);
          
          // Create all blocks
          for (const block of blocks) {
            await addCalendarBlockMutation.mutateAsync(block);
          }
          break;
        }
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error.message || "Failed to create event",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showNewMeetingType ? "Create Meeting Type" : "Add New Event"}
          </DialogTitle>
        </DialogHeader>

        {showNewMeetingType ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="typeName">Type Name</Label>
              <Input
                id="typeName"
                name="typeName"
                required
              />
            </div>
            <div>
              <Label htmlFor="typeColor">Color</Label>
              <Input
                id="typeColor"
                name="typeColor"
                type="color"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewMeetingType(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Type</Button>
            </div>
          </form>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="session">Session</TabsTrigger>
              <TabsTrigger value="meeting">Meeting</TabsTrigger>
              <TabsTrigger value="block">Calendar Block</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <TabsContent value="session">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="patientId">Client</Label>
                    <Select 
                      name="patientId" 
                      required
                      onValueChange={(value) => setSelectedClientId(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients && Array.isArray(clients) ? clients.map((client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name}
                          </SelectItem>
                        )) : (
                          <SelectItem value="no-clients" disabled>
                            No clients available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedDateTime ? (
                    <div>
                      <input
                        type="hidden"
                        name="date"
                        value={format(selectedDateTime, 'yyyy-MM-dd')}
                      />
                      <input
                        type="hidden"
                        name="hour"
                        value={selectedDateTime.getHours().toString()}
                      />
                      <input
                        type="hidden"
                        name="minute"
                        value={selectedDateTime.getMinutes().toString()}
                      />
                      <input
                        type="hidden"
                        name="period"
                        value={selectedDateTime.getHours() >= 12 ? "PM" : "AM"}
                      />
                      <div className="bg-muted p-2 rounded-lg text-sm">
                        Selected time: {format(selectedDateTime, 'MMMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          name="date"
                          type="date"
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label htmlFor="hour">Hour</Label>
                          <Select name="hour" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Hour" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {i + 1}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <Label htmlFor="minute">Minute</Label>
                          <Select name="minute" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Minute" />
                            </SelectTrigger>
                            <SelectContent>
                              {['00', '15', '30', '45'].map((minute) => (
                                <SelectItem key={minute} value={minute}>
                                  :{minute}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <Label htmlFor="period">AM/PM</Label>
                          <Select name="period" required>
                            <SelectTrigger>
                              <SelectValue placeholder="AM/PM" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="type">Session Type</Label>
                      <Select 
                        name="type" 
                        required 
                        defaultValue="individual"
                        onValueChange={(value) => {
                          setSelectedSessionType(value);
                          // Reset assessment type when changing away from assessment
                          if (value !== 'assessment') {
                            setSelectedAssessmentType('');
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {SESSION_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration</Label>
                      <Select 
                        name="duration" 
                        required 
                        defaultValue="50"
                        onValueChange={(value) => setSelectedDuration(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          {[15, 30, 45, 50, 60, 75, 90].map((minutes) => (
                            <SelectItem key={minutes} value={minutes.toString()}>
                              {minutes} min
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Assessment Type dropdown - only show when session type is assessment */}
                  {selectedSessionType === 'assessment' && (
                    <div>
                      <Label htmlFor="assessmentType">Assessment Type</Label>
                      <Select 
                        name="assessmentType" 
                        value={selectedAssessmentType}
                        onValueChange={setSelectedAssessmentType}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select assessment type" />
                        </SelectTrigger>
                        <SelectContent>
                          {assessmentCategories.map((category: string) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}




                  {/* CPT Code Billing Selection - Unified Interface */}
                  {isInsuranceBilling && (
                    <div className="space-y-4">
                      {/* AI Billing Assistant Header */}
                      {cptSuggestion && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <LightBulbIcon className="h-5 w-5 text-blue-600" />
                            <h3 className="font-semibold text-blue-900">AI Billing Assistant - Smart Recommendations</h3>
                          </div>
                          <p className="text-sm text-blue-700 mb-3">
                            Based on your {selectedSessionType} session ({selectedDuration} minutes), I've selected the most appropriate CPT codes for billing.
                          </p>
                          <div className="bg-white rounded-md p-3 border border-blue-100">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium text-gray-900">{cptSuggestion.code}</span>
                                <span className="text-gray-600 ml-2">{cptSuggestion.description}</span>
                              </div>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                Confidence: {cptSuggestion.confidence}
                              </span>
                            </div>
                            {cptSuggestion.addOnCodes && cptSuggestion.addOnCodes.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Add-on codes:</p>
                                <div className="flex flex-wrap gap-1">
                                  {cptSuggestion.addOnCodes.map((addOn, index) => (
                                    <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                      {addOn.code}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Simplified CPT Code Selection */}
                      <div className="flex justify-between items-center">
                        <div className="flex space-x-3">
                          {/* Primary CPT Code Selector */}
                          <Popover open={openCptPopover} onOpenChange={setOpenCptPopover}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="justify-between h-auto py-3 min-w-[160px]"
                              >
                                <div className="text-left">
                                  <div className="font-medium text-sm">Primary Code</div>
                                  <div className="text-xs text-gray-500">
                                    {selectedCptCode || "Select primary CPT"}
                                  </div>
                                </div>
                                <ChevronUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0 max-h-[400px]">
                              <Command className="max-h-[400px]">
                                <CommandInput placeholder="Search CPT codes..." />
                                <CommandEmpty>No CPT code found.</CommandEmpty>
                                <CommandGroup className="max-h-[320px] overflow-y-auto">
                                  {cptCodes.map((code: any) => (
                                    <CommandItem
                                      key={code.id}
                                      value={code.code}
                                      onSelect={(currentValue) => {
                                        setSelectedCptCode(currentValue === selectedCptCode ? "" : currentValue);
                                        setOpenCptPopover(false);
                                      }}
                                    >
                                      <CheckIcon
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedCptCode === code.code ? "opacity-100" : "opacity-0"
                                        )} />
                                      <div>
                                        <div className="font-medium">{code.code}</div>
                                        <div className="text-sm text-gray-600">{code.description}</div>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          
                          {/* Add-on CPT Code Selector */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="justify-between h-auto py-3 min-w-[160px]"
                              >
                                <div className="text-left">
                                  <div className="font-medium text-sm">Add-on Codes</div>
                                  <div className="text-xs text-gray-500">
                                    {selectedAddOnCodes.length ? `${selectedAddOnCodes.length} selected` : "Add optional codes"}
                                  </div>
                                </div>
                                <ChevronUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0 max-h-[400px]">
                              <Command className="max-h-[400px]">
                                <CommandInput placeholder="Search add-on CPT codes..." />
                                <CommandEmpty>No CPT code found.</CommandEmpty>
                                <CommandGroup className="max-h-[320px] overflow-y-auto">
                                  {cptCodes
                                    .filter((code: any) => code.code !== selectedCptCode)
                                    .map((code: any) => (
                                    <CommandItem
                                      key={code.id}
                                      value={code.code}
                                      onSelect={(currentValue) => {
                                        setSelectedAddOnCodes([...selectedAddOnCodes, currentValue]);
                                      }}
                                    >
                                      <CheckIcon
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedAddOnCodes.includes(code.code) ? "opacity-100" : "opacity-0"
                                        )} />
                                      <div>
                                        <div className="font-medium">{code.code}</div>
                                        <div className="text-sm text-gray-600">{code.description}</div>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        {/* Clear All Button - only show if codes are selected */}
                        {(selectedCptCode || selectedAddOnCodes.length > 0) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCptCode('');
                              setSelectedAddOnCodes([]);
                            }}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Clear All
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Non-assessment suggestions - simplified */}
                  {isInsuranceBilling && selectedSessionType !== 'assessment' && cptSuggestion && cptSuggestion.confidence === 'high' && !selectedCptCode && (
                    <Alert className="border-indigo-200 bg-indigo-50">
                      <div className="flex items-center space-x-2">
                        <div className="p-0.5 bg-indigo-100 rounded-full">
                          <svg className="h-3 w-3 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014.846 21H9.154a3.374 3.374 0 00-2.869-1.453l-.548-.547z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-indigo-800">AI Suggestion</span>
                      </div>
                      <AlertDescription className="text-indigo-800 mt-2">
                        <span className="text-sm">{cptSuggestion.reason}</span>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Authorization Section - Only show for insurance clients */}
                  {isInsuranceBilling && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="authorization"
                          checked={authorizationRequired}
                          onCheckedChange={setAuthorizationRequired}
                        />
                        <Label htmlFor="authorization">Authorization Required</Label>
                      </div>
                      
                      {authorizationRequired && (
                        <div>
                          <Label htmlFor="authorizationNumber">Authorization Number</Label>
                          <Input
                            id="authorizationNumber"
                            name="authorizationNumber"
                            placeholder="Enter authorization number"
                            required={authorizationRequired}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="recurrence">Recurrence</Label>
                    <Select name="recurrence" required defaultValue="none">
                      <SelectTrigger>
                        <SelectValue placeholder="Select recurrence" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="occurrences">Number of Occurrences</Label>
                    <Input type="number" id="occurrences" name="occurrences" min="1" max="52" defaultValue="1" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="meeting">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center">
                      <Label htmlFor="meetingTypeId">Meeting Type</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNewMeetingType(true)}
                      >
                        Add Type
                      </Button>
                    </div>
                    <Select name="meetingTypeId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select meeting type" />
                      </SelectTrigger>
                      <SelectContent>
                        {meetingTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      name="title"
                      required
                    />
                  </div>

                  {!selectedDateTime && (
                    <div>
                      <Label htmlFor="meetingDate">Date & Time</Label>
                      <Input
                        id="meetingDate"
                        name="meetingDate"
                        type="datetime-local"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="meetingDuration">Duration (minutes)</Label>
                    <Select name="meetingDuration" required defaultValue="60">
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {[30, 45, 60, 90, 120].map((minutes) => (
                          <SelectItem key={minutes} value={minutes.toString()}>
                            {minutes} min
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      name="notes"
                      type="text"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="block">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="blockTitle">Block Title</Label>
                    <Input
                      id="blockTitle"
                      name="blockTitle"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="dayOfWeek">Day of Week</Label>
                    <Select name="dayOfWeek">
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedDateTime && (
                    <div className="bg-muted p-2 rounded-lg text-sm mb-4">
                      <p>Selected time: {format(selectedDateTime, 'MMMM d, yyyy h:mm a')}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        You can adjust the exact times below.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input
                        id="startTime"
                        name="startTime"
                        type="time"
                        required
                        defaultValue={selectedDateTime ? 
                          `${selectedDateTime.getHours().toString().padStart(2, '0')}:${selectedDateTime.getMinutes().toString().padStart(2, '0')}` 
                          : undefined}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endTime">End Time</Label>
                      <Input
                        id="endTime"
                        name="endTime"
                        type="time"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="blockType">Block Type</Label>
                    <Select name="blockType" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {BLOCK_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="blockRecurrence">Recurrence</Label>
                    <Select name="blockRecurrence" required defaultValue="none">
                      <SelectTrigger>
                        <SelectValue placeholder="Select recurrence" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="blockOccurrences">Number of Occurrences</Label>
                    <Input type="number" id="blockOccurrences" name="blockOccurrences" min="1" max="52" defaultValue="1" />
                  </div>
                </div>
              </TabsContent>

              <Button 
                type="submit" 
                className="w-full"
                disabled={
                  addSessionMutation.isPending || 
                  addMeetingMutation.isPending || 
                  addCalendarBlockMutation.isPending ||
                  createMeetingTypeMutation.isPending
                }
              >
                {activeTab === 'session' ? (
                  addSessionMutation.isPending ? 'Scheduling...' : 'Schedule Session'
                ) : activeTab === 'meeting' ? (
                  addMeetingMutation.isPending ? 'Scheduling...' : 'Schedule Meeting'
                ) : (
                  addCalendarBlockMutation.isPending ? 'Adding...' : 'Add Calendar Block'
                )}
              </Button>
            </form>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}