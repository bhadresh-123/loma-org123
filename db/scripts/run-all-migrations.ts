#!/usr/bin/env tsx

/**
 * Comprehensive Migration Runner
 * 
 * Runs all HIPAA migrations that may be missing in production:
 * - 0003: Operational tables (invoices, notifications, user_settings, etc.)
 * - 0004: Medical codes tables (medical_codes, assessment_categories)
 * - 0005: Documents tables (document_templates, documents)
 * - Meetings tables (meetings, meeting_types) - no migration file exists
 * - 0007: Tasks table
 * - 0010: Organization invites table
 * 
 * This script is idempotent - safe to run multiple times.
 * Tables are created with "IF NOT EXISTS" so existing tables won't error.
 * 
 * Usage:
 *   npm run migrate:all
 *   or
 *   tsx db/scripts/run-all-migrations.ts
 */

// Load environment variables FIRST - this MUST happen before any db imports
import { config } from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Try to load environment files in order of priority
const envFiles = [
  '.env.local',
  '.env.development',
  'env.development',
  '.env'
];

let envLoaded = false;
for (const envFile of envFiles) {
  const envPath = join(process.cwd(), envFile);
  if (existsSync(envPath)) {
    config({ path: envPath });
    console.log(`✅ Loaded environment from: ${envFile}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('⚠️  No environment file found. Trying to use process.env.DATABASE_URL');
}

// Verify DATABASE_URL is available before proceeding
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set - PostgreSQL connection required');
  console.error('❌ Please set DATABASE_URL environment variable');
  process.exit(1);
}

// Import sql separately (doesn't need db connection)
import { sql } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MigrationResult {
  name: string;
  success: boolean;
  message: string;
  tablesCreated: string[];
}

async function checkTableExists(db: any, tableName: string): Promise<boolean> {
  try {
    if (!db) {
      console.error(`Database not initialized - cannot check table ${tableName}`);
      return false;
    }
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      ) as table_exists
    `);
    return result.rows[0]?.table_exists || false;
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error);
    return false;
  }
}

