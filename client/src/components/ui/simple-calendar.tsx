import React, { useState } from 'react';
import { Button } from './button';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { dayjs } from '@/utils/dateFnsCompat';

interface SimpleCalendarProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
  classNames?: {
    months?: string;
    month?: string;
    caption?: string;
    caption_label?: string;
    nav?: string;
    nav_button?: string;
    table?: string;
    head_row?: string;
    head_cell?: string;
    row?: string;
    cell?: string;
    day?: string;
    day_selected?: string;
    day_outside?: string;
    day_disabled?: string;
    day_range_middle?: string;
    day_hidden?: string;
  };
  components?: {
    Day?: ({ date }: { date: Date }) => React.ReactNode;
  };
}

export function SimpleCalendar({
  selected,
  onSelect,
  className,
  classNames = {},
  components,
}: SimpleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(dayjs());
  
  const startOfMonth = currentDate.startOf('month');
  const endOfMonth = currentDate.endOf('month');
  const startOfCalendar = startOfMonth.startOf('week');
  const endOfCalendar = endOfMonth.endOf('week');
  
  const weeks = [];
  let currentWeek = [];
  let day = startOfCalendar;
  
  while (day.isBefore(endOfCalendar) || day.isSame(endOfCalendar)) {
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
    day = day.add(1, 'day');
  }
  
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }
  
  const handlePrevious = () => {
    setCurrentDate(currentDate.subtract(1, 'month'));
  };
  
  const handleNext = () => {
    setCurrentDate(currentDate.add(1, 'month'));
  };
  
  const handleDayClick = (date: dayjs.Dayjs) => {
    if (onSelect) {
      onSelect(date.toDate());
    }
  };
  
  const isSelected = (date: dayjs.Dayjs) => {
    return selected && dayjs(selected).isSame(date, 'day');
  };
  
  const isToday = (date: dayjs.Dayjs) => {
    return dayjs().isSame(date, 'day');
  };
  
  const isOutsideMonth = (date: dayjs.Dayjs) => {
    return !date.isSame(currentDate, 'month');
  };
  
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  
  return (
    <div className={cn("p-1", className)}>
      <div className={cn("flex justify-center pt-1 relative items-center mb-2", classNames.caption)}>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          className={cn("h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1", classNames.nav_button)}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <div className={cn("text-sm font-medium", classNames.caption_label)}>
          {currentDate.format('MMMM YYYY')}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          className={cn("h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1", classNames.nav_button)}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
      
      <div className={cn("w-full border-collapse space-y-0.5", classNames.table)}>
        <div className={cn("flex w-full", classNames.head_row)}>
          {weekDays.map((day) => (
            <div
              key={day}
              className={cn(
                "text-muted-foreground rounded-md w-full font-normal text-[0.8rem] flex-1 text-center p-1",
                classNames.head_cell
              )}
            >
              {day}
            </div>
          ))}
        </div>
        
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className={cn("flex w-full mt-0.5", classNames.row)}>
            {week.map((day) => {
              const isSelectedDay = isSelected(day);
              const isTodayDay = isToday(day);
              const isOutside = isOutsideMonth(day);
              
              return (
                <div
                  key={day.format('YYYY-MM-DD')}
                  className={cn(
                    "text-center text-sm relative p-0 flex-1 h-6",
                    isSelectedDay && "[&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    classNames.cell
                  )}
                >
                  {components?.Day ? (
                    components.Day({ date: day.toDate() })
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        "h-6 w-full p-0 font-normal text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                        isSelectedDay && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                        isTodayDay && "bg-accent text-accent-foreground",
                        isOutside && "text-muted-foreground opacity-50",
                        classNames.day,
                        isSelectedDay && classNames.day_selected,
                        isOutside && classNames.day_outside
                      )}
                    >
                      {day.date()}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}