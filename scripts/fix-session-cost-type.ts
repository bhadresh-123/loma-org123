#!/usr/bin/env tsx

/**
 * Fix session_cost column type conversion issue
 * 
 * This script manually fixes the session_cost and related decimal columns
 * that cannot be automatically cast to numeric type.
 * 
 * Usage:
 *   tsx scripts/fix-session-cost-type.ts
 *   or
 *   npm run fix:session-cost-type (if added to package.json)
 */

import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

// Load environment variables
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
  console.warn('⚠️  No environment file found. Using process.env.DATABASE_URL');
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set - PostgreSQL connection required');
  process.exit(1);
}

async function fixSessionCostType() {
  const sql = postgres(process.env.DATABASE_URL!, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    console.log('🔧 Fixing session_cost and related decimal columns...\n');

    // Check current column type
    const columnInfo = await sql`
      SELECT column_name, data_type, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_name = 'patients'
      AND column_name IN ('session_cost', 'no_show_fee', 'copay_amount', 'deductible_amount')
      ORDER BY column_name;
    `;

    console.log('Current column types:');
    columnInfo.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type}${col.numeric_precision ? `(${col.numeric_precision},${col.numeric_scale})` : ''}`);
    });
    console.log('');

    // Fix session_cost
    console.log('Fixing session_cost...');
    await sql`
      ALTER TABLE patients 
      ALTER COLUMN session_cost TYPE numeric(10, 2) 
      USING CASE 
        WHEN session_cost IS NULL THEN NULL
        WHEN session_cost::text ~ '^[0-9]+\.?[0-9]*$' THEN session_cost::text::numeric(10, 2)
        ELSE 0::numeric(10, 2)
      END;
    `;
    console.log('✅ Fixed session_cost\n');

    // Fix no_show_fee
    console.log('Fixing no_show_fee...');
    await sql`
      ALTER TABLE patients 
      ALTER COLUMN no_show_fee TYPE numeric(10, 2) 
      USING CASE 
        WHEN no_show_fee IS NULL THEN NULL
        WHEN no_show_fee::text ~ '^[0-9]+\.?[0-9]*$' THEN no_show_fee::text::numeric(10, 2)
        ELSE 0::numeric(10, 2)
      END;
    `;
    console.log('✅ Fixed no_show_fee\n');

    // Fix copay_amount
    console.log('Fixing copay_amount...');
    await sql`
      ALTER TABLE patients 
      ALTER COLUMN copay_amount TYPE numeric(10, 2) 
      USING CASE 
        WHEN copay_amount IS NULL THEN NULL
        WHEN copay_amount::text ~ '^[0-9]+\.?[0-9]*$' THEN copay_amount::text::numeric(10, 2)
        ELSE 0::numeric(10, 2)
      END;
    `;
    console.log('✅ Fixed copay_amount\n');

    // Fix deductible_amount
    console.log('Fixing deductible_amount...');
    await sql`
      ALTER TABLE patients 
      ALTER COLUMN deductible_amount TYPE numeric(10, 2) 
      USING CASE 
        WHEN deductible_amount IS NULL THEN NULL
        WHEN deductible_amount::text ~ '^[0-9]+\.?[0-9]*$' THEN deductible_amount::text::numeric(10, 2)
        ELSE 0::numeric(10, 2)
      END;
    `;
    console.log('✅ Fixed deductible_amount\n');

    // Verify the fix
    const verifyInfo = await sql`
      SELECT column_name, data_type, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_name = 'patients'
      AND column_name IN ('session_cost', 'no_show_fee', 'copay_amount', 'deductible_amount')
      ORDER BY column_name;
    `;

    console.log('✅ Verification - Updated column types:');
    verifyInfo.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type}(${col.numeric_precision},${col.numeric_scale})`);
    });

    console.log('\n✅ All decimal columns fixed successfully!');
    console.log('You can now run: npm run db:hipaa:push');

  } catch (error: any) {
    console.error('❌ Error fixing column types:', error.message);
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    if (error.hint) {
      console.error('   Hint:', error.hint);
    }
    process.exit(1);
  } finally {
    await sql.end();
  }
}

fixSessionCostType();

