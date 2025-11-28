#!/usr/bin/env node

/**
 * Create user_profiles table migration script
 * Ensures the user_profiles table exists in production database
 */

import { drizzle } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleSQLite } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import ws from "ws";

async function createUserProfilesTable() {
  console.log("🔧 Starting user_profiles table migration...");
  
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set - skipping migration");
    return false;
  }

  try {
    const connectionString = process.env.DATABASE_URL;
    let db;
    
    // Check if it's a SQLite database URL (file:)
    if (connectionString.startsWith('file:')) {
      console.log("🔧 Using SQLite database for migration");
      const sqlite = new Database(connectionString.replace('file:', ''));
      
      // Import SQLite schema
      const { users, clients, sessions, tasks, notifications } = await import("../../db/schema-sqlite.js");
      const schema = { users, clients, sessions, tasks, notifications };
      db = drizzleSQLite(sqlite, { schema });
      
      // Check if user_profiles table exists in SQLite
      const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_profiles'").all();
      
      if (tables.length > 0) {
        console.log("✅ user_profiles table already exists in SQLite");
        return true;
      }
      
      // Create user_profiles table for SQLite
      console.log("🔧 Creating user_profiles table in SQLite...");
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255),
          title VARCHAR(255),
          license_number VARCHAR(255),
          address_encrypted TEXT,
          city VARCHAR(255),
          state VARCHAR(255),
          zip_code VARCHAR(255),
          personal_phone_encrypted TEXT,
          personal_email_encrypted TEXT,
          biography TEXT,
          years_of_experience INTEGER,
          qualifications TEXT,
          languages TEXT,
          session_format VARCHAR(50) DEFAULT 'in_person',
          base_rate DECIMAL(10,2),
          sliding_scale BOOLEAN DEFAULT FALSE,
          specialties TEXT,
          therapist_identities TEXT,
          ssn_encrypted TEXT,
          date_of_birth_encrypted TEXT,
          birth_city_encrypted TEXT,
          birth_state_encrypted TEXT,
          birth_country_encrypted TEXT,
          is_us_citizen BOOLEAN,
          work_permit_visa VARCHAR(255),
          npi_number VARCHAR(255),
          taxonomy_code VARCHAR(255),
          ein_number VARCHAR(255),
          legal_business_name VARCHAR(255),
          is_insurance_provider BOOLEAN DEFAULT FALSE,
          accepted_providers TEXT,
          group_session_rate DECIMAL(10,2),
          default_note_format VARCHAR(50) DEFAULT 'SOAP',
          session_duration INTEGER DEFAULT 50,
          time_zone VARCHAR(100) DEFAULT 'America/Chicago',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log("✅ user_profiles table created in SQLite");
      return true;
      
    } else {
      // Use PostgreSQL for production
      console.log("🔧 Using PostgreSQL database for migration");
      
      // Import PostgreSQL schema
      const schema = await import("../../db/schema.js");
      
      db = drizzle({
        connection: connectionString,
        schema,
        ws: ws,
      });
      
      // Check if user_profiles table exists in PostgreSQL
      try {
        const result = await db.execute(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_profiles'
          );
        `);
        
        const tableExists = result.rows[0]?.exists;
        
        if (tableExists) {
          console.log("✅ user_profiles table already exists in PostgreSQL");
          return true;
        }
        
        // Create user_profiles table for PostgreSQL
        console.log("🔧 Creating user_profiles table in PostgreSQL...");
        await db.execute(`
          CREATE TABLE IF NOT EXISTS user_profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(255),
            title VARCHAR(255),
            license_number VARCHAR(255),
            address_encrypted TEXT,
            city VARCHAR(255),
            state VARCHAR(255),
            zip_code VARCHAR(255),
            personal_phone_encrypted TEXT,
            personal_email_encrypted TEXT,
            biography TEXT,
            years_of_experience INTEGER,
            qualifications TEXT,
            languages TEXT,
            session_format VARCHAR(50) DEFAULT 'in_person',
            base_rate DECIMAL(10,2),
            sliding_scale BOOLEAN DEFAULT FALSE,
            specialties TEXT,
            therapist_identities TEXT,
            ssn_encrypted TEXT,
            date_of_birth_encrypted TEXT,
            birth_city_encrypted TEXT,
            birth_state_encrypted TEXT,
            birth_country_encrypted TEXT,
            is_us_citizen BOOLEAN,
            work_permit_visa VARCHAR(255),
            npi_number VARCHAR(255),
            taxonomy_code VARCHAR(255),
            ein_number VARCHAR(255),
            legal_business_name VARCHAR(255),
            is_insurance_provider BOOLEAN DEFAULT FALSE,
            accepted_providers TEXT,
            group_session_rate DECIMAL(10,2),
            default_note_format VARCHAR(50) DEFAULT 'SOAP',
            session_duration INTEGER DEFAULT 50,
            time_zone VARCHAR(100) DEFAULT 'America/Chicago',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        
        console.log("✅ user_profiles table created in PostgreSQL");
        return true;
        
      } catch (error) {
        console.error("❌ Error creating user_profiles table:", error.message);
        return false;
      }
    }
    
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    return false;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createUserProfilesTable()
    .then(success => {
      if (success) {
        console.log("✅ Migration completed successfully");
        process.exit(0);
      } else {
        console.error("❌ Migration failed");
        process.exit(1);
      }
    })
    .catch(error => {
      console.error("❌ Migration error:", error);
      process.exit(1);
    });
}

export { createUserProfilesTable };
