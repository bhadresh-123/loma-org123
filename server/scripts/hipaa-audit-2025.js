#!/usr/bin/env node

/**
 * HIPAA Compliance Audit Script - July 2025
 * Comprehensive audit of PHI encryption compliance after user profile improvements
 */

import { Pool } from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// PHI field definitions - must match current implementation
const PHI_FIELDS = {
  users: [
    'ssn', 'email', 'personalphone', 'personalemail',
    'date_of_birth', 'dateofbirth', 'birth_city', 'birthcity',
    'birth_state', 'birthstate', 'birth_country', 'birthcountry'
  ],
  user_profiles: [
    'address', 'personal_phone', 'personal_email', 'ssn',
    'date_of_birth', 'birth_city', 'birth_state', 'birth_country'
  ],
  clients: [
    'email', 'phone', 'notes', 'hometown', 'race', 'pronouns'
  ],
  sessions: [
    'notes'
  ]
};

// Audit results storage
const auditResults = {
  timestamp: new Date().toISOString(),
  complianceScore: 0,
  phiEncryption: {
    totalFields: 0,
    encryptedFields: 0,
    unencryptedFields: 0,
    encryptionPercentage: 0,
    tables: {},
    violations: []
  },
  auditTrail: {
    enabled: false,
    logCount: 0,
    phiAccessLogs: 0,
    userActionLogs: 0
  },
  accessControl: {
    rowLevelSecurity: false,
    crossUserProtection: false,
    userContextEnabled: false
  },
  riskLevel: 'HIGH',
  recommendations: []
};

/**
 * Main audit function
 */
async function runHIPAAAudit() {
  console.log('🏥 HIPAA COMPLIANCE AUDIT - July 2025');
  console.log('=====================================');
  console.log(`Audit Started: ${auditResults.timestamp}`);
  console.log('');

  try {
    // Test database connection
    const { rows: [{ now }] } = await pool.query('SELECT NOW()');
    console.log(`📊 Database Connection: ✅ Connected (${now})`);
    console.log('');

    // 1. PHI Encryption Audit
    await auditPHIEncryption();
    console.log('');

    // 2. Audit Trail Analysis
    await auditTrailAnalysis();
    console.log('');

    // 3. Access Control Assessment
    await auditAccessControl();
    console.log('');

    // 4. Calculate compliance score
    calculateComplianceScore();
    console.log('');

    // 5. Generate final report
    generateFinalReport();

  } catch (error) {
    console.error('❌ Audit failed:', error);
    auditResults.recommendations.push({
      priority: 'CRITICAL',
      category: 'SYSTEM_ERROR',
      issue: 'Audit script execution failed',
      recommendation: 'Fix database connection or audit script errors'
    });
  } finally {
    await pool.end();
  }
}

/**
 * Audit PHI encryption compliance
 */
