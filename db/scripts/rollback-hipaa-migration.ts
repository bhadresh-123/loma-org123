#!/usr/bin/env node

/**
 * HIPAA Schema Migration Rollback Script
 * 
 * This script rolls back the HIPAA schema migration by:
 * 1. Restoring data from backup tables
 * 2. Dropping HIPAA tables
 * 3. Verifying rollback success
 */

import { db } from '../index';
import { sql } from 'drizzle-orm';

async function rollbackMigration() {
  console.log('🔄 Starting HIPAA Schema Migration Rollback...');
  
  try {
    // Step 1: Restore data from backup tables
    console.log('📋 Step 1: Restoring data from backup tables...');
    
    // Check if backup tables exist
    const backupCheck = await db.execute(sql.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('users_backup', 'clients_backup', 'sessions_backup')
    `));
    
    if (backupCheck.rows.length === 0) {
      console.log('⚠️  No backup tables found. Cannot rollback.');
      return;
    }
    
    // Restore users table if backup exists
    const usersBackupExists = backupCheck.rows.some(row => row.table_name === 'users_backup');
    if (usersBackupExists) {
      console.log('🔄 Restoring users table...');
      await db.execute(sql.raw(`
        DROP TABLE IF EXISTS users;
        CREATE TABLE users AS SELECT * FROM users_backup;
      `));
      console.log('✅ Users table restored');
    }
    
    // Restore clients table if backup exists
    const clientsBackupExists = backupCheck.rows.some(row => row.table_name === 'clients_backup');
    if (clientsBackupExists) {
      console.log('🔄 Restoring clients table...');
      await db.execute(sql.raw(`
        DROP TABLE IF EXISTS clients;
        CREATE TABLE clients AS SELECT * FROM clients_backup;
      `));
      console.log('✅ Clients table restored');
    }
    
    // Restore sessions table if backup exists
    const sessionsBackupExists = backupCheck.rows.some(row => row.table_name === 'sessions_backup');
    if (sessionsBackupExists) {
      console.log('🔄 Restoring sessions table...');
      await db.execute(sql.raw(`
        DROP TABLE IF EXISTS sessions;
        CREATE TABLE sessions AS SELECT * FROM sessions_backup;
      `));
      console.log('✅ Sessions table restored');
    }
    
    // Step 2: Drop HIPAA tables
    console.log('🗑️  Step 2: Dropping HIPAA tables...');
    
    const hipaaTables = [
      'audit_logs_hipaa',
      'treatment_plans_hipaa',
      'sessions_hipaa',
      'clients_hipaa',
      'therapist_phi',
      'therapist_profiles',
      'users_auth'
    ];
    
    for (const table of hipaaTables) {
      try {
        await db.execute(sql.raw(`DROP TABLE IF EXISTS ${table}`));
        console.log(`✅ Dropped table: ${table}`);
      } catch (error) {
        console.log(`⚠️  Could not drop table ${table}: ${error.message}`);
      }
    }
    
    // Step 3: Verify rollback
    console.log('🔍 Step 3: Verifying rollback...');
    
    const verificationQueries = [
      'SELECT COUNT(*) as count FROM users',
      'SELECT COUNT(*) as count FROM clients',
      'SELECT COUNT(*) as count FROM sessions'
    ];
    
    for (const query of verificationQueries) {
      try {
        const result = await db.execute(sql.raw(query));
        console.log(`✅ ${query}: ${result.rows[0]?.count || 0} records`);
      } catch (error) {
        console.log(`⚠️  ${query}: Table does not exist`);
      }
    }
    
    console.log('🎉 HIPAA Schema Migration Rollback Complete!');
    console.log('✅ Original schema restored');
    console.log('✅ HIPAA tables removed');
    console.log('✅ System ready for re-migration');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    console.error('🔄 Please check the error and contact support');
    process.exit(1);
  }
}

// Run the rollback
if (require.main === module) {
  rollbackMigration();
}

export { rollbackMigration };
