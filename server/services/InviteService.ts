import { db } from '@db';
import { organizationInvites, organizations, organizationMemberships, usersAuth } from '../../db/schema-hipaa-refactored';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { sendOrganizationInviteEmail } from './email';
import { OrganizationService } from './OrganizationService';

/**
 * Service for managing organization invitations
 * Handles secure invite flow for adding therapists to practices
 */
export class InviteService {
  /**
   * Send an invite to a therapist by email
   */
  static async sendInvite(params: {
    organizationId: number;
    invitedBy: number;
    email: string;
    role: 'business_owner' | 'admin' | 'therapist' | 'contractor_1099';
    permissions: {
      canViewAllPatients?: boolean;
      canViewSelectedPatients?: number[];
      canViewAllCalendars?: boolean;
      canViewSelectedCalendars?: number[];
      canManageBilling?: boolean;
      canManageStaff?: boolean;
      canManageSettings?: boolean;
      canCreatePatients?: boolean;
    };
  }): Promise<{ success: boolean; inviteId?: number; error?: string }> {
    try {
      // Validate permissions
      const requestingMembership = await db.query.organizationMemberships.findFirst({
        where: and(
          eq(organizationMemberships.organizationId, params.organizationId),
          eq(organizationMemberships.userId, params.invitedBy)
        ),
      });

      if (!requestingMembership || !requestingMembership.canManageStaff) {
        return { success: false, error: 'Insufficient permissions to send invites' };
      }

      // Check if user already has membership
      const existingUser = await db.query.usersAuth.findFirst({
        where: eq(usersAuth.email, params.email),
      });

      if (existingUser) {
        const existingMembership = await db.query.organizationMemberships.findFirst({
          where: and(
            eq(organizationMemberships.organizationId, params.organizationId),
            eq(organizationMemberships.userId, existingUser.id),
            eq(organizationMemberships.isActive, true)
          ),
        });

        if (existingMembership) {
          return { success: false, error: 'User is already a member of this organization' };
        }
      }

      // Check for existing pending invite
      const existingInvite = await db.query.organizationInvites.findFirst({
        where: and(
          eq(organizationInvites.organizationId, params.organizationId),
          eq(organizationInvites.email, params.email),
          eq(organizationInvites.status, 'pending')
        ),
      });

      if (existingInvite) {
        // Resend existing invite instead of creating new one
        const organization = await db.query.organizations.findFirst({
          where: eq(organizations.id, params.organizationId),
        });

        await sendOrganizationInviteEmail({
          to: params.email,
          organizationName: organization?.name || 'Practice',
          inviteToken: existingInvite.token,
          inviterName: requestingMembership.user?.therapistProfile?.name || 'Practice Administrator',
        });

        return { success: true, inviteId: existingInvite.id };
      }

      // Generate secure token
      const token = randomBytes(32).toString('hex');
      
      // Create invite (expires in 7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const [invite] = await db
        .insert(organizationInvites)
        .values({
          organizationId: params.organizationId,
          invitedBy: params.invitedBy,
          email: params.email,
          role: params.role,
          token,
          canViewAllPatients: params.permissions.canViewAllPatients || false,
          canViewSelectedPatients: params.permissions.canViewSelectedPatients || [],
          canViewAllCalendars: params.permissions.canViewAllCalendars || false,
          canViewSelectedCalendars: params.permissions.canViewSelectedCalendars || [],
          canManageBilling: params.permissions.canManageBilling || false,
          canManageStaff: params.permissions.canManageStaff || false,
          canManageSettings: params.permissions.canManageSettings || false,
          canCreatePatients: params.permissions.canCreatePatients !== false,
          status: 'pending',
          expiresAt,
        })
        .returning();

      if (!invite) {
        return { success: false, error: 'Failed to create invite' };
      }

      // Get organization details for email
      const organization = await db.query.organizations.findFirst({
        where: eq(organizations.id, params.organizationId),
      });

      // Get inviter details
      const inviter = await db.query.usersAuth.findFirst({
        where: eq(usersAuth.id, params.invitedBy),
        with: {
          therapistProfile: true,
        },
      });

      // Send invite email
      await sendOrganizationInviteEmail({
        to: params.email,
        organizationName: organization?.name || 'Practice',
        inviteToken: token,
        inviterName: inviter?.therapistProfile?.name || inviter?.username || 'Practice Administrator',
      });

      return { success: true, inviteId: invite.id };
    } catch (error) {
      console.error('Error sending invite:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Accept an invite by token
   */
  static async acceptInvite(token: string, userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      // Find invite
      const invite = await db.query.organizationInvites.findFirst({
        where: and(
          eq(organizationInvites.token, token),
          eq(organizationInvites.status, 'pending')
        ),
      });

      if (!invite) {
        return { success: false, error: 'Invalid or expired invite' };
      }

      // Check expiration
      if (new Date() > invite.expiresAt) {
        await db
          .update(organizationInvites)
          .set({ status: 'expired', updatedAt: new Date() })
          .where(eq(organizationInvites.id, invite.id));

        return { success: false, error: 'Invite has expired' };
      }

      // Verify email matches
      const user = await db.query.usersAuth.findFirst({
        where: eq(usersAuth.id, userId),
      });

      if (!user || user.email.toLowerCase() !== invite.email.toLowerCase()) {
        return { success: false, error: 'Invite email does not match your account email' };
      }

      // Check if already a member
      const existingMembership = await db.query.organizationMemberships.findFirst({
        where: and(
          eq(organizationMemberships.organizationId, invite.organizationId),
          eq(organizationMemberships.userId, userId),
          eq(organizationMemberships.isActive, true)
        ),
      });

      if (existingMembership) {
        // Mark invite as accepted even though membership exists
        await db
          .update(organizationInvites)
          .set({ 
            status: 'accepted', 
            acceptedAt: new Date(),
            acceptedBy: userId,
            updatedAt: new Date()
          })
          .where(eq(organizationInvites.id, invite.id));

        return { success: false, error: 'You are already a member of this organization' };
      }

      // Create membership
      await OrganizationService.addTherapistToOrganization({
        organizationId: invite.organizationId,
        userId,
        role: invite.role as any,
        canViewAllPatients: invite.canViewAllPatients,
        canViewSelectedPatients: invite.canViewSelectedPatients as number[],
        canViewAllCalendars: invite.canViewAllCalendars,
        canViewSelectedCalendars: invite.canViewSelectedCalendars as number[],
        canManageBilling: invite.canManageBilling,
        canManageStaff: invite.canManageStaff,
        canManageSettings: invite.canManageSettings,
        employmentStartDate: new Date(),
      });

      // Mark invite as accepted
      await db
        .update(organizationInvites)
        .set({ 
          status: 'accepted', 
          acceptedAt: new Date(),
          acceptedBy: userId,
          updatedAt: new Date()
        })
        .where(eq(organizationInvites.id, invite.id));

      return { success: true };
    } catch (error) {
      console.error('Error accepting invite:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get invite details by token (for display before acceptance)
   */
  static async getInviteByToken(token: string): Promise<{ 
    success: boolean; 
    invite?: any; 
    error?: string 
  }> {
    try {
      const invite = await db.query.organizationInvites.findFirst({
        where: and(
          eq(organizationInvites.token, token),
          eq(organizationInvites.status, 'pending')
        ),
        with: {
          organization: true,
        },
      });

      if (!invite) {
        return { success: false, error: 'Invite not found' };
      }

      if (new Date() > invite.expiresAt) {
        await db
          .update(organizationInvites)
          .set({ status: 'expired', updatedAt: new Date() })
          .where(eq(organizationInvites.id, invite.id));

        return { success: false, error: 'Invite has expired' };
      }

      return { success: true, invite };
    } catch (error) {
      console.error('Error getting invite:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

