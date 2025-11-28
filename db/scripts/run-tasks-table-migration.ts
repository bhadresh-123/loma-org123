#!/usr/bin/env tsx

/**
 * Migration Script: Add Tasks Table to Production Database
 * 
 * This script adds the missing tasks table to the HIPAA schema.
 * The tasks table is required for task management functionality.
 * 
 * Usage:
 *   npm run migrate:tasks
 *   or
 *   tsx db/scripts/run-tasks-table-migration.ts
 */

import { db } from '@db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function runTasksTableMigration() {
  console.log('🔧 Tasks Table Migration Script');
  console.log('================================\n');

  try {
    // Check if tasks table already exists
    console.log('1. Checking if tasks table exists...');
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks'
      ) as table_exists
    `);
    
    const tableExists = tableCheck.rows[0]?.table_exists;
    
    if (tableExists) {
      console.log('   ✅ Tasks table already exists - no migration needed');
      return { success: true, message: 'Table already exists' };
    }

    console.log('   ⚠️  Tasks table does not exist - proceeding with migration...\n');

    // Read the migration file
    console.log('2. Reading migration file...');
    const migrationPath = path.join(__dirname, '../migrations-hipaa/0007_add_tasks_table.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    console.log('   ✅ Migration file loaded\n');

    // Execute the migration
    console.log('3. Executing migration...');
    await db.execute(sql.raw(migrationSQL));
    console.log('   ✅ Migration executed successfully\n');

    // Verify the table was created
    console.log('4. Verifying table creation...');
    const verifyCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks'
      ) as table_exists
    `);
    
    const verified = verifyCheck.rows[0]?.table_exists;
    
    if (!verified) {
      throw new Error('Table verification failed - tasks table was not created');
    }

    console.log('   ✅ Tasks table verified\n');

    // Check table structure
    console.log('5. Checking table structure...');
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'tasks'
      ORDER BY ordinal_position
    `);

    console.log(`   ✅ Found ${columns.rows.length} columns:\n`);
    columns.rows.forEach((col: any) => {
      console.log(`      - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('   Tasks table is now available for use.\n');

    return { success: true, message: 'Migration completed' };

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    if (error instanceof Error) {
      console.error('   Error details:', error.message);
      console.error('   Stack trace:', error.stack);
    }
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  runTasksTableMigration()
    .then((result) => {
      console.log('\n✅ Script completed:', result.message);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error.message);
      process.exit(1);
    });
}

export { runTasksTableMigration };

