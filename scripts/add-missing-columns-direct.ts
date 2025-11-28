import postgres from 'postgres';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

// Load environment
const envPath = join(process.cwd(), 'env.development');
if (existsSync(envPath)) {
  config({ path: envPath });
  console.log('✅ Loaded environment from env.development');
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

async function addMissingColumns() {
  console.log('🔗 Connecting to database...');
  const sql = postgres(DATABASE_URL);

  console.log('\n📝 Adding missing columns to users_auth table...\n');
  
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
      await sql.unsafe(migration);
      console.log('✅ Success\n');
    } catch (error: any) {
      console.log(`⚠️  ${error.message}\n`);
    }
  }

  console.log('✅ All migrations complete');
  await sql.end();
  process.exit(0);
}

addMissingColumns();

