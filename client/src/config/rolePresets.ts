import { RoleConfig } from '@/types/organization';

export const ROLE_PRESETS: Record<string, RoleConfig> = {
  business_owner: {
    name: 'Business Owner',
    description: 'Full access to all practice data and settings. Can manage staff, billing, and organization settings.',
    color: 'bg-purple-100 text-purple-800',
    defaultPermissions: {
      canViewAllPatients: true,
      canViewSelectedPatients: [],
      canViewAllCalendars: true,
      canViewSelectedCalendars: [],
      canManageBilling: true,
      canManageStaff: true,
      canManageSettings: true,
      canCreatePatients: true,
    }
  },
  admin: {
    name: 'Administrator',
    description: 'Limited management access. Can view selected patients and calendars, but cannot manage billing or staff.',
    color: 'bg-blue-100 text-blue-800',
    defaultPermissions: {
      canViewAllPatients: false,
      canViewSelectedPatients: [],
      canViewAllCalendars: false,
      canViewSelectedCalendars: [],
      canManageBilling: false,
      canManageStaff: false,
      canManageSettings: false,
      canCreatePatients: true,
    }
  },
  therapist: {
    name: 'Therapist',
    description: 'Clinical access only. Can view and manage own patients, create new patients, but cannot access other therapists\' data.',
    color: 'bg-green-100 text-green-800',
    defaultPermissions: {
      canViewAllPatients: false,
      canViewSelectedPatients: [],
      canViewAllCalendars: false,
      canViewSelectedCalendars: [],
      canManageBilling: false,
      canManageStaff: false,
      canManageSettings: false,
      canCreatePatients: true,
    }
  },
  contractor_1099: {
    name: 'Contractor (1099)',
    description: 'Independent contractor with same clinical access as therapist, but tracked separately for tax purposes.',
    color: 'bg-orange-100 text-orange-800',
    defaultPermissions: {
      canViewAllPatients: false,
      canViewSelectedPatients: [],
      canViewAllCalendars: false,
      canViewSelectedCalendars: [],
      canManageBilling: false,
      canManageStaff: false,
      canManageSettings: false,
      canCreatePatients: true,
    }
  }
};

export const ROLE_OPTIONS = Object.entries(ROLE_PRESETS).map(([key, config]) => ({
  value: key,
  label: config.name,
  description: config.description,
  color: config.color
}));

export const PERMISSION_DESCRIPTIONS = {
  canViewAllPatients: 'Can view all patients in the practice',
  canViewSelectedPatients: 'Can view patients assigned to specific therapists',
  canViewAllCalendars: 'Can view all therapists\' calendars',
  canViewSelectedCalendars: 'Can view calendars of specific therapists',
  canManageBilling: 'Can manage billing, payments, and financial settings',
  canManageStaff: 'Can add, remove, and manage staff members',
  canManageSettings: 'Can modify organization settings and preferences',
  canCreatePatients: 'Can create new patient records'
};

export const HIPAA_WARNINGS = {
  canViewAllPatients: '⚠️ Granting access to all patients provides broad PHI access. Ensure this is necessary for the role.',
  canManageBilling: '⚠️ Billing access includes financial information. Limit to trusted staff members.',
  canManageStaff: '⚠️ Staff management includes adding/removing users. This is a high-privilege permission.'
};
