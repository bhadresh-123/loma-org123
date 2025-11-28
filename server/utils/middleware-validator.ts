/**
 * Middleware Validator
 * 
 * Validates that all required middleware functions are properly defined
 * before routes are registered. This prevents cryptic "undefined callback"
 * errors at runtime.
 * 
 * HIPAA Compliance: Fail fast at startup rather than exposing broken auth
 */

import { authenticateToken, rbac } from '../middleware/authentication';
import { rateLimits } from '../middleware/core-security';
import { auditMiddleware } from '../middleware/audit-logging';

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate all critical middleware is properly defined
 */
export function validateMiddleware(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: []
  };

  // Validate authentication middleware
  if (typeof authenticateToken !== 'function') {
    result.valid = false;
    result.errors.push('authenticateToken is not a function');
  }

  // Validate RBAC middleware
  const requiredRbacFunctions = [
    'requireTherapistOrAbove',
    'requireAdminOrOwner',
    'requireBusinessOwner',
    'canAccessPatient',
    'canCreatePatients',
    'canManageBilling',
    'canManageStaff',
    'canManageSettings',
    'canViewAllPatients',
    'canViewSelectedPatients',
    'canViewAllCalendars'
  ];

  for (const funcName of requiredRbacFunctions) {
    if (typeof rbac[funcName] !== 'function') {
      result.valid = false;
      result.errors.push(`rbac.${funcName} is not a function (got: ${typeof rbac[funcName]})`);
    }
  }

  // Validate rate limiting middleware
  const requiredRateLimits = [
    'auth',
    'criticalPHI',
    'sensitivePHI',
    'standard',
    'readOnly',
    'admin',
    'files'
  ];

  for (const limitName of requiredRateLimits) {
    if (typeof rateLimits[limitName] !== 'function') {
      result.valid = false;
      result.errors.push(`rateLimits.${limitName} is not a function (got: ${typeof rateLimits[limitName]})`);
    }
  }

  // Validate audit middleware
  if (typeof auditMiddleware.auditPHIAccess !== 'function') {
    result.valid = false;
    result.errors.push('auditMiddleware.auditPHIAccess is not a function');
  }

  return result;
}

/**
 * Run middleware validation and throw if invalid
 * Called during server startup
 */
export function ensureMiddlewareValid(): void {
  const result = validateMiddleware();
  
  if (!result.valid) {
    console.error('\n❌ MIDDLEWARE VALIDATION FAILED\n');
    console.error('The following middleware functions are undefined or invalid:\n');
    result.errors.forEach(error => console.error(`  - ${error}`));
    console.error('\nThis is a critical error that prevents secure route registration.');
    console.error('Server cannot start with invalid middleware.\n');
    process.exit(1);
  }

  console.log('✅ All middleware validated successfully');
}

