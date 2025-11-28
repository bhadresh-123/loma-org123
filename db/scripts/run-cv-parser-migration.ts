#!/usr/bin/env node

/**
 * CV Parser Migration Runner
 * 
 * Creates the cv_parser_education and cv_parser_work_experience tables
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from '../index';
import { sql } from 'drizzle-orm';

async function runCVParserMigration() {
  console.log('🚀 Starting CV Parser Migration...');
  
  try {
    // Read the migration SQL file
    const migrationPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations-hipaa', '0006_add_cv_parser_tables.sql');
    console.log('📋 Reading migration from:', migrationPath);
    
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('COMMENT'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.execute(sql.raw(statement));
          const preview = statement.substring(0, 80).replace(/\n/g, ' ');
          console.log(`✅ Executed: ${preview}...`);
        } catch (error: any) {
          // Tables might already exist, which is OK
          if (error.message?.includes('already exists')) {
            console.log(`⚠️  Already exists, skipping: ${statement.substring(0, 50)}...`);
          } else {
            console.error(`❌ Error executing statement: ${statement.substring(0, 100)}`);
            throw error;
          }
        }
      }
    }
    
    // Verify tables were created
    console.log('🔍 Verifying tables...');
    
    const verifyQueries = [
      "SELECT COUNT(*) as count FROM cv_parser_education",
      "SELECT COUNT(*) as count FROM cv_parser_work_experience"
    ];
    
    for (const query of verifyQueries) {
      try {
        const result = await db.execute(sql.raw(query));
        console.log(`✅ ${query}: ${result.rows[0]?.count || 0} records`);
      } catch (error: any) {
        console.error(`❌ Verification failed for: ${query}`);
        throw error;
      }
    }
    
    console.log('🎉 CV Parser Migration Complete!');
    console.log('');
    console.log('Tables created:');
    console.log('  - cv_parser_education');
    console.log('  - cv_parser_work_experience');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runCVParserMigration();

