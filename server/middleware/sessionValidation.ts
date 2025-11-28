
import { Request, Response, NextFunction } from 'express';

// Helper function to create a timezone-aware date from components
const createTimezoneAwareDate = (year: number, month: number, day: number, hours: number, minutes: number): Date => {
  // Create a UTC date object - all dates are now stored in UTC
  const date = new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));
  
  console.log(`Creating UTC date: ${year}-${month+1}-${day} ${hours}:${minutes}`);
  console.log(`Resulting UTC date: ${date.toISOString()}`);
  
  return date;
}

export const validateSessionData = (req: Request, res: Response, next: NextFunction) => {
  const { patientId, date, duration, type } = req.body;
  
  // Check required fields
  if (!patientId || !date) {
    return res.status(400).json({ error: 'Client ID and date are required' });
  }
  
  // Validate date format
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    // Convert date to UTC for storage - frontend will handle timezone display
    if (typeof date === 'string') {
      // Parse ISO string directly - it should already be in UTC from frontend
      req.body.date = new Date(date);
      console.log(`[TIMEZONE TEST] Backend: Parsed ISO date for UTC storage: ${req.body.date.toISOString()}`);
    } else {
      // It's already a Date object, ensure it's UTC
      req.body.date = dateObj;
      console.log(`[TIMEZONE TEST] Backend: Using date object for UTC storage: ${req.body.date.toISOString()}`);
    }
  } catch (error) {
    return res.status(400).json({ error: 'Invalid date format' });
  }
  
  // Validate patientId is a number
  if (isNaN(parseInt(patientId))) {
    return res.status(400).json({ error: 'Client ID must be a number' });
  }
  
  // Validate duration if provided
  if (duration && isNaN(parseInt(duration))) {
    return res.status(400).json({ error: 'Duration must be a number' });
  }
  
  next();
};
