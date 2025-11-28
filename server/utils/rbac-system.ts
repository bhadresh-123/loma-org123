import { db } from '../../db';
import { getActiveSchema } from '@db';

// Dynamic schema handled by getActiveSchema()

import { eq, and, or } from 'drizzle-orm';
import { auditLogger, AuditAction, ResourceType } from './audit-system';

export interface Role {
  id: string;
  name: string;
  description?: string;
  category: 'clinical' | 'administrative' | 'technical' | 'executive';
  hipaaAccessLevel: 'minimal' | 'limited' | 'full' | 'administrative';
  emergencyOverride: boolean;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  actions: string[];
  description?: string;
  conditions?: AccessCondition;
  timeRestrictions?: TimeRestriction;
  locationRestrictions?: LocationRestriction;
}

export interface AccessCondition {
  dataScope?: string[];
  clientScope?: 'own' | 'assigned' | 'all';
  departmentScope?: string[];
  emergencyOnly?: boolean;
}

export interface TimeRestriction {
  businessHoursOnly?: boolean;
  allowedHours?: string; // "09:00-17:00"
  allowedDays?: number[]; // 0-6, Sunday=0
  emergencyOverride?: boolean;
}

export interface LocationRestriction {
  allowedLocations?: string[];
  blockedLocations?: string[];
  requireSecureNetwork?: boolean;
}

export interface UserRole {
  userId: number;
  roleId: string;
  assignedBy: number;
  assignedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface AccessRequest {
  userId: number;
  resource: string;
  action: string;
  context?: AccessContext;
}

export interface AccessContext {
  patientId?: number;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
  emergencyAccess?: boolean;
}

export class RBACSystem {
  private static readonly HEALTHCARE_ROLES: Omit<Role, 'id' | 'permissions'>[] = [
    {
      name: 'Licensed Therapist',
      description: 'Licensed mental health professional with full clinical access',
      category: 'clinical',
      hipaaAccessLevel: 'full',
      emergencyOverride: true
    },
    {
      name: 'Administrative Assistant',
      description: 'Administrative support with limited patient data access',
      category: 'administrative',
      hipaaAccessLevel: 'limited',
      emergencyOverride: false
    },
    {
      name: 'Practice Manager',
      description: 'Practice management with full administrative access',
      category: 'administrative',
      hipaaAccessLevel: 'administrative',
      emergencyOverride: true
    },
    {
      name: 'Billing Specialist',
      description: 'Billing and insurance specialist with financial data access',
      category: 'administrative',
      hipaaAccessLevel: 'limited',
      emergencyOverride: false
    },
    {
      name: 'IT Administrator',
      description: 'Technical system administrator with system access',
      category: 'technical',
      hipaaAccessLevel: 'administrative',
      emergencyOverride: true
    },
    {
      name: 'Clinical Supervisor',
      description: 'Clinical supervision with oversight access to therapist activities',
      category: 'clinical',
      hipaaAccessLevel: 'full',
      emergencyOverride: true
    }
  ];

  private static readonly HEALTHCARE_PERMISSIONS: Omit<Permission, 'id'>[] = [
    // Clinical Permissions
    {
      name: 'client.full_access',
      resource: 'client',
      actions: ['create', 'read', 'update', 'delete'],
      description: 'Full access to client records and PHI'
    },
    {
      name: 'client.basic_access',
      resource: 'client',
      actions: ['read', 'update'],
      description: 'Basic client information access (demographics, contact)'
    },
    {
      name: 'session.clinical_access',
      resource: 'session',
      actions: ['create', 'read', 'update'],
      description: 'Clinical session management and documentation'
    },
    {
      name: 'notes.clinical_access',
      resource: 'notes',
      actions: ['create', 'read', 'update'],
      description: 'Clinical notes and treatment documentation'
    },
    {
      name: 'treatment_plan.full_access',
      resource: 'treatment_plan',
      actions: ['create', 'read', 'update', 'delete'],
      description: 'Treatment plan development and management'
    },

    // Administrative Permissions
    {
      name: 'scheduling.management',
      resource: 'scheduling',
      actions: ['create', 'read', 'update', 'delete'],
      description: 'Appointment scheduling and calendar management'
    },
    {
      name: 'billing.management',
      resource: 'billing',
      actions: ['create', 'read', 'update'],
      description: 'Billing, invoicing, and payment processing'
    },
    {
      name: 'insurance.management',
      resource: 'insurance',
      actions: ['read', 'update'],
      description: 'Insurance verification and claims management'
    },
    {
      name: 'reports.administrative',
      resource: 'reports',
      actions: ['read', 'export'],
      description: 'Administrative and operational reporting'
    },

    // Technical Permissions
    {
      name: 'system.administration',
      resource: 'system',
      actions: ['create', 'read', 'update', 'delete', 'configure'],
      description: 'System administration and configuration'
    },
    {
      name: 'audit.access',
      resource: 'audit',
      actions: ['read', 'export'],
      description: 'Audit log access and review'
    },
    {
      name: 'security.management',
      resource: 'security',
      actions: ['read', 'update', 'configure'],
      description: 'Security configuration and management'
    },

    // Emergency Permissions
    {
      name: 'emergency.access',
      resource: 'emergency',
      actions: ['override'],
      description: 'Emergency access override for patient care'
    }
  ];

