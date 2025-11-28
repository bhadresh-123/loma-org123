// Simple audit logging system for HIPAA compliance
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export enum AuditAction {
  PHI_ACCESS = 'PHI_ACCESS',
  PHI_CREATE = 'PHI_CREATE', 
  PHI_UPDATE = 'PHI_UPDATE',
  PHI_DELETE = 'PHI_DELETE',
  LOGIN_ATTEMPT = 'LOGIN_ATTEMPT',
  LOGOUT = 'LOGOUT',
  REGISTRATION = 'REGISTRATION',
  FAILED_ACCESS = 'FAILED_ACCESS',
  // MFA Actions (HIPAA 1.4.4 compliance)
  MFA_SETUP_INITIATED = 'MFA_SETUP_INITIATED',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  MFA_VERIFIED = 'MFA_VERIFIED',
  MFA_RECOVERY_CODE_USED = 'MFA_RECOVERY_CODE_USED',
  MFA_RECOVERY_CODES_REGENERATED = 'MFA_RECOVERY_CODES_REGENERATED'
}

export enum ResourceType {
  CLIENT = 'CLIENT',
  SESSION = 'SESSION',
  DOCUMENT = 'DOCUMENT',
  PATIENT_DOCUMENT = 'PATIENT_DOCUMENT',
  DOCUMENT_TEMPLATE = 'DOCUMENT_TEMPLATE',
  USER = 'USER',
  TREATMENT_PLAN = 'TREATMENT_PLAN',
  SYSTEM = 'SYSTEM'
}

interface AuditEntry {
  timestamp: string;
  userId: number | null;
  action: AuditAction;
  resourceType?: ResourceType;
  resourceId?: number;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  details?: string;
}

interface TamperProofAuditEntry extends AuditEntry {
  hash: string;
  previousHash?: string;
}

const AUDIT_LOG_DIR = path.join(process.cwd(), 'logs');
const AUDIT_LOG_FILE = path.join(AUDIT_LOG_DIR, 'hipaa-audit.log');

// Ensure log directory exists
if (!fs.existsSync(AUDIT_LOG_DIR)) {
  fs.mkdirSync(AUDIT_LOG_DIR, { recursive: true });
}

