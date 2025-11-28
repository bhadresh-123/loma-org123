// Emergency data integrity fix for corrupted profile data
import { db, getActiveSchema } from '@db';
import { eq } from 'drizzle-orm';

export class DataIntegrityFixer {
  
  /**
   * Fix double-encoded JSON arrays in specialties, languages, therapistIdentities
   */
  static async fixCorruptedArrayFields(userId: number): Promise<void> {
    try {
      const schema = getActiveSchema();
      const user = await db.query[schema.users].findFirst({
        where: eq(schema.users.id, userId)
      });
      
      if (!user) return;
      
      const updates: any = {};
      
      // Fix specialties
      if (user.specialties) {
        const fixed = this.fixJsonField(user.specialties);
        if (fixed !== user.specialties) {
          updates.specialties = fixed;
        }
      }
      
      // Fix languages
      if (user.languages) {
        const fixed = this.fixJsonField(user.languages);
        if (fixed !== user.languages) {
          updates.languages = fixed;
        }
      }
      
      // Fix therapistIdentities
      if (user.therapistIdentities) {
        const fixed = this.fixJsonField(user.therapistIdentities);
        if (fixed !== user.therapistIdentities) {
          updates.therapistIdentities = fixed;
        }
      }
      
      // Apply fixes if any
      if (Object.keys(updates).length > 0) {
        await db.update(schema.users)
          .set(updates)
          .where(eq(users.id, userId));
        console.log(`[DATA-INTEGRITY] Fixed corrupted fields for user ${userId}:`, Object.keys(updates));
      }
      
    } catch (error) {
      console.error(`[DATA-INTEGRITY] Error fixing user ${userId}:`, error);
    }
  }
  
  /**
   * Fix a single JSON field that may be double-encoded
   */
  private static fixJsonField(fieldValue: string): string {
    try {
      // Try to parse the field
      const parsed = JSON.parse(fieldValue);
      
      // If it's already an array, return properly serialized
      if (Array.isArray(parsed)) {
        return JSON.stringify(parsed);
      }
      
      // If it's a string that might be double-encoded, try parsing again
      if (typeof parsed === 'string') {
        try {
          const doubleParsed = JSON.parse(parsed);
          if (Array.isArray(doubleParsed)) {
            return JSON.stringify(doubleParsed);
          }
        } catch {
          // Not double-encoded, wrap in array
          return JSON.stringify([parsed]);
        }
      }
      
      // Wrap single values in array
      return JSON.stringify([parsed]);
      
    } catch {
      // If parsing fails, assume it's a plain value
      return JSON.stringify([fieldValue]);
    }
  }
  
  /**
   * Fix LOMA settings for a user
   */
  static async fixLomaSettings(userId: number, settings: {
    defaultNoteFormat?: string;
    sessionDuration?: number;
    timeZone?: string;
  }): Promise<void> {
    try {
      const updates: any = {};
      
      if (settings.defaultNoteFormat) {
        updates.defaultNoteFormat = settings.defaultNoteFormat;
      }
      if (settings.sessionDuration) {
        updates.sessionDuration = settings.sessionDuration;
      }
      if (settings.timeZone) {
        updates.timeZone = settings.timeZone;
      }
      
      if (Object.keys(updates).length > 0) {
        await db.update(schema.users)
          .set(updates)
          .where(eq(users.id, userId));
        console.log(`[LOMA-SETTINGS] Updated settings for user ${userId}:`, updates);
      }
      
    } catch (error) {
      console.error(`[LOMA-SETTINGS] Error updating user ${userId}:`, error);
    }
  }
}