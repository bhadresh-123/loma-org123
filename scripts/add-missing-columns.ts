import { loadEnvironmentConfig } from '../server/utils/environment';

// Load environment first
loadEnvironmentConfig();

import { db } from '../db/index';
import { sql } from 'drizzle-orm';

async function addMissingColumns() {
  console.log('Adding missing columns to users_auth table...');
  
  const migrations = [
    'ALTER TABLE users_auth ADD COLUMN IF NOT EXISTS mfa_enforced_at TIMESTAMP',
    'ALTER TABLE users_auth ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT \'active\'',
    'ALTER TABLE users_auth ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false',
    'ALTER TABLE users_auth ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0',
    'ALTER TABLE users_auth ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP',
  ];

  for (const migration of migrations) {
    try {
      console.log(`Running: ${migration}`);
      await db.execute(sql.raw(migration));
      console.log('✅ Success');
    } catch (error: any) {
      console.log(`Error: ${error.message}`);
    }
  }

  console.log('\n✅ All migrations complete');
  process.exit(0);
}

addMissingColumns();

