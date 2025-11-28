#!/bin/bash

# ============================================================================
# HIPAA Migration Testing Script - PostgreSQL Version
# ============================================================================
# Purpose: Test application functionality after HIPAA schema refactor
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
API_BASE_URL=${API_BASE_URL:-"http://localhost:3000"}
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

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if DATABASE_URL is set
    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL environment variable is required"
        exit 1
    fi
    
    # Check if psql is available
    if ! command -v psql &> /dev/null; then
        log_error "psql command not found. Please install PostgreSQL client tools."
        exit 1
    fi
    
    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        log_error "curl command not found. Please install curl."
        exit 1
    fi
    
    # Check if node is available
    if ! command -v node &> /dev/null; then
        log_error "node command not found. Please install Node.js."
        exit 1
    fi
    
    log_success "All prerequisites met"
}

test_database_connection() {
    log_info "Testing database connection..."
    
    if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        log_success "Database connection successful"
    else
        log_error "Failed to connect to database"
        exit 1
    fi
}

test_new_tables() {
    log_info "Testing new table structure..."
    
    # Test organizations table
    local org_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM organizations;")
    if [ "$org_count" -gt 0 ]; then
        log_success "Organizations table accessible ($org_count records)"
    else
        log_warning "Organizations table empty"
    fi
    
    # Test organization_memberships table
    local membership_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM organization_memberships;")
    if [ "$membership_count" -gt 0 ]; then
        log_success "Organization memberships table accessible ($membership_count records)"
    else
        log_warning "Organization memberships table empty"
    fi
    
    # Test patients table
    local patient_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM patients;")
    if [ "$patient_count" -gt 0 ]; then
        log_success "Patients table accessible ($patient_count records)"
    else
        log_warning "Patients table empty"
    fi
    
    # Test clinical_sessions table
    local session_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM clinical_sessions;")
    if [ "$session_count" -gt 0 ]; then
        log_success "Clinical sessions table accessible ($session_count records)"
    else
        log_warning "Clinical sessions table empty"
    fi
    
    # Test patient_treatment_plans table
    local treatment_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM patient_treatment_plans;")
    if [ "$treatment_count" -gt 0 ]; then
        log_success "Patient treatment plans table accessible ($treatment_count records)"
    else
        log_warning "Patient treatment plans table empty"
    fi
}

test_data_integrity() {
    log_info "Testing data integrity..."
    
    # Test that all patients have valid organization references
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
    
    # Test that all sessions have valid patient references
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
    
    # Test that all treatment plans have valid patient references
    local orphaned_treatments=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM patient_treatment_plans ptp 
        LEFT JOIN patients p ON ptp.patient_id = p.id 
        WHERE p.id IS NULL;
    ")
    
    if [ "$orphaned_treatments" -eq 0 ]; then
        log_success "All treatment plans have valid patient references"
    else
        log_error "Found $orphaned_treatments treatment plans with invalid patient references"
        exit 1
    fi
}

test_encryption_functionality() {
    log_info "Testing encryption functionality..."
    
    # Test that encrypted fields contain data
    local encrypted_fields=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM patients 
        WHERE patient_contact_email_encrypted IS NOT NULL 
        AND patient_contact_email_encrypted != '';
    ")
    
    if [ "$encrypted_fields" -gt 0 ]; then
        log_success "Encrypted fields contain data ($encrypted_fields records)"
    else
        log_warning "No encrypted data found in patient records"
    fi
    
    # Test that search hashes exist
    local search_hashes=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM patients 
        WHERE patient_contact_email_search_hash IS NOT NULL 
        AND patient_contact_email_search_hash != '';
    ")
    
    if [ "$search_hashes" -gt 0 ]; then
        log_success "Search hashes exist ($search_hashes records)"
    else
        log_warning "No search hashes found in patient records"
    fi
}

test_application_startup() {
    log_info "Testing application startup..."
    
    # Set environment variables
    export USE_HIPAA_SCHEMA=true
    export PHI_ENCRYPTION_KEY="test-key-64-characters-long-for-testing-purposes-only"
    
    # Test if application can start (timeout after 30 seconds)
    if timeout 30s npm run dev > /dev/null 2>&1 & then
        local app_pid=$!
        sleep 5  # Give app time to start
        
        # Check if app is still running
        if kill -0 $app_pid 2>/dev/null; then
            log_success "Application started successfully"
            kill $app_pid 2>/dev/null || true
        else
            log_error "Application failed to start"
            exit 1
        fi
    else
        log_warning "Application startup test skipped (npm not available or timeout)"
    fi
}