export function logAuditEvent(entry: Omit<AuditEntry, 'timestamp'>) {
  const auditEntry: AuditEntry = {
    timestamp: new Date().toISOString(),
    ...entry
  };

  const logLine = JSON.stringify(auditEntry) + '\n';
  
  try {
    fs.appendFileSync(AUDIT_LOG_FILE, logLine);
    console.log(`[AUDIT] ${auditEntry.timestamp} - ${auditEntry.action}: User ${entry.userId || 'anonymous'} ${entry.success ? 'SUCCESS' : 'FAILED'}`);
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

export function getAuditLogs(limit: number = 100): AuditEntry[] {
  try {
    if (!fs.existsSync(AUDIT_LOG_FILE)) {
      return [];
    }

    const logs = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8')
      .trim()
      .split('\n')
      .filter(line => line.length > 0)
      .slice(-limit)
      .map(line => JSON.parse(line));

    return logs.reverse(); // Most recent first
  } catch (error) {
    console.error('Failed to read audit logs:', error);
    return [];
  }
}

export function getAuditStats(): { totalEvents: number; recentEvents: number; failedAccess: number } {
  try {
    if (!fs.existsSync(AUDIT_LOG_FILE)) {
      return { totalEvents: 0, recentEvents: 0, failedAccess: 0 };
    }

    const allLogs = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8')
      .trim()
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => JSON.parse(line));

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents = allLogs.filter(log => new Date(log.timestamp) > last24Hours).length;
    const failedAccess = allLogs.filter(log => !log.success).length;

    return {
      totalEvents: allLogs.length,
      recentEvents,
      failedAccess
    };
  } catch (error) {
    console.error('Failed to get audit stats:', error);
    return { totalEvents: 0, recentEvents: 0, failedAccess: 0 };
  }
}

// Tamper-proof audit logger for HIPAA compliance
export class TamperProofAuditLogger {
  private lastHash: string | null = null;
  
  async logEvent(event: any): Promise<void> {
    const auditEntry: TamperProofAuditEntry = {
      timestamp: new Date().toISOString(),
      ...event,
      hash: '',
      previousHash: this.lastHash || undefined
    };
    
    // Calculate hash of the entry (excluding the hash field itself)
    const entryForHash = { ...auditEntry, hash: '' };
    const entryString = JSON.stringify(entryForHash, null, 0);
    auditEntry.hash = crypto.createHash('sha256').update(entryString).digest('hex');
    
    const logLine = JSON.stringify(auditEntry) + '\n';
    
    try {
      fs.appendFileSync(AUDIT_LOG_FILE, logLine);
      this.lastHash = auditEntry.hash;
      
      console.log(`[AUDIT] ${auditEntry.timestamp} - ${auditEntry.action}: User ${event.userId || 'anonymous'} ${event.success ? 'SUCCESS' : 'FAILED'} [Hash: ${auditEntry.hash.substring(0, 8)}...]`);
    } catch (error) {
      console.error('Failed to write audit log:', error);
      throw error;
    }
  }
  
  verifyLogIntegrity(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    let previousHash: string | null = null;
    
    try {
      if (!fs.existsSync(AUDIT_LOG_FILE)) {
        return { isValid: true, errors: [] };
      }

      const logs = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8')
        .trim()
        .split('\n')
        .filter(line => line.length > 0);

      for (let i = 0; i < logs.length; i++) {
        const logEntry: TamperProofAuditEntry = JSON.parse(logs[i]);
        
        // Verify hash chain
        if (logEntry.previousHash !== previousHash) {
          errors.push(`Hash chain broken at line ${i + 1}: expected ${previousHash}, got ${logEntry.previousHash}`);
        }
        
        // Verify current hash
        const entryForHash = { ...logEntry, hash: '' };
        const expectedHash = crypto.createHash('sha256')
          .update(JSON.stringify(entryForHash, null, 0))
          .digest('hex');
          
        if (logEntry.hash !== expectedHash) {
          errors.push(`Hash verification failed at line ${i + 1}: expected ${expectedHash}, got ${logEntry.hash}`);
        }
        
        previousHash = logEntry.hash;
      }
    } catch (error) {
      errors.push(`Error reading log file: ${error}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export tamper-proof audit logger instance
export const auditLogger = new TamperProofAuditLogger();

// Generate correlation ID for request tracking
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Extract PHI fields from data for audit tracking
export function extractPHIFields(data: any): string[] {
  const phiFields: string[] = [];
  
  function scanObject(obj: any, path: string = ''): void {
    if (!obj || typeof obj !== 'object') return;
    
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;
      
      // Check if field name indicates PHI
      if (isPHIField(key)) {
        phiFields.push(fullPath);
      }
      
      // Recursively scan nested objects
      if (value && typeof value === 'object') {
        scanObject(value, fullPath);
      }
    }
  }
  
  scanObject(data);
  return phiFields;
}

// Check if a field name indicates PHI
function isPHIField(fieldName: string): boolean {
  const phiPatterns = [
    'email', 'phone', 'ssn', 'dateOfBirth', 'address', 'city', 'state', 'zip',
    'diagnosis', 'treatment', 'notes', 'medical', 'health', 'patient', 'client',
    'name', 'firstName', 'lastName', 'birth', 'gender', 'race', 'ethnicity',
    'encrypted', 'phi', 'personal', 'private', 'sensitive'
  ];
  
  const lowerField = fieldName.toLowerCase();
  return phiPatterns.some(pattern => lowerField.includes(pattern));
}

// Export log integrity verification function
export function verifyAuditLogIntegrity(): { isValid: boolean; errors: string[] } {
  return auditLogger.verifyLogIntegrity();
}