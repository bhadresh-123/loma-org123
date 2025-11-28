#!/usr/bin/env tsx
/**
 * Phase 4 Documentation Validation Script
 * 
 * Validates that schema documentation and PHI governance guide meet
 * all requirements from the PHI security remediation plan.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const schemaPath = path.join(projectRoot, 'db', 'schema-hipaa-refactored.ts');
const guidePath = path.join(projectRoot, 'docs', 'PHI_GOVERNANCE.md');

interface ValidationResult {
  category: string;
  test: string;
  passed: boolean;
  details?: string;
}

const results: ValidationResult[] = [];

function test(category: string, testName: string, condition: boolean, details?: string) {
  results.push({
    category,
    test: testName,
    passed: condition,
    details: condition ? undefined : details
  });
}

function readFile(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

console.log('🔍 Phase 4 Documentation Validation\n');
console.log('=' + '='.repeat(79) + '\n');

// Load files
let schemaContent: string;
let guideContent: string;

try {
  schemaContent = readFile(schemaPath);
  guideContent = readFile(guidePath);
  console.log('✅ Files loaded successfully\n');
} catch (error) {
  console.error('❌ Failed to load files:', error);
  process.exit(1);
}

// Schema Documentation Tests
console.log('📄 Schema Documentation Quality\n');

test(
  'Schema Documentation',
  'Patient name field has GOVERNANCE POLICY comment',
  schemaContent.includes('GOVERNANCE POLICY: Patient names are stored UNENCRYPTED'),
  'Patient name governance policy not found'
);

test(
  'Schema Documentation',
  'Patient policy includes ACCESS CONTROL section',
  schemaContent.includes('ACCESS CONTROL:'),
  'ACCESS CONTROL section not found'
);

test(
  'Schema Documentation',
  'Patient policy includes LOGGING PROHIBITION section',
  schemaContent.includes('LOGGING PROHIBITION:'),
  'LOGGING PROHIBITION section not found'
);

test(
  'Schema Documentation',
  'Patient policy includes AUDIT REQUIREMENTS section',
  schemaContent.includes('AUDIT REQUIREMENTS:'),
  'AUDIT REQUIREMENTS section not found'
);

test(
  'Schema Documentation',
  'Patient policy includes SEARCH CAPABILITY section',
  schemaContent.includes('SEARCH CAPABILITY:'),
  'SEARCH CAPABILITY section not found'
);

test(
  'Schema Documentation',
  'Patient policy mentions patientNameSearchHash',
  schemaContent.includes('patientNameSearchHash') && schemaContent.includes('patient_name_search_hash'),
  'Search hash field not referenced'
);

test(
  'Schema Documentation',
  'Patient policy references safe-logger utility',
  schemaContent.includes('safe-logger'),
  'safe-logger utility not referenced'
);

// Extract therapist section for focused testing
const therapistStart = schemaContent.indexOf('export const therapistProfiles');
const therapistEnd = schemaContent.indexOf('export const therapistPHI');
const therapistSection = therapistStart !== -1 && therapistEnd !== -1 
  ? schemaContent.substring(therapistStart, therapistEnd) 
  : '';

test(
  'Schema Documentation',
  'Therapist name field has GOVERNANCE POLICY comment',
  therapistSection.includes('GOVERNANCE POLICY: Therapist names are stored UNENCRYPTED'),
  'Therapist name governance policy not found'
);

test(
  'Schema Documentation',
  'Therapist policy explains NOT PHI classification',
  therapistSection.includes('NOT considered PHI'),
  'PHI classification not explained'
);

test(
  'Schema Documentation',
  'Therapist policy includes LOGGING PROHIBITION',
  therapistSection.includes('LOGGING PROHIBITION:'),
  'LOGGING PROHIBITION not found in therapist policy'
);

test(
  'Schema Documentation',
  'Therapist policy includes PUBLIC DISCLOSURE guidance',
  therapistSection.includes('PUBLIC DISCLOSURE:'),
  'PUBLIC DISCLOSURE section not found'
);

test(
  'Schema Documentation',
  'Therapist policy mentions professional/business identity',
  therapistSection.includes('professional') && therapistSection.includes('business'),
  'Professional/business identity not explained'
);

// PHI Governance Guide Tests
console.log('\n📘 PHI Governance Guide Quality\n');

test(
  'Governance Guide',
  'Guide has main title "# PHI Governance Policy"',
  guideContent.includes('# PHI Governance Policy'),
  'Main title not found'
);

const requiredSections = [
  '## Overview',
  '## Table of Contents',
  '## Unencrypted Name Policy',
  '## Logging Restrictions',
  '## Access Control Requirements',
  '## Audit Trail Requirements',
  '## Search and Query Guidelines',
  '## Developer Guidelines',
  '## Compliance Checklist',
  '## Quick Reference',
  '## References',
  '## Revision History'
];

requiredSections.forEach(section => {
  test(
    'Governance Guide',
    `Guide includes section: ${section}`,
    guideContent.includes(section),
    `Section ${section} not found`
  );
});

test(
  'Governance Guide',
  'Guide covers Patient Names subsection',
  guideContent.includes('### Patient Names'),
  'Patient Names subsection not found'
);

test(
  'Governance Guide',
  'Guide covers Therapist Names subsection',
  guideContent.includes('### Therapist Names'),
  'Therapist Names subsection not found'
);

test(
  'Governance Guide',
  'Guide includes Never-Log Rules',
  guideContent.includes('### Never-Log Rules'),
  'Never-Log Rules not found'
);

test(
  'Governance Guide',
  'Guide references safe-logger.ts utility',
  guideContent.includes('safe-logger.ts'),
  'safe-logger.ts not referenced'
);

test(
  'Governance Guide',
  'Guide includes RBAC roles (Business Owner, Admin, Therapist)',
  guideContent.includes('Business Owner') && 
  guideContent.includes('Admin') && 
  guideContent.includes('Therapist'),
  'RBAC roles not fully documented'
);

test(
  'Governance Guide',
  'Guide mentions 7-year retention requirement',
  guideContent.includes('7 years'),
  '7-year retention requirement not mentioned'
);

const codeBlockCount = (guideContent.match(/```typescript/g) || []).length;
test(
  'Governance Guide',
  'Guide has TypeScript code examples (min 5)',
  codeBlockCount >= 5,
  `Only ${codeBlockCount} TypeScript code blocks found, expected >= 5`
);

test(
  'Governance Guide',
  'Guide includes WRONG/RIGHT examples',
  guideContent.includes('WRONG') && guideContent.includes('RIGHT'),
  'WRONG/RIGHT comparison examples not found'
);

const checkboxCount = (guideContent.match(/- \[ \]/g) || []).length;
test(
  'Governance Guide',
  'Guide has developer checklists (min 20 items)',
  checkboxCount >= 20,
  `Only ${checkboxCount} checkbox items found, expected >= 20`
);

test(
  'Governance Guide',
  'Guide has DO/DON\'T quick reference',
  guideContent.includes("DO's") && guideContent.includes("DON'Ts"),
  'DO/DON\'T quick reference not found'
);

test(
  'Governance Guide',
  'Guide includes HIPAA references',
  guideContent.includes('HIPAA Privacy Rule') && 
  guideContent.includes('HIPAA Security Rule'),
  'HIPAA references incomplete'
);

const guideLines = guideContent.split('\n').length;
test(
  'Governance Guide',
  'Guide is comprehensive (min 450 lines)',
  guideLines >= 450,
  `Guide has ${guideLines} lines, expected >= 450`
);

// Cross-Reference Tests
console.log('\n🔗 Cross-References and Consistency\n');

test(
  'Cross-References',
  'Schema references HIPAA and PHI',
  schemaContent.includes('HIPAA') && schemaContent.includes('PHI'),
  'HIPAA/PHI not found in schema'
);

test(
  'Cross-References',
  'Guide references schema file',
  guideContent.includes('schema-hipaa-refactored.ts'),
  'Schema file not referenced in guide'
);

test(
  'Cross-References',
  'Both documents reference audit_logs_hipaa',
  schemaContent.includes('audit_logs_hipaa') && 
  guideContent.includes('audit_logs_hipaa'),
  'audit_logs_hipaa not referenced in both documents'
);

test(
  'Cross-References',
  'Both documents reference search hashes',
  schemaContent.includes('patientNameSearchHash') && 
  guideContent.includes('patientNameSearchHash'),
  'Search hashes not referenced in both documents'
);

test(
  'Cross-References',
  'Both documents prohibit logging names',
  schemaContent.includes('NEVER') && guideContent.includes('Never log'),
  'Logging prohibition not consistent across documents'
);

test(
  'Cross-References',
  'Both documents reference safe-logger',
  schemaContent.includes('safe-logger') && 
  guideContent.includes('safe-logger'),
  'safe-logger not referenced in both documents'
);

// Extract patient section for consistency check
const patientStart = schemaContent.indexOf('export const patients');
const patientEnd = schemaContent.indexOf('export const clinicalSessions');
const patientSection = patientStart !== -1 && patientEnd !== -1 
  ? schemaContent.substring(patientStart, patientEnd) 
  : '';

test(
  'Policy Consistency',
  'Patient and therapist policies both prohibit logging',
  patientSection.includes('NEVER') && therapistSection.includes('NEVER'),
  'Logging prohibition not consistent between patient and therapist policies'
);

test(
  'Policy Consistency',
  'Patient and therapist policies both require auditing',
  patientSection.toLowerCase().includes('audit') && 
  therapistSection.toLowerCase().includes('audit'),
  'Audit requirements not consistent between patient and therapist policies'
);

// Actionable Content Tests
console.log('\n⚡ Actionable Content Quality\n');

test(
  'Actionable Content',
  'Guide provides specific file paths',
  guideContent.includes('.ts') && 
  guideContent.includes('server/') && 
  guideContent.includes('db/'),
  'Specific file paths not provided'
);

test(
  'Actionable Content',
  'Guide has copy-paste ready examples',
  guideContent.includes('import {') && 
  guideContent.includes("from '@") && 
  guideContent.includes('console.log('),
  'Copy-paste ready examples not found'
);

test(
  'Actionable Content',
  'Guide includes Common Mistakes section',
  guideContent.includes('### Common Mistakes to Avoid'),
  'Common Mistakes section not found'
);

// Print Results
console.log('\n' + '='.repeat(80));
console.log('VALIDATION RESULTS');
console.log('='.repeat(80) + '\n');

const groupedResults: Record<string, ValidationResult[]> = {};
results.forEach(result => {
  if (!groupedResults[result.category]) {
    groupedResults[result.category] = [];
  }
  groupedResults[result.category].push(result);
});

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

Object.entries(groupedResults).forEach(([category, categoryResults]) => {
  const passed = categoryResults.filter(r => r.passed).length;
  const total = categoryResults.length;
  const percentage = Math.round((passed / total) * 100);
  
  totalTests += total;
  passedTests += passed;
  failedTests += total - passed;
  
  console.log(`\n${category}: ${passed}/${total} (${percentage}%)`);
  
  categoryResults.forEach(result => {
    if (!result.passed) {
      console.log(`  ❌ ${result.test}`);
      if (result.details) {
        console.log(`     └─ ${result.details}`);
      }
    }
  });
  
  if (passed === total) {
    console.log(`  ✅ All tests passed!`);
  }
});

console.log('\n' + '='.repeat(80));
console.log(`SUMMARY: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('='.repeat(80) + '\n');

if (failedTests === 0) {
  console.log('🎉 Phase 4 documentation is complete and meets all requirements!\n');
  process.exit(0);
} else {
  console.log(`⚠️  ${failedTests} test(s) failed. Please review the documentation.\n`);
  process.exit(1);
}

