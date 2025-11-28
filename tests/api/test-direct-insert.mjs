import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './db/schema.ts';

// ⚠️  SECURITY WARNING: Use environment variable for database connection
// Set DATABASE_URL environment variable before running this test
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
  console.error('Please set your database connection string:');
  console.error('export DATABASE_URL="postgresql://username:password@hostname.neon.tech/database?sslmode=require"');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

console.log('Testing direct insert...');
console.log('Schema users columns:', Object.keys(schema.users._.columns));

try {
  const result = await db.insert(schema.users).values({
    username: 'direct_insert_test',
    password: 'hashed_password',
    name: 'Direct Insert Test',
    email: 'direct@example.com'
  }).returning();
  
  console.log('Success:', result);
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}

await client.end();

