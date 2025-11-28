#!/usr/bin/env tsx
/**
 * SESSION_SECRET Rotation Script
 * 
 * Rotates the JWT session secret and logs the rotation.
 * 
 * IMPORTANT NOTES:
 * - All active user sessions will be invalidated
 * - Users will need to log in again
 * - Coordinate with users for minimal disruption
 * - Best performed during off-peak hours
 * 
 * USAGE:
 *   NEW_SECRET=$(openssl rand -hex 32) tsx server/scripts/rotate-session-secret.ts
 * 
 * OR:
 *   NEW_SECRET=<your-new-secret> tsx server/scripts/rotate-session-secret.ts
 * 
 * DEPLOYMENT STEPS:
 * 1. Run this script to validate and log the rotation
 * 2. Update SESSION_SECRET in Render environment variables
 * 3. Restart the application
 * 4. Notify users of session expiration
 */

import { db } from '@db';

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateSecret(secret: string): void {
  if (!secret || secret.trim() === '') {
    throw new Error('NEW_SECRET cannot be empty');
  }
  
  if (secret.length < 32) {
    throw new Error('NEW_SECRET must be at least 32 characters for security');
  }
  
  if (!/^[a-f0-9]{64}$/.test(secret)) {
    log('   ⚠️  Warning: Secret is not a 64-character hex string', 'yellow');
    log('   ⚠️  Recommended format: openssl rand -hex 32', 'yellow');
  }
  
  log('   ✅ Secret format validated', 'green');
}

async function logRotationToDatabase(
  oldSecretFingerprint: string,
  newSecretFingerprint: string,
  reason: string
): Promise<void> {
  try {
    const { keyRotationHistory } = await import('@db/schema-hipaa-refactored');
    
    await db.insert(keyRotationHistory).values({
      keyType: 'SESSION_SECRET',
      rotationReason: reason || 'scheduled',
      oldKeyFingerprint: oldSecretFingerprint,
      newKeyFingerprint: newSecretFingerprint,
      recordsReencrypted: 0, // Not applicable for session secrets
      rotationStatus: 'completed',
      rotatedAt: new Date()
    });
    
    log('   ✅ Rotation logged to database', 'green');
  } catch (error) {
    log(`   ⚠️  Failed to log rotation to database: ${error.message}`, 'yellow');
  }
}

async function getActiveSessions(): Promise<number> {
  try {
    const { enhancedSessions } = await import('@db/schema-hipaa-refactored');
    const { count, and, eq } = await import('drizzle-orm');
    
    const result = await db
      .select({ count: count() })
      .from(enhancedSessions)
      .where(
        and(
          eq(enhancedSessions.isValid, true),
          eq(enhancedSessions.isActive, true)
        )
      );
    
    return result[0]?.count || 0;
  } catch (error) {
    log(`   ⚠️  Could not count active sessions: ${error.message}`, 'yellow');
    return 0;
  }
}

async function invalidateAllSessions(): Promise<number> {
  try {
    const { enhancedSessions } = await import('@db/schema-hipaa-refactored');
    const { eq } = await import('drizzle-orm');
    
    const result = await db
      .update(enhancedSessions)
      .set({
        isValid: false,
        invalidatedAt: new Date()
      })
      .where(eq(enhancedSessions.isValid, true));
    
    return result.length || 0;
  } catch (error) {
    log(`   ⚠️  Could not invalidate sessions: ${error.message}`, 'yellow');
    log(`   ⚠️  Sessions will be invalidated automatically when app restarts with new secret`, 'yellow');
    return 0;
  }
}

async function main() {
  log('═══════════════════════════════════════════════════════════', 'magenta');
  log('🔐 SESSION SECRET ROTATION SCRIPT', 'magenta');
  log('═══════════════════════════════════════════════════════════', 'magenta');
  
  const reason = process.env.ROTATION_REASON || 'scheduled';
  log(`\n📋 Rotation Reason: ${reason}`, 'yellow');
  
  // Get secrets from environment
  const currentSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  const newSecret = process.env.NEW_SECRET;
  
  if (!newSecret) {
    log('\n❌ ERROR: Missing NEW_SECRET environment variable', 'red');
    log('\nUsage:', 'yellow');
    log('  NEW_SECRET=<new-secret> tsx server/scripts/rotate-session-secret.ts\n', 'yellow');
    log('Generate new secret:', 'yellow');
    log('  openssl rand -hex 32\n', 'yellow');
    log('Example:', 'yellow');
    log('  NEW_SECRET=$(openssl rand -hex 32) tsx server/scripts/rotate-session-secret.ts\n', 'yellow');
    process.exit(1);
  }
  
  try {
    const startTime = Date.now();
    
    // Validate new secret
    log('\n🔍 Validating new secret...', 'blue');
    validateSecret(newSecret);
    
    // Check active sessions
    log('\n📊 Checking active sessions...', 'blue');
    const activeSessions = await getActiveSessions();
    log(`   Active sessions: ${activeSessions}`, 'magenta');
    
    if (activeSessions > 0) {
      log(`   ⚠️  ${activeSessions} users will be logged out`, 'yellow');
    }
    
    // Generate fingerprints
    const oldFingerprint = currentSecret ? currentSecret.substring(currentSecret.length - 8) : 'none';
    const newFingerprint = newSecret.substring(newSecret.length - 8);
    
    // Log rotation
    log('\n📝 Logging rotation...', 'blue');
    await logRotationToDatabase(oldFingerprint, newFingerprint, reason);
    
    // Invalidate sessions
    log('\n🔒 Invalidating existing sessions...', 'blue');
    const invalidatedCount = await invalidateAllSessions();
    if (invalidatedCount > 0) {
      log(`   ✅ Invalidated ${invalidatedCount} sessions`, 'green');
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Summary
    log('\n═══════════════════════════════════════════════════════════', 'magenta');
    log('✅ SESSION SECRET ROTATION PREPARED', 'green');
    log('═══════════════════════════════════════════════════════════', 'magenta');
    log(`\n   Old secret fingerprint: ...${oldFingerprint}`, 'blue');
    log(`   New secret fingerprint: ...${newFingerprint}`, 'blue');
    log(`   Active sessions affected: ${activeSessions}`, 'magenta');
    log(`   Duration: ${duration}s`, 'blue');
    
    log('\n📋 NEXT STEPS:', 'yellow');
    log('   1. Update SESSION_SECRET in Render environment variables:', 'yellow');
    log(`      SESSION_SECRET=${newSecret}`, 'yellow');
    log('   2. Restart the application (Render will do this automatically)', 'yellow');
    log('   3. Notify users via:', 'yellow');
    log('      - Email: "Please log in again due to security update"', 'yellow');
    log('      - Dashboard banner: "Session expired - please log in"', 'yellow');
    log('   4. Monitor application logs for any issues', 'yellow');
    log('   5. Verify users can log in with new secret\n', 'yellow');
    
    log('⚠️  REMEMBER: Do NOT commit the new secret to git!', 'red');
    log('');
    
    process.exit(0);
  } catch (error) {
    log(`\n❌ ERROR: ${error.message}`, 'red');
    log(`\n${error.stack}\n`, 'red');
    process.exit(1);
  }
}

main();

