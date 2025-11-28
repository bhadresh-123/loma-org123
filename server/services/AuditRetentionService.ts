import { db } from '@db';
import { auditLogsHIPAA } from '@db/schema';
import { lt, and, sql } from 'drizzle-orm';
import { log } from '../vite';

export interface RetentionPolicy {
  /** Retention period in years */
  retentionYears: number;
  /** Whether to archive before deletion */
  archiveBeforeDelete: boolean;
  /** Archive location (if archiving is enabled) */
  archiveLocation?: string;
}

export interface RetentionStats {
  /** Number of records processed */
  recordsProcessed: number;
  /** Number of records deleted */
  recordsDeleted: number;
  /** Number of records archived */
  recordsArchived: number;
  /** Number of errors encountered */
  errors: number;
  /** Processing duration in milliseconds */
  durationMs: number;
}

export class AuditRetentionService {
  private defaultPolicy: RetentionPolicy = {
    retentionYears: 7, // HIPAA requirement
    archiveBeforeDelete: true,
    archiveLocation: './archives/audit-logs'
  };

  /**
   * Enforces the retention policy by cleaning up old audit logs
   */
  async enforceRetentionPolicy(policy?: Partial<RetentionPolicy>): Promise<RetentionStats> {
    const startTime = Date.now();
    const stats: RetentionStats = {
      recordsProcessed: 0,
      recordsDeleted: 0,
      recordsArchived: 0,
      errors: 0,
      durationMs: 0
    };

    try {
      const effectivePolicy = { ...this.defaultPolicy, ...policy };
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - effectivePolicy.retentionYears);

      log(`Starting audit log retention enforcement. Cutoff date: ${cutoffDate.toISOString()}`);

      // Find records to be processed
      const recordsToProcess = await db
        .select()
        .from(auditLogsHIPAA)
        .where(lt(auditLogsHIPAA.dataRetentionDate, cutoffDate));

      stats.recordsProcessed = recordsToProcess.length;
      log(`Found ${stats.recordsProcessed} audit records exceeding retention period`);

      if (stats.recordsProcessed === 0) {
        stats.durationMs = Date.now() - startTime;
        return stats;
      }

      // Archive records if enabled
      if (effectivePolicy.archiveBeforeDelete && effectivePolicy.archiveLocation) {
        await this.archiveRecords(recordsToProcess, effectivePolicy.archiveLocation);
        stats.recordsArchived = stats.recordsProcessed;
      }

      // Delete old records
      const deleteResult = await db
        .delete(auditLogsHIPAA)
        .where(lt(auditLogsHIPAA.dataRetentionDate, cutoffDate));

      stats.recordsDeleted = deleteResult.rowCount || 0;
      log(`Deleted ${stats.recordsDeleted} audit records`);

    } catch (error) {
      stats.errors++;
      log(`Error during retention policy enforcement: ${error}`);
      throw error;
    } finally {
      stats.durationMs = Date.now() - startTime;
    }

    return stats;
  }

  /**
   * Archives audit records to a specified location
   */
  private async archiveRecords(records: any[], archiveLocation: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Ensure archive directory exists
      await fs.mkdir(archiveLocation, { recursive: true });
      
      // Create archive filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archiveFile = path.join(archiveLocation, `audit-logs-${timestamp}.json`);
      
      // Write records to archive file
      await fs.writeFile(archiveFile, JSON.stringify(records, null, 2));
      
      log(`Archived ${records.length} audit records to ${archiveFile}`);
    } catch (error) {
      log(`Error archiving records: ${error}`);
      throw error;
    }
  }

  /**
   * Gets statistics about current audit log storage
   */
  async getStorageStats(): Promise<{
    totalRecords: number;
    oldestRecord: Date | null;
    newestRecord: Date | null;
    recordsExceedingRetention: number;
    estimatedStorageSize: string;
  }> {
    try {
      // Get total count
      const totalCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogsHIPAA);

      // Get oldest and newest records
      const oldestRecord = await db
        .select({ createdAt: auditLogsHIPAA.createdAt })
        .from(auditLogsHIPAA)
        .orderBy(auditLogsHIPAA.createdAt)
        .limit(1);

      const newestRecord = await db
        .select({ createdAt: auditLogsHIPAA.createdAt })
        .from(auditLogsHIPAA)
        .orderBy(sql`${auditLogsHIPAA.createdAt} DESC`)
        .limit(1);

      // Count records exceeding retention
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - this.defaultPolicy.retentionYears);
      
      const exceedingRetention = await db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogsHIPAA)
        .where(lt(auditLogsHIPAA.dataRetentionDate, cutoffDate));

      // Estimate storage size (rough calculation)
      const avgRecordSize = 1024; // 1KB per record estimate
      const estimatedSizeBytes = totalCount[0]?.count * avgRecordSize || 0;
      const estimatedSizeMB = Math.round(estimatedSizeBytes / (1024 * 1024));

      return {
        totalRecords: totalCount[0]?.count || 0,
        oldestRecord: oldestRecord[0]?.createdAt || null,
        newestRecord: newestRecord[0]?.createdAt || null,
        recordsExceedingRetention: exceedingRetention[0]?.count || 0,
        estimatedStorageSize: `${estimatedSizeMB} MB`
      };
    } catch (error) {
      log(`Error getting storage stats: ${error}`);
      throw error;
    }
  }

  /**
   * Validates that the retention policy is being enforced correctly
   */
  async validateRetentionPolicy(): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const stats = await this.getStorageStats();
      
      // Check if there are records exceeding retention
      if (stats.recordsExceedingRetention > 0) {
        issues.push(`${stats.recordsExceedingRetention} records exceed retention policy`);
        recommendations.push('Run retention policy enforcement to clean up old records');
      }

      // Check storage size
      const sizeInMB = parseInt(stats.estimatedStorageSize.replace(' MB', ''));
      if (sizeInMB > 1000) { // More than 1GB
        issues.push(`Large storage usage: ${stats.estimatedStorageSize}`);
        recommendations.push('Consider more frequent retention policy enforcement');
      }

      // Check if oldest record is too old
      if (stats.oldestRecord) {
        const oldestAge = Date.now() - stats.oldestRecord.getTime();
        const oldestAgeYears = oldestAge / (1000 * 60 * 60 * 24 * 365);
        
        if (oldestAgeYears > this.defaultPolicy.retentionYears + 1) {
          issues.push(`Oldest record is ${oldestAgeYears.toFixed(1)} years old`);
          recommendations.push('Immediately run retention policy enforcement');
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
        recommendations
      };
    } catch (error) {
      issues.push(`Error validating retention policy: ${error}`);
      return {
        isValid: false,
        issues,
        recommendations: ['Check database connection and audit log table structure']
      };
    }
  }

  /**
   * Updates the default retention policy
   */
  updateRetentionPolicy(policy: Partial<RetentionPolicy>): void {
    this.defaultPolicy = { ...this.defaultPolicy, ...policy };
    log(`Updated retention policy: ${JSON.stringify(this.defaultPolicy)}`);
  }

  /**
   * Gets the current retention policy
   */
  getRetentionPolicy(): RetentionPolicy {
    return { ...this.defaultPolicy };
  }
}

// Export singleton instance
export const auditRetentionService = new AuditRetentionService();
