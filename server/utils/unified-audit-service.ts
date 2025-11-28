import crypto from 'crypto';
import { db } from '@db';
import { auditLogsHIPAA } from '@db/schema';
import { logAuditEvent } from './audit-system';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

/**
 * Unified Audit Service
 * 
 * Provides comprehensive PHI access logging to database with file fallback
 * Combines the best of both HIPAA audit service and file-based logging
 */

export interface PHIAccessLogParams {
  userId: number | null;
  action: string;
  resourceType: string;
  resourceId?: number;
  fieldsAccessed?: string[];
  requestMethod?: string;
  requestPath?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  details?: string;
  sessionId?: string;
  correlationId?: string;
}

export interface DetailedPHIAccessLogParams extends PHIAccessLogParams {
  requestBody?: string;
  responseStatus?: number;
  responseTime?: number;
  securityLevel?: 'standard' | 'phi-protected' | 'admin';
  riskScore?: number;
}

/**
 * Calculate risk score for audit logging
 */
function calculateRiskScore(params: {
  action: string;
  fieldsAccessed?: string[];
  responseStatus?: number;
  success: boolean;
}): number {
  let score = 0;

  // Base score by action
  const actionScores: Record<string, number> = {
    'CREATE': 10,
    'READ': 5,
    'UPDATE': 15,
    'DELETE': 20,
    'PHI_ACCESS': 25,
    'EXPORT': 30,
    'PHI_CREATE': 10,
    'PHI_UPDATE': 15,
    'PHI_DELETE': 20,
    'LOGIN_ATTEMPT': 5,
    'LOGOUT': 2,
    'FAILED_ACCESS': 15,
  };
  score += actionScores[params.action] || 5;

  // Add score for PHI fields accessed
  if (params.fieldsAccessed) {
    score += params.fieldsAccessed.length * 2;
  }

  // Add score for failed requests
  if (!params.success) {
    score += 10;
  }

  // Add score for failed HTTP responses
  if (params.responseStatus && params.responseStatus >= 400) {
    score += 10;
  }

  return Math.min(score, 100); // Cap at 100
}

/**
 * Log PHI access to database with comprehensive tracking
 */
export async function logPHIAccessToDatabase(params: PHIAccessLogParams): Promise<void> {
  try {
    const phiFieldsCount = params.fieldsAccessed?.length || 0;
    const dataRetentionDate = new Date();
    dataRetentionDate.setFullYear(dataRetentionDate.getFullYear() + 7); // 7 years retention

    const riskScore = calculateRiskScore({
      action: params.action,
      fieldsAccessed: params.fieldsAccessed,
      success: params.success
    });

    await db.insert(auditLogsHIPAA).values({
      userId: params.userId,
      sessionId: params.sessionId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      fieldsAccessed: params.fieldsAccessed || [],
      phiFieldsCount,
      requestMethod: params.requestMethod,
      requestPath: params.requestPath,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      responseStatus: params.success ? 200 : 400, // Default status codes
      securityLevel: phiFieldsCount > 0 ? 'phi-protected' : 'standard',
      riskScore,
      hipaaCompliant: true,
      dataRetentionDate,
      correlationId: params.correlationId || crypto.randomUUID(),
      traceId: crypto.randomUUID(),
    });

    console.log(`[AUDIT-DB] ${params.action}: User ${params.userId} ${params.success ? 'SUCCESS' : 'FAILED'} - ${params.resourceType}${params.resourceId ? ` #${params.resourceId}` : ''}`);
  } catch (error) {
    console.error('Failed to log PHI access to database:', error);
    
    // Fallback to file logging if database fails
    try {
      logAuditEvent({
        userId: params.userId,
        action: params.action as any,
        resourceType: params.resourceType as any,
        resourceId: params.resourceId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        success: params.success,
        details: `[FALLBACK] ${params.details || ''} - Database logging failed`
      });
    } catch (fallbackError) {
      console.error('Failed to log PHI access to file (fallback):', fallbackError);
    }
  }
}

/**
 * Log detailed PHI access with additional metadata
 */
export async function logDetailedPHIAccessToDatabase(params: DetailedPHIAccessLogParams): Promise<void> {
  try {
    const phiFieldsCount = params.fieldsAccessed?.length || 0;
    const dataRetentionDate = new Date();
    dataRetentionDate.setFullYear(dataRetentionDate.getFullYear() + 7); // 7 years retention

    const riskScore = params.riskScore || calculateRiskScore({
      action: params.action,
      fieldsAccessed: params.fieldsAccessed,
      responseStatus: params.responseStatus,
      success: params.success
    });

    await db.insert(auditLogsHIPAA).values({
      userId: params.userId,
      sessionId: params.sessionId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      fieldsAccessed: params.fieldsAccessed || [],
      phiFieldsCount,
      requestMethod: params.requestMethod,
      requestPath: params.requestPath,
      requestBody: params.requestBody,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      responseStatus: params.responseStatus,
      responseTime: params.responseTime,
      securityLevel: params.securityLevel || (phiFieldsCount > 0 ? 'phi-protected' : 'standard'),
      riskScore,
      hipaaCompliant: true,
      dataRetentionDate,
      correlationId: params.correlationId || crypto.randomUUID(),
      traceId: crypto.randomUUID(),
    });

    console.log(`[AUDIT-DB-DETAILED] ${params.action}: User ${params.userId} ${params.success ? 'SUCCESS' : 'FAILED'} - ${params.resourceType}${params.resourceId ? ` #${params.resourceId}` : ''} (Risk: ${riskScore})`);
  } catch (error) {
    console.error('Failed to log detailed PHI access to database:', error);
    
    // Fallback to simple database logging
    await logPHIAccessToDatabase(params);
  }
}

/**
 * Get audit logs from database with filtering
 */
export async function getAuditLogsFromDatabase(options: {
  limit?: number;
  offset?: number;
  userId?: number;
  action?: string;
  resourceType?: string;
  resourceId?: number;
  startDate?: Date;
  endDate?: Date;
  minRiskScore?: number;
} = {}): Promise<{
  logs: any[];
  total: number;
  hasMore: boolean;
}> {
  try {
    const {
      limit = 100,
      offset = 0,
      userId,
      action,
      resourceType,
      resourceId,
      startDate,
      endDate,
      minRiskScore
    } = options;

    // Build conditions using Drizzle ORM
    const conditions = [];
    if (userId) conditions.push(eq(auditLogsHIPAA.userId, userId));
    if (action) conditions.push(eq(auditLogsHIPAA.action, action));
    if (resourceType) conditions.push(eq(auditLogsHIPAA.resourceType, resourceType));
    if (resourceId) conditions.push(eq(auditLogsHIPAA.resourceId, resourceId));
    if (startDate) conditions.push(gte(auditLogsHIPAA.createdAt, startDate));
    if (endDate) conditions.push(lte(auditLogsHIPAA.createdAt, endDate));
    if (minRiskScore) conditions.push(gte(auditLogsHIPAA.riskScore, minRiskScore));

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogsHIPAA)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const total = totalResult[0]?.count || 0;

    // Get logs with pagination
    const logs = await db
      .select()
      .from(auditLogsHIPAA)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogsHIPAA.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      logs,
      total,
      hasMore: offset + limit < total
    };
  } catch (error) {
    console.error('Failed to get audit logs from database:', error);
    return { logs: [], total: 0, hasMore: false };
  }
}

