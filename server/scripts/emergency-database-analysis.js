#!/usr/bin/env node

/**
 * Emergency Database Analysis - Phase 1.1
 * 
 * Immediate assessment of current profile data state to identify:
 * 1. Data consistency audit across all profile fields
 * 2. Users affected by data loss
 * 3. Field collision issues (duplicate columns with different naming)
 * 4. PHI encryption coverage gaps
 * 
 * This is a READ-ONLY analysis script with no data modifications.
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Analysis results storage
const analysisResults = {
  timestamp: new Date().toISOString(),
  fieldMapping: {
    duplicateColumns: [],
    namingInconsistencies: [],
    dataTypeConflicts: []
  },
  affectedUsers: {
    totalUsers: 0,
    usersWithDataLoss: [],
    usersWithIncompleteProfiles: []
  },
  phiEncryption: {
    encryptedFields: [],
    unencryptedFields: [],
    coverageGaps: []
  },
  dataConsistency: {
    fieldCollisions: [],
    nullValueAnalysis: [],
    dataTypeIssues: []
  }
};

/**
 * 1. Run data consistency audit across all profile fields
 */
async function auditDataConsistency() {
  console.log('🔍 Starting data consistency audit...');
  
  try {
    // Get all columns in users table
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    const { rows: columns } = await pool.query(columnsQuery);
    console.log(`📊 Found ${columns.length} columns in users table`);
    
    // Identify duplicate/conflicting columns
    const potentialDuplicates = [
      { standard: 'npi_number', variations: ['npinumber'] },
      { standard: 'date_of_birth', variations: ['dateofbirth'] },
      { standard: 'birth_city', variations: ['birthcity'] },
      { standard: 'birth_state', variations: ['birthstate'] },
      { standard: 'birth_country', variations: ['birthcountry'] },
      { standard: 'is_us_citizen', variations: ['isuscitizen'] },
      { standard: 'work_permit_visa', variations: ['workpermitvisa'] },
      { standard: 'taxonomy_code', variations: ['taxonomycode'] },
      { standard: 'years_of_experience', variations: ['yearsofexperience'] },
      { standard: 'base_rate', variations: ['baserate'] },
      { standard: 'zip_code', variations: ['zipcode'] },
      { standard: 'personal_phone', variations: ['personalphone'] },
      { standard: 'personal_email', variations: ['personalemail'] },
      { standard: 'session_format', variations: ['sessionformat'] },
      { standard: 'sliding_scale', variations: ['slidingscale'] },
      { standard: 'therapist_identities', variations: ['therapistidentities'] },
      { standard: 'legal_business_name', variations: ['legalbusinessname'] }
    ];
    
    for (const { standard, variations } of potentialDuplicates) {
      const foundColumns = columns.filter(col => 
        col.column_name === standard || variations.includes(col.column_name)
      );
      
      if (foundColumns.length > 1) {
        analysisResults.fieldMapping.duplicateColumns.push({
          standardName: standard,
          foundColumns: foundColumns.map(col => ({
            name: col.column_name,
            type: col.data_type,
            nullable: col.is_nullable
          }))
        });
        console.log(`⚠️  Duplicate columns found for ${standard}:`, 
          foundColumns.map(c => c.column_name).join(', '));
      }
    }
    
    // Check for naming inconsistencies
    const snakeCasePattern = /^[a-z]+(_[a-z]+)*$/;
    const camelCaseFields = columns.filter(col => 
      !snakeCasePattern.test(col.column_name) && 
      col.column_name !== 'id' && 
      !col.column_name.startsWith('stripeConnectAccountId')
    );
    
    analysisResults.fieldMapping.namingInconsistencies = camelCaseFields.map(col => ({
      columnName: col.column_name,
      suggestedSnakeCase: col.column_name.replace(/([A-Z])/g, '_$1').toLowerCase(),
      dataType: col.data_type
    }));
    
    console.log(`📝 Found ${camelCaseFields.length} columns with naming inconsistencies`);
    
  } catch (error) {
    console.error('❌ Error in data consistency audit:', error);
    throw error;
  }
}

/**
 * 2. Identify which users are affected by data loss
 */
