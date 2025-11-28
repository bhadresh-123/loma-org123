import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import type { CalendarBlock } from "@/types/schema";
import { BLOCK_TYPES } from "./CalendarLegend";
import { cn } from "@/lib/utils";

const DAYS_OF_WEEK = [
  { value: "everyday", label: "Everyday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
];

interface CalendarBlockDialogProps {
  trigger?: React.ReactNode;
  editBlock?: CalendarBlock;
}

export default function CalendarBlockDialog({ trigger, editBlock }: CalendarBlockDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addBlockMutation = useMutation({
    mutationFn: async (blocks: Omit<CalendarBlock, "id" | "userId" | "createdAt">[]) => {
      const responses = await Promise.all(
        blocks.map(block => 
          fetch("/api/calendar/blocks", {
            method: editBlock ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editBlock ? { ...block, id: editBlock.id } : block),
            credentials: "include",
          })
        )
      );

      const failedResponse = responses.find(res => !res.ok);
      if (failedResponse) {
        throw new Error(await failedResponse.text());
      }

      return await Promise.all(responses.map(res => res.json()));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/blocks"] });
      setOpen(false);
      toast({
        title: "Success",
        description: `Calendar block ${editBlock ? "updated" : "created"} successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save calendar block",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    // Get the color for the selected block type
    const blockType = BLOCK_TYPES.find(type => type.value === data.type);
    if (!blockType) {
      toast({
        title: "Error",
        description: "Invalid block type selected",
        variant: "destructive",
      });
      return;
    }

    const baseBlock = {
      title: data.title as string,
      type: data.type as string,
      startTime: data.startTime as string,
      endTime: data.endTime as string,
      isRecurring: true,
      color: blockType.hexColor,
    };

    // If everyday is selected, create a block for each weekday
    if (data.dayOfWeek === "everyday") {
      const blocks = [1, 2, 3, 4, 5].map(day => ({
        ...baseBlock,
        dayOfWeek: day,
      }));
      await addBlockMutation.mutateAsync(blocks);
    } else {
      // Create a single block for the selected day
      await addBlockMutation.mutateAsync([{
        ...baseBlock,
        dayOfWeek: parseInt(data.dayOfWeek as string),
      }]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Add Calendar Block</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editBlock ? "Edit Calendar Block" : "Add Calendar Block"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              defaultValue={editBlock?.title}
              required
            />
          </div>

          <div>
            <Label htmlFor="type">Block Type</Label>
            <Select name="type" defaultValue={editBlock?.type}>
              <SelectTrigger>
                <SelectValue placeholder="Select block type" />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded", type.color)} />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="dayOfWeek">Day of Week</Label>
            <Select name="dayOfWeek" defaultValue={editBlock?.dayOfWeek?.toString()}>
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                defaultValue={editBlock?.startTime}
                required
              />
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                name="endTime"
                type="time"
                defaultValue={editBlock?.endTime}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            {editBlock ? "Update Block" : "Add Block"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}