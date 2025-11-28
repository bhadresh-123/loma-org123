import pg from 'pg';
const { Pool } = pg;

async function checkActualColumns() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const query = `
    SELECT column_name, data_type
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name IN ('address', 'business_physical_address', 'city', 'state', 'zipcode')
    ORDER BY column_name;
  `;
  
  const { rows } = await pool.query(query);
  console.log('Address-related columns in database:');
  rows.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`));
  
  await pool.end();
}

checkActualColumns().catch(console.error);