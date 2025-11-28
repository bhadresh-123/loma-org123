/**
 * Work Schedule Validation Utilities
 * 
 * Pure functions for validating work schedule data without database dependencies
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface WorkScheduleInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/**
 * Validate that schedules don't overlap
 */
export function validateNoOverlaps(schedules: WorkScheduleInput[]): ValidationError[] {
  const errors: ValidationError[] = [];

  // Group schedules by day of week
  const schedulesByDay = schedules.reduce((acc, schedule) => {
    if (!acc[schedule.dayOfWeek]) {
      acc[schedule.dayOfWeek] = [];
    }
    acc[schedule.dayOfWeek].push(schedule);
    return acc;
  }, {} as Record<number, WorkScheduleInput[]>);

  // Check for overlaps within each day
  for (const [dayOfWeek, daySchedules] of Object.entries(schedulesByDay)) {
    const sortedSchedules = daySchedules.sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    for (let i = 0; i < sortedSchedules.length - 1; i++) {
      const current = sortedSchedules[i];
      const next = sortedSchedules[i + 1];
      
      if (current.endTime > next.startTime) {
        errors.push({
          field: `dayOfWeek_${dayOfWeek}`,
          message: `Schedule overlap detected: ${current.startTime}-${current.endTime} overlaps with ${next.startTime}-${next.endTime}`
        });
      }
    }
  }

  return errors;
}

/**
 * Validate time format (HH:MM)
 */
export function validateTimeFormat(time: string): boolean {
  const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Validate that end time is after start time
 */
export function validateTimeOrder(startTime: string, endTime: string): boolean {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  return endMinutes > startMinutes;
}

/**
 * Validate day of week (0-6)
 */
export function validateDayOfWeek(dayOfWeek: number): boolean {
  return Number.isInteger(dayOfWeek) && dayOfWeek >= 0 && dayOfWeek <= 6;
}
