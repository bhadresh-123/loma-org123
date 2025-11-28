// Note Format Type System - Unified approach
export type NoteFormat = 'SOAP' | 'DAP' | 'BIRP' | 'GIRP' | 'PIRP' | 'Narrative';

export interface UserNoteSettings {
  defaultNoteFormat: NoteFormat;
  sessionDuration: number;
  timeZone: string;
}

// Database field mapping - matches actual schema
export const NOTE_SETTINGS_FIELDS = {
  defaultNoteFormat: 'default_note_format',
  sessionDuration: 'session_duration', 
  timeZone: 'time_zone'
} as const;

// Transform database response to API format
export const transformNoteSettingsFromDb = (dbData: any): UserNoteSettings => {
  return {
    defaultNoteFormat: dbData.default_note_format || 'SOAP',
    sessionDuration: dbData.session_duration || 50,
    timeZone: dbData.time_zone || 'America/New_York'
  };
};

// Transform API data to database format
export const transformNoteSettingsToDb = (apiData: Partial<UserNoteSettings>) => {
  const dbData: Record<string, any> = {};
  
  if (apiData.defaultNoteFormat !== undefined) {
    dbData.default_note_format = apiData.defaultNoteFormat;
  }
  if (apiData.sessionDuration !== undefined) {
    dbData.session_duration = apiData.sessionDuration;
  }
  if (apiData.timeZone !== undefined) {
    dbData.time_zone = apiData.timeZone;
  }
  
  return dbData;
};