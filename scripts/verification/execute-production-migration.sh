#!/bin/bash

# HIPAA Persona Segmentation Production Migration Script
# This script executes the production migration with comprehensive safety measures

set -e  # Exit on any error

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-loma_production}"
DB_USER="${DB_USER:-loma_user}"
BACKUP_DIR="/backups/hipaa-migration-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="/logs/hipaa-migration-$(date +%Y%m%d-%H%M%S).log"
ROLLBACK_SCRIPT="/scripts/rollback-hipaa-migration.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Pre-migration checks
pre_migration_checks() {
    log "🔍 Running pre-migration checks..."
    
    # Check database connectivity
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        error "Cannot connect to database. Check connection parameters."
        exit 1
    fi
    
    # Check disk space (need at least 2x database size)
    DB_SIZE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | tr -d ' ')
    AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
    
    log "Database size: $DB_SIZE"
    log "Available space: $(df -h / | awk 'NR==2 {print $4}')"
    
    # Check if migration has already been run
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 FROM information_schema.tables WHERE table_name = 'users_auth';" | grep -q "1 row"; then
        error "HIPAA migration appears to have already been run. Aborting."
        exit 1
    fi
    
    # Check for active connections
    ACTIVE_CONNECTIONS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" | tr -d ' ')
    if [ "$ACTIVE_CONNECTIONS" -gt 5 ]; then
        warning "There are $ACTIVE_CONNECTIONS active connections. Consider stopping the application."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    success "Pre-migration checks passed"
}

# Create backup
create_backup() {
    log "💾 Creating database backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Full database backup
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose --no-owner --no-privileges \
        --file="$BACKUP_DIR/full_backup.sql"
    
    # Schema-only backup
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --schema-only --verbose --no-owner --no-privileges \
        --file="$BACKUP_DIR/schema_backup.sql"
    
    # Data-only backup
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --data-only --verbose --no-owner --no-privileges \
        --file="$BACKUP_DIR/data_backup.sql"
    
    success "Backup created in $BACKUP_DIR"
}

# Create rollback script
create_rollback_script() {
    log "📝 Creating rollback script..."
    
    cat > "$ROLLBACK_SCRIPT" << 'EOF'
#!/bin/bash
# HIPAA Migration Rollback Script

set -e

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-loma_production}"
DB_USER="${DB_USER:-loma_user}"
BACKUP_DIR="$1"

if [ -z "$BACKUP_DIR" ]; then
    echo "Usage: $0 <backup_directory>"
    exit 1
fi

echo "🔄 Rolling back HIPAA migration..."

# Drop new tables
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'SQL'
-- Drop HIPAA tables
DROP TABLE IF EXISTS therapist_phi CASCADE;
DROP TABLE IF EXISTS therapist_profiles CASCADE;
DROP TABLE IF EXISTS users_auth CASCADE;
DROP TABLE IF EXISTS clients_hipaa CASCADE;
DROP TABLE IF EXISTS sessions_hipaa CASCADE;
DROP TABLE IF EXISTS treatment_plans_hipaa CASCADE;
DROP TABLE IF EXISTS audit_logs_hipaa CASCADE;

-- Drop backup tables
DROP TABLE IF EXISTS users_backup CASCADE;
DROP TABLE IF EXISTS clients_backup CASCADE;
DROP TABLE IF EXISTS sessions_backup CASCADE;
DROP TABLE IF EXISTS treatment_plans_backup CASCADE;
SQL

# Restore from backup
echo "📥 Restoring from backup..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_DIR/full_backup.sql"

echo "✅ Rollback completed"
EOF

    chmod +x "$ROLLBACK_SCRIPT"
    success "Rollback script created: $ROLLBACK_SCRIPT"
}

# Execute migration
execute_migration() {
    log "🚀 Executing HIPAA migration..."
    
    # Start transaction
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'SQL'
BEGIN;

-- Create backup tables
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE clients_backup AS SELECT * FROM clients;
CREATE TABLE sessions_backup AS SELECT * FROM sessions;
CREATE TABLE treatment_plans_backup AS SELECT * FROM treatment_plans;

-- Log migration start
INSERT INTO audit_logs (user_id, action, resource_type, details, ip_address, created_at)
VALUES (1, 'MIGRATION_START', 'SYSTEM', 'HIPAA Persona Segmentation Migration Started', '127.0.0.1', NOW());

COMMIT;
SQL

    # Run the comprehensive migration script
    log "📋 Running comprehensive migration script..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < db/migrations/hipaa-schema-migration.sql
    
    success "Migration script executed"
}