test_api_endpoints() {
    log_info "Testing API endpoints..."
    
    # Test health endpoint
    if curl -s "$API_BASE_URL/api/health" > /dev/null 2>&1; then
        log_success "Health endpoint accessible"
    else
        log_warning "Health endpoint not accessible (app may not be running)"
    fi
    
    # Test organizations endpoint
    if curl -s "$API_BASE_URL/api/organizations" > /dev/null 2>&1; then
        log_success "Organizations endpoint accessible"
    else
        log_warning "Organizations endpoint not accessible"
    fi
    
    # Test patients endpoint
    if curl -s "$API_BASE_URL/api/patients" > /dev/null 2>&1; then
        log_success "Patients endpoint accessible"
    else
        log_warning "Patients endpoint not accessible"
    fi
    
    # Test therapists endpoint
    if curl -s "$API_BASE_URL/api/therapists" > /dev/null 2>&1; then
        log_success "Therapists endpoint accessible"
    else
        log_warning "Therapists endpoint not accessible"
    fi
}

test_node_integration() {
    log_info "Testing Node.js integration..."
    
    # Test database queries through Node.js
    if node -e "
        const { db } = require('./db');
        Promise.all([
            db.query.organizations.findMany(),
            db.query.patients.findMany(),
            db.query.clinicalSessions.findMany()
        ]).then(results => {
            console.log('✅ All database queries successful');
            console.log('Organizations:', results[0].length);
            console.log('Patients:', results[1].length);
            console.log('Sessions:', results[2].length);
        }).catch(err => {
            console.error('❌ Database query failed:', err.message);
            process.exit(1);
        });
    " 2>/dev/null; then
        log_success "Node.js database integration working"
    else
        log_warning "Node.js database integration test failed"
    fi
}

generate_test_report() {
    log_info "Generating test report..."
    
    local report_file="hipaa-migration-test-report-$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "HIPAA Migration Test Report"
        echo "=========================="
        echo "Date: $(date)"
        echo "Database: $DATABASE_URL"
        echo "API Base URL: $API_BASE_URL"
        echo ""
        
        echo "Database Status:"
        echo "================"
        psql "$DATABASE_URL" -c "
            SELECT 'Organizations' as table_name, COUNT(*) as count FROM organizations
            UNION ALL
            SELECT 'Organization Memberships', COUNT(*) FROM organization_memberships
            UNION ALL
            SELECT 'Patients', COUNT(*) FROM patients
            UNION ALL
            SELECT 'Clinical Sessions', COUNT(*) FROM clinical_sessions
            UNION ALL
            SELECT 'Treatment Plans', COUNT(*) FROM patient_treatment_plans;
        "
        
        echo ""
        echo "Data Integrity Checks:"
        echo "======================"
        psql "$DATABASE_URL" -c "
            SELECT 'Orphaned Patients' as check_type, COUNT(*) as count 
            FROM patients p LEFT JOIN organizations o ON p.organization_id = o.id 
            WHERE o.id IS NULL
            UNION ALL
            SELECT 'Orphaned Sessions', COUNT(*) 
            FROM clinical_sessions cs LEFT JOIN patients p ON cs.patient_id = p.id 
            WHERE p.id IS NULL
            UNION ALL
            SELECT 'Orphaned Treatment Plans', COUNT(*) 
            FROM patient_treatment_plans ptp LEFT JOIN patients p ON ptp.patient_id = p.id 
            WHERE p.id IS NULL;
        "
        
        echo ""
        echo "Encryption Status:"
        echo "=================="
        psql "$DATABASE_URL" -c "
            SELECT 'Encrypted Email Fields' as field_type, COUNT(*) as count 
            FROM patients 
            WHERE patient_contact_email_encrypted IS NOT NULL 
            AND patient_contact_email_encrypted != ''
            UNION ALL
            SELECT 'Search Hash Fields', COUNT(*) 
            FROM patients 
            WHERE patient_contact_email_search_hash IS NOT NULL 
            AND patient_contact_email_search_hash != '';
        "
        
    } > "$report_file"
    
    log_success "Test report saved to: $report_file"
}

# Main execution
main() {
    echo "HIPAA Migration Testing Script"
    echo "=============================="
    echo ""
    
    check_prerequisites
    test_database_connection
    test_new_tables
    test_data_integrity
    test_encryption_functionality
    test_application_startup
    test_api_endpoints
    test_node_integration
    generate_test_report
    
    echo ""
    log_success "All tests completed! Review the test report for details."
    echo ""
    echo "Next steps:"
    echo "1. Review the test report"
    echo "2. Address any warnings or errors"
    echo "3. Test application functionality manually"
    echo "4. Schedule production migration"
}

# Run main function
main "$@"
