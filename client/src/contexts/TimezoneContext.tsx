import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupportedTimezone, isValidTimezone } from '@/utils/timezoneUtils';

interface TimezoneContextValue {
  userTimezone: SupportedTimezone;
  setUserTimezone: (timezone: SupportedTimezone) => void;
  isLoading: boolean;
}

const TimezoneContext = createContext<TimezoneContextValue | undefined>(undefined);

interface TimezoneProviderProps {
  children: ReactNode;
}

export function TimezoneProvider({ children }: TimezoneProviderProps) {
  const [userTimezone, setUserTimezone] = useState<SupportedTimezone>(() => {
    // Use browser timezone by default
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimezone(browserTimezone) ? browserTimezone : 'America/Los_Angeles';
  });
  const [isLoading, setIsLoading] = useState(false);

  // No API calls, no dependencies on auth
  // TimezoneContext is now completely independent
  const value: TimezoneContextValue = {
    userTimezone,
    setUserTimezone,
    isLoading,
  };

  return (
    <TimezoneContext.Provider value={value}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone(): TimezoneContextValue {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
}