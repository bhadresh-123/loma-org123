import { OrganizationRepository, OrganizationMembershipRepository, PatientRepository } from '../repositories';
import { encryptPHI, decryptPHI, createSearchHash } from '../utils/phi-encryption';
import { AuditLogRepository } from '../repositories';

/**
 * Organization Service
 * 
 * Handles organization (practice) management with HIPAA compliance
 */

export class OrganizationService {
  /**
   * Create a new organization (practice)
   */
  static async createOrganization(data: {
    name: string;
    type: 'solo' | 'partnership' | 'group_practice';
    businessEin?: string;
    businessAddress?: string;
    businessCity?: string;
    businessState?: string;
    businessZip?: string;
    businessPhone?: string;
    businessEmail?: string;
    defaultSessionDuration?: number;
    timezone?: string;
  }): Promise<any> {
    // Encrypt sensitive business data
    const encryptedData = {
      name: data.name,
      type: data.type,
      organizationBusinessEinEncrypted: data.businessEin ? encryptPHI(data.businessEin) : null,
      organizationBusinessAddress: data.businessAddress,
      organizationBusinessCity: data.businessCity,
      organizationBusinessState: data.businessState,
      organizationBusinessZip: data.businessZip,
      organizationBusinessPhone: data.businessPhone,
      organizationBusinessEmail: data.businessEmail,
      defaultSessionDuration: data.defaultSessionDuration || 50,
      timezone: data.timezone || 'America/New_York',
    };

    const organization = await OrganizationRepository.create(encryptedData);

    // Log organization creation
    await AuditLogRepository.create({
      action: 'CREATE',
      resourceType: 'ORGANIZATION',
      resourceId: organization.id,
      securityLevel: 'standard',
      riskScore: 10,
      hipaaCompliant: true,
    });

    return organization;
  }

  /**
   * Get organization by ID
   */
  static async getOrganization(id: number): Promise<any> {
    const organization = await OrganizationRepository.findById(id);
    
    if (!organization) {
      return null;
    }

    // Decrypt sensitive data
    const decryptedOrganization = {
      ...organization,
      businessEin: organization.organizationBusinessEinEncrypted 
        ? decryptPHI(organization.organizationBusinessEinEncrypted)
        : null,
    };

    return decryptedOrganization;
  }

  /**
   * Update organization
   */
  static async updateOrganization(id: number, data: {
    name?: string;
    type?: 'solo' | 'partnership' | 'group_practice';
    businessEin?: string;
    businessAddress?: string;
    businessCity?: string;
    businessState?: string;
    businessZip?: string;
    businessPhone?: string;
    businessEmail?: string;
    defaultSessionDuration?: number;
    timezone?: string;
  }): Promise<any> {
    const updateData: any = { ...data };

    // Encrypt sensitive fields if provided
    if (data.businessEin !== undefined) {
      updateData.organizationBusinessEinEncrypted = data.businessEin 
        ? encryptPHI(data.businessEin)
        : null;
      delete updateData.businessEin;
    }

    const organization = await OrganizationRepository.update(id, updateData);

    if (organization) {
      // Log organization update
      await AuditLogRepository.create({
        action: 'UPDATE',
        resourceType: 'ORGANIZATION',
        resourceId: id,
        securityLevel: 'standard',
        riskScore: 10,
        hipaaCompliant: true,
      });
    }

    return organization;
  }

  /**
   * Add therapist to organization
   */
  static async addTherapistToOrganization(data: {
    organizationId: number;
    userId: number;
    role: 'business_owner' | 'admin' | 'therapist' | 'contractor_1099';
    canViewAllPatients?: boolean;
    canViewSelectedPatients?: number[];
    canViewAllCalendars?: boolean;
    canViewSelectedCalendars?: number[];
    canManageBilling?: boolean;
    canManageStaff?: boolean;
    canManageSettings?: boolean;
    employmentStartDate?: Date;
    isPrimaryOwner?: boolean;
  }): Promise<any> {
    const membership = await OrganizationMembershipRepository.create(data);

    // Log membership creation
    await AuditLogRepository.create({
      userId: data.userId,
      action: 'CREATE',
      resourceType: 'ORGANIZATION_MEMBERSHIP',
      resourceId: membership.id,
      securityLevel: 'standard',
      riskScore: 20,
      hipaaCompliant: true,
    });

    return membership;
  }

  /**
   * Get organization members
   */
  static async getOrganizationMembers(organizationId: number): Promise<any[]> {
    const members = await OrganizationRepository.getMembers(organizationId);
    
    // Transform the data to include user information at the top level
    return members.map((member: any) => ({
      ...member,
      userName: member.user?.username || member.user?.email?.split('@')[0] || 'Unknown',
      userEmail: member.user?.email || 'No email'
    }));
  }

  /**
   * Get organization patients
   */
  static async getOrganizationPatients(organizationId: number): Promise<any[]> {
    return OrganizationRepository.getPatients(organizationId);
  }

  /**
   * Check if user can access organization
   */
  static async canUserAccessOrganization(userId: number, organizationId: number): Promise<boolean> {
    const membership = await OrganizationMembershipRepository.findByUserAndOrganization(userId, organizationId);
    return membership !== null && membership.isActive;
  }

  /**
   * Get user's organization memberships
   */
  static async getUserOrganizations(userId: number): Promise<any[]> {
    return OrganizationMembershipRepository.findByUserId(userId);
  }

