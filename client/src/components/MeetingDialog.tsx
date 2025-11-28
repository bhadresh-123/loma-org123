import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useToast } from "@/contexts/ToastContext";
import type { Meeting, MeetingType } from "@/types/schema";
import { PlusIcon } from '@heroicons/react/24/outline';

interface MeetingDialogProps {
  selectedDateTime?: Date;
  onOpenChange?: (open: boolean) => void;
}

export default function MeetingDialog({ selectedDateTime, onOpenChange }: MeetingDialogProps) {
  const [open, setOpen] = useState(false);
  const [showNewTypeForm, setShowNewTypeForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch meeting types
  const { data: meetingTypes = [] } = useQuery<MeetingType[]>({
    queryKey: ["/api/meetings/types"],
    queryFn: async () => {
      const response = await fetch("/api/meetings/types", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch meeting types");
      }
      return response.json();
    },
  });

  // Create new meeting type
  const createMeetingTypeMutation = useMutation({
    mutationFn: async (newType: { name: string; color: string }) => {
      const res = await fetch("/api/meetings/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newType),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings/types"] });
      setShowNewTypeForm(false);
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

  // Schedule meeting
  const scheduleMeetingMutation = useMutation({
    mutationFn: async (meeting: Partial<Meeting>) => {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meeting),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      setOpen(false);
      if (onOpenChange) {
        onOpenChange(false);
      }
      toast({
        title: "Success",
        description: "Meeting scheduled successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to schedule meeting",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (showNewTypeForm) {
      await createMeetingTypeMutation.mutateAsync({
        name: formData.get("typeName") as string,
        color: formData.get("typeColor") as string,
      });
      return;
    }

    // Convert datetime-local value to ISO string
    let dateValue: string;
    if (selectedDateTime) {
      dateValue = selectedDateTime.toISOString();
    } else {
      const dateInput = formData.get("date") as string;
      // datetime-local gives us "YYYY-MM-DDTHH:mm", convert to ISO string
      dateValue = new Date(dateInput).toISOString();
    }

    await scheduleMeetingMutation.mutateAsync({
      typeId: parseInt(formData.get("typeId") as string),
      title: formData.get("title") as string,
      date: dateValue,
      duration: parseInt(formData.get("duration") as string),
      notes: formData.get("notes") as string,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (onOpenChange) {
        onOpenChange(newOpen);
      }
    }}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="h-4 w-4 mr-2" />
          Schedule Meeting
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {showNewTypeForm ? "Create Meeting Type" : "Schedule Meeting"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {showNewTypeForm ? (
            <>
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
                  onClick={() => setShowNewTypeForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Type</Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="typeId">Meeting Type</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewTypeForm(true)}
                  >
                    Add Type
                  </Button>
                </div>
                <Select name="typeId" required>
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
                  <Label htmlFor="date">Date & Time</Label>
                  <Input
                    id="date"
                    name="date"
                    type="datetime-local"
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select name="duration" required defaultValue="60">
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

              <Button type="submit" className="w-full">
                Schedule Meeting
              </Button>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