  private static readonly ROLE_PERMISSION_MAPPINGS = {
    'Licensed Therapist': [
      'client.full_access',
      'session.clinical_access', 
      'notes.clinical_access',
      'treatment_plan.full_access',
      'scheduling.management',
      'billing.management',
      'emergency.access'
    ],
    'Administrative Assistant': [
      'client.basic_access',
      'scheduling.management',
      'billing.management',
      'insurance.management'
    ],
    'Practice Manager': [
      'client.full_access',
      'session.clinical_access',
      'scheduling.management',
      'billing.management',
      'insurance.management',
      'reports.administrative',
      'emergency.access'
    ],
    'Billing Specialist': [
      'client.basic_access',
      'billing.management',
      'insurance.management',
      'reports.administrative'
    ],
    'IT Administrator': [
      'system.administration',
      'audit.access',
      'security.management',
      'emergency.access'
    ],
    'Clinical Supervisor': [
      'client.full_access',
      'session.clinical_access',
      'notes.clinical_access',
      'treatment_plan.full_access',
      'reports.administrative',
      'emergency.access'
    ]
  };

  static async initializeHealthcareRoles(): Promise<string[]> {
    const roleIds: string[] = [];

    // Create permissions first
    const permissionMap = new Map<string, string>();
    
    for (const permissionData of this.HEALTHCARE_PERMISSIONS) {
      const [permission] = await db.insert(permissions).values({
        name: permissionData.name,
        resource: permissionData.resource,
        actions: permissionData.actions,
        description: permissionData.description
      }).returning();
      
      permissionMap.set(permissionData.name, permission.id);
    }

    // Create roles and assign permissions
    for (const roleData of this.HEALTHCARE_ROLES) {
      const [role] = await db.insert(roles).values({
        name: roleData.name,
        description: roleData.description,
        category: roleData.category,
        hipaa_access_level: roleData.hipaaAccessLevel,
        emergency_override: roleData.emergencyOverride
      }).returning();

      roleIds.push(role.id);

      // Assign permissions to role
      const rolePermissionNames = this.ROLE_PERMISSION_MAPPINGS[roleData.name as keyof typeof this.ROLE_PERMISSION_MAPPINGS] || [];
      
      for (const permissionName of rolePermissionNames) {
        const permissionId = permissionMap.get(permissionName);
        if (permissionId) {
          await db.insert(rolePermissions).values({
            role_id: role.id,
            permission_id: permissionId,
            conditions: this.getPermissionConditions(roleData, permissionName),
            time_restrictions: this.getTimeRestrictions(roleData, permissionName),
            location_restrictions: this.getLocationRestrictions(roleData, permissionName)
          });
        }
      }
    }

    return roleIds;
  }

  static async assignUserRole(
    userId: number, 
    roleId: string, 
    assignedBy: number,
    expiresAt?: Date
  ): Promise<void> {
    await db.insert(userRoles).values({
      user_id: userId,
      role_id: roleId,
      assigned_by: assignedBy,
      assigned_at: new Date(),
      expires_at: expiresAt,
      is_active: true
    }).onConflictDoUpdate({
      target: [userRoles.user_id, userRoles.role_id],
      set: {
        assigned_by: assignedBy,
        assigned_at: new Date(),
        expires_at: expiresAt,
        is_active: true
      }
    });

    // Log role assignment
    await auditLogger.logEvent({
      userId: assignedBy,
      action: AuditAction.UPDATE,
      resourceType: ResourceType.SYSTEM,
      resourceId: userId,
      success: true,
      additionalData: {
        targetUserId: userId,
        roleId,
        action: 'role_assignment',
        expiresAt: expiresAt?.toISOString()
      }
    });
  }

  static async revokeUserRole(
    userId: number, 
    roleId: string, 
    revokedBy: number
  ): Promise<void> {
    await db.update(userRoles)
      .set({ is_active: false })
      .where(and(
        eq(userRoles.user_id, userId),
        eq(userRoles.role_id, roleId)
      ));

    // Log role revocation
    await auditLogger.logEvent({
      userId: revokedBy,
      action: AuditAction.DELETE,
      resourceType: ResourceType.SYSTEM,
      resourceId: userId,
      success: true,
      additionalData: {
        targetUserId: userId,
        roleId,
        action: 'role_revocation'
      }
    });
  }

