import React, { useState } from 'react';
import { format } from '@/utils/dateFnsCompat';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Session } from '../types';
//import { useLocation } from 'wouter';  // Removed as navigation is no longer used
import SessionNotes from './SessionNotes'; // Assuming this component exists
import { formatLocalTime } from "@/utils/dateFnsCompat";

interface TodayScheduleProps {
  sessions: Session[];
}

export default function TodaySchedule({ sessions }: TodayScheduleProps) {
  //const [, setLocation] = useLocation(); // Removed
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);
  };

  // Sort sessions by date
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedSessions.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No sessions scheduled for today
            </div>
          ) : (
            <div>
              {sortedSessions.map((session) => (
                <div 
                  key={session.id}
                  className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-secondary/20 cursor-pointer"
                  onClick={() => handleSessionClick(session)}
                >
                  <div>
                    <div className="font-medium">{session.patient?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatLocalTime(session.date, 'h:mm a')}
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    {session.duration} minutes
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSession && (
        <SessionNotes
          session={selectedSession}
          open={!!selectedSession}
          onClose={() => setSelectedSession(null)}
          //onSubmit={() => setSelectedSession(null)} // Removed as onSubmit functionality is unclear from context
        />
      )}
    </>
  );
}