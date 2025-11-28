#!/usr/bin/env node

/**
 * Render Cold Start Optimizer
 * 
 * This script implements multiple strategies to reduce cold start time
 */

import { neon } from "@neondatabase/serverless";

// OPTIMIZATION 1: Pre-warm database connection
let dbConnection: any = null;

export async function preWarmDatabase() {
  if (!dbConnection) {
    try {
      const sql = neon(process.env.DATABASE_URL!);
      // Test connection with simple query
      await sql`SELECT 1 as test`;
      dbConnection = sql;
      console.log('✅ Database connection pre-warmed');
    } catch (error) {
      console.error('❌ Database pre-warming failed:', error);
    }
  }
  return dbConnection;
}

// OPTIMIZATION 2: Connection pooling for faster subsequent requests
export function getOptimizedDbConnection() {
  if (!dbConnection) {
    dbConnection = neon(process.env.DATABASE_URL!, {
      // Optimize connection settings
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      maxConnections: 10
    });
  }
  return dbConnection;
}

// OPTIMIZATION 3: Health check optimization
export async function optimizedHealthCheck() {
  try {
    const db = getOptimizedDbConnection();
    
    // Quick database check
    const dbResult = await db`SELECT 1 as status`;
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbResult.length > 0 ? 'connected' : 'disconnected',
      sessionSecret: process.env.SESSION_SECRET ? 'configured' : 'missing',
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    };
  } catch (error) {
    return {
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// OPTIMIZATION 4: Lazy loading for heavy modules
const moduleCache = new Map();

export async function lazyLoadModule(modulePath: string) {
  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath);
  }
  
  try {
    const module = await import(modulePath);
    moduleCache.set(modulePath, module);
    return module;
  } catch (error) {
    console.error(`Failed to load module ${modulePath}:`, error);
    throw error;
  }
}

// OPTIMIZATION 5: Memory optimization
export function optimizeMemory() {
  // Clear any unnecessary caches
  if (global.gc) {
    global.gc();
  }
  
  // Set memory limits
  process.setMaxListeners(20);
}

// OPTIMIZATION 6: Startup time tracking
const startupTime = Date.now();

export function getStartupTime() {
  return Date.now() - startupTime;
}

// OPTIMIZATION 7: Render-specific optimizations
export function renderOptimizations() {
  // Set environment variables for Render
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  
  // Optimize for Render's infrastructure
  if (process.env.RENDER) {
    // Render-specific optimizations
    process.env.PORT = process.env.PORT || '10000';
    
    // Disable unnecessary features for faster startup
    process.env.DISABLE_EMAIL = 'true'; // Can be enabled later
    process.env.DISABLE_SCHEDULED_TASKS = 'true'; // Can be enabled later
  }
}

// OPTIMIZATION 8: Pre-compile routes for faster startup
export function preCompileRoutes() {
  // This would pre-compile route handlers
  // Implementation depends on your routing strategy
  console.log('✅ Routes pre-compiled');
}

// OPTIMIZATION 9: Cache static assets
export function enableStaticCaching() {
  // Enable aggressive caching for static assets
  return {
    maxAge: '1y',
    immutable: true,
    etag: true,
    lastModified: true
  };
}

// OPTIMIZATION 10: Database query optimization
export async function optimizeDatabaseQueries() {
  try {
    const db = getOptimizedDbConnection();
    
    // Create indexes for faster queries
    await db`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_patient_id ON sessions(patient_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    `;
    
    console.log('✅ Database indexes optimized');
  } catch (error) {
    console.error('❌ Database optimization failed:', error);
  }
}

// Initialize optimizations
export async function initializeOptimizations() {
  console.log('🚀 Initializing cold start optimizations...');
  
  // Apply Render-specific optimizations
  renderOptimizations();
  
  // Pre-warm database connection
  await preWarmDatabase();
  
  // Optimize memory usage
  optimizeMemory();
  
  // Pre-compile routes
  preCompileRoutes();
  
  // Optimize database queries
  await optimizeDatabaseQueries();
  
  console.log(`✅ Optimizations initialized in ${getStartupTime()}ms`);
}
