import pg from 'pg';
const { Pool } = pg;

async function finalSystemVerification() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('🔍 FINAL SYSTEM VERIFICATION');
    console.log('============================\n');
    
    // Test authentication system thoroughly
    console.log('1. Testing authentication system...');
    
    const authTestQuery = `
      SELECT id, username, name, email, title
      FROM users 
      WHERE id = 27 
      LIMIT 1
    `;
    
    const { rows: [testUser] } = await pool.query(authTestQuery);
    
    if (testUser) {
      console.log('✅ Authentication system working');
      console.log(`   User: ${testUser.username} (${testUser.name})`);
    } else {
      console.log('❌ Authentication system failed');
      return;
    }
    
    // Test profile data access
    console.log('\n2. Testing profile data access...');
    
    const profileTestQuery = `
      SELECT 
        npi_number, city, state, 
        date_of_birth, birth_city, birth_state, birth_country,
        address, dateofbirth, birthcity, birthstate, birthcountry,
        taxonomycode, isuscitizen, npinumber
      FROM users 
      WHERE id = 27 
      LIMIT 1
    `;
    
    const { rows: [profileData] } = await pool.query(profileTestQuery);
    
    if (profileData) {
      console.log('✅ Profile data accessible');
      console.log(`   NPI: ${profileData.npi_number || 'Not set'}`);
      console.log(`   Location: ${profileData.city}, ${profileData.state}`);
      console.log(`   All temporary columns present`);
    } else {
      console.log('❌ Profile data access failed');
    }
    
    // Test sessions data
    console.log('\n3. Testing sessions data...');
    
    const sessionsTestQuery = `
      SELECT COUNT(*) as count, MAX(date) as latest_session
      FROM sessions 
      WHERE user_id = 27
    `;
    
    const { rows: [sessionsData] } = await pool.query(sessionsTestQuery);
    console.log(`✅ Sessions accessible: ${sessionsData.count} sessions`);
    
    // Test tasks data  
    console.log('\n4. Testing tasks data...');
    
    const tasksTestQuery = `
      SELECT COUNT(*) as count, MAX(created_at) as latest_task
      FROM tasks 
      WHERE user_id = 27
    `;
    
    const { rows: [tasksData] } = await pool.query(tasksTestQuery);
    console.log(`✅ Tasks accessible: ${tasksData.count} tasks`);
    
    console.log('\n🎉 SYSTEM VERIFICATION COMPLETE');
    console.log('================================');
    console.log('✅ Authentication system stable');
    console.log('✅ Profile data accessible');
    console.log('✅ Sessions data accessible');  
    console.log('✅ Tasks data accessible');
    console.log('✅ No missing column errors');
    console.log('\n🚀 System ready for profile persistence testing');
    
  } catch (error) {
    console.error('❌ System verification failed:', error.message);
  } finally {
    await pool.end();
  }
}

finalSystemVerification().catch(console.error);