import { cn } from "@/lib/utils";

export const BLOCK_TYPES = [
  { value: "intake", label: "Intake Sessions", color: "bg-blue-100", hexColor: "#dbeafe" },
  { value: "lunch", label: "Lunch Break", color: "bg-primary/20", hexColor: "#ffedd5" },
  { value: "recurring", label: "Recurring Clients", color: "bg-green-100", hexColor: "#8DA391" },
  { value: "blocked", label: "Blocked Time", color: "bg-red-100", hexColor: "#fee2e2" },
  { value: "meeting", label: "Meetings", color: "bg-purple-100", hexColor: "#F4B9A5" },
  { value: "notes", label: "Session Notes", color: "bg-yellow-100", hexColor: "#fef9c3" }
];

export default function CalendarLegend() {
  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      {BLOCK_TYPES.map(type => (
        <div key={type.value} className="flex items-center gap-2">
          <div className={cn("w-4 h-4 rounded", type.color)} />
          <span>{type.label}</span>
        </div>
      ))}
    </div>
  );
}