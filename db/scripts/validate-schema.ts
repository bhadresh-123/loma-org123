#!/usr/bin/env node

/**
 * Schema Validation Script
 * 
 * Compares the Drizzle schema definition with the actual database structure
 * to identify mismatches that cause 500 errors.
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { sql } from 'drizzle-orm';
import * as schema from '../schema-hipaa-refactored';
import { config } from 'dotenv';

// Load environment variables
config({ path: '../../env.development' });

// Database connection
const db = drizzle({
  connection: process.env.DATABASE_URL!,
  schema: schema,
  ws: ws,
});

interface ColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  ordinal_position: number;
}

interface TableInfo {
  table_name: string;
  table_type: string;
}

interface SchemaMismatch {
  table: string;
  issue: 'missing_table' | 'missing_column' | 'wrong_type' | 'wrong_nullable' | 'extra_column';
  expected?: any;
  actual?: any;
  severity: 'critical' | 'warning' | 'info';
}

class SchemaValidator {
  private mismatches: SchemaMismatch[] = [];
  
  // Expected schema from Drizzle definition
  private expectedTables = {
    usersAuth: schema.usersAuth,
    organizations: schema.organizations,
    organizationMemberships: schema.organizationMemberships,
    therapistProfiles: schema.therapistProfiles,
    therapistPHI: schema.therapistPHI,
    patients: schema.patients,
    clinicalSessions: schema.clinicalSessions,
    patientTreatmentPlans: schema.patientTreatmentPlans,
    tasks: schema.tasks,
    calendarBlocks: schema.calendarBlocks,
    workSchedules: schema.workSchedules,
    auditLogsHIPAA: schema.auditLogsHIPAA,
  };

  async validateSchema(): Promise<void> {
    console.log('🔍 Starting comprehensive schema validation...\n');
    
    // Get actual database schema
    const actualTables = await this.getActualTables();
    const actualColumns = await this.getActualColumns();
    
    console.log(`📊 Found ${actualTables.length} tables in database`);
    console.log(`📊 Found ${actualColumns.length} columns across all tables\n`);
    
    // Validate each expected table
    for (const [tableName, drizzleTable] of Object.entries(this.expectedTables)) {
      await this.validateTable(tableName, drizzleTable, actualTables, actualColumns);
    }
    
    // Check for extra tables not in schema
    await this.checkExtraTables(actualTables);
    
    // Generate report
    this.generateReport();
  }

  private async getActualTables(): Promise<TableInfo[]> {
    const result = await db.execute(sql`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    return result.rows as TableInfo[];
  }

  private async getActualColumns(): Promise<ColumnInfo[]> {
    const result = await db.execute(sql`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position
    `);
    
    return result.rows as ColumnInfo[];
  }

  private async validateTable(
    tableName: string, 
    drizzleTable: any, 
    actualTables: TableInfo[], 
    actualColumns: ColumnInfo[]
  ): Promise<void> {
    const dbTableName = this.getDbTableName(tableName);
    
    console.log(`🔍 Validating table: ${tableName} (${dbTableName})`);
    
    // Check if table exists
    const tableExists = actualTables.some(t => t.table_name === dbTableName);
    if (!tableExists) {
      this.mismatches.push({
        table: tableName,
        issue: 'missing_table',
        expected: dbTableName,
        actual: null,
        severity: 'critical'
      });
      console.log(`  ❌ Table ${dbTableName} does not exist in database`);
      return;
    }
    
    // Get expected columns from Drizzle schema
    const expectedColumns = this.extractExpectedColumns(drizzleTable);
    const actualTableColumns = actualColumns.filter(c => c.table_name === dbTableName);
    
    console.log(`  📋 Expected ${expectedColumns.length} columns, found ${actualTableColumns.length} columns`);
    
    // Check each expected column
    for (const [columnName, expectedType] of Object.entries(expectedColumns)) {
      const actualColumn = actualTableColumns.find(c => c.column_name === columnName);
      
      if (!actualColumn) {
        this.mismatches.push({
          table: tableName,
          issue: 'missing_column',
          expected: { name: columnName, type: expectedType },
          actual: null,
          severity: 'critical'
        });
        console.log(`    ❌ Missing column: ${columnName}`);
      } else {
        // Check data type
        if (!this.isTypeCompatible(expectedType, actualColumn.data_type)) {
          this.mismatches.push({
            table: tableName,
            issue: 'wrong_type',
            expected: { name: columnName, type: expectedType },
            actual: { name: columnName, type: actualColumn.data_type },
            severity: 'warning'
          });
          console.log(`    ⚠️  Type mismatch: ${columnName} (expected ${expectedType}, got ${actualColumn.data_type})`);
        }
      }
    }
    
    // Check for extra columns
    const expectedColumnNames = Object.keys(expectedColumns);
    const extraColumns = actualTableColumns.filter(c => !expectedColumnNames.includes(c.column_name));
    
    for (const extraColumn of extraColumns) {
      this.mismatches.push({
        table: tableName,
        issue: 'extra_column',
        expected: null,
        actual: { name: extraColumn.column_name, type: extraColumn.data_type },
        severity: 'info'
      });
      console.log(`    ℹ️  Extra column: ${extraColumn.column_name}`);
    }
    
    console.log(`  ✅ Validation complete for ${tableName}\n`);
  }

  private async checkExtraTables(actualTables: TableInfo[]): Promise<void> {
    const expectedTableNames = Object.keys(this.expectedTables).map(name => this.getDbTableName(name));
    const extraTables = actualTables.filter(t => !expectedTableNames.includes(t.table_name));
    
    for (const extraTable of extraTables) {
      this.mismatches.push({
        table: extraTable.table_name,
        issue: 'extra_column', // Reusing for extra tables
        expected: null,
        actual: { name: extraTable.table_name, type: extraTable.table_type },
        severity: 'info'
      });
      console.log(`ℹ️  Extra table in database: ${extraTable.table_name}`);
    }
  }

  private getDbTableName(tableName: string): string {
    // Map known table names correctly
    const tableMapping: Record<string, string> = {
      'usersAuth': 'users_auth',
      'organizations': 'organizations',
      'organizationMemberships': 'organization_memberships',
      'therapistProfiles': 'therapist_profiles',
      'therapistPHI': 'therapist_phi', // Fixed mapping
      'patients': 'patients',
      'clinicalSessions': 'clinical_sessions',
      'patientTreatmentPlans': 'patient_treatment_plans',
      'tasks': 'tasks',
      'calendarBlocks': 'calendar_blocks',
      'workSchedules': 'work_schedules',
      'auditLogsHIPAA': 'audit_logs_hipaa', // Fixed mapping
    };
    
    return tableMapping[tableName] || tableName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }

  private extractExpectedColumns(drizzleTable: any): Record<string, string> {
    const columns: Record<string, string> = {};
    
    // Extract columns from Drizzle table definition
    if (drizzleTable._ && drizzleTable._.columns) {
      for (const [columnName, columnDef] of Object.entries(drizzleTable._.columns)) {
        const dbColumnName = this.getDbColumnName(columnName);
        const dataType = this.getDrizzleDataType(columnDef);
        columns[dbColumnName] = dataType;
      }
    }
    
    // If no columns found, try alternative structure
    if (Object.keys(columns).length === 0 && drizzleTable) {
      // For some Drizzle tables, columns might be directly on the table object
      for (const [key, value] of Object.entries(drizzleTable)) {
        if (key !== '_' && typeof value === 'object' && value !== null) {
          const dbColumnName = this.getDbColumnName(key);
          const dataType = this.getDrizzleDataType(value);
          columns[dbColumnName] = dataType;
        }
      }
    }
    
    return columns;
  }

  private getDbColumnName(columnName: string): string {
    // Convert camelCase to snake_case
    return columnName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }

  private getDrizzleDataType(columnDef: any): string {
    // Map Drizzle types to PostgreSQL types
    if (columnDef.dataType === 'serial') return 'integer';
    if (columnDef.dataType === 'text') return 'text';
    if (columnDef.dataType === 'timestamp') return 'timestamp without time zone';
    if (columnDef.dataType === 'integer') return 'integer';
    if (columnDef.dataType === 'boolean') return 'boolean';
    if (columnDef.dataType === 'jsonb') return 'jsonb';
    if (columnDef.dataType === 'decimal') return 'numeric';
    if (columnDef.dataType === 'varchar') return 'character varying';
    
    return 'unknown';
  }

  private isTypeCompatible(expected: string, actual: string): boolean {
    // Map PostgreSQL types to compatible groups
    const typeGroups = {
      'integer': ['integer', 'serial'],
      'text': ['text', 'character varying'],
      'timestamp': ['timestamp without time zone', 'timestamp with time zone'],
      'boolean': ['boolean'],
      'jsonb': ['jsonb'],
      'numeric': ['numeric', 'decimal'],
    };
    
    for (const [group, types] of Object.entries(typeGroups)) {
      if (types.includes(expected) && types.includes(actual)) {
        return true;
      }
    }
    
    return expected === actual;
  }

  private generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 SCHEMA VALIDATION REPORT');
    console.log('='.repeat(80));
    
    const criticalIssues = this.mismatches.filter(m => m.severity === 'critical');
    const warnings = this.mismatches.filter(m => m.severity === 'warning');
    const infos = this.mismatches.filter(m => m.severity === 'info');
    
    console.log(`\n🚨 Critical Issues: ${criticalIssues.length}`);
    console.log(`⚠️  Warnings: ${warnings.length}`);
    console.log(`ℹ️  Info: ${infos.length}`);
    
    if (criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES (Must Fix):');
      console.log('-'.repeat(50));
      criticalIssues.forEach(issue => {
        console.log(`Table: ${issue.table}`);
        console.log(`Issue: ${issue.issue}`);
        console.log(`Expected: ${JSON.stringify(issue.expected)}`);
        console.log(`Actual: ${JSON.stringify(issue.actual)}`);
        console.log('');
      });
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS (Should Fix):');
      console.log('-'.repeat(50));
      warnings.forEach(issue => {
        console.log(`Table: ${issue.table}`);
        console.log(`Issue: ${issue.issue}`);
        console.log(`Expected: ${JSON.stringify(issue.expected)}`);
        console.log(`Actual: ${JSON.stringify(issue.actual)}`);
        console.log('');
      });
    }
    
    if (infos.length > 0) {
      console.log('\nℹ️  INFO (Extra Items):');
      console.log('-'.repeat(50));
      infos.forEach(issue => {
        console.log(`Table: ${issue.table}`);
        console.log(`Item: ${JSON.stringify(issue.actual)}`);
        console.log('');
      });
    }
    
    // Generate migration recommendations
    this.generateMigrationRecommendations();
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Schema validation complete');
    console.log('='.repeat(80));
  }

  private generateMigrationRecommendations(): void {
    const criticalIssues = this.mismatches.filter(m => m.severity === 'critical');
    
    if (criticalIssues.length === 0) {
      console.log('\n🎉 No critical issues found! Schema appears to be aligned.');
      return;
    }
    
    console.log('\n🔧 MIGRATION RECOMMENDATIONS:');
    console.log('-'.repeat(50));
    
    // Group by table
    const issuesByTable = criticalIssues.reduce((acc, issue) => {
      if (!acc[issue.table]) acc[issue.table] = [];
      acc[issue.table].push(issue);
      return acc;
    }, {} as Record<string, SchemaMismatch[]>);
    
    for (const [tableName, issues] of Object.entries(issuesByTable)) {
      console.log(`\nTable: ${tableName}`);
      
      for (const issue of issues) {
        if (issue.issue === 'missing_table') {
          console.log(`  -- Create table ${issue.expected}`);
        } else if (issue.issue === 'missing_column') {
          console.log(`  ALTER TABLE ${this.getDbTableName(tableName)} ADD COLUMN ${issue.expected.name} ${issue.expected.type};`);
        }
      }
    }
    
    console.log('\n💡 Run these SQL commands to fix critical issues.');
  }
}

// Main execution
async function main() {
  try {
    const validator = new SchemaValidator();
    await validator.validateSchema();
  } catch (error) {
    console.error('❌ Schema validation failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
main().catch(console.error);
