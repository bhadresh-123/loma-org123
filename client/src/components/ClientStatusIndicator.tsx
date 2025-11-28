import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface ClientStatusIndicatorProps {
  status: string;
  lastSessionDate?: string | null;
}

export default function ClientStatusIndicator({ status, lastSessionDate }: ClientStatusIndicatorProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress on mount
    const timer = setTimeout(() => {
      setProgress(100);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const getStatusDetails = (status: string) => {
    const normalizedStatus = status.toLowerCase();

    switch (normalizedStatus) {
      case 'active':
        return {
          label: 'Active',
          variant: 'default' as const,
          color: 'bg-emerald-500',
          description: 'Currently active client'
        };
      case 'inactive':
        return {
          label: 'Inactive',
          variant: 'secondary' as const,
          color: 'bg-amber-500',
          description: 'Inactive client'
        };
      case 'terminated':
        return {
          label: 'Terminated',
          variant: 'destructive' as const,
          color: 'bg-rose-500',
          description: 'Services terminated'
        };
      case 'inquiry':
      default:
        return {
          label: 'Inquiry',
          variant: 'inquiry' as const,
          color: 'bg-yellow-400',
          description: 'New client inquiry'
        };
    }
  };

  const details = getStatusDetails(status);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge 
          variant={details.variant}
          className={cn(
            "text-white font-medium",
            status === 'active' && "bg-primary hover:bg-primary/90",
            status === 'inactive' && "bg-yellow-500 hover:bg-yellow-600",
            status === 'terminated' && "bg-red-500 hover:bg-red-600",
            status === 'inquiry' && "bg-blue-500 hover:bg-blue-600"
          )}
        >
          {details.label}
        </Badge>
        <span className="text-xs text-gray-600">{details.description}</span>
      </div>
      <div className={`h-0.5 w-full ${details.color} rounded-full`} />
    </div>
  );
}