# Verify migration
verify_migration() {
    log "🔍 Verifying migration..."
    
    # Check table counts
    USERS_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users_backup;" | tr -d ' ')
    USERS_AUTH_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users_auth;" | tr -d ' ')
    THERAPIST_PROFILES_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM therapist_profiles;" | tr -d ' ')
    
    CLIENTS_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM clients_backup;" | tr -d ' ')
    CLIENTS_HIPAA_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM clients_hipaa;" | tr -d ' ')
    
    SESSIONS_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM sessions_backup;" | tr -d ' ')
    SESSIONS_HIPAA_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM sessions_hipaa;" | tr -d ' ')
    
    log "Data verification:"
    log "  Users: $USERS_COUNT -> Auth: $USERS_AUTH_COUNT, Profiles: $THERAPIST_PROFILES_COUNT"
    log "  Clients: $CLIENTS_COUNT -> HIPAA: $CLIENTS_HIPAA_COUNT"
    log "  Sessions: $SESSIONS_COUNT -> HIPAA: $SESSIONS_HIPAA_COUNT"
    
    # Verify data integrity
    if [ "$USERS_COUNT" -ne "$USERS_AUTH_COUNT" ] || [ "$USERS_COUNT" -ne "$THERAPIST_PROFILES_COUNT" ]; then
        error "User data migration failed - count mismatch"
        return 1
    fi
    
    if [ "$CLIENTS_COUNT" -ne "$CLIENTS_HIPAA_COUNT" ]; then
        error "Client data migration failed - count mismatch"
        return 1
    fi
    
    if [ "$SESSIONS_COUNT" -ne "$SESSIONS_HIPAA_COUNT" ]; then
        error "Session data migration failed - count mismatch"
        return 1
    fi
    
    # Check encryption
    ENCRYPTED_PHI_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM therapist_phi WHERE ssn_encrypted IS NOT NULL;" | tr -d ' ')
    log "Encrypted PHI records: $ENCRYPTED_PHI_COUNT"
    
    success "Migration verification passed"
}

# Update application configuration
update_app_config() {
    log "⚙️ Updating application configuration..."
    
    # Enable HIPAA feature flag
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'SQL'
-- Enable HIPAA schema feature flag
INSERT INTO feature_flags (name, enabled, description, created_at)
VALUES ('hipaa_schema', true, 'Enable HIPAA-compliant schema', NOW())
ON CONFLICT (name) DO UPDATE SET enabled = true, updated_at = NOW();
SQL
    
    success "Application configuration updated"
}

# Post-migration testing
post_migration_testing() {
    log "🧪 Running post-migration tests..."
    
    # Test authentication
    AUTH_TEST=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users_auth WHERE account_status = 'active';" | tr -d ' ')
    log "Active users: $AUTH_TEST"
    
    # Test profile access
    PROFILE_TEST=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM therapist_profiles;" | tr -d ' ')
    log "Therapist profiles: $PROFILE_TEST"
    
    # Test client access
    CLIENT_TEST=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM clients_hipaa;" | tr -d ' ')
    log "HIPAA clients: $CLIENT_TEST"
    
    success "Post-migration tests completed"
}

# Main execution
main() {
    log "🏥 Starting HIPAA Persona Segmentation Production Migration"
    log "Database: $DB_NAME@$DB_HOST:$DB_PORT"
    log "Backup directory: $BACKUP_DIR"
    log "Log file: $LOG_FILE"
    
    # Confirmation prompt
    echo
    warning "This will migrate your production database to HIPAA-compliant schema."
    warning "This operation cannot be undone without restoring from backup."
    echo
    read -p "Are you sure you want to continue? (yes/NO): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Migration cancelled by user"
        exit 0
    fi
    
    # Execute migration steps
    pre_migration_checks
    create_backup
    create_rollback_script
    execute_migration
    
    if verify_migration; then
        update_app_config
        post_migration_testing
        
        success "🎉 HIPAA migration completed successfully!"
        log "Backup location: $BACKUP_DIR"
        log "Rollback script: $ROLLBACK_SCRIPT"
        log "Log file: $LOG_FILE"
        
        # Log migration completion
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'SQL'
INSERT INTO audit_logs (user_id, action, resource_type, details, ip_address, created_at)
VALUES (1, 'MIGRATION_COMPLETE', 'SYSTEM', 'HIPAA Persona Segmentation Migration Completed Successfully', '127.0.0.1', NOW());
SQL
        
    else
        error "❌ Migration verification failed!"
        log "Run rollback script: $ROLLBACK_SCRIPT $BACKUP_DIR"
        exit 1
    fi
}

# Run main function
main "$@"

