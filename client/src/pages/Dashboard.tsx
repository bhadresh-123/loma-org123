import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleCalendar } from "@/components/ui/simple-calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ClockIcon, ExclamationCircleIcon, UserIcon } from '@heroicons/react/24/outline';
import { UsersIcon } from '@heroicons/react/24/outline';
import type { Client, Session, Task } from "@/types/schema";
import TasksWidget from "@/components/TasksWidget";
import { format } from "@/utils/dateFnsCompat";
import TodaySchedule from "@/components/TodaySchedule";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isArrayResponse } from "@/types/api";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [, setLocation] = useLocation();

  const { data: clientsData, isLoading: loadingClients, error: clientsError } = useQuery<Client[]>({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const response = await fetch("/api/patients", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch patients");
      }
      const data = await response.json();
      // Handle HIPAA response format
      const patients = data.success ? data.data : data;
      return isArrayResponse<Client>(patients) ? patients : [];
    },
  });

  const { data: sessionsData, isLoading: loadingSessions, error: sessionsError } = useQuery<Session[]>({
    queryKey: ["/api/clinical-sessions"],
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
      return isArrayResponse<Session>(sessions) ? sessions : [];
    },
    retry: false,
  });

  const { data: tasksData, isLoading: loadingTasks, error: tasksError } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const response = await fetch("/api/tasks", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }
      const data = await response.json();
      return isArrayResponse<Task>(data) ? data : [];
    },
  });

  // Ensure all data is safely converted to arrays
  const clients = isArrayResponse<Client>(clientsData) ? clientsData : [];
  const sessions = isArrayResponse<Session>(sessionsData) ? sessionsData : [];
  const tasks = isArrayResponse<Task>(tasksData) ? tasksData : [];

  // Error handling
  const hasErrors = clientsError || sessionsError || tasksError;
  const errorMessage = clientsError?.message || sessionsError?.message || tasksError?.message;

  const handleCalendarSelect = (date: Date | undefined) => {
    console.log("Calendar day selected:", date);
    if (date) {
      // Force a new date object to ensure state update
      const newDate = new Date(date);
      setSelectedDate(newDate);

      // Force re-filter sessions for the new date
      const dateStr = newDate.toDateString();
      console.log("Selected new date:", dateStr);
    }
  };

  const handleCalendarDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Use UTC date parts to match Calendar component's behavior
    const year = selectedDate.getUTCFullYear();
    const month = String(selectedDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getUTCDate()).padStart(2, "0");

    const formattedDate = `${year}-${month}-${day}`;
    setLocation(`/calendar?date=${formattedDate}`);
  };

  // Filter sessions for the selected date
  const sessionsByDate = sessions
    .filter((session) => {
      const sessionDate = new Date(session.date);

      // Format both dates to a string for consistent comparison (removes time component)
      const sessionDateStr = sessionDate.toDateString();
      const selectedDateStr = selectedDate.toDateString();



      return sessionDateStr === selectedDateStr;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


  const isToday = (date: Date) =>
    date.toDateString() === new Date().toDateString();

  return (
    <div className="space-y-4 md:space-y-6 max-w-full">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Dashboard</h1>
      </div>

      {hasErrors && (
        <Alert variant="destructive">
          <ExclamationCircleIcon className="h-4 w-4" />
          <AlertDescription>
            Error loading dashboard data: {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
        <Link href="/clients">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Clients
              </CardTitle>
              <UserIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingClients ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-2xl font-bold">{clients.length}</p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/sessions">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Schedule
              </CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingSessions ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-2xl font-bold">{sessionsByDate.length}</p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/calendar">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Hours This Week
              </CardTitle>
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingSessions ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-2xl font-bold">
                  {(() => {
                    // Get current week's start and end
                    const now = new Date();
                    const startOfWeek = new Date(now);
                    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
                    startOfWeek.setHours(0, 0, 0, 0);

                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
                    endOfWeek.setHours(23, 59, 59, 999);

                    // Filter sessions for current week
                    const thisWeekSessions = sessions.filter((session) => {
                      const sessionDate = new Date(session.date);
                      return (
                        sessionDate >= startOfWeek && sessionDate <= endOfWeek
                      );
                    });

                    // Calculate hours (duration is in minutes)
                    const totalMinutes = thisWeekSessions.reduce(
                      (acc, session) => acc + (session.duration || 0),
                      0,
                    );

                    return (totalMinutes / 60).toFixed(1);
                  })()}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pt-0">
            <div
              onDoubleClick={handleCalendarDoubleClick}
              className="cursor-pointer"
            >
              <SimpleCalendar
                selected={selectedDate}
                onSelect={handleCalendarSelect}
                className="rounded-md border shadow-sm w-full max-w-none"
                classNames={{
                  months: "flex w-full space-y-0",
                  month: "space-y-2 w-full",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex w-full",
                  head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem] flex-1",
                  row: "flex w-full mt-1",
                  cell: "text-center text-sm relative p-0 flex-1 h-8 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: "h-8 w-full p-0 font-normal text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                  day_hidden: "invisible",
                }}
                components={{
                  Day: ({ date }) => {
                    if (!date) return null;
                    
                    const handleClick = () => {
                      handleCalendarSelect(date);
                    };

                    const dayEvents = sessions.filter((session) => {
                      const sessionDate = new Date(session.date);
                      return sessionDate.toDateString() === date.toDateString();
                    });

                    return (
                      <div onClick={handleClick} className="w-full h-full flex flex-col items-center justify-center relative">
                        <span className="text-sm">{date.getDate()}</span>
                        {dayEvents.length > 0 && (
                          <div className="h-1 w-1 rounded-full bg-primary absolute bottom-1" />
                        )}
                      </div>
                    );
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 md:space-y-6">
          <div>
            {/* Today's Schedule component integrated here */}
            <TodaySchedule
              sessions={sessions.filter((session) => {
                const sessionDate = new Date(session.date);
                const today = new Date();
                return (
                  sessionDate.getDate() === today.getDate() &&
                  sessionDate.getMonth() === today.getMonth() &&
                  sessionDate.getFullYear() === today.getFullYear()
                );
              })}
            />
          </div>
          <Link href="/tasks" className="block">
            <TasksWidget tasks={tasks} isLoading={loadingTasks} />
          </Link>
        </div>
      </div>
    </div>
  );
}
