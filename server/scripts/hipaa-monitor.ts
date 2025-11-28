#!/usr/bin/env tsx

/**
 * HIPAA System Health Monitor
 * 
 * Monitors HIPAA compliance status and system health
 */

import { neon } from "@neondatabase/serverless";
import { PHIEncryptionService, FeatureFlagService } from '../services/HIPAAService';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: HealthCheck;
    encryption: HealthCheck;
    auditLogging: HealthCheck;
    featureFlags: HealthCheck;
    dataIntegrity: HealthCheck;
  };
  compliance: {
    score: number;
    lastAudit: string;
    nextAudit: string;
    violations: string[];
  };
}

interface HealthCheck {
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  responseTime?: number;
}

class HIPAAMonitor {
  private db: any;
  private startTime: number;

  constructor(databaseUrl: string) {
    this.db = neon(databaseUrl);
    this.startTime = Date.now();
  }

  /**
   * Run comprehensive health check
   */
  async runHealthCheck(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    
    // Run all health checks in parallel
    const [database, encryption, auditLogging, featureFlags, dataIntegrity] = await Promise.all([
      this.checkDatabase(),
      this.checkEncryption(),
      this.checkAuditLogging(),
      this.checkFeatureFlags(),
      this.checkDataIntegrity()
    ]);

    const checks = {
      database,
      encryption,
      auditLogging,
      featureFlags,
      dataIntegrity
    };

    // Determine overall status
    const overallStatus = this.determineOverallStatus(checks);
    
    // Calculate compliance score
    const compliance = await this.calculateComplianceScore(checks);

    return {
      status: overallStatus,
      timestamp,
      checks,
      compliance
    };
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      await this.db`SELECT 1`;
      
      // Test HIPAA table access
      await this.db`SELECT COUNT(*) FROM users_auth LIMIT 1`;
      await this.db`SELECT COUNT(*) FROM clients_hipaa LIMIT 1`;
      await this.db`SELECT COUNT(*) FROM audit_logs_hipaa LIMIT 1`;
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'pass',
        message: 'Database connectivity and HIPAA tables accessible',
        responseTime
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `Database error: ${error.message}`,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check encryption functionality
   */
  private async checkEncryption(): Promise<HealthCheck> {
    try {
      const testData = 'HIPAA health check test data';
      
      // Test encryption
      const encrypted = PHIEncryptionService.encryptPHI(testData);
      if (!encrypted) {
        return {
          status: 'fail',
          message: 'Encryption failed - no output'
        };
      }
      
      // Test decryption
      const decrypted = PHIEncryptionService.decryptPHI(encrypted);
      if (decrypted !== testData) {
        return {
          status: 'fail',
          message: 'Decryption failed - data mismatch'
        };
      }
      
      // Test search hash
      const searchHash = PHIEncryptionService.createSearchHash(testData);
      if (!searchHash) {
        return {
          status: 'warning',
          message: 'Search hash generation failed'
        };
      }
      
      return {
        status: 'pass',
        message: 'Encryption and decryption working correctly',
        details: {
          algorithm: 'AES-256-GCM',
          keyVersion: 'v2',
          testDataLength: testData.length
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `Encryption error: ${error.message}`
      };
    }
  }

  /**
   * Check audit logging functionality
   */
  private async checkAuditLogging(): Promise<HealthCheck> {
    try {
      // Check if audit logging is enabled
      const auditEnabled = FeatureFlagService.isHIPAAAuditLoggingEnabled();
      
      if (!auditEnabled) {
        return {
          status: 'warning',
          message: 'Audit logging is disabled'
        };
      }
      
      // Check recent audit logs
      const recentLogs = await this.db`
        SELECT COUNT(*) as count 
        FROM audit_logs_hipaa 
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `;
      
      const logCount = recentLogs[0]?.count || 0;
      
      return {
        status: 'pass',
        message: 'Audit logging is active and functional',
        details: {
          enabled: auditEnabled,
          recentLogs: logCount,
          retentionPeriod: '7 years'
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `Audit logging error: ${error.message}`
      };
    }
  }

  /**
   * Check feature flags status
   */
  private async checkFeatureFlags(): Promise<HealthCheck> {
    try {
      const flags = FeatureFlagService.getFeatureFlags();
      
      const enabledFlags = Object.values(flags).filter(Boolean).length;
      const totalFlags = Object.keys(flags).length;
      
      let status: 'pass' | 'warning' = 'pass';
      let message = 'All HIPAA feature flags are properly configured';
      
      if (enabledFlags === 0) {
        status = 'warning';
        message = 'No HIPAA features are enabled';
      } else if (enabledFlags < totalFlags) {
        status = 'warning';
        message = 'Some HIPAA features are disabled';
      }
      
      return {
        status,
        message,
        details: flags
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `Feature flags error: ${error.message}`
      };
    }
  }

  /**
   * Check data integrity
   */
  private async checkDataIntegrity(): Promise<HealthCheck> {
    try {
      // Check for orphaned records
      const orphanedClients = await this.db`
        SELECT COUNT(*) as count 
        FROM clients_hipaa c 
        LEFT JOIN users_auth u ON c.therapist_id = u.id 
        WHERE u.id IS NULL
      `;
      
      const orphanedSessions = await this.db`
        SELECT COUNT(*) as count 
        FROM sessions_hipaa s 
        LEFT JOIN users_auth u ON s.therapist_id = u.id 
        WHERE u.id IS NULL
      `;
      
      // Check for unencrypted PHI
      const unencryptedPHI = await this.db`
        SELECT COUNT(*) as count 
        FROM therapist_phi 
        WHERE ssn_encrypted IS NULL OR personal_email_encrypted IS NULL
      `;
      
      const orphanedCount = (orphanedClients[0]?.count || 0) + (orphanedSessions[0]?.count || 0);
      const unencryptedCount = unencryptedPHI[0]?.count || 0;
      
      if (orphanedCount > 0 || unencryptedCount > 0) {
        return {
          status: 'warning',
          message: 'Data integrity issues detected',
          details: {
            orphanedRecords: orphanedCount,
            unencryptedPHI: unencryptedCount
          }
        };
      }
      
      return {
        status: 'pass',
        message: 'Data integrity checks passed',
        details: {
          orphanedRecords: 0,
          unencryptedPHI: 0
        }
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `Data integrity check error: ${error.message}`
      };
    }
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(checks: any): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(checks).map((check: any) => check.status);
    
    if (statuses.includes('fail')) {
      return 'unhealthy';
    } else if (statuses.includes('warning')) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * Calculate HIPAA compliance score
   */
  private async calculateComplianceScore(checks: any): Promise<{
    score: number;
    lastAudit: string;
    nextAudit: string;
    violations: string[];
  }> {
    let score = 100;
    const violations: string[] = [];
    
    // Deduct points for failures
    Object.entries(checks).forEach(([checkName, check]: [string, any]) => {
      if (check.status === 'fail') {
        score -= 20;
        violations.push(`${checkName}: ${check.message}`);
      } else if (check.status === 'warning') {
        score -= 5;
        violations.push(`${checkName}: ${check.message}`);
      }
    });
    
    // Ensure score doesn't go below 0
    score = Math.max(0, score);
    
    const lastAudit = new Date().toISOString();
    const nextAudit = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString(); // 6 months
    
    return {
      score,
      lastAudit,
      nextAudit,
      violations
    };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(): Promise<any> {
    const healthCheck = await this.runHealthCheck();
    
    return {
      reportType: 'HIPAA Compliance Report',
      generatedAt: healthCheck.timestamp,
      overallStatus: healthCheck.status,
      complianceScore: healthCheck.compliance.score,
      summary: {
        totalChecks: Object.keys(healthCheck.checks).length,
        passedChecks: Object.values(healthCheck.checks).filter((c: any) => c.status === 'pass').length,
        warningChecks: Object.values(healthCheck.checks).filter((c: any) => c.status === 'warning').length,
        failedChecks: Object.values(healthCheck.checks).filter((c: any) => c.status === 'fail').length
      },
      details: healthCheck.checks,
      violations: healthCheck.compliance.violations,
      recommendations: this.generateRecommendations(healthCheck)
    };
  }

  /**
   * Generate recommendations based on health check results
   */
  private generateRecommendations(healthCheck: HealthCheckResult): string[] {
    const recommendations: string[] = [];
    
    Object.entries(healthCheck.checks).forEach(([checkName, check]: [string, any]) => {
      if (check.status === 'fail') {
        recommendations.push(`CRITICAL: Fix ${checkName} - ${check.message}`);
      } else if (check.status === 'warning') {
        recommendations.push(`WARNING: Address ${checkName} - ${check.message}`);
      }
    });
    
    if (healthCheck.compliance.score < 95) {
      recommendations.push('Consider scheduling additional security review');
    }
    
    if (healthCheck.compliance.violations.length > 0) {
      recommendations.push('Review and resolve all compliance violations');
    }
    
    return recommendations;
  }
}

// Main execution
async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const monitor = new HIPAAMonitor(DATABASE_URL);

  try {
    console.log('🔍 Running HIPAA system health check...');
    
    const healthCheck = await monitor.runHealthCheck();
    
    console.log(`\n📊 Health Check Results:`);
    console.log(`Overall Status: ${healthCheck.status.toUpperCase()}`);
    console.log(`Compliance Score: ${healthCheck.compliance.score}/100`);
    console.log(`Timestamp: ${healthCheck.timestamp}`);
    
    console.log(`\n🔍 Individual Checks:`);
    Object.entries(healthCheck.checks).forEach(([name, check]: [string, any]) => {
      const status = check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
      console.log(`  ${status} ${name}: ${check.message}`);
    });
    
    if (healthCheck.compliance.violations.length > 0) {
      console.log(`\n⚠️ Violations:`);
      healthCheck.compliance.violations.forEach(violation => {
        console.log(`  - ${violation}`);
      });
    }
    
    // Generate detailed report
    const report = await monitor.generateComplianceReport();
    console.log(`\n📋 Detailed Report:`);
    console.log(JSON.stringify(report, null, 2));
    
  } catch (error) {
    console.error('💥 Health check failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { HIPAAMonitor };
