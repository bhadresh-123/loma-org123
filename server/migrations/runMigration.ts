import { db } from '../../db';
import fs from 'fs';
import path from 'path';
import { sql } from 'drizzle-orm';

async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'add_task_categories.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute SQL
    await db.execute(sql.raw(sqlContent));
    
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();