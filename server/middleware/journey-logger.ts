import { Request, Response, NextFunction } from 'express';

interface JourneyLog {
  timestamp: Date;
  userId?: number;
  step: string;
  action: string;
  data?: any;
  duration?: number;
}

const journeyLogs: JourneyLog[] = [];

export const journeyLogger = (req: Request, res: Response, next: NextFunction) => {
  // Only log onboarding-related requests
  if (!req.path.includes('/api/onboarding')) {
    return next();
  }

  const startTime = Date.now();
  const log: JourneyLog = {
    timestamp: new Date(),
    userId: 1, // Demo mode - use default user ID
    step: req.path.split('/').pop() || 'unknown',
    action: req.method,
    data: req.method === 'GET' ? undefined : req.body
  };

  // Store original end function
  const originalEnd = res.end;
  const chunks: Buffer[] = [];

  // Override end function to capture response
  res.end = function(chunk?: any) {
    if (chunk) {
      chunks.push(Buffer.from(chunk));
    }

    // Calculate request duration
    log.duration = Date.now() - startTime;

    // Log the journey step
    logJourneyStep(log, res.statusCode, Buffer.concat(chunks).toString());

    // Call original end function
    return originalEnd.apply(res, arguments as any);
  };

  next();
};

function logJourneyStep(journeyLog: JourneyLog, statusCode: number, response: string) {
  try {
    const responseData = JSON.parse(response);

    console.log(`Journey Log:
  Step: ${journeyLog.step}
  Action: ${journeyLog.action}
  Status: ${statusCode}
  Duration: ${journeyLog.duration}ms
  User ID: ${journeyLog.userId || 'demo'}
  Data: ${JSON.stringify(journeyLog.data || responseData, null, 2)}
    `);

    journeyLogs.push(journeyLog);

  } catch (error) {
    console.error(`Error logging journey step: ${String(error)}`);
  }
}

export function getJourneyLogs(userId?: number): JourneyLog[] {
  return userId 
    ? journeyLogs.filter(log => log.userId === userId)
    : journeyLogs;
}

export function clearJourneyLogs() {
  journeyLogs.length = 0;
}