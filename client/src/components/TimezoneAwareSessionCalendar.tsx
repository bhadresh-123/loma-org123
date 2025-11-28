import { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays, setHours, setMinutes, setSeconds, areIntervalsOverlapping, startOfMonth, endOfMonth, startOfHour } from "@/utils/dateFnsCompat";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, CheckCircleIcon, DocumentTextIcon, ReceiptPercentIcon, XCircleIcon } from '@heroicons/react/24/outline';
import type { Session, CalendarBlock, Meeting, MeetingType } from "@/types/schema";
import { cn } from "@/lib/utils";
import { BLOCK_TYPES } from "./CalendarLegend";
import { useToast } from "@/contexts/ToastContext";
import { useTimezoneAwareDates } from "@/hooks/use-timezone-aware-dates";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useWorkSchedules } from "@/hooks/use-work-schedules";

type ViewType = 'day' | 'week' | 'month';

interface TimezoneAwareSessionCalendarProps {
  sessions: Session[];
  meetings?: Meeting[];
  meetingTypes?: MeetingType[];
  calendarBlocks?: CalendarBlock[];
  onSelectDate?: (date: Date) => void;
  onSelectTimeSlot?: (date: Date) => void;
  onSessionClick?: (session: Session, action?: string) => void;
  excludeSessionId?: number;
  initialDate?: Date;
  initialView?: ViewType;
}

// Default hours (9 AM to 6 PM) if no work schedule is defined
const DEFAULT_HOURS = Array.from({ length: 10 }, (_, i) => i + 9);

