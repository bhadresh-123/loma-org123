#!/usr/bin/env node

/**
 * Simplified PHI Encryption Audit - July 2025
 * Focus on user profile PHI encryption compliance
 */

import { Pool } from 'pg';
import fs from 'fs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runPHIAudit() {
  console.log('🔒 PHI ENCRYPTION AUDIT - User Profile Focus');
  console.log('==========================================');
  
  const auditResults = {
    timestamp: new Date().toISOString(),
    tables: {
      users: { encrypted: 0, total: 0, details: [] },
      user_profiles: { encrypted: 0, total: 0, details: [] },
      clients: { encrypted: 0, total: 0, details: [] },
      sessions: { encrypted: 0, total: 0, details: [] }
    },
    overallScore: 0,
    violations: [],
    recommendations: []
  };

  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Database connected\n');

    // Audit Users Table
    console.log('📊 USERS TABLE AUDIT');
    console.log('-------------------');
    
    const userPHIFields = [
      'ssn', 'email', 'personalphone', 'personalemail',
      'date_of_birth', 'birth_city', 'birth_state', 'birth_country'
    ];

    for (const field of userPHIFields) {
      const encryptedField = `${field}_encrypted`;
      auditResults.tables.users.total++;
      
      try {
        // Check if encrypted column exists and has data
        const { rows: [{ count }] } = await pool.query(
          `SELECT COUNT(*) as count FROM users 
           WHERE ${encryptedField} IS NOT NULL AND ${encryptedField} != ''`
        );

        if (parseInt(count) > 0) {
          auditResults.tables.users.encrypted++;
          auditResults.tables.users.details.push({
            field,
            status: 'ENCRYPTED',
            records: parseInt(count)
          });
          console.log(`  ✅ ${field} -> ${encryptedField} (${count} records)`);
        } else {
          auditResults.tables.users.details.push({
            field,
            status: 'NO_DATA',
            records: 0
          });
          console.log(`  ⚠️  ${field} -> ${encryptedField} (no data)`);
        }
      } catch (error) {
        auditResults.tables.users.details.push({
          field,
          status: 'ERROR',
          error: error.message
        });
        console.log(`  ❌ ${field} -> ${encryptedField} (error: ${error.message})`);
      }
    }

    // Audit User Profiles Table
    console.log('\n📊 USER_PROFILES TABLE AUDIT');
    console.log('----------------------------');
    
    const { rows: profileTableExists } = await pool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_name = 'user_profiles' AND table_schema = 'public'`
    );

    if (profileTableExists.length > 0) {
      const profilePHIFields = [
        'address', 'personal_phone', 'personal_email', 'ssn',
        'date_of_birth', 'birth_city', 'birth_state', 'birth_country'
      ];

      for (const field of profilePHIFields) {
        const encryptedField = `${field}_encrypted`;
        auditResults.tables.user_profiles.total++;
        
        try {
          const { rows: [{ count }] } = await pool.query(
            `SELECT COUNT(*) as count FROM user_profiles 
             WHERE ${encryptedField} IS NOT NULL AND ${encryptedField} != ''`
          );

          if (parseInt(count) > 0) {
            auditResults.tables.user_profiles.encrypted++;
            auditResults.tables.user_profiles.details.push({
              field,
              status: 'ENCRYPTED',
              records: parseInt(count)
            });
            console.log(`  ✅ ${field} -> ${encryptedField} (${count} records)`);
          } else {
            auditResults.tables.user_profiles.details.push({
              field,
              status: 'NO_DATA',
              records: 0
            });
            console.log(`  ⚠️  ${field} -> ${encryptedField} (no data)`);
          }
        } catch (error) {
          auditResults.tables.user_profiles.details.push({
            field,
            status: 'ERROR',
            error: error.message
          });
          console.log(`  ❌ ${field} -> ${encryptedField} (error: ${error.message})`);
        }
      }
    } else {
      console.log('  ⚠️  user_profiles table does not exist');
    }

    // Audit Clients Table
    console.log('\n📊 CLIENTS TABLE AUDIT');
    console.log('---------------------');
    
    const clientPHIFields = ['email', 'phone', 'notes', 'hometown', 'race', 'pronouns'];

    for (const field of clientPHIFields) {
      const encryptedField = `${field}_encrypted`;
      auditResults.tables.clients.total++;
      
      try {
        const { rows: [{ count }] } = await pool.query(
          `SELECT COUNT(*) as count FROM clients 
           WHERE ${encryptedField} IS NOT NULL AND ${encryptedField} != ''`
        );

        if (parseInt(count) > 0) {
          auditResults.tables.clients.encrypted++;
          auditResults.tables.clients.details.push({
            field,
            status: 'ENCRYPTED',
            records: parseInt(count)
          });
          console.log(`  ✅ ${field} -> ${encryptedField} (${count} records)`);
        } else {
          auditResults.tables.clients.details.push({
            field,
            status: 'NO_DATA',
            records: 0
          });
          console.log(`  ⚠️  ${field} -> ${encryptedField} (no data)`);
        }
      } catch (error) {
        auditResults.tables.clients.details.push({
          field,
          status: 'ERROR',
          error: error.message
        });
        console.log(`  ❌ ${field} -> ${encryptedField} (error: ${error.message})`);
      }
    }

    // Audit Sessions Table
    console.log('\n📊 SESSIONS TABLE AUDIT');
    console.log('----------------------');
    
    const sessionPHIFields = ['notes'];

    for (const field of sessionPHIFields) {
      const encryptedField = `${field}_encrypted`;
      auditResults.tables.sessions.total++;
      
      try {
        const { rows: [{ count }] } = await pool.query(
          `SELECT COUNT(*) as count FROM sessions 
           WHERE ${encryptedField} IS NOT NULL AND ${encryptedField} != ''`
        );

        if (parseInt(count) > 0) {
          auditResults.tables.sessions.encrypted++;
          auditResults.tables.sessions.details.push({
            field,
            status: 'ENCRYPTED',
            records: parseInt(count)
          });
          console.log(`  ✅ ${field} -> ${encryptedField} (${count} records)`);
        } else {
          auditResults.tables.sessions.details.push({
            field,
            status: 'NO_DATA',
            records: 0
          });
          console.log(`  ⚠️  ${field} -> ${encryptedField} (no data)`);
        }
      } catch (error) {
        auditResults.tables.sessions.details.push({
          field,
          status: 'ERROR',
          error: error.message
        });
        console.log(`  ❌ ${field} -> ${encryptedField} (error: ${error.message})`);
      }
    }

    // Calculate overall score
    const totalFields = Object.values(auditResults.tables).reduce((sum, table) => sum + table.total, 0);
    const encryptedFields = Object.values(auditResults.tables).reduce((sum, table) => sum + table.encrypted, 0);
    auditResults.overallScore = totalFields > 0 ? Math.round((encryptedFields / totalFields) * 100) : 0;

    // Generate summary
    console.log('\n📋 AUDIT SUMMARY');
    console.log('================');
    console.log(`Audit Date: ${auditResults.timestamp}`);
    console.log(`Overall PHI Encryption Score: ${auditResults.overallScore}%`);
    console.log(`Total PHI Fields: ${totalFields}`);
    console.log(`Encrypted Fields: ${encryptedFields}`);
    console.log(`Unencrypted Fields: ${totalFields - encryptedFields}`);

    // Per-table breakdown
    for (const [tableName, tableData] of Object.entries(auditResults.tables)) {
      if (tableData.total > 0) {
        const tableScore = Math.round((tableData.encrypted / tableData.total) * 100);
        console.log(`${tableName}: ${tableData.encrypted}/${tableData.total} (${tableScore}%)`);
      }
    }

    // Compliance assessment
    console.log('\n🏥 HIPAA COMPLIANCE ASSESSMENT');
    console.log('==============================');
    
    if (auditResults.overallScore >= 90) {
      console.log('✅ COMPLIANT - Excellent PHI encryption coverage');
    } else if (auditResults.overallScore >= 70) {
      console.log('⚠️  PARTIALLY COMPLIANT - Good coverage but room for improvement');
    } else {
      console.log('❌ NON-COMPLIANT - Significant PHI encryption gaps detected');
    }

    // Save detailed report
    const reportPath = `./server/reports/phi-audit-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
    console.log(`\n📄 Detailed audit report saved to: ${reportPath}`);

  } catch (error) {
    console.error('❌ Audit failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the audit
runPHIAudit().catch(console.error);