# HIPAA Migration Rollback Procedures

## Overview

This document provides comprehensive rollback procedures for the HIPAA schema refactor migration. Use these procedures if issues arise during or after the migration.

## When to Use Rollback

### Immediate Rollback (During Migration)
- Migration script fails with errors
- Data corruption detected
- Foreign key constraint violations
- Application fails to start after migration

### Post-Migration Rollback (After Deployment)
- Critical application bugs discovered
- Performance issues
- Data integrity problems
- User reports of missing data

## Rollback Options

### Option 1: Database Restore from Backup (Recommended)

**Use when**: You have a recent backup and want the fastest recovery.

#### Steps:

1. **Stop the Application**
   ```bash
   # In Render dashboard: Set MAINTENANCE_MODE=true
   # Or stop the application process
   ```

2. **Restore Database from Backup**
   ```bash
   # Set your production database URL
   export PROD_DATABASE_URL="postgresql://your-production-url"
   
   # Restore from backup (replace with your backup file)
   psql $PROD_DATABASE_URL < prod-backup-YYYYMMDD_HHMMSS.sql
   
   # Verify restoration
   psql $PROD_DATABASE_URL -c "SELECT COUNT(*) FROM clients_hipaa;"
   ```

3. **Update Environment Variables**
   ```bash
   # In Render dashboard:
   # Remove or set: USE_HIPAA_SCHEMA=false
   # Keep: PHI_ENCRYPTION_KEY=your-key
   ```

4. **Restart Application**
   ```bash
   # Trigger Render deployment
   git push origin main
   # Or manual deploy in Render dashboard
   ```

5. **Verify Rollback**
   ```bash
   # Check health endpoint
   curl https://loma-org.onrender.com/api/health
   
   # Test old endpoints
   curl https://loma-org.onrender.com/api/clients
   curl https://loma-org.onrender.com/api/sessions
   ```

### Option 2: Run Rollback Migration Script

**Use when**: You want to preserve some new data or the backup is too old.

#### Steps:

1. **Stop the Application**
   ```bash
   # In Render dashboard: Set MAINTENANCE_MODE=true
   ```

2. **Run Rollback Script**
   ```bash
   # Set your production database URL
   export PROD_DATABASE_URL="postgresql://your-production-url"
   
   # Run rollback migration
   psql $PROD_DATABASE_URL < db/migrations/001_rollback_postgresql.sql
   
   # Verify rollback
   psql $PROD_DATABASE_URL -c "SELECT COUNT(*) FROM clients_hipaa;"
   ```

3. **Update Environment Variables**
   ```bash
   # In Render dashboard:
   # Remove or set: USE_HIPAA_SCHEMA=false
   ```

4. **Restart Application**
   ```bash
   # Trigger Render deployment
   git push origin main
   ```

5. **Verify Rollback**
   ```bash
   # Check health endpoint
   curl https://loma-org.onrender.com/api/health
   ```

### Option 3: Point to Backup Database

**Use when**: You want to create a new database from backup.

#### Steps:

1. **Create New Neon Database**
   ```bash
   # In Neon console:
   # Create new project: loma-rollback
   # Copy connection string
   ```

2. **Restore Backup to New Database**
   ```bash
   export ROLLBACK_DATABASE_URL="postgresql://your-rollback-url"
   psql $ROLLBACK_DATABASE_URL < prod-backup-YYYYMMDD_HHMMSS.sql
   ```

3. **Update Render Environment Variables**
   ```bash
   # In Render dashboard:
   # Update DATABASE_URL to point to rollback database
   # Remove or set: USE_HIPAA_SCHEMA=false
   ```

4. **Deploy Application**
   ```bash
   # Trigger Render deployment
   git push origin main
   ```

5. **Verify Rollback**
   ```bash
   # Check health endpoint
   curl https://loma-org.onrender.com/api/health
   ```

## Rollback Verification Checklist

### Database Verification
- [ ] Old tables exist (`clients_hipaa`, `sessions_hipaa`, `treatment_plans_hipaa`)
- [ ] New tables removed (`organizations`, `patients`, `clinical_sessions`, `patient_treatment_plans`)
- [ ] Data counts match pre-migration
- [ ] Foreign key constraints restored
- [ ] Indexes restored

