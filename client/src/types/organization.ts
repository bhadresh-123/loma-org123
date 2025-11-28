export interface OrganizationMember {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  role: 'business_owner' | 'admin' | 'therapist' | 'contractor_1099';
  canViewAllPatients: boolean;
  canViewSelectedPatients: number[];
  canViewAllCalendars: boolean;
  canViewSelectedCalendars: number[];
  canManageBilling: boolean;
  canManageStaff: boolean;
  canManageSettings: boolean;
  canCreatePatients: boolean;
  employmentStartDate: string;
  employmentEndDate: string | null;
  isActive: boolean;
  isPrimaryOwner: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMembership {
  id: number;
  organizationId: number;
  userId: number;
  role: 'business_owner' | 'admin' | 'therapist' | 'contractor_1099';
  canViewAllPatients: boolean;
  canViewSelectedPatients: number[];
  canViewAllCalendars: boolean;
  canViewSelectedCalendars: number[];
  canManageBilling: boolean;
  canManageStaff: boolean;
  canManageSettings: boolean;
  canCreatePatients: boolean;
  employmentStartDate: string;
  employmentEndDate: string | null;
  isActive: boolean;
  isPrimaryOwner: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: number;
  name: string;
  type: 'solo' | 'partnership' | 'group_practice';
  organizationBusinessEinEncrypted?: string;
  organizationBusinessAddress?: string;
  organizationBusinessCity?: string;
  organizationBusinessState?: string;
  organizationBusinessZip?: string;
  organizationBusinessPhone?: string;
  organizationBusinessEmail?: string;
  defaultSessionDuration: number;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permissions {
  canViewAllPatients: boolean;
  canViewSelectedPatients: number[];
  canViewAllCalendars: boolean;
  canViewSelectedCalendars: number[];
  canManageBilling: boolean;
  canManageStaff: boolean;
  canManageSettings: boolean;
  canCreatePatients: boolean;
}

export interface RoleConfig {
  name: string;
  description: string;
  defaultPermissions: Permissions;
  color: string;
}

export interface AddMemberData {
  userId: number;
  role: 'business_owner' | 'admin' | 'therapist' | 'contractor_1099';
  canViewAllPatients?: boolean;
  canViewSelectedPatients?: number[];
  canViewAllCalendars?: boolean;
  canViewSelectedCalendars?: number[];
  canManageBilling?: boolean;
  canManageStaff?: boolean;
  canManageSettings?: boolean;
  canCreatePatients?: boolean;
  employmentStartDate?: string;
  isPrimaryOwner?: boolean;
}

export interface UpdateMemberData {
  role?: 'business_owner' | 'admin' | 'therapist' | 'contractor_1099';
  canViewAllPatients?: boolean;
  canViewSelectedPatients?: number[];
  canViewAllCalendars?: boolean;
  canViewSelectedCalendars?: number[];
  canManageBilling?: boolean;
  canManageStaff?: boolean;
  canManageSettings?: boolean;
  canCreatePatients?: boolean;
  isActive?: boolean;
  employmentEndDate?: string;
}

export interface AvailableTherapist {
  id: number;
  userId: number;
  name: string;
  professionalTitle?: string;
  licenseNumber?: string;
  specialties: string[];
  // NOTE: user email/username are intentionally NOT included for privacy/compliance
  // They are not needed for the therapist selection UI
  user?: {
    id: number;
    username?: string;
    email?: string;
  };
}
