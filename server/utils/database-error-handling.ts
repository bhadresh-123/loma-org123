/**
 * Database Error Handling Utilities
 * 
 * Provides clear error boundaries for database operations to distinguish between:
 * - Table missing errors (schema issues)
 * - Query failed errors (data/constraint issues)
 * - Connection errors (infrastructure issues)
 */

export class DatabaseError extends Error {
  constructor(
    message: string,
    public type: 'TABLE_MISSING' | 'QUERY_FAILED' | 'CONNECTION_ERROR' | 'CONSTRAINT_ERROR',
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Wraps database operations with proper error handling
 */
export function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  return operation().catch((error) => {
    // Check if it's a table missing error
    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      throw new DatabaseError(
        `Table missing in schema: ${context}`,
        'TABLE_MISSING',
        error
      );
    }
    
    // Check if it's a constraint error
    if (error.message?.includes('constraint') || error.message?.includes('foreign key')) {
      throw new DatabaseError(
        `Database constraint violation: ${context}`,
        'CONSTRAINT_ERROR',
        error
      );
    }
    
    // Check if it's a connection error
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      throw new DatabaseError(
        `Database connection error: ${context}`,
        'CONNECTION_ERROR',
        error
      );
    }
    
    // Default to query failed
    throw new DatabaseError(
      `Database query failed: ${context}`,
      'QUERY_FAILED',
      error
    );
  });
}

/**
 * Checks if a table exists in the current schema
 */
export function checkTableExists(schema: any, tableName: string): boolean {
  return schema && schema[tableName] !== null && schema[tableName] !== undefined;
}

/**
 * Validates that required tables exist before performing operations
 */
export function validateRequiredTables(schema: any, requiredTables: string[]): void {
  const missingTables = requiredTables.filter(table => !checkTableExists(schema, table));
  
  if (missingTables.length > 0) {
    throw new DatabaseError(
      `Required tables missing from schema: ${missingTables.join(', ')}`,
      'TABLE_MISSING'
    );
  }
}

/**
 * Enhanced error logging for database operations
 */
export function logDatabaseError(error: DatabaseError, context: string): void {
  const timestamp = new Date().toISOString();
  
  switch (error.type) {
    case 'TABLE_MISSING':
      console.error(`[${timestamp}] SCHEMA ERROR: ${context}`);
      console.error(`  Missing table: ${error.message}`);
      console.error(`  This indicates an incomplete migration or schema mismatch`);
      break;
      
    case 'QUERY_FAILED':
      console.error(`[${timestamp}] QUERY ERROR: ${context}`);
      console.error(`  Query failed: ${error.message}`);
      if (error.originalError) {
        console.error(`  Original error: ${error.originalError.message}`);
      }
      break;
      
    case 'CONSTRAINT_ERROR':
      console.error(`[${timestamp}] CONSTRAINT ERROR: ${context}`);
      console.error(`  Constraint violation: ${error.message}`);
      console.error(`  Check data integrity and foreign key relationships`);
      break;
      
    case 'CONNECTION_ERROR':
      console.error(`[${timestamp}] CONNECTION ERROR: ${context}`);
      console.error(`  Database connection failed: ${error.message}`);
      console.error(`  Check DATABASE_URL and network connectivity`);
      break;
  }
}

/**
 * Safe database operation wrapper with error handling
 */
export async function safeDatabaseOperation<T>(
  operation: () => Promise<T>,
  context: string,
  requiredTables: string[] = []
): Promise<T | null> {
  try {
    // Validate required tables if provided
    if (requiredTables.length > 0) {
      const { getActiveSchema } = await import('./db/index');
      const schema = getActiveSchema();
      validateRequiredTables(schema, requiredTables);
    }
    
    return await withDatabaseErrorHandling(operation, context);
  } catch (error) {
    if (error instanceof DatabaseError) {
      logDatabaseError(error, context);
      return null;
    }
    
    // Re-throw unexpected errors
    throw error;
  }
}
