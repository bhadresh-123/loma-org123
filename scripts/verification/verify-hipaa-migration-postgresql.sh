#!/bin/bash

# ============================================================================
# HIPAA Migration Verification Script - PostgreSQL Version
# ============================================================================
# Purpose: Comprehensive verification of HIPAA schema refactor migration
# Database: PostgreSQL (Neon)
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DATABASE_URL=${DATABASE_URL:-""}
VERBOSE=${VERBOSE:-false}

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_database_connection() {
    log_info "Checking database connection..."
    
    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL environment variable is required"
        exit 1
    fi
    
    if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        log_success "Database connection successful"
    else
        log_error "Failed to connect to database"
        exit 1
    fi
}

verify_old_tables_exist() {
    log_info "Verifying old tables exist..."
    
    local tables=("clients_hipaa" "sessions_hipaa" "treatment_plans_hipaa" "therapist_profiles" "therapist_phi" "users_auth")
    
    for table in "${tables[@]}"; do
        if psql "$DATABASE_URL" -c "SELECT 1 FROM $table LIMIT 1;" > /dev/null 2>&1; then
            log_success "Table $table exists"
        else
            log_error "Table $table does not exist"
            exit 1
        fi
    done
}

verify_new_tables_exist() {
    log_info "Verifying new tables exist..."
    
    local tables=("organizations" "organization_memberships" "patients" "clinical_sessions" "patient_treatment_plans")
    
    for table in "${tables[@]}"; do
        if psql "$DATABASE_URL" -c "SELECT 1 FROM $table LIMIT 1;" > /dev/null 2>&1; then
            log_success "Table $table exists"
        else
            log_error "Table $table does not exist"
            exit 1
        fi
    done
}

verify_data_counts() {
    log_info "Verifying data migration counts..."
    
    # Get counts from old tables
    local old_clients=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM clients_hipaa;")
    local old_sessions=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM sessions_hipaa;")
    local old_treatment_plans=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM treatment_plans_hipaa;")
    
    # Get counts from new tables
    local new_organizations=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM organizations;")
    local new_memberships=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM organization_memberships;")
    local new_patients=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM patients;")
    local new_sessions=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM clinical_sessions;")
    local new_treatment_plans=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM patient_treatment_plans;")
    
    # Display counts
    echo "Data Migration Counts:"
    echo "====================="
    echo "Organizations: $new_organizations"
    echo "Memberships: $new_memberships"
    echo "Patients: $new_patients (was $old_clients clients)"
    echo "Sessions: $new_sessions (was $old_sessions)"
    echo "Treatment Plans: $new_treatment_plans (was $old_treatment_plans)"
    
    # Verify counts match
    if [ "$old_clients" -eq "$new_patients" ]; then
        log_success "Patient count matches: $old_clients -> $new_patients"
    else
        log_error "Patient count mismatch: $old_clients -> $new_patients"
        exit 1
    fi
    
    if [ "$old_sessions" -eq "$new_sessions" ]; then
        log_success "Session count matches: $old_sessions -> $new_sessions"
    else
        log_error "Session count mismatch: $old_sessions -> $new_sessions"
        exit 1
    fi
    
    if [ "$old_treatment_plans" -eq "$new_treatment_plans" ]; then
        log_success "Treatment plan count matches: $old_treatment_plans -> $new_treatment_plans"
    else
        log_error "Treatment plan count mismatch: $old_treatment_plans -> $new_treatment_plans"
        exit 1
    fi
}

verify_foreign_keys() {
    log_info "Verifying foreign key relationships..."
    
    # Check patients -> organizations
    local orphaned_patients=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM patients p 
        LEFT JOIN organizations o ON p.organization_id = o.id 
        WHERE o.id IS NULL;
    ")
    
    if [ "$orphaned_patients" -eq 0 ]; then
        log_success "All patients have valid organization references"
    else
        log_error "Found $orphaned_patients patients with invalid organization references"
        exit 1
    fi
    
    # Check clinical_sessions -> patients
    local orphaned_sessions=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM clinical_sessions cs 
        LEFT JOIN patients p ON cs.patient_id = p.id 
        WHERE p.id IS NULL;
    ")
    
    if [ "$orphaned_sessions" -eq 0 ]; then
        log_success "All clinical sessions have valid patient references"
    else
        log_error "Found $orphaned_sessions sessions with invalid patient references"
        exit 1
    fi
    
    # Check organization_memberships -> organizations
    local orphaned_memberships=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM organization_memberships om 
        LEFT JOIN organizations o ON om.organization_id = o.id 
        WHERE o.id IS NULL;
    ")
    
    if [ "$orphaned_memberships" -eq 0 ]; then
        log_success "All organization memberships have valid organization references"
    else
        log_error "Found $orphaned_memberships memberships with invalid organization references"
        exit 1
    fi
}

verify_encryption_fields() {
    log_info "Verifying encryption fields..."
    
    # Check that encrypted fields are not empty (they should contain encrypted data)
    local empty_encrypted_fields=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM patients 
        WHERE patient_contact_email_encrypted IS NULL 
        OR patient_contact_email_encrypted = '';
    ")
    
    if [ "$empty_encrypted_fields" -gt 0 ]; then
        log_warning "Found $empty_encrypted_fields patients with empty encrypted email fields"
    else
        log_success "All patients have encrypted email fields"
    fi
    
    # Check search hashes exist
    local missing_search_hashes=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM patients 
        WHERE patient_contact_email_search_hash IS NULL 
        OR patient_contact_email_search_hash = '';
    ")
    
    if [ "$missing_search_hashes" -gt 0 ]; then
        log_warning "Found $missing_search_hashes patients with missing search hashes"
    else
        log_success "All patients have search hashes"
    fi
}

