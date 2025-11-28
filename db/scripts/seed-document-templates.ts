#!/usr/bin/env tsx
/**
 * Seed Document Templates
 * 
 * Populates the database with default HIPAA-compliant clinical document templates
 * for intake forms, consents, and other patient documents.
 * 
 * Usage:
 *   npm run seed:templates
 *   or
 *   NODE_ENV=development tsx db/scripts/seed-document-templates.ts
 */

// Ensure NODE_ENV is set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

import { db } from '../index';
import { documentTemplates } from '../schema-hipaa-refactored';
import { eq, and } from 'drizzle-orm';
import { ALL_CLINICAL_TEMPLATES } from '../../server/templates/clinical-documents';

async function seedDocumentTemplates() {
  console.log('🌱 Starting document templates seed...\n');

  try {
    let createdCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    for (const template of ALL_CLINICAL_TEMPLATES) {
      console.log(`Processing template: ${template.title} (${template.type})`);

      // Check if template already exists (system-wide template with no organization)
      const existingTemplates = await db
        .select()
        .from(documentTemplates)
        .where(
          and(
            eq(documentTemplates.type, template.type),
            eq(documentTemplates.organizationId, null)
          )
        )
        .limit(1);

      if (existingTemplates.length > 0) {
        console.log(`  ⏭️  Template already exists, skipping...`);
        skippedCount++;
        
        // Optional: Update existing template
        // Uncomment below if you want to update existing templates
        /*
        await db
          .update(documentTemplates)
          .set({
            title: template.title,
            content: template.content,
            category: template.category,
            version: existingTemplates[0].version + 1,
            updatedAt: new Date(),
          })
          .where(eq(documentTemplates.id, existingTemplates[0].id));
        console.log(`  ✅ Updated existing template`);
        updatedCount++;
        */
      } else {
        // Create new template
        await db
          .insert(documentTemplates)
          .values({
            type: template.type,
            title: template.title,
            content: template.content,
            category: template.category,
            organizationId: null, // System-wide template
            isActive: true,
            version: 1,
            createdBy: null, // System-generated
            updatedBy: null,
          });
        
        console.log(`  ✅ Created new template`);
        createdCount++;
      }

      console.log('');
    }

    console.log('\n📊 Seed Summary:');
    console.log(`   ✅ Created: ${createdCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   🔄 Updated: ${updatedCount}`);
    console.log(`   📝 Total Templates: ${ALL_CLINICAL_TEMPLATES.length}\n`);

    console.log('✨ Document templates seed completed successfully!\n');
    
    // Display all templates
    console.log('📋 Available Templates:');
    const allTemplates = await db
      .select({
        id: documentTemplates.id,
        type: documentTemplates.type,
        title: documentTemplates.title,
        category: documentTemplates.category,
        isActive: documentTemplates.isActive,
      })
      .from(documentTemplates)
      .where(eq(documentTemplates.organizationId, null));
    
    console.table(allTemplates);

  } catch (error) {
    console.error('❌ Error seeding document templates:', error);
    throw error;
  }
}

// Run seed if this file is executed directly
seedDocumentTemplates()
  .then(() => {
    console.log('✅ Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed script failed:', error);
    process.exit(1);
  });

export default seedDocumentTemplates;