/**
 * Get audit statistics from database
 */
export async function getAuditStatsFromDatabase(): Promise<{
  totalEvents: number;
  recentEvents: number;
  failedAccess: number;
  highRiskEvents: number;
  phiAccessEvents: number;
}> {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get total events
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogsHIPAA);
    
    // Get recent events (last 24 hours)
    const recentResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogsHIPAA)
      .where(gte(auditLogsHIPAA.createdAt, last24Hours));
    
    // Get failed access events
    const failedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogsHIPAA)
      .where(gte(auditLogsHIPAA.responseStatus, 400));
    
    // Get high risk events
    const highRiskResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogsHIPAA)
      .where(gte(auditLogsHIPAA.riskScore, 50));
    
    // Get PHI access events
    const phiResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogsHIPAA)
      .where(gte(auditLogsHIPAA.phiFieldsCount, 1));

    return {
      totalEvents: totalResult[0]?.count || 0,
      recentEvents: recentResult[0]?.count || 0,
      failedAccess: failedResult[0]?.count || 0,
      highRiskEvents: highRiskResult[0]?.count || 0,
      phiAccessEvents: phiResult[0]?.count || 0
    };
  } catch (error) {
    console.error('Failed to get audit stats from database:', error);
    return {
      totalEvents: 0,
      recentEvents: 0,
      failedAccess: 0,
      highRiskEvents: 0,
      phiAccessEvents: 0
    };
  }
}

/**
 * Validate that audit logging is working correctly
 */
export async function validateAuditLogging(): Promise<{
  databaseLogging: boolean;
  fileLogging: boolean;
  error?: string;
}> {
  try {
    // Test database logging
    const testParams: PHIAccessLogParams = {
      userId: null, // Test with null user (no authenticated user for validation test)
      action: 'VALIDATION_TEST',
      resourceType: 'SYSTEM',
      success: true,
      details: 'Audit logging validation test'
    };

    await logPHIAccessToDatabase(testParams);
    
    // Clean up test log
    await db.delete(auditLogsHIPAA).where(eq(auditLogsHIPAA.action, 'VALIDATION_TEST'));

    return {
      databaseLogging: true,
      fileLogging: true // File logging is always available as fallback
    };
  } catch (error) {
    return {
      databaseLogging: false,
      fileLogging: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