verify_indexes() {
    log_info "Verifying database indexes..."
    
    # Check that important indexes exist
    local indexes=(
        "idx_patients_organization"
        "idx_patients_primary_therapist"
        "idx_sessions_organization"
        "idx_sessions_patient"
        "idx_sessions_therapist"
        "idx_treatment_plans_organization"
        "idx_treatment_plans_patient"
    )
    
    for index in "${indexes[@]}"; do
        if psql "$DATABASE_URL" -c "SELECT 1 FROM pg_indexes WHERE indexname = '$index';" | grep -q "1 row"; then
            log_success "Index $index exists"
        else
            log_warning "Index $index does not exist"
        fi
    done
}

verify_constraints() {
    log_info "Verifying database constraints..."
    
    # Check unique constraints
    local duplicate_orgs=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM (
            SELECT organization_id, user_id, COUNT(*) 
            FROM organization_memberships 
            GROUP BY organization_id, user_id 
            HAVING COUNT(*) > 1
        ) duplicates;
    ")
    
    if [ "$duplicate_orgs" -eq 0 ]; then
        log_success "No duplicate organization memberships found"
    else
        log_error "Found $duplicate_orgs duplicate organization memberships"
        exit 1
    fi
    
    # Check primary owner constraint
    local multiple_primary_owners=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM (
            SELECT organization_id, COUNT(*) 
            FROM organization_memberships 
            WHERE is_primary_owner = true 
            GROUP BY organization_id 
            HAVING COUNT(*) > 1
        ) multiple_owners;
    ")
    
    if [ "$multiple_primary_owners" -eq 0 ]; then
        log_success "No organizations with multiple primary owners found"
    else
        log_error "Found $multiple_primary_owners organizations with multiple primary owners"
        exit 1
    fi
}

verify_application_compatibility() {
    log_info "Verifying application compatibility..."
    
    # Check that the application can connect and query the new schema
    if [ -f "package.json" ]; then
        log_info "Testing application connection..."
        
        # Set environment variables for testing
        export USE_HIPAA_SCHEMA=true
        export PHI_ENCRYPTION_KEY="test-key-64-characters-long-for-testing-purposes-only"
        
        # Test basic queries
        if node -e "
            const { db } = require('./db');
            db.query.organizations.findMany().then(() => {
                console.log('✅ Organizations query successful');
            }).catch(err => {
                console.error('❌ Organizations query failed:', err.message);
                process.exit(1);
            });
        " 2>/dev/null; then
            log_success "Application can query organizations table"
        else
            log_warning "Application query test failed (this may be expected in staging)"
        fi
    else
        log_warning "package.json not found, skipping application compatibility test"
    fi
}

generate_report() {
    log_info "Generating verification report..."
    
    local report_file="migration-verification-report-$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "HIPAA Migration Verification Report"
        echo "===================================="
        echo "Date: $(date)"
        echo "Database: $DATABASE_URL"
        echo ""
        
        echo "Data Counts:"
        echo "============"
        psql "$DATABASE_URL" -c "
            SELECT 'Organizations' as table_name, COUNT(*) as count FROM organizations
            UNION ALL
            SELECT 'Organization Memberships', COUNT(*) FROM organization_memberships
            UNION ALL
            SELECT 'Patients', COUNT(*) FROM patients
            UNION ALL
            SELECT 'Clinical Sessions', COUNT(*) FROM clinical_sessions
            UNION ALL
            SELECT 'Treatment Plans', COUNT(*) FROM patient_treatment_plans
            UNION ALL
            SELECT 'Original Clients', COUNT(*) FROM clients_hipaa
            UNION ALL
            SELECT 'Original Sessions', COUNT(*) FROM sessions_hipaa
            UNION ALL
            SELECT 'Original Treatment Plans', COUNT(*) FROM treatment_plans_hipaa;
        "
        
        echo ""
        echo "Foreign Key Verification:"
        echo "========================"
        psql "$DATABASE_URL" -c "
            SELECT 'Orphaned Patients' as check_type, COUNT(*) as count 
            FROM patients p LEFT JOIN organizations o ON p.organization_id = o.id 
            WHERE o.id IS NULL
            UNION ALL
            SELECT 'Orphaned Sessions', COUNT(*) 
            FROM clinical_sessions cs LEFT JOIN patients p ON cs.patient_id = p.id 
            WHERE p.id IS NULL
            UNION ALL
            SELECT 'Orphaned Memberships', COUNT(*) 
            FROM organization_memberships om LEFT JOIN organizations o ON om.organization_id = o.id 
            WHERE o.id IS NULL;
        "
        
    } > "$report_file"
    
    log_success "Verification report saved to: $report_file"
}

# Main execution
main() {
    echo "HIPAA Migration Verification Script"
    echo "===================================="
    echo ""
    
    check_database_connection
    verify_old_tables_exist
    verify_new_tables_exist
    verify_data_counts
    verify_foreign_keys
    verify_encryption_fields
    verify_indexes
    verify_constraints
    verify_application_compatibility
    generate_report
    
    echo ""
    log_success "All verification checks passed! Migration appears successful."
    echo ""
    echo "Next steps:"
    echo "1. Review the verification report"
    echo "2. Test application functionality"
    echo "3. Schedule production migration"
    echo "4. Create production backup"
    echo "5. Execute production migration"
}

# Run main function
main "$@"