  static async checkAccess(request: AccessRequest): Promise<boolean> {
    const userRolesList = await this.getUserRoles(request.userId);
    
    for (const userRole of userRolesList) {
      if (!userRole.isActive || (userRole.expiresAt && userRole.expiresAt < new Date())) {
        continue;
      }

      const role = await this.getRole(userRole.roleId);
      if (!role) continue;

      for (const permission of role.permissions) {
        if (permission.resource === request.resource && 
            permission.actions.includes(request.action)) {
          
          // Check conditions
          if (permission.conditions && !this.checkConditions(permission.conditions, request.context)) {
            continue;
          }

          // Check time restrictions
          if (permission.timeRestrictions && !this.checkTimeRestrictions(permission.timeRestrictions, request.context)) {
            continue;
          }

          // Check location restrictions
          if (permission.locationRestrictions && !this.checkLocationRestrictions(permission.locationRestrictions, request.context)) {
            continue;
          }

          // Log successful access
          await auditLogger.logEvent({
            userId: request.userId,
            action: AuditAction.READ,
            resourceType: ResourceType.SYSTEM,
            success: true,
            additionalData: {
              accessRequest: {
                resource: request.resource,
                action: request.action,
                granted: true,
                roleUsed: role.name,
                permissionUsed: permission.name
              }
            }
          });

          return true;
        }
      }
    }

    // Log access denial
    await auditLogger.logEvent({
      userId: request.userId,
      action: AuditAction.READ,
      resourceType: ResourceType.SYSTEM,
      success: false,
      additionalData: {
        accessRequest: {
          resource: request.resource,
          action: request.action,
          granted: false,
          reason: 'insufficient_permissions'
        }
      }
    });

    return false;
  }

  static async getUserRoles(userId: number): Promise<UserRole[]> {
    const userRolesList = await db.select()
      .from(userRoles)
      .where(eq(userRoles.user_id, userId));

    return userRolesList.map(ur => ({
      userId: ur.user_id,
      roleId: ur.role_id,
      assignedBy: ur.assigned_by || 0,
      assignedAt: ur.assigned_at,
      expiresAt: ur.expires_at || undefined,
      isActive: ur.is_active
    }));
  }

  static async getRole(roleId: string): Promise<Role | null> {
    const role = await db.query.roles.findFirst({
      where: eq(roles.id, roleId)
    });

    if (!role) return null;

    const rolePermissionsList = await db.select({
      permission: permissions,
      conditions: rolePermissions.conditions,
      timeRestrictions: rolePermissions.time_restrictions,
      locationRestrictions: rolePermissions.location_restrictions
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permission_id, permissions.id))
    .where(eq(rolePermissions.role_id, roleId));

    const permissionsList: Permission[] = rolePermissionsList.map(rp => ({
      id: rp.permission.id,
      name: rp.permission.name,
      resource: rp.permission.resource,
      actions: rp.permission.actions,
      description: rp.permission.description || undefined,
      conditions: rp.conditions as AccessCondition || undefined,
      timeRestrictions: rp.timeRestrictions as TimeRestriction || undefined,
      locationRestrictions: rp.locationRestrictions as LocationRestriction || undefined
    }));

    return {
      id: role.id,
      name: role.name,
      description: role.description || undefined,
      category: role.category as any,
      hipaaAccessLevel: role.hipaa_access_level as any,
      emergencyOverride: role.emergency_override,
      permissions: permissionsList
    };
  }

  private static checkConditions(conditions: AccessCondition, context?: AccessContext): boolean {
    if (conditions.emergencyOnly && !context?.emergencyAccess) {
      return false;
    }

    // Add additional condition checks as needed
    return true;
  }

  private static checkTimeRestrictions(restrictions: TimeRestriction, context?: AccessContext): boolean {
    if (!context?.timestamp) return true;

    const now = context.timestamp;
    
    if (restrictions.businessHoursOnly) {
      const hour = now.getHours();
      const day = now.getDay();
      
      // Check business days (Monday-Friday)
      if (day === 0 || day === 6) { // Sunday or Saturday
        return restrictions.emergencyOverride || false;
      }
      
      // Check business hours (9 AM - 5 PM)
      if (hour < 9 || hour >= 17) {
        return restrictions.emergencyOverride || false;
      }
    }

    if (restrictions.allowedDays && !restrictions.allowedDays.includes(now.getDay())) {
      return restrictions.emergencyOverride || false;
    }

    return true;
  }

  private static checkLocationRestrictions(restrictions: LocationRestriction, context?: AccessContext): boolean {
    // For now, assume all locations are allowed
    // In production, implement IP-based location checking
    return true;
  }

  private static getPermissionConditions(role: any, permissionName: string): any {
    // Define role-specific conditions
    const conditions: any = {};

    if (role.category === 'clinical') {
      conditions.dataScope = ['clinical', 'administrative'];
      conditions.clientScope = role.name === 'Clinical Supervisor' ? 'all' : 'assigned';
    } else if (role.category === 'administrative') {
      conditions.dataScope = ['administrative', 'billing'];
      conditions.clientScope = role.name === 'Practice Manager' ? 'all' : 'assigned';
    }

    return Object.keys(conditions).length > 0 ? conditions : null;
  }

  private static getTimeRestrictions(role: any, permissionName: string): any {
    const restrictions: any = {};

    // Non-clinical roles have business hours restrictions
    if (role.category !== 'clinical' && role.category !== 'technical') {
      restrictions.businessHoursOnly = true;
      restrictions.emergencyOverride = role.emergencyOverride;
    }

    return Object.keys(restrictions).length > 0 ? restrictions : null;
  }

  private static getLocationRestrictions(role: any, permissionName: string): any {
    // Define location restrictions if needed
    return null;
  }
}