  /**
   * Create solo practice for therapist
   */
  static async createSoloPractice(therapistId: number, therapistName: string): Promise<any> {
    // Create organization
    const organization = await this.createOrganization({
      name: `${therapistName}'s Practice`,
      type: 'solo',
    });

    // Add therapist as business owner
    await this.addTherapistToOrganization({
      organizationId: organization.id,
      userId: therapistId,
      role: 'business_owner',
      canViewAllPatients: true,
      canViewAllCalendars: true,
      canManageBilling: true,
      canManageStaff: true,
      canManageSettings: true,
      isPrimaryOwner: true,
      isActive: true,
    });

    return organization;
  }

  /**
   * Update organization member
   */
  static async updateOrganizationMember(memberId: number, updateData: any, requestingUserId: number): Promise<any> {
    // Get current member
    const currentMember = await OrganizationMembershipRepository.findById(memberId);
    if (!currentMember) {
      throw new Error('Member not found');
    }

    // Check if requesting user can manage this organization
    const requestingMembership = await OrganizationMembershipRepository.findByUserAndOrganization(
      requestingUserId,
      currentMember.organizationId
    );

    if (!requestingMembership || !requestingMembership.canManageStaff) {
      throw new Error('Insufficient permissions to update member');
    }

    // Prevent self-modification
    if (currentMember.userId === requestingUserId) {
      throw new Error('Cannot modify own permissions');
    }

    // Prevent removing last business owner
    if (updateData.role && updateData.role !== 'business_owner' && currentMember.role === 'business_owner') {
      const businessOwners = await OrganizationMembershipRepository.findByOrganizationAndRole(
        currentMember.organizationId,
        'business_owner'
      );
      if (businessOwners.length <= 1) {
        throw new Error('Cannot remove last business owner');
      }
    }

    // Update member
    const updatedMember = await OrganizationMembershipRepository.update(memberId, updateData);

    // Log member update
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'UPDATE',
      resourceType: 'ORGANIZATION_MEMBERSHIP',
      resourceId: memberId,
      fieldsAccessed: Object.keys(updateData),
      phiFieldsCount: 0,
      securityLevel: 'standard',
      riskScore: 20,
      hipaaCompliant: true,
    });

    return updatedMember;
  }

  /**
   * Deactivate organization member
   */
  static async deactivateMember(memberId: number, requestingUserId: number): Promise<boolean> {
    // Get current member
    const currentMember = await OrganizationMembershipRepository.findById(memberId);
    if (!currentMember) {
      throw new Error('Member not found');
    }

    // Check if requesting user can manage this organization
    const requestingMembership = await OrganizationMembershipRepository.findByUserAndOrganization(
      requestingUserId,
      currentMember.organizationId
    );

    if (!requestingMembership || !requestingMembership.canManageStaff) {
      throw new Error('Insufficient permissions to remove member');
    }

    // Prevent self-removal
    if (currentMember.userId === requestingUserId) {
      throw new Error('Cannot remove self');
    }

    // Prevent removing last business owner
    if (currentMember.role === 'business_owner') {
      const businessOwners = await OrganizationMembershipRepository.findByOrganizationAndRole(
        currentMember.organizationId,
        'business_owner'
      );
      if (businessOwners.length <= 1) {
        throw new Error('Cannot remove last business owner');
      }
    }

    // Soft delete: set isActive to false and add employment end date
    await OrganizationMembershipRepository.update(memberId, {
      isActive: false,
      employmentEndDate: new Date(),
    });

    // Log member deactivation
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'DELETE',
      resourceType: 'ORGANIZATION_MEMBERSHIP',
      resourceId: memberId,
      fieldsAccessed: ['isActive', 'employmentEndDate'],
      phiFieldsCount: 0,
      securityLevel: 'standard',
      riskScore: 25,
      hipaaCompliant: true,
    });

    return true;
  }

  /**
   * Get available therapists for adding to organization
   */
  static async getAvailableTherapists(organizationId: number, requestingUserId: number): Promise<any[]> {
    // Check if requesting user can manage this organization
    const requestingMembership = await OrganizationMembershipRepository.findByUserAndOrganization(
      requestingUserId,
      organizationId
    );

    if (!requestingMembership || !requestingMembership.canManageStaff) {
      throw new Error('Insufficient permissions to view available therapists');
    }

    // Get all therapists not already in this organization
    const availableTherapists = await OrganizationMembershipRepository.findAvailableTherapists(organizationId);
    
    return availableTherapists;
  }

  /**
   * Transfer patient to different therapist
   */
  static async transferPatient(patientId: number, newTherapistId: number, requestingUserId: number): Promise<any> {
    const patient = await PatientRepository.findById(patientId);
    
    if (!patient) {
      throw new Error('Patient not found');
    }

    // Check if requesting user has permission to transfer this patient
    const membership = await OrganizationMembershipRepository.findByUserAndOrganization(
      requestingUserId, 
      patient.organizationId
    );

    if (!membership || !membership.canManageStaff) {
      throw new Error('Insufficient permissions to transfer patient');
    }

    // Update patient's primary therapist
    const updatedPatient = await PatientRepository.update(patientId, {
      primaryTherapistId: newTherapistId,
    });

    // Log patient transfer
    await AuditLogRepository.create({
      userId: requestingUserId,
      action: 'UPDATE',
      resourceType: 'PATIENT',
      resourceId: patientId,
      fieldsAccessed: ['primaryTherapistId'],
      phiFieldsCount: 0,
      securityLevel: 'phi-protected',
      riskScore: 30,
      hipaaCompliant: true,
    });

    return updatedPatient;
  }
}
