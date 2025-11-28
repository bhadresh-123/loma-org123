import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon } from '@heroicons/react/24/outline';
import { EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';
import type { Client } from "@/types/schema";
import ClientStatusIndicator from "./ClientStatusIndicator";
import { format } from "@/utils/dateFnsCompat";
import { useLocation } from "wouter";
import { useCallback } from "react";

interface ClientCardProps {
  client: Client;
}

export default function ClientCard({ client }: ClientCardProps) {
  const [, setLocation] = useLocation();

  const handleCardClick = useCallback(() => {
    setLocation(`/clients/${client.id}`);
  }, [client.id, setLocation]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  }, [handleCardClick]);

  return (
    <Card 
      className="hover:bg-gray-50 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-white border-gray-200" 
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View client details for ${client.name}`}
    >
      <CardContent className="pt-6 pb-6">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
              <ClientStatusIndicator status={client.status || 'inquiry'} />
              {client.createdAt && (
                <div className="flex items-center mt-2 text-sm text-gray-600">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Client since {format(new Date(client.createdAt), 'MMMM d, yyyy')}
                </div>
              )}
            </div>
          </div>

          {client.email && (
            <div className="flex items-center text-sm">
              <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-500" />
              <a
                href={`mailto:${client.email}`}
                className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                  }
                }}
                tabIndex={0}
                aria-label={`Send email to ${client.email}`}
              >
                {client.email}
              </a>
            </div>
          )}

          {client.phone && (
            <div className="flex items-center text-sm">
              <PhoneIcon className="h-4 w-4 mr-2 text-gray-500" />
              <a
                href={`tel:${client.phone}`}
                className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                  }
                }}
                tabIndex={0}
                aria-label={`Call ${client.phone}`}
              >
                {client.phone}
              </a>
            </div>
          )}

          {client.notes && (
            <p className="text-sm text-gray-600 mt-2">
              {client.notes}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}