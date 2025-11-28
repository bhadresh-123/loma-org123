import { format } from "@/utils/dateFnsCompat";
import { DocumentTextIcon, CalendarIcon, ExclamationCircleIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TimelineEvent {
  id: string;
  date: Date;
  type: 'session' | 'document' | 'creation' | 'note';
  title: string;
  description?: string;
  status?: string;
  metadata?: Record<string, any>;
}

interface TimelineProps {
  events: TimelineEvent[];
  onSessionClick?: (eventId: string) => void;
}

export default function Timeline({ events, onSessionClick }: TimelineProps) {
  const sortedEvents = [...events].sort((a, b) => b.date.getTime() - a.date.getTime());

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'session':
        return <CalendarIcon className="h-5 w-5" />;
      case 'document':
        return <DocumentTextIcon className="h-5 w-5" />;
      case 'note':
        return <ExclamationCircleIcon className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getEventColor = (type: TimelineEvent['type'], status?: string) => {
    if (status === 'no_show') return 'destructive';
    switch (type) {
      case 'session':
        return 'default';
      case 'document':
        return 'secondary';
      case 'note':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-8">
      {sortedEvents.map((event, index) => (
        <div key={event.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`p-2 rounded-full bg-${getEventColor(event.type, event.status)}`}>
              {getEventIcon(event.type)}
            </div>
            {index < sortedEvents.length - 1 && (
              <div className="w-px h-full bg-border" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{event.title}</h4>
              <Badge variant={getEventColor(event.type, event.status) as any}>
                {event.type}
              </Badge>
              {event.status && (
                <Badge variant={event.status === 'no_show' ? 'destructive' : 'outline'}>
                  {event.status === 'no_show' ? 'No-show' : 
                   event.status?.charAt(0).toUpperCase() + event.status?.slice(1)}
                </Badge>
              )}
            </div>
            <time className="text-sm text-muted-foreground">
              {format(event.date, 'PPP p')}
            </time>
            {event.description && (
              <p className="text-sm text-muted-foreground">{event.description}</p>
            )}
            {event.type === 'session' && onSessionClick && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2 text-sm"
                onClick={() => onSessionClick(event.id)}
              >
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                View/Edit Notes
                <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export type { TimelineEvent };