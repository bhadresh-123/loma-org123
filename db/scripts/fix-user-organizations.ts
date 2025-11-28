#!/usr/bin/env tsx
/**
 * Fix User Organizations
 * 
 * Ensures all users have an organization membership.
 * Creates a solo practice organization for users without one.
 * 
 * Usage:
 *   npm run fix:orgs
 *   or
 *   NODE_ENV=development tsx db/scripts/fix-user-organizations.ts
 */

// Ensure NODE_ENV is set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

import { db } from '../index';
import { usersAuth, organizations, organizationMemberships, therapistProfiles } from '../schema-hipaa-refactored';
import { eq, and, isNull } from 'drizzle-orm';

async function fixUserOrganizations() {
  console.log('🔧 Checking user organization memberships...\n');

  try {
    // Get all users
    const allUsers = await db
      .select({
        id: usersAuth.id,
        username: usersAuth.username,
        email: usersAuth.email,
      })
      .from(usersAuth);

    console.log(`Found ${allUsers.length} users\n`);

    let fixedCount = 0;
    let alreadyOkCount = 0;

    for (const user of allUsers) {
      console.log(`Checking user: ${user.username} (${user.email})`);

      // Check if user has organization membership
      const [membership] = await db
        .select()
        .from(organizationMemberships)
        .where(eq(organizationMemberships.userId, user.id))
        .limit(1);

      if (membership) {
        console.log(`  ✅ User already has organization membership (Org ID: ${membership.organizationId})`);
        alreadyOkCount++;
      } else {
        console.log(`  ⚠️  User has NO organization membership, creating one...`);

        // Get user's therapist profile if exists
        const [profile] = await db
          .select()
          .from(therapistProfiles)
          .where(eq(therapistProfiles.userId, user.id))
          .limit(1);

        const practiceName = profile?.name 
          ? `${profile.name}'s Practice`
          : `${user.username}'s Practice`;

        // Create organization
        const [newOrg] = await db
          .insert(organizations)
          .values({
            name: practiceName,
            type: 'solo',
            defaultSessionDuration: 50,
            timezone: 'America/New_York',
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        console.log(`  ✅ Created organization: ${newOrg.name} (ID: ${newOrg.id})`);

        // Create organization membership
        const [newMembership] = await db
          .insert(organizationMemberships)
          .values({
            organizationId: newOrg.id,
            userId: user.id,
            role: 'business_owner',
            canViewAllPatients: true,
            canViewAllCalendars: true,
            canManageBilling: true,
            canManageStaff: true,
            canManageSettings: true,
            canCreatePatients: true,
            employmentStartDate: new Date(),
            employmentEndDate: null,
            isActive: true,
            isPrimaryOwner: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        console.log(`  ✅ Created organization membership (ID: ${newMembership.id})`);
        fixedCount++;
      }

      console.log('');
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Users with organizations: ${alreadyOkCount}`);
    console.log(`   🔧 Users fixed: ${fixedCount}`);
    console.log(`   📝 Total users: ${allUsers.length}\n`);

    console.log('✨ Organization membership check completed!\n');

  } catch (error) {
    console.error('❌ Error fixing user organizations:', error);
    throw error;
  }
}

// Run fix if this file is executed directly
fixUserOrganizations()
  .then(() => {
    console.log('✅ Fix script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fix script failed:', error);
    process.exit(1);
  });

export default fixUserOrganizations;