async function checkColumnExists(db: any, tableName: string, columnName: string): Promise<boolean> {
  try {
    if (!db) {
      console.error(`Database not initialized - cannot check column ${tableName}.${columnName}`);
      return false;
    }
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
        AND column_name = ${columnName}
      ) as column_exists
    `);
    return result.rows[0]?.column_exists || false;
  } catch (error) {
    console.error(`Error checking column ${tableName}.${columnName}:`, error);
    return false;
  }
}

async function runSQLMigration(
  db: any,
  name: string,
  sqlFilePath: string,
  expectedTables: string[],
  expectedColumns?: Array<{ table: string; column: string }>
): Promise<MigrationResult> {
  console.log(`\n📦 Running migration: ${name}`);
  console.log(`   File: ${sqlFilePath}`);
  
  const result: MigrationResult = {
    name,
    success: false,
    message: '',
    tablesCreated: []
  };

  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    // Check if all expected tables already exist
    const existingTables = await Promise.all(
      expectedTables.map(async (table) => ({
        name: table,
        exists: await checkTableExists(db, table)
      }))
    );

    const missingTables = existingTables.filter(t => !t.exists);
    
    // Check expected columns if provided
    let missingColumns: Array<{ table: string; column: string }> = [];
    if (expectedColumns && expectedColumns.length > 0) {
      const existingColumns = await Promise.all(
        expectedColumns.map(async (col) => ({
          ...col,
          exists: await checkColumnExists(db, col.table, col.column)
        }))
      );
      missingColumns = existingColumns.filter(c => !c.exists);
    }
    
    // If all tables and columns already exist, skip
    if (missingTables.length === 0 && missingColumns.length === 0) {
      result.success = true;
      result.message = 'All tables and columns already exist, skipping';
      console.log(`   ✅ All tables and columns already exist, skipping`);
      return result;
    }

    if (missingTables.length > 0) {
      console.log(`   ⚙️  Missing tables: ${missingTables.map(t => t.name).join(', ')}`);
    }
    if (missingColumns.length > 0) {
      console.log(`   ⚙️  Missing columns: ${missingColumns.map(c => `${c.table}.${c.column}`).join(', ')}`);
    }

    // Read and execute the SQL file
    const migrationSQL = readFileSync(sqlFilePath, 'utf8');
    
    // Split into individual statements - handle multi-line SQL properly
    // Remove all comment lines first, then split by semicolon+newline
    const lines = migrationSQL.split('\n');
    const cleanedLines: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Keep only non-comment lines (or inline comments within statements)
      if (!trimmed.startsWith('--') || trimmed.length === 2) {
        cleanedLines.push(line);
      }
    }
    
    const cleanedSQL = cleanedLines.join('\n');
    
    // Split by semicolon followed by newline or end of string
    const rawStatements = cleanedSQL
      .split(/;\s*(?=\n|$)/)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    const statements = rawStatements.filter(stmt => {
      // Skip empty statements and standalone comment markers
      const trimmed = stmt.trim();
      return trimmed.length > 0 && trimmed !== '--';
    });

    let tablesCreated = 0;
    let indexesCreated = 0;
    let columnsAdded = 0;

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          // Ensure statement ends with semicolon
          const sqlStatement = statement.trim().endsWith(';') 
            ? statement.trim() 
            : statement.trim() + ';';
          await db.execute(sql.raw(sqlStatement));
          
          if (statement.includes('CREATE TABLE')) {
            tablesCreated++;
            const tableName = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?"?(\w+)"?/)?.[1];
            if (tableName) {
              result.tablesCreated.push(tableName);
            }
          } else if (statement.includes('CREATE INDEX')) {
            indexesCreated++;
          } else if (statement.includes('ADD COLUMN')) {
            columnsAdded++;
          }
        } catch (error: any) {
          const errorMsg = error.message || String(error);
          // Ignore "already exists" errors
          if (errorMsg.includes('already exists')) {
            continue;
          }
          // Ignore "does not exist" errors for COMMENT statements (table might not exist yet)
          if (errorMsg.includes('does not exist') && statement.toUpperCase().includes('COMMENT')) {
            console.log(`   ⚠️  Skipping COMMENT statement (table may not exist yet): ${errorMsg}`);
            continue;
          }
          // For other errors, throw
          console.error(`   ❌ Error executing statement: ${statement.substring(0, 150)}...`);
          throw error;
        }
      }
    }

    result.success = true;
    
    // Build appropriate message based on what was done
    const messageParts: string[] = [];
    if (tablesCreated > 0) {
      messageParts.push(`Created ${tablesCreated} table${tablesCreated > 1 ? 's' : ''}`);
    }
    if (columnsAdded > 0) {
      messageParts.push(`Added ${columnsAdded} column${columnsAdded > 1 ? 's' : ''}`);
    }
    if (indexesCreated > 0) {
      messageParts.push(`Created ${indexesCreated} index${indexesCreated > 1 ? 'es' : ''}`);
    }
    if (missingColumns.length === 0 && missingTables.length === 0 && tablesCreated === 0 && columnsAdded === 0 && indexesCreated === 0) {
      messageParts.push('No changes needed');
    }
    
    result.message = messageParts.length > 0 ? messageParts.join(', ') : 'Migration completed';
    console.log(`   ✅ ${result.message}`);
    
    return result;
  } catch (error: any) {
    result.success = false;
    result.message = `Failed: ${error.message}`;
    console.error(`   ❌ ${result.message}`);
    throw error;
  }
}

async function runInlineSQLMigration(
  db: any,
  name: string,
  sqlContent: string,
  expectedTables: string[]
): Promise<MigrationResult> {
  console.log(`\n📦 Running migration: ${name}`);
  
  const result: MigrationResult = {
    name,
    success: false,
    message: '',
    tablesCreated: []
  };

  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    // Check if all expected tables already exist
    const existingTables = await Promise.all(
      expectedTables.map(async (table) => ({
        name: table,
        exists: await checkTableExists(db, table)
      }))
    );

    const missingTables = existingTables.filter(t => !t.exists);
    
    if (missingTables.length === 0) {
      result.success = true;
      result.message = 'All tables already exist, skipping';
      console.log(`   ✅ All tables already exist, skipping`);
      return result;
    }

    console.log(`   ⚙️  Missing tables: ${missingTables.map(t => t.name).join(', ')}`);

    // Execute the SQL
    await db.execute(sql.raw(sqlContent));

    result.success = true;
    result.message = `Created ${expectedTables.length} tables`;
    result.tablesCreated = expectedTables;
    console.log(`   ✅ ${result.message}`);
    
    return result;
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      result.success = true;
      result.message = 'Tables already exist';
      console.log(`   ✅ Tables already exist, skipping`);
      return result;
    }
    
    result.success = false;
    result.message = `Failed: ${error.message}`;
    console.error(`   ❌ ${result.message}`);
    throw error;
  }
}

async function seedMedicalCodes(db: any): Promise<void> {
  console.log(`\n🌱 Seeding medical codes data...`);
  
  try {
    if (!db) {
      console.error('   ⚠️  Database not initialized - skipping seed');
      return;
    }
    
    // Check if data already exists
    const existingCodes = await db.execute(sql`SELECT COUNT(*) as count FROM medical_codes`);
    const count = parseInt(existingCodes.rows[0]?.count || '0');
    
    if (count > 0) {
      console.log(`   ✅ Medical codes already seeded (${count} records), skipping`);
      return;
    }

    // Read and execute seed file
    const seedSQL = readFileSync(
      join(__dirname, '../scripts/seed-medical-codes.sql'),
      'utf8'
    );
    
    await db.execute(sql.raw(seedSQL));
    
    // Verify seeding
    const newCount = await db.execute(sql`SELECT COUNT(*) as count FROM medical_codes`);
    const seededCount = parseInt(newCount.rows[0]?.count || '0');
    
    console.log(`   ✅ Seeded ${seededCount} medical codes`);
  } catch (error: any) {
    console.error(`   ⚠️  Seeding skipped: ${error.message}`);
  }
}

async function runAllMigrations() {
  console.log('🚀 Starting Comprehensive Database Migration\n');
  console.log('='.repeat(60));

  // Dynamically import db AFTER environment variables are loaded
  const { db } = await import('../index');
  
  if (!db) {
    console.error('❌ Failed to initialize database connection');
    console.error('❌ Make sure DATABASE_URL is set correctly');
    process.exit(1);
  }

  const startTime = Date.now();
  const results: MigrationResult[] = [];

  try {
    // Migration 0003: Operational Tables
    const migration0003 = await runSQLMigration(
      db,
      'Migration 0003: Operational Tables',
      join(__dirname, '../migrations-hipaa/0003_add_operational_tables.sql'),
      ['user_settings', 'notifications', 'notification_settings', 'invoices', 'invoice_items', 'card_transactions']
    );
    results.push(migration0003);

    // Migration 0004: Medical Codes
    const migration0004 = await runSQLMigration(
      db,
      'Migration 0004: Medical Codes Tables',
      join(__dirname, '../migrations-hipaa/0004_add_medical_codes_tables.sql'),
      ['medical_codes', 'assessment_categories']
    );
    results.push(migration0004);

    // Seed medical codes data
    if (migration0004.success) {
      await seedMedicalCodes(db);
    }

    // Migration 0005: Documents Tables
    const migration0005 = await runSQLMigration(
      db,
      'Migration 0005: Documents Tables',
      join(__dirname, '../migrations-hipaa/0005_add_documents_tables.sql'),
      ['document_templates', 'documents']
    );
    results.push(migration0005);

    // Meetings Tables (no migration file exists, so we create inline)
    const meetingsSQL = `
-- Create meeting_types table
CREATE TABLE IF NOT EXISTS meeting_types (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users_auth(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users_auth(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  type_id INTEGER REFERENCES meeting_types(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  duration INTEGER NOT NULL DEFAULT 60,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_meeting_types_user_id ON meeting_types(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_types_organization_id ON meeting_types(organization_id);
CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_organization_id ON meetings(organization_id);
CREATE INDEX IF NOT EXISTS idx_meetings_type_id ON meetings(type_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);
`;

    const meetingsMigration = await runInlineSQLMigration(
      db,
      'Meetings Tables (inline)',
      meetingsSQL,
      ['meeting_types', 'meetings']
    );
    results.push(meetingsMigration);

    // Migration 0007: Tasks Table
    const migration0007 = await runSQLMigration(
      db,
      'Migration 0007: Tasks Table',
      join(__dirname, '../migrations-hipaa/0007_add_tasks_table.sql'),
      ['tasks']
    );
    results.push(migration0007);

    // Migration 0008: Remove patient_age and Add patient_name_search_hash
    const migration0008 = await runSQLMigration(
      db,
      'Migration 0008: Remove patient_age, Add patient_name_search_hash',
      join(__dirname, '../migrations-hipaa/0008_remove_patient_age.sql'),
      [], // observedTables - empty since we're modifying existing table
      [{ table: 'patients', column: 'patient_name_search_hash' }] // expectedColumns
    );
    results.push(migration0008);

    // Migration 0010: Organization Invites Table
    const migration0010 = await runSQLMigration(
      db,
      'Migration 0010: Organization Invites Table',
      join(__dirname, '../migrations-hipaa/0010_add_organization_invites.sql'),
      ['organization_invites']
    );
    results.push(migration0010);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Migration Summary:\n');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.name}`);
      console.log(`   ${result.message}`);
      if (result.tablesCreated.length > 0) {
        console.log(`   Tables: ${result.tablesCreated.join(', ')}`);
      }
    });

    console.log(`\n📈 Results: ${successful} successful, ${failed} failed`);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  Duration: ${duration}s`);

    // Verify all critical tables and columns exist
    console.log('\n🔍 Verifying database state...');
    const criticalTables = [
      'medical_codes',
      'assessment_categories',
      'meetings',
      'meeting_types',
      'document_templates',
      'documents',
      'tasks',
      'invoices',
      'notifications',
      'user_settings',
      'organization_invites'
    ];

    const criticalColumns = [
      { table: 'patients', column: 'patient_name_search_hash' }
    ];

    const tableVerification = await Promise.all(
      criticalTables.map(async (table) => ({
        name: table,
        exists: await checkTableExists(db, table)
      }))
    );

    const columnVerification = await Promise.all(
      criticalColumns.map(async (col) => ({
        ...col,
        exists: await checkColumnExists(db, col.table, col.column)
      }))
    );

    const missingTables = tableVerification.filter(v => !v.exists);
    const missingColumns = columnVerification.filter(v => !v.exists);
    
    if (missingTables.length === 0 && missingColumns.length === 0) {
      console.log('   ✅ All critical tables and columns verified');
    } else {
      if (missingTables.length > 0) {
        console.log('   ⚠️  Missing tables:', missingTables.map(t => t.name).join(', '));
      }
      if (missingColumns.length > 0) {
        console.log('   ⚠️  Missing columns:', missingColumns.map(c => `${c.table}.${c.column}`).join(', '));
      }
    }

    console.log('\n🎉 Migration completed successfully!\n');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  }
}

// Run migrations
runAllMigrations();