async function auditPHIEncryption() {
  console.log('🔒 PHI ENCRYPTION COMPLIANCE AUDIT');
  console.log('----------------------------------');

  for (const [tableName, fields] of Object.entries(PHI_FIELDS)) {
    console.log(`\n📋 Auditing ${tableName} table...`);
    
    // Check if table exists
    const { rows: tableExists } = await pool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_name = $1 AND table_schema = 'public'`,
      [tableName]
    );

    if (tableExists.length === 0) {
      console.log(`⚠️  Table ${tableName} does not exist - skipping`);
      continue;
    }

    // Get all columns for this table
    const { rows: columns } = await pool.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns 
       WHERE table_name = $1 AND table_schema = 'public'
       ORDER BY ordinal_position`,
      [tableName]
    );

    auditResults.phiEncryption.tables[tableName] = {
      totalPHIFields: fields.length,
      encryptedFields: 0,
      unencryptedFields: 0,
      fields: {}
    };

    // Check each PHI field
    for (const field of fields) {
      const encryptedField = `${field}_encrypted`;
      const hasPlaintext = columns.some(col => col.column_name === field);
      const hasEncrypted = columns.some(col => col.column_name === encryptedField);

      auditResults.phiEncryption.totalFields++;
      
      if (hasEncrypted) {
        // Check if there's data in encrypted field
        const { rows: [{ count }] } = await pool.query(
          `SELECT COUNT(*) as count FROM ${tableName} 
           WHERE ${encryptedField} IS NOT NULL AND ${encryptedField} != ''`
        );

        if (parseInt(count) > 0) {
          auditResults.phiEncryption.encryptedFields++;
          auditResults.phiEncryption.tables[tableName].encryptedFields++;
          auditResults.phiEncryption.tables[tableName].fields[field] = {
            status: 'ENCRYPTED',
            encryptedField: encryptedField,
            recordsWithData: parseInt(count)
          };
          console.log(`  ✅ ${field} -> ${encryptedField} (${count} records)`);
        } else {
          auditResults.phiEncryption.unencryptedFields++;
          auditResults.phiEncryption.tables[tableName].unencryptedFields++;
          auditResults.phiEncryption.tables[tableName].fields[field] = {
            status: 'ENCRYPTION_COLUMN_EXISTS_BUT_EMPTY',
            encryptedField: encryptedField,
            recordsWithData: 0
          };
          console.log(`  ⚠️  ${field} -> ${encryptedField} (column exists but empty)`);
        }

        // Check for plaintext data that should be migrated
        if (hasPlaintext) {
          try {
            const { rows: [{ plaintextCount }] } = await pool.query(
              `SELECT COUNT(*) as plaintextCount FROM ${tableName} 
               WHERE ${field} IS NOT NULL AND ${field} != ''`
            );

            if (parseInt(plaintextCount) > 0) {
              auditResults.phiEncryption.violations.push({
                table: tableName,
                field: field,
                issue: 'PLAINTEXT_DATA_EXISTS',
                severity: 'HIGH',
                description: `${plaintextCount} records contain unencrypted PHI data`,
                recommendation: 'Encrypt and migrate plaintext data immediately'
              });
              console.log(`  🚨 VIOLATION: ${plaintextCount} plaintext records in ${field}`);
            }
          } catch (error) {
            console.log(`  ⚠️  Error checking plaintext data for ${field}: ${error.message}`);
          }
        }
      } else {
        auditResults.phiEncryption.unencryptedFields++;
        auditResults.phiEncryption.tables[tableName].unencryptedFields++;
        auditResults.phiEncryption.tables[tableName].fields[field] = {
          status: 'UNENCRYPTED',
          encryptedField: null,
          recordsWithData: 0
        };
        
        // Check if there's plaintext data that needs encryption
        if (hasPlaintext) {
          const { rows: [{ count }] } = await pool.query(
            `SELECT COUNT(*) as count FROM ${tableName} 
             WHERE ${field} IS NOT NULL AND ${field} != ''`
          );

          if (parseInt(count) > 0) {
            auditResults.phiEncryption.violations.push({
              table: tableName,
              field: field,
              issue: 'UNENCRYPTED_PHI_DATA',
              severity: 'CRITICAL',
              description: `${count} records contain unencrypted PHI data`,
              recommendation: 'Add encryption column and encrypt data immediately'
            });
            console.log(`  🚨 CRITICAL: ${count} unencrypted PHI records in ${field}`);
          }
        }
        console.log(`  ❌ ${field} - NO ENCRYPTION IMPLEMENTED`);
      }
    }

    // Table summary
    const tableResults = auditResults.phiEncryption.tables[tableName];
    console.log(`\n📊 ${tableName} Summary:`);
    console.log(`  Encrypted: ${tableResults.encryptedFields}/${tableResults.totalPHIFields}`);
    console.log(`  Unencrypted: ${tableResults.unencryptedFields}/${tableResults.totalPHIFields}`);
  }

  // Calculate encryption percentage
  auditResults.phiEncryption.encryptionPercentage = 
    auditResults.phiEncryption.totalFields > 0 
      ? Math.round((auditResults.phiEncryption.encryptedFields / auditResults.phiEncryption.totalFields) * 100)
      : 0;

  console.log(`\n🔒 OVERALL PHI ENCRYPTION STATUS:`);
  console.log(`  Total PHI Fields: ${auditResults.phiEncryption.totalFields}`);
  console.log(`  Encrypted Fields: ${auditResults.phiEncryption.encryptedFields}`);
  console.log(`  Unencrypted Fields: ${auditResults.phiEncryption.unencryptedFields}`);
  console.log(`  Encryption Coverage: ${auditResults.phiEncryption.encryptionPercentage}%`);
  console.log(`  Violations: ${auditResults.phiEncryption.violations.length}`);
}

