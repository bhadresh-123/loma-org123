import pg from 'pg';
const { Pool } = pg;

async function addMissingColumns() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('🔧 Adding missing columns to fix authentication...');
    
    // Add back the address column as an alias to business_physical_address
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS address text');
    console.log('✅ Added address column back');
    
    // Add back the dateofbirth column as an alias to date_of_birth
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS dateofbirth timestamp');
    console.log('✅ Added dateofbirth column back');
    
    // Add back other missing columns from clean slate fix
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS birthcity text');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS birthstate text');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS birthcountry text');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS taxonomycode text');
    console.log('✅ Added birthcity, birthstate, birthcountry, taxonomycode columns back');
    
    // Update existing data to copy from business_physical_address to address
    await pool.query(`
      UPDATE users 
      SET address = business_physical_address 
      WHERE business_physical_address IS NOT NULL AND address IS NULL
    `);
    console.log('✅ Copied data from business_physical_address to address');
    
    // Update existing data to copy from date_of_birth to dateofbirth
    await pool.query(`
      UPDATE users 
      SET dateofbirth = date_of_birth 
      WHERE date_of_birth IS NOT NULL AND dateofbirth IS NULL
    `);
    console.log('✅ Copied data from date_of_birth to dateofbirth');
    
    // Verify the fix
    const { rows: [{ count }] } = await pool.query('SELECT COUNT(*) as count FROM users WHERE address IS NOT NULL');
    console.log(`✅ Address column now has ${count} entries`);
    
    const { rows: [{ count: dobCount }] } = await pool.query('SELECT COUNT(*) as count FROM users WHERE dateofbirth IS NOT NULL');
    console.log(`✅ Date of birth column now has ${dobCount} entries`);
    
    console.log('\n🎉 Authentication system should now work');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    await pool.end();
  }
}

addMissingColumns().catch(console.error);