export default function TimezoneAwareSessionCalendar({
  sessions,
  meetings = [],
  meetingTypes = [],
  calendarBlocks = [],
  onSelectDate,
  onSelectTimeSlot,
  onSessionClick,
  excludeSessionId,
  initialDate = new Date(),
  initialView = 'week'
}: TimezoneAwareSessionCalendarProps) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [view, setView] = useState<ViewType>(initialView);
  const [now, setNow] = useState(new Date());
  const { toast } = useToast();
  const { fromUtc, formatTime, formatDate, timezone } = useTimezoneAwareDates();
  
  // Get work schedules for the current user
  const { data: workSchedules = [] } = useWorkSchedules();

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, []);

  // Filter out excluded session
  const filteredSessions = sessions.filter(session => session.id !== excludeSessionId);

  const navigatePrevious = () => {
    if (view === 'day') {
      setCurrentDate(prev => addDays(prev, -1));
    } else if (view === 'week') {
      setCurrentDate(prev => addDays(prev, -7));
    } else if (view === 'month') {
      setCurrentDate(prev => addDays(prev, -30));
    }
  };

  const navigateNext = () => {
    if (view === 'day') {
      setCurrentDate(prev => addDays(prev, 1));
    } else if (view === 'week') {
      setCurrentDate(prev => addDays(prev, 7));
    } else if (view === 'month') {
      setCurrentDate(prev => addDays(prev, 30));
    }
  };

  const handleTimeSlotClick = (date: Date) => {
    console.log(`[TIMEZONE TEST] Time slot clicked:`, {
      clickedTime: format(date, 'PPP p'),
      timezone: timezone,
      localTime: date.toString(),
      isoString: date.toISOString()
    });
    onSelectTimeSlot?.(date);
  };

  const getCalendarBlock = (day: Date, hour: number) => {
    const dayStart = new Date(day);
    dayStart.setHours(hour, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(hour + 1, 0, 0, 0);

    return calendarBlocks.find(block => {
      const blockStart = new Date(block.startDate);
      const blockEnd = new Date(block.endDate);
      
      // Check if the time slot overlaps with the calendar block
      return areIntervalsOverlapping(
        { start: dayStart, end: dayEnd },
        { start: blockStart, end: blockEnd }
      );
    });
  };

  const handleSessionClick = (session: Session, action?: string) => {
    console.log(`Session clicked: ${session.id}, action: ${action}`);
    onSessionClick?.(session, action);
  };

  const getHoursForDay = (dayOfWeek: number): number[] => {
    const schedule = workSchedules.find(ws => ws.dayOfWeek === dayOfWeek);
    if (!schedule) return DEFAULT_HOURS;
    
    try {
      const [startHour] = schedule.startTime.split(':').map(Number);
      const [endHour] = schedule.endTime.split(':').map(Number);
      
      // Validate that we have valid numbers
      if (isNaN(startHour) || isNaN(endHour) || startHour >= endHour) {
        console.warn('Invalid schedule times, falling back to default hours:', schedule);
        return DEFAULT_HOURS;
      }
      
      return Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
    } catch (error) {
      console.error('Error parsing schedule times:', error, schedule);
      return DEFAULT_HOURS;
    }
  };

  if (view === 'day') {
    const dayOfWeek = currentDate.getDay();
    let hours = getHoursForDay(dayOfWeek);
    const isToday = isSameDay(currentDate, now);
    const currentHour = now.getHours();
    
    // Ensure hours is always an array
    if (!Array.isArray(hours) || hours.length === 0) {
      console.warn('No valid hours found for day, using default hours');
      hours = DEFAULT_HOURS;
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={navigatePrevious}>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <h2 className={cn(
              "text-lg font-semibold",
              isToday && "text-blue-600 dark:text-blue-400"
            )}>
              {formatDate(currentDate, 'EEEE, MMMM d, yyyy')}
              {isToday && " (Today)"}
            </h2>
            <Button variant="outline" size="sm" onClick={navigateNext}>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant={view === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('day')}
            >
              Day
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('week')}
            >
              Week
            </Button>
            <Button
              variant={view === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('month')}
            >
              Month
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="relative">
              <div className="grid grid-cols-1 divide-y">
                {hours && Array.isArray(hours) ? hours.map(hour => {
                  const timeSlot = startOfHour(setHours(currentDate, hour));
                  const calendarBlock = getCalendarBlock(currentDate, hour);
                  const isCurrentHour = isToday && hour === currentHour;

                  return (
                    <div
                      key={hour}
                      className={cn(
                        "flex min-h-[60px] hover:bg-muted/50 cursor-pointer relative group",
                        calendarBlock && BLOCK_TYPES.find(t => t.value === calendarBlock.blockType)?.color,
                        isCurrentHour && "bg-blue-50 dark:bg-blue-950/30 border-l-4 border-l-blue-500"
                      )}
                      onClick={() => handleTimeSlotClick(timeSlot)}
                      title={calendarBlock?.reason || "Click to add event"}
                    >
                      <div className={cn(
                        "w-20 p-2 text-sm text-muted-foreground border-r",
                        isCurrentHour && "text-blue-600 dark:text-blue-400 font-semibold"
                      )}>
                        {formatTime(timeSlot, 'h:mm a')}
                        {isCurrentHour && (
                          <div className="text-[10px] uppercase tracking-wide">Now</div>
                        )}
                      </div>
                      <div className="flex-1 p-2">
                        {calendarBlock && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 z-0">
                            <span className="text-xs font-medium">{calendarBlock.reason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="p-4 text-center text-muted-foreground">
                    No hours available for this day
                  </div>
                )}
              </div>
              
              {/* Render sessions as absolute positioned blocks */}
              <div className="absolute top-0 left-20 right-0 pointer-events-none">
                {filteredSessions
                  .filter(session => {
                    const sessionStart = fromUtc(new Date(session.date));
                    return isSameDay(sessionStart, currentDate);
                  })
                  .map(session => {
                    const sessionStart = fromUtc(new Date(session.date));
                    const duration = session.duration || 50;
                    
                    // Calculate position from top of calendar (starting from first hour)
                    const firstHour = hours[0] || 9;
                    const minutesFromStart = (sessionStart.getHours() - firstHour) * 60 + sessionStart.getMinutes();
                    const topOffset = (minutesFromStart / 60) * 60; // 60px per hour
                    const height = (duration / 60) * 60; // Convert duration to pixels
                    
                    return (
                      <div
                        key={session.id}
                        className="absolute left-2 right-2 pointer-events-auto"
                        style={{
                          top: `${topOffset}px`,
                          height: `${height}px`,
                          zIndex: 10
                        }}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div
                              className="h-full bg-primary text-primary-foreground rounded-md p-2 cursor-pointer hover:opacity-90 transition-opacity border border-primary-foreground/20 overflow-hidden"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="text-xs font-semibold truncate">
                                {session.client?.name || session.patient?.name || 'Client'}
                              </div>
                              <div className="text-xs opacity-90">
                                {formatTime(sessionStart, 'h:mm a')} ({session.duration || 50} min)
                              </div>
                              {height > 40 && (
                                <div className="text-xs opacity-75 truncate">{session.type}</div>
                              )}
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSessionClick(session, "reschedule")}>
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              Reschedule
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSessionClick(session, "complete")}>
                              <CheckCircleIcon className="h-4 w-4 mr-2" />
                              Complete Session
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSessionClick(session, "notes")}>
                              <DocumentTextIcon className="h-4 w-4 mr-2" />
                              Add Note
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSessionClick(session, "invoice")}>
                              <ReceiptPercentIcon className="h-4 w-4 mr-2" />
                              Invoice Client
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSessionClick(session, "no-show")}>
                              <XCircleIcon className="h-4 w-4 mr-2" />
                              No-show
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}

                {/* Render meetings as absolute positioned blocks */}
                {meetings
                  .filter(meeting => {
                    const meetingStart = fromUtc(new Date(meeting.date));
                    return isSameDay(meetingStart, currentDate);
                  })
                  .map(meeting => {
                    const meetingStart = fromUtc(new Date(meeting.date));
                    const duration = meeting.duration || 30;
                    
                    const firstHour = hours[0] || 9;
                    const minutesFromStart = (meetingStart.getHours() - firstHour) * 60 + meetingStart.getMinutes();
                    const topOffset = (minutesFromStart / 60) * 60;
                    const height = (duration / 60) * 60;
                    
                    const meetingType = meetingTypes.find(t => t.id === meeting.typeId);
                    return (
                      <div
                        key={meeting.id}
                        className="absolute left-2 right-2 pointer-events-auto"
                        style={{
                          top: `${topOffset}px`,
                          height: `${height}px`,
                          zIndex: 10
                        }}
                      >
                        <div
                          className="h-full rounded-md p-2 cursor-pointer hover:opacity-90 transition-opacity border border-white/20 overflow-hidden"
                          style={{
                            backgroundColor: meetingType?.color || '#6b7280',
                            color: '#ffffff'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-xs font-semibold truncate">{meeting.title}</div>
                          <div className="text-xs opacity-90">
                            {formatTime(meetingStart, 'h:mm a')} ({meeting.duration} min)
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Week view implementation
  if (view === 'week') {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const currentHour = now.getHours();
    let hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 8 PM
    
    // Ensure hours is always an array
    if (!Array.isArray(hours) || hours.length === 0) {
      console.warn('No valid hours found for week view, using default hours');
      hours = DEFAULT_HOURS;
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={navigatePrevious}>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold">
              {formatDate(weekStart, 'MMM d')} - {formatDate(weekEnd, 'MMM d, yyyy')}
            </h2>
            <Button variant="outline" size="sm" onClick={navigateNext}>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant={view === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('day')}
            >
              Day
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('week')}
            >
              Week
            </Button>
            <Button
              variant={view === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('month')}
            >
              Month
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-8 border-b">
              <div className="p-2 border-r text-sm font-medium">Time</div>
              {weekDays.map(day => {
                const isToday = isSameDay(day, now);
                return (
                  <div 
                    key={day.toISOString()} 
                    className={cn(
                      "p-2 border-r text-sm font-medium text-center",
                      isToday && "bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
                    )}
                  >
                    <div>{formatDate(day, 'EEE')}</div>
                    <div className={cn(
                      "text-muted-foreground",
                      isToday && "text-blue-600 dark:text-blue-400 font-bold"
                    )}>
                      {formatDate(day, 'd')}
                      {isToday && " (Today)"}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="relative">
              {hours && Array.isArray(hours) ? hours.map(hour => {
                const isCurrentHourRow = hour === currentHour;
                
                return (
                  <div key={hour} className="grid grid-cols-8 border-b min-h-[60px]">
                    <div className={cn(
                      "p-2 border-r text-sm text-muted-foreground",
                      isCurrentHourRow && "text-blue-600 dark:text-blue-400 font-semibold"
                    )}>
                      {format(startOfHour(setHours(new Date(), hour)), 'h:mm a')}
                    </div>
                    {weekDays.map(day => {
                      const timeSlot = startOfHour(setHours(day, hour));
                      const isToday = isSameDay(day, now);
                      const isCurrentTimeSlot = isToday && isCurrentHourRow;
                      const calendarBlock = getCalendarBlock(day, hour);

                      return (
                        <div 
                          key={`${day.toISOString()}-${hour}`}
                          className={cn(
                            "p-1 border-r hover:bg-muted/50 cursor-pointer relative group",
                            calendarBlock && BLOCK_TYPES.find(t => t.value === calendarBlock.blockType)?.color,
                            isToday && "bg-blue-50/30 dark:bg-blue-950/10",
                            isCurrentTimeSlot && "bg-blue-100 dark:bg-blue-950/40 ring-2 ring-inset ring-blue-500"
                          )}
                          onClick={() => handleTimeSlotClick(timeSlot)}
                          title={calendarBlock?.reason || "Click to add event"}
                        >
                          {calendarBlock && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 z-0">
                              <span className="text-xs font-medium">{calendarBlock.reason}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              }) : (
                <div className="p-4 text-center text-muted-foreground">
                  No hours available for this view
                </div>
              )}
              
              {/* Render sessions and meetings as absolute positioned blocks for each day */}
              {weekDays.map((day, dayIndex) => {
                const firstHour = hours[0] || 8;
                
                return (
                  <div 
                    key={`events-${day.toISOString()}`}
                    className="absolute top-0 pointer-events-none"
                    style={{
                      left: `calc((100% - ${100/8}%) * ${(dayIndex + 1) / 7})`,
                      width: `calc(${100/8}%)`,
                      height: '100%'
                    }}
                  >
                    {/* Render sessions */}
                    {filteredSessions
                      .filter(session => {
                        const sessionStart = fromUtc(new Date(session.date));
                        return isSameDay(sessionStart, day);
                      })
                      .map(session => {
                        const sessionStart = fromUtc(new Date(session.date));
                        const duration = session.duration || 50;
                        
                        const minutesFromStart = (sessionStart.getHours() - firstHour) * 60 + sessionStart.getMinutes();
                        const topOffset = (minutesFromStart / 60) * 60; // 60px per hour
                        const height = (duration / 60) * 60;
                        
                        return (
                          <div
                            key={session.id}
                            className="absolute left-0.5 right-0.5 pointer-events-auto"
                            style={{
                              top: `${topOffset}px`,
                              height: `${height}px`,
                              zIndex: 10
                            }}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <div
                                  className="h-full bg-primary text-primary-foreground rounded px-1 py-0.5 cursor-pointer hover:opacity-90 transition-opacity border border-primary-foreground/20 overflow-hidden text-[10px]"
                                  onClick={(e) => e.stopPropagation()}
                                  title={`${session.client?.name || session.patient?.name || 'Client'} - ${formatTime(sessionStart, 'h:mm a')} (${duration} min)`}
                                >
                                  <div className="font-semibold truncate">
                                    {session.client?.name || session.patient?.name || 'Client'}
                                  </div>
                                  {height > 30 && (
                                    <div className="opacity-90 truncate">
                                      {formatTime(sessionStart, 'h:mm a')}
                                    </div>
                                  )}
                                </div>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleSessionClick(session, "reschedule")}>
                                  <CalendarIcon className="h-4 w-4 mr-2" />
                                  Reschedule
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSessionClick(session, "complete")}>
                                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                                  Complete Session
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSessionClick(session, "notes")}>
                                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                                  Add Note
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSessionClick(session, "invoice")}>
                                  <ReceiptPercentIcon className="h-4 w-4 mr-2" />
                                  Invoice Client
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSessionClick(session, "no-show")}>
                                  <XCircleIcon className="h-4 w-4 mr-2" />
                                  No-show
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })}
                    
                    {/* Render meetings */}
                    {meetings
                      .filter(meeting => {
                        const meetingStart = fromUtc(new Date(meeting.date));
                        return isSameDay(meetingStart, day);
                      })
                      .map(meeting => {
                        const meetingStart = fromUtc(new Date(meeting.date));
                        const duration = meeting.duration || 30;
                        
                        const minutesFromStart = (meetingStart.getHours() - firstHour) * 60 + meetingStart.getMinutes();
                        const topOffset = (minutesFromStart / 60) * 60;
                        const height = (duration / 60) * 60;
                        
                        const meetingType = meetingTypes.find(t => t.id === meeting.typeId);
                        return (
                          <div
                            key={meeting.id}
                            className="absolute left-0.5 right-0.5 pointer-events-auto"
                            style={{
                              top: `${topOffset}px`,
                              height: `${height}px`,
                              zIndex: 10
                            }}
                          >
                            <div
                              className="h-full rounded px-1 py-0.5 cursor-pointer hover:opacity-90 transition-opacity border border-white/20 overflow-hidden text-[10px]"
                              style={{
                                backgroundColor: meetingType?.color || '#6b7280',
                                color: '#ffffff'
                              }}
                              onClick={(e) => e.stopPropagation()}
                              title={`${meeting.title} - ${formatTime(meetingStart, 'h:mm a')} (${duration} min)`}
                            >
                              <div className="font-semibold truncate">{meeting.title}</div>
                              {height > 30 && (
                                <div className="opacity-90 truncate">
                                  {formatTime(meetingStart, 'h:mm a')}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Month view - simplified implementation
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={navigatePrevious}>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">
            {formatDate(currentDate, 'MMMM yyyy')}
          </h2>
          <Button variant="outline" size="sm" onClick={navigateNext}>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('day')}
          >
            Day
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('week')}
          >
            Week
          </Button>
          <Button
            variant={view === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('month')}
          >
            Month
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            Month view coming soon. Use Day or Week view for full timezone-aware scheduling.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}