### Application Verification
- [ ] Application starts successfully
- [ ] Health endpoint responds
- [ ] Old API endpoints work (`/api/clients`, `/api/sessions`)
- [ ] User authentication works
- [ ] PHI encryption working
- [ ] No application errors in logs

### Data Integrity Verification
- [ ] All client records present
- [ ] All session records present
- [ ] All treatment plan records present
- [ ] Therapist profiles intact
- [ ] User authentication data intact
- [ ] Encrypted fields contain data

## Rollback Timeline

### Immediate Rollback (During Migration)
- **Time**: 5-15 minutes
- **Downtime**: Minimal (if caught early)
- **Data Loss**: None (if using backup)

### Post-Migration Rollback
- **Time**: 30-60 minutes
- **Downtime**: 30-60 minutes
- **Data Loss**: Any data added after migration

## Rollback Risks

### High Risk
- **Data Loss**: If backup is incomplete or corrupted
- **Extended Downtime**: If rollback procedures are not tested
- **User Impact**: Users may lose recent data

### Medium Risk
- **Configuration Issues**: Environment variables may need adjustment
- **Application Bugs**: Old code may have compatibility issues

### Low Risk
- **Database Corruption**: Unlikely with proper procedures
- **Security Issues**: Rollback maintains same security level

## Prevention Strategies

### Before Migration
- [ ] Create comprehensive backup
- [ ] Test rollback procedures on staging
- [ ] Verify backup integrity
- [ ] Document all environment variables
- [ ] Prepare rollback scripts

### During Migration
- [ ] Monitor migration progress
- [ ] Check data counts at each step
- [ ] Verify foreign key constraints
- [ ] Test application startup

### After Migration
- [ ] Monitor application performance
- [ ] Check error logs
- [ ] Verify user reports
- [ ] Test critical functionality

## Emergency Contacts

### Technical Issues
- **Database**: Neon support
- **Application**: Render support
- **Code**: Development team

### Business Issues
- **User Impact**: Customer support
- **Data Loss**: Legal/compliance team
- **Downtime**: Management team

## Rollback Decision Matrix

| Scenario | Rollback Method | Time | Risk | Data Loss |
|----------|----------------|------|------|-----------|
| Migration fails | Database restore | 5-15 min | Low | None |
| App won't start | Rollback script | 15-30 min | Medium | None |
| Critical bugs | Database restore | 30-60 min | Low | Recent data |
| Performance issues | Rollback script | 30-60 min | Medium | Recent data |
| Data corruption | Database restore | 30-60 min | Low | Recent data |

## Post-Rollback Actions

### Immediate (0-2 hours)
- [ ] Verify application functionality
- [ ] Monitor error logs
- [ ] Notify users of resolution
- [ ] Document issues encountered

### Short-term (2-24 hours)
- [ ] Analyze root cause
- [ ] Fix issues in staging
- [ ] Plan re-migration
- [ ] Update procedures

### Long-term (1-7 days)
- [ ] Implement fixes
- [ ] Test thoroughly
- [ ] Schedule new migration
- [ ] Update documentation

## Rollback Testing

### Staging Rollback Test
```bash
# Test rollback on staging database
export STAGING_DATABASE_URL="postgresql://your-staging-url"

# Create backup
pg_dump $STAGING_DATABASE_URL > staging-backup.sql

# Run migration
psql $STAGING_DATABASE_URL < db/migrations/001_schema_refactor.sql

# Test rollback
psql $STAGING_DATABASE_URL < db/migrations/001_rollback_postgresql.sql

# Verify rollback
psql $STAGING_DATABASE_URL -c "SELECT COUNT(*) FROM clients_hipaa;"
```

### Application Rollback Test
```bash
# Test application with rolled back database
export DATABASE_URL=$STAGING_DATABASE_URL
export USE_HIPAA_SCHEMA=false

# Start application
npm run dev

# Test endpoints
curl http://localhost:3000/api/clients
curl http://localhost:3000/api/sessions
```

## Conclusion

Rollback procedures are critical for maintaining system reliability during migrations. Always test rollback procedures in staging before running production migrations. Keep backups current and verify their integrity regularly.

Remember: **It's better to rollback and fix issues than to leave a broken system running.**
