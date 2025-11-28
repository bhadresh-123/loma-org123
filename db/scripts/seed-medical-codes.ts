#!/usr/bin/env tsx
/**
 * Seed Medical Codes and Assessment Categories
 * 
 * This script populates the medical_codes and assessment_categories tables
 * with default CPT codes and assessment categories used for billing.
 * 
 * Safe to run multiple times (idempotent) - will skip existing records.
 */

import { db } from '../index';
import { medicalCodes, assessmentCategories } from '../schema-hipaa-refactored';
import { eq } from 'drizzle-orm';

// Default CPT codes for psychotherapy
const DEFAULT_CPT_CODES = [
  { 
    code: '90791', 
    description: 'Psychiatric diagnostic evaluation',
    codeType: 'cpt',
    duration: 60,
    category: 'assessment'
  },
  { 
    code: '90832', 
    description: 'Individual psychotherapy, 30 minutes',
    codeType: 'cpt',
    duration: 30,
    category: 'individual'
  },
  { 
    code: '90834', 
    description: 'Individual psychotherapy, 45 minutes',
    codeType: 'cpt',
    duration: 45,
    category: 'individual'
  },
  { 
    code: '90837', 
    description: 'Individual psychotherapy, 60 minutes',
    codeType: 'cpt',
    duration: 60,
    category: 'individual'
  },
  { 
    code: '90846', 
    description: 'Family psychotherapy without patient present',
    codeType: 'cpt',
    duration: 50,
    category: 'family'
  },
  { 
    code: '90847', 
    description: 'Family psychotherapy with patient present',
    codeType: 'cpt',
    duration: 50,
    category: 'family'
  },
  { 
    code: '90849', 
    description: 'Multiple-family group psychotherapy',
    codeType: 'cpt',
    duration: 50,
    category: 'group'
  },
  { 
    code: '90853', 
    description: 'Group psychotherapy',
    codeType: 'cpt',
    duration: 50,
    category: 'group'
  },
  { 
    code: '90833', 
    description: 'Psychotherapy add-on, 30 minutes',
    codeType: 'cpt',
    duration: 30,
    category: 'addon'
  },
  { 
    code: '90836', 
    description: 'Psychotherapy add-on, 45 minutes',
    codeType: 'cpt',
    duration: 45,
    category: 'addon'
  },
  { 
    code: '90838', 
    description: 'Psychotherapy add-on, 60 minutes',
    codeType: 'cpt',
    duration: 60,
    category: 'addon'
  },
  { 
    code: '96130', 
    description: 'Psychological testing evaluation services',
    codeType: 'cpt',
    duration: 60,
    category: 'assessment'
  },
  { 
    code: '96131', 
    description: 'Psychological testing evaluation services, each additional hour',
    codeType: 'cpt',
    duration: 60,
    category: 'assessment'
  },
  { 
    code: '96132', 
    description: 'Neuropsychological testing evaluation services',
    codeType: 'cpt',
    duration: 60,
    category: 'assessment'
  },
  { 
    code: '96133', 
    description: 'Neuropsychological testing evaluation services, each additional hour',
    codeType: 'cpt',
    duration: 60,
    category: 'assessment'
  },
];

// Default assessment categories
const DEFAULT_ASSESSMENT_CATEGORIES = [
  { name: 'Mental Health Assessment', sortOrder: 1 },
  { name: 'Substance Use Assessment', sortOrder: 2 },
  { name: 'Risk Assessment', sortOrder: 3 },
  { name: 'Psychosocial Assessment', sortOrder: 4 },
  { name: 'Cognitive Assessment', sortOrder: 5 },
  { name: 'Behavioral Assessment', sortOrder: 6 },
  { name: 'Trauma Assessment', sortOrder: 7 },
  { name: 'Developmental Assessment', sortOrder: 8 },
  { name: 'Suicide Risk Assessment', sortOrder: 9 },
  { name: 'Violence Risk Assessment', sortOrder: 10 },
  { name: 'Neuropsychological Assessment', sortOrder: 11 },
  { name: 'Personality Assessment', sortOrder: 12 },
];

async function seedMedicalCodes() {
  console.log('🌱 Seeding medical codes and assessment categories...\n');
  
  try {
    // Seed CPT codes
    console.log('📋 Seeding CPT codes...');
    let cptInserted = 0;
    let cptSkipped = 0;
    
    for (const cptCode of DEFAULT_CPT_CODES) {
      try {
        // Check if code already exists
        const existing = await db
          .select()
          .from(medicalCodes)
          .where(eq(medicalCodes.code, cptCode.code))
          .limit(1);
        
        if (existing.length > 0) {
          console.log(`   ⏭️  Skipping existing code: ${cptCode.code}`);
          cptSkipped++;
          continue;
        }
        
        // Insert new code
        await db.insert(medicalCodes).values({
          code: cptCode.code,
          description: cptCode.description,
          codeType: cptCode.codeType,
          category: cptCode.category,
          duration: cptCode.duration,
          isActive: true,
        });
        
        console.log(`   ✅ Inserted CPT code: ${cptCode.code} - ${cptCode.description}`);
        cptInserted++;
      } catch (error) {
        console.error(`   ❌ Failed to insert CPT code ${cptCode.code}:`, error);
      }
    }
    
    console.log(`\n✅ CPT codes: ${cptInserted} inserted, ${cptSkipped} skipped\n`);
    
    // Seed assessment categories
    console.log('📋 Seeding assessment categories...');
    let categoryInserted = 0;
    let categorySkipped = 0;
    
    for (const category of DEFAULT_ASSESSMENT_CATEGORIES) {
      try {
        // Check if category already exists
        const existing = await db
          .select()
          .from(assessmentCategories)
          .where(eq(assessmentCategories.name, category.name))
          .limit(1);
        
        if (existing.length > 0) {
          console.log(`   ⏭️  Skipping existing category: ${category.name}`);
          categorySkipped++;
          continue;
        }
        
        // Insert new category
        await db.insert(assessmentCategories).values({
          name: category.name,
          sortOrder: category.sortOrder,
          isActive: true,
        });
        
        console.log(`   ✅ Inserted category: ${category.name}`);
        categoryInserted++;
      } catch (error) {
        console.error(`   ❌ Failed to insert category ${category.name}:`, error);
      }
    }
    
    console.log(`\n✅ Assessment categories: ${categoryInserted} inserted, ${categorySkipped} skipped\n`);
    
    // Summary
    console.log('🎉 Seed complete!');
    console.log(`   Total CPT codes: ${cptInserted + cptSkipped}`);
    console.log(`   Total categories: ${categoryInserted + categorySkipped}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run the seed
seedMedicalCodes();