/**
 * Audit trail analysis
 */
async function auditTrailAnalysis() {
  console.log('📝 AUDIT TRAIL COMPLIANCE ANALYSIS');
  console.log('----------------------------------');

  try {
    // Check if audit_logs table exists
    const { rows: auditTableExists } = await pool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_name = 'audit_logs' AND table_schema = 'public'`
    );

    if (auditTableExists.length === 0) {
      console.log('❌ audit_logs table does not exist');
      auditResults.auditTrail.enabled = false;
      auditResults.recommendations.push({
        priority: 'CRITICAL',
        category: 'AUDIT_TRAIL',
        issue: 'No audit logging system',
        recommendation: 'Implement comprehensive audit logging system'
      });
      return;
    }

    auditResults.auditTrail.enabled = true;
    console.log('✅ Audit logging system exists');

    // Count total audit logs
    const { rows: [{ totalLogs }] } = await pool.query(
      'SELECT COUNT(*) as totalLogs FROM audit_logs'
    );
    auditResults.auditTrail.logCount = parseInt(totalLogs);

    // Count PHI access logs
    const { rows: [{ phiLogs }] } = await pool.query(
      `SELECT COUNT(*) as phiLogs FROM audit_logs 
       WHERE array_length(phi_fields_accessed, 1) > 0`
    );
    auditResults.auditTrail.phiAccessLogs = parseInt(phiLogs);

    // Count user action logs
    const { rows: [{ userLogs }] } = await pool.query(
      `SELECT COUNT(*) as userLogs FROM audit_logs 
       WHERE action IN ('CREATE', 'READ', 'UPDATE', 'DELETE')`
    );
    auditResults.auditTrail.userActionLogs = parseInt(userLogs);

    console.log(`📊 Audit Trail Statistics:`);
    console.log(`  Total Audit Logs: ${auditResults.auditTrail.logCount}`);
    console.log(`  PHI Access Logs: ${auditResults.auditTrail.phiAccessLogs}`);
    console.log(`  User Action Logs: ${auditResults.auditTrail.userActionLogs}`);

    // Check for recent PHI access within last 24 hours
    const { rows: [{ recentPHIAccess }] } = await pool.query(
      `SELECT COUNT(*) as recentPHIAccess FROM audit_logs 
       WHERE array_length(phi_fields_accessed, 1) > 0 
       AND timestamp > NOW() - INTERVAL '24 hours'`
    );

    console.log(`  Recent PHI Access (24h): ${recentPHIAccess}`);

    if (auditResults.auditTrail.logCount < 100) {
      auditResults.recommendations.push({
        priority: 'MEDIUM',
        category: 'AUDIT_TRAIL',
        issue: 'Low audit log volume',
        recommendation: 'Verify audit logging is capturing all required events'
      });
    }

  } catch (error) {
    console.error('❌ Audit trail analysis failed:', error);
    auditResults.auditTrail.enabled = false;
  }
}

/**
 * Access control assessment
 */
async function auditAccessControl() {
  console.log('🔐 ACCESS CONTROL ASSESSMENT');
  console.log('---------------------------');

  try {
    // Check for Row Level Security policies
    const { rows: rlsPolicies } = await pool.query(
      `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
       FROM pg_policies 
       WHERE schemaname = 'public'`
    );

    if (rlsPolicies.length > 0) {
      auditResults.accessControl.rowLevelSecurity = true;
      console.log(`✅ Row Level Security enabled (${rlsPolicies.length} policies)`);
      
      // Check for user-scoped policies
      const userScopedPolicies = rlsPolicies.filter(policy => 
        policy.qual && policy.qual.includes('user_id')
      );
      
      if (userScopedPolicies.length > 0) {
        auditResults.accessControl.crossUserProtection = true;
        console.log(`✅ Cross-user protection enabled (${userScopedPolicies.length} user-scoped policies)`);
      } else {
        console.log('⚠️  No user-scoped RLS policies found');
      }
    } else {
      console.log('❌ No Row Level Security policies found');
      auditResults.recommendations.push({
        priority: 'HIGH',
        category: 'ACCESS_CONTROL',
        issue: 'Missing Row Level Security',
        recommendation: 'Implement RLS policies to prevent cross-user data access'
      });
    }

    // Check for user context middleware evidence
    const { rows: [{ userContextLogs }] } = await pool.query(
      `SELECT COUNT(*) as userContextLogs FROM audit_logs 
       WHERE details->>'context' LIKE '%user_id%'
       AND timestamp > NOW() - INTERVAL '1 hour'`
    );

    if (parseInt(userContextLogs) > 0) {
      auditResults.accessControl.userContextEnabled = true;
      console.log('✅ User context middleware active');
    } else {
      console.log('⚠️  No recent user context evidence found');
    }

  } catch (error) {
    console.error('❌ Access control assessment failed:', error);
  }
}

/**
 * Calculate overall compliance score
 */
function calculateComplianceScore() {
  let score = 0;
  let maxScore = 100;

  // PHI Encryption (50 points)
  const encryptionScore = Math.min(50, (auditResults.phiEncryption.encryptionPercentage / 100) * 50);
  score += encryptionScore;

  // Audit Trail (25 points)
  if (auditResults.auditTrail.enabled) {
    score += 15;
    if (auditResults.auditTrail.phiAccessLogs > 0) score += 5;
    if (auditResults.auditTrail.logCount > 500) score += 5;
  }

  // Access Control (25 points)
  if (auditResults.accessControl.rowLevelSecurity) score += 10;
  if (auditResults.accessControl.crossUserProtection) score += 10;
  if (auditResults.accessControl.userContextEnabled) score += 5;

  auditResults.complianceScore = Math.round(score);

  // Determine risk level
  if (auditResults.complianceScore >= 90) {
    auditResults.riskLevel = 'LOW';
  } else if (auditResults.complianceScore >= 70) {
    auditResults.riskLevel = 'MEDIUM';
  } else if (auditResults.complianceScore >= 50) {
    auditResults.riskLevel = 'HIGH';
  } else {
    auditResults.riskLevel = 'CRITICAL';
  }
}

/**
 * Generate final audit report
 */
function generateFinalReport() {
  console.log('📋 HIPAA COMPLIANCE AUDIT REPORT');
  console.log('================================');
  console.log(`Audit Completed: ${new Date().toISOString()}`);
  console.log(`Compliance Score: ${auditResults.complianceScore}/100`);
  console.log(`Risk Level: ${auditResults.riskLevel}`);
  console.log('');

  // Compliance status
  const complianceStatus = auditResults.complianceScore >= 80 ? '✅ COMPLIANT' : '❌ NON-COMPLIANT';
  console.log(`🏥 HIPAA Compliance Status: ${complianceStatus}`);
  console.log('');

  // PHI Encryption Summary
  console.log('🔒 PHI ENCRYPTION SUMMARY:');
  console.log(`  Coverage: ${auditResults.phiEncryption.encryptionPercentage}% (${auditResults.phiEncryption.encryptedFields}/${auditResults.phiEncryption.totalFields})`);
  console.log(`  Violations: ${auditResults.phiEncryption.violations.length}`);
  console.log('');

  // Critical violations
  const criticalViolations = auditResults.phiEncryption.violations.filter(v => v.severity === 'CRITICAL');
  if (criticalViolations.length > 0) {
    console.log('🚨 CRITICAL VIOLATIONS:');
    criticalViolations.forEach(violation => {
      console.log(`  - ${violation.table}.${violation.field}: ${violation.description}`);
    });
    console.log('');
  }

  // High-priority recommendations
  const highPriorityRecs = auditResults.recommendations.filter(r => r.priority === 'CRITICAL' || r.priority === 'HIGH');
  if (highPriorityRecs.length > 0) {
    console.log('⚠️  HIGH-PRIORITY RECOMMENDATIONS:');
    highPriorityRecs.forEach(rec => {
      console.log(`  ${rec.priority}: ${rec.issue}`);
      console.log(`    → ${rec.recommendation}`);
    });
    console.log('');
  }

  // Overall assessment
  if (auditResults.complianceScore >= 80) {
    console.log('✅ ASSESSMENT: Platform meets HIPAA compliance requirements');
  } else {
    console.log('❌ ASSESSMENT: Platform requires immediate attention to achieve HIPAA compliance');
  }

  // Save audit report
  const reportPath = './server/reports/hipaa-audit-report-' + new Date().toISOString().split('T')[0] + '.json';
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}`);
}

// Run the audit
runHIPAAAudit().catch(console.error);