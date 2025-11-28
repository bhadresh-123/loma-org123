/**
 * RBAC Helper: Auto-load Organization Membership
 * 
 * This module provides a helper function to automatically load organization membership
 * for RBAC checks, eliminating the need to manually call loadOrganizationMembership middleware.
 */

import { Request, Response, NextFunction } from 'express';
import { OrganizationMembershipRepository } from '../repositories';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
  };
  organizationMembership?: any;
}

/**
 * Auto-load organization membership if not already loaded
 * This is called by RBAC middleware to ensure membership is available
 */
export async function ensureOrganizationMembership(req: AuthenticatedRequest): Promise<any> {
  // If already loaded, return it
  if (req.organizationMembership) {
    return req.organizationMembership;
  }

  // Load user's first/primary organization membership
  const userId = req.user?.id;
  if (!userId) {
    return null;
  }

  try {
    // Get user's organization memberships
    const memberships = await OrganizationMembershipRepository.findByUserId(userId);
    
    // Find first active membership
    const activeMembership = memberships.find(m => m.isActive);
    
    if (activeMembership) {
      req.organizationMembership = activeMembership;
      return activeMembership;
    }
    
    return null;
  } catch (error) {
    console.error('[RBAC] Failed to load organization membership:', error);
    return null;
  }
}

