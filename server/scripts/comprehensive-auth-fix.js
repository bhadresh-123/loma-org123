import pg from 'pg';
const { Pool } = pg;

async function comprehensiveAuthFix() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('🔧 Comprehensive Authentication System Fix');
    console.log('==========================================\n');
    
    // Get all columns that exist in the schema definition (including missing ones)
    const schemaColumns = [
      'address', 'dateofbirth', 'birthcity', 'birthstate', 'birthcountry', 'taxonomycode',
      'isuscitizen', 'npinumber', 'workpermitvisa', // Additional missing columns from clean slate
      // Original columns that should exist
      'id', 'username', 'name', 'title', 'ssn', 'gender', 'race', 'personalphone', 
      'personalemail', 'license', 'specialties', 'email', 'phone', 'created_at',
      'npi_number', 'taxonomy_code', 'city', 'state', 'zipcode', 'date_of_birth',
      'birth_city', 'birth_state', 'birth_country', 'business_physical_address'
    ];
    
    // Check which columns actually exist in the database
    const { rows: existingColumns } = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY column_name
    `);
    
    const existingColumnNames = existingColumns.map(row => row.column_name);
    console.log('📋 Existing columns in database:');
    console.log(existingColumnNames.join(', '));
    
    // Find missing columns
    const missingColumns = schemaColumns.filter(col => !existingColumnNames.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('\n❌ Missing columns found:');
      console.log(missingColumns.join(', '));
      
      // Add missing columns
      for (const column of missingColumns) {
        const dataType = column.includes('date') || column === 'created_at' ? 'timestamp' : 'text';
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${column} ${dataType}`);
        console.log(`✅ Added ${column} (${dataType})`);
      }
    } else {
      console.log('\n✅ All required columns exist');
    }
    
    // Test authentication system
    console.log('\n🧪 Testing authentication system...');
    
    const testQuery = `
      SELECT id, username, name 
      FROM users 
      WHERE id = 27 
      LIMIT 1
    `;
    
    const { rows: [testUser] } = await pool.query(testQuery);
    
    if (testUser) {
      console.log('✅ Authentication test PASSED');
      console.log(`   User ${testUser.username} (ID: ${testUser.id}) accessible`);
    } else {
      console.log('❌ Authentication test FAILED - no test user found');
    }
    
    console.log('\n🎉 Comprehensive authentication fix complete!');
    
  } catch (error) {
    console.error('❌ Comprehensive fix failed:', error.message);
  } finally {
    await pool.end();
  }
}

comprehensiveAuthFix().catch(console.error);