async function identifyAffectedUsers() {
  console.log('👥 Identifying users affected by data loss...');
  
  try {
    // Get total user count
    const { rows: [{ count: totalUsers }] } = await pool.query('SELECT COUNT(*) as count FROM users');
    analysisResults.affectedUsers.totalUsers = parseInt(totalUsers);
    console.log(`📊 Total users in system: ${totalUsers}`);
    
    // Check for users with null values in critical fields
    const criticalFields = [
      'name', 'email', 'state', 'zipcode', 'yearsofexperience', 'baserate',
      'npinumber', 'npi_number', 'dateofbirth', 'date_of_birth',
      'birthcity', 'birth_city', 'birthstate', 'birth_state'
    ];
    
    for (const field of criticalFields) {
      // Check if field exists
      const fieldExistsQuery = `
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = $1
      `;
      const { rows: fieldExists } = await pool.query(fieldExistsQuery, [field]);
      
      if (fieldExists.length > 0) {
        // Handle different field types safely
        const isNumericField = ['yearsofexperience', 'baserate'].includes(field);
        const isDateField = ['dateofbirth', 'date_of_birth'].includes(field);
        
        let nullCheckQuery;
        if (isNumericField) {
          nullCheckQuery = `
            SELECT id, username, name, ${field}
            FROM users 
            WHERE ${field} IS NULL OR ${field}::text = '' OR ${field}::text = '0'
            ORDER BY id
          `;
        } else if (isDateField) {
          nullCheckQuery = `
            SELECT id, username, name, ${field}
            FROM users 
            WHERE ${field} IS NULL
            ORDER BY id
          `;
        } else {
          nullCheckQuery = `
            SELECT id, username, name, ${field}
            FROM users 
            WHERE ${field} IS NULL OR ${field} = ''
            ORDER BY id
          `;
        }
        
        const { rows: usersWithNulls } = await pool.query(nullCheckQuery);
        
        if (usersWithNulls.length > 0) {
          analysisResults.affectedUsers.usersWithIncompleteProfiles.push({
            field: field,
            affectedCount: usersWithNulls.length,
            affectedUsers: usersWithNulls.slice(0, 10) // Sample of first 10
          });
          console.log(`⚠️  ${usersWithNulls.length} users missing data in field: ${field}`);
        }
      }
    }
    
    // Check for users with conflicting data in duplicate columns
    const duplicateChecks = [
      { std: 'npi_number', alt: 'npinumber' },
      { std: 'date_of_birth', alt: 'dateofbirth' },
      { std: 'birth_city', alt: 'birthcity' },
      { std: 'birth_state', alt: 'birthstate' }
    ];
    
    for (const { std, alt } of duplicateChecks) {
      // Check if both columns exist
      const bothExistQuery = `
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name IN ($1, $2)
      `;
      const { rows: columns } = await pool.query(bothExistQuery, [std, alt]);
      
      if (columns.length === 2) {
        const conflictQuery = `
          SELECT id, username, name, ${std}, ${alt}
          FROM users 
          WHERE ${std} IS NOT NULL 
            AND ${alt} IS NOT NULL 
            AND ${std} != ${alt}
          ORDER BY id
        `;
        
        const { rows: conflictingUsers } = await pool.query(conflictQuery);
        
        if (conflictingUsers.length > 0) {
          analysisResults.affectedUsers.usersWithDataLoss.push({
            issue: `Conflicting data in ${std} vs ${alt}`,
            affectedCount: conflictingUsers.length,
            users: conflictingUsers.slice(0, 5) // Sample of first 5
          });
          console.log(`🚨 ${conflictingUsers.length} users with conflicting data in ${std} vs ${alt}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error identifying affected users:', error);
    throw error;
  }
}

/**
 * 3. Map field collision issues
 */
async function mapFieldCollisions() {
  console.log('🔄 Mapping field collision issues...');
  
  try {
    // Check for data inconsistencies between duplicate columns
    const collisionChecks = [
      { 
        primary: 'npi_number', 
        secondary: 'npinumber',
        description: 'NPI Number collision'
      },
      { 
        primary: 'date_of_birth', 
        secondary: 'dateofbirth',
        description: 'Date of Birth collision'
      },
      { 
        primary: 'birth_city', 
        secondary: 'birthcity',
        description: 'Birth City collision'
      },
      { 
        primary: 'birth_state', 
        secondary: 'birthstate',
        description: 'Birth State collision'
      },
      { 
        primary: 'birth_country', 
        secondary: 'birthcountry',
        description: 'Birth Country collision'
      },
      { 
        primary: 'is_us_citizen', 
        secondary: 'isuscitizen',
        description: 'US Citizen collision'
      },
      { 
        primary: 'work_permit_visa', 
        secondary: 'workpermitvisa',
        description: 'Work Permit Visa collision'
      },
      { 
        primary: 'taxonomy_code', 
        secondary: 'taxonomycode',
        description: 'Taxonomy Code collision'
      }
    ];
    
    for (const { primary, secondary, description } of collisionChecks) {
      // Check if both columns exist
      const columnsExistQuery = `
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name IN ($1, $2)
      `;
      const { rows: existingColumns } = await pool.query(columnsExistQuery, [primary, secondary]);
      
      if (existingColumns.length === 2) {
        // Get statistics on data distribution
        const analysisQuery = `
          SELECT 
            COUNT(*) as total_records,
            COUNT(${primary}) as primary_populated,
            COUNT(${secondary}) as secondary_populated,
            COUNT(CASE WHEN ${primary} IS NOT NULL AND ${secondary} IS NOT NULL THEN 1 END) as both_populated,
            COUNT(CASE WHEN ${primary} IS NOT NULL AND ${secondary} IS NOT NULL AND ${primary} != ${secondary} THEN 1 END) as conflicting_values,
            COUNT(CASE WHEN ${primary} IS NULL AND ${secondary} IS NOT NULL THEN 1 END) as only_secondary,
            COUNT(CASE WHEN ${primary} IS NOT NULL AND ${secondary} IS NULL THEN 1 END) as only_primary
          FROM users;
        `;
        
        const { rows: [stats] } = await pool.query(analysisQuery);
        
        analysisResults.dataConsistency.fieldCollisions.push({
          description,
          primaryField: primary,
          secondaryField: secondary,
          statistics: {
            totalRecords: parseInt(stats.total_records),
            primaryPopulated: parseInt(stats.primary_populated),
            secondaryPopulated: parseInt(stats.secondary_populated),
            bothPopulated: parseInt(stats.both_populated),
            conflictingValues: parseInt(stats.conflicting_values),
            onlySecondary: parseInt(stats.only_secondary),
            onlyPrimary: parseInt(stats.only_primary)
          }
        });
        
        console.log(`📊 ${description}: ${stats.conflicting_values} conflicts out of ${stats.total_records} records`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error mapping field collisions:', error);
    throw error;
  }
}

/**
 * 4. Document current PHI encryption coverage gaps
 */
async function auditPHIEncryption() {
  console.log('🔒 Auditing PHI encryption coverage...');
  
  try {
    // Define PHI fields that should be encrypted
    const phiFields = {
      users: [
        'ssn', 'email', 'phone', 'personalphone', 'personalemail',
        'date_of_birth', 'dateofbirth', 'birth_city', 'birthcity',
        'birth_state', 'birthstate', 'birth_country', 'birthcountry'
      ],
      clients: [
        'email', 'phone', 'notes', 'hometown', 'race', 'pronouns'
      ],
      sessions: [
        'notes'
      ]
    };
    
    // Check encryption status for each table
    for (const [tableName, fields] of Object.entries(phiFields)) {
      console.log(`🔍 Checking ${tableName} table for PHI encryption...`);
      
      // Check if table exists
      const tableExistsQuery = `
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = $1 AND table_schema = 'public'
      `;
      const { rows: tableExists } = await pool.query(tableExistsQuery, [tableName]);
      
      if (tableExists.length === 0) {
        console.log(`⚠️  Table ${tableName} does not exist`);
        continue;
      }
      
      // Get all columns for this table
      const columnsQuery = `
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY column_name;
      `;
      
      const { rows: tableColumns } = await pool.query(columnsQuery, [tableName]);
      const columnNames = tableColumns.map(col => col.column_name);
      
      for (const field of fields) {
        const encryptedField = `${field}_encrypted`;
        const searchHashField = `${field}_search_hash`;
        
        const hasPlaintext = columnNames.includes(field);
        const hasEncrypted = columnNames.includes(encryptedField);
        const hasSearchHash = columnNames.includes(searchHashField);
        
        const fieldStatus = {
          table: tableName,
          field: field,
          hasPlaintext: hasPlaintext,
          hasEncrypted: hasEncrypted,
          hasSearchHash: hasSearchHash,
          status: hasEncrypted ? 'ENCRYPTED' : 'UNENCRYPTED'
        };
        
        if (hasEncrypted) {
          analysisResults.phiEncryption.encryptedFields.push(fieldStatus);
          
          // Check if plaintext data still exists alongside encrypted
          if (hasPlaintext && tableName === 'users') {
            // Handle different field types for plaintext check
            const isDateField = ['date_of_birth', 'dateofbirth'].includes(field);
            
            let plaintextCheckQuery;
            if (isDateField) {
              plaintextCheckQuery = `
                SELECT COUNT(*) as count 
                FROM ${tableName} 
                WHERE ${field} IS NOT NULL
              `;
            } else {
              plaintextCheckQuery = `
                SELECT COUNT(*) as count 
                FROM ${tableName} 
                WHERE ${field} IS NOT NULL AND ${field} != ''
              `;
            }
            
            const { rows: [{ count }] } = await pool.query(plaintextCheckQuery);
            
            if (parseInt(count) > 0) {
              fieldStatus.plaintextRecords = parseInt(count);
              analysisResults.phiEncryption.coverageGaps.push({
                ...fieldStatus,
                issue: 'Plaintext data exists alongside encrypted data'
              });
            }
          }
        } else {
          analysisResults.phiEncryption.unencryptedFields.push(fieldStatus);
          console.log(`⚠️  Unencrypted PHI field: ${tableName}.${field}`);
        }
      }
    }
    
    // Count total encrypted vs unencrypted fields
    const totalEncrypted = analysisResults.phiEncryption.encryptedFields.length;
    const totalUnencrypted = analysisResults.phiEncryption.unencryptedFields.length;
    const encryptionPercentage = totalEncrypted + totalUnencrypted > 0 
      ? ((totalEncrypted / (totalEncrypted + totalUnencrypted)) * 100).toFixed(1)
      : '0';
    
    console.log(`🔒 PHI Encryption Coverage: ${totalEncrypted}/${totalEncrypted + totalUnencrypted} fields (${encryptionPercentage}%)`);
    
  } catch (error) {
    console.error('❌ Error auditing PHI encryption:', error);
    throw error;
  }
}

/**
 * Generate comprehensive analysis report
 */
function generateReport() {
  console.log('📄 Generating comprehensive analysis report...');
  
  const report = {
    ...analysisResults,
    summary: {
      criticalIssues: [],
      recommendations: [],
      priorityActions: []
    }
  };
  
  // Analyze results and generate recommendations
  if (analysisResults.fieldMapping.duplicateColumns.length > 0) {
    report.summary.criticalIssues.push(
      `Found ${analysisResults.fieldMapping.duplicateColumns.length} sets of duplicate columns causing field mapping conflicts`
    );
    report.summary.priorityActions.push('Standardize database schema to eliminate duplicate columns');
  }
  
  if (analysisResults.affectedUsers.usersWithDataLoss.length > 0) {
    const totalAffected = analysisResults.affectedUsers.usersWithDataLoss.reduce(
      (sum, issue) => sum + issue.affectedCount, 0
    );
    report.summary.criticalIssues.push(
      `${totalAffected} users have conflicting data in duplicate columns`
    );
    report.summary.priorityActions.push('Implement data reconciliation for conflicting fields');
  }
  
  if (analysisResults.phiEncryption.unencryptedFields.length > 0) {
    report.summary.criticalIssues.push(
      `${analysisResults.phiEncryption.unencryptedFields.length} PHI fields are not encrypted`
    );
    report.summary.priorityActions.push('Encrypt all unprotected PHI fields');
  }
  
  if (analysisResults.phiEncryption.coverageGaps.length > 0) {
    report.summary.criticalIssues.push(
      `${analysisResults.phiEncryption.coverageGaps.length} PHI fields have both encrypted and plaintext data`
    );
    report.summary.priorityActions.push('Remove plaintext PHI data where encrypted versions exist');
  }
  
  // General recommendations
  report.summary.recommendations = [
    'Implement single source of truth for field mappings',
    'Establish data validation pipeline for profile updates',
    'Create comprehensive audit trail for all profile changes',
    'Implement automated data consistency monitoring'
  ];
  
  return report;
}

/**
 * Main analysis execution
 */
async function runEmergencyAnalysis() {
  console.log('🚨 Starting Emergency Database Analysis - Phase 1.1');
  console.log('=' .repeat(60));
  
  try {
    await auditDataConsistency();
    await identifyAffectedUsers();
    await mapFieldCollisions();
    await auditPHIEncryption();
    
    const report = generateReport();
    
    // Save report to file
    const reportPath = path.join(__dirname, '../reports/emergency-analysis-report.json');
    const reportsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n' + '=' .repeat(60));
    console.log('📋 EMERGENCY ANALYSIS COMPLETE');
    console.log('=' .repeat(60));
    console.log(`📊 Total Users: ${report.affectedUsers.totalUsers}`);
    console.log(`⚠️  Critical Issues: ${report.summary.criticalIssues.length}`);
    console.log(`🔒 PHI Encryption: ${report.phiEncryption.encryptedFields.length} encrypted, ${report.phiEncryption.unencryptedFields.length} unencrypted`);
    console.log(`🔄 Duplicate Columns: ${report.fieldMapping.duplicateColumns.length} sets found`);
    console.log(`📄 Full report saved to: ${reportPath}`);
    
    if (report.summary.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES FOUND:');
      report.summary.criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }
    
    if (report.summary.priorityActions.length > 0) {
      console.log('\n⚡ PRIORITY ACTIONS REQUIRED:');
      report.summary.priorityActions.forEach((action, index) => {
        console.log(`${index + 1}. ${action}`);
      });
    }
    
    return report;
    
  } catch (error) {
    console.error('❌ Emergency analysis failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run analysis if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runEmergencyAnalysis()
    .then(() => {
      console.log('✅ Analysis completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    });
}

export { runEmergencyAnalysis };