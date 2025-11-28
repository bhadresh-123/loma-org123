import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ROLE_PRESETS, PERMISSION_DESCRIPTIONS, HIPAA_WARNINGS } from '@/config/rolePresets';
import { Permissions } from '@/types/organization';
import { ShieldExclamationIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface PermissionConfigProps {
  permissions: Permissions;
  onPermissionsChange: (permissions: Permissions) => void;
  role: string;
  onRoleChange: (role: string) => void;
  availableTherapists?: Array<{ id: number; name: string }>;
  disabled?: boolean;
}

export function PermissionConfig({ 
  permissions, 
  onPermissionsChange, 
  role, 
  onRoleChange,
  availableTherapists = [],
  disabled = false 
}: PermissionConfigProps) {
  const [useCustomPermissions, setUseCustomPermissions] = useState(false);

  // Apply role preset when role changes
  useEffect(() => {
    if (role && !useCustomPermissions) {
      const preset = ROLE_PRESETS[role];
      if (preset) {
        onPermissionsChange(preset.defaultPermissions);
      }
    }
  }, [role, useCustomPermissions, onPermissionsChange]);

  const handlePermissionChange = (key: keyof Permissions, value: boolean | number[]) => {
    onPermissionsChange({
      ...permissions,
      [key]: value
    });
  };

  const handleRoleChange = (newRole: string) => {
    onRoleChange(newRole);
    setUseCustomPermissions(false);
  };

  const currentPreset = ROLE_PRESETS[role];
  const hasHighRiskPermissions = permissions.canViewAllPatients || 
                                permissions.canManageBilling || 
                                permissions.canManageStaff;

  return (
    <div className="space-y-6">
      {/* Role Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Role Assignment</CardTitle>
          <CardDescription>
            Select a role for this team member. Each role has predefined permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role-select">Role</Label>
            <Select value={role} onValueChange={handleRoleChange} disabled={disabled}>
              <SelectTrigger id="role-select">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_PRESETS).map(([key, preset]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Badge className={preset.color}>{preset.name}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currentPreset && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{currentPreset.description}</p>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="custom-permissions" 
              checked={useCustomPermissions}
              onCheckedChange={setUseCustomPermissions}
              disabled={disabled}
            />
            <Label htmlFor="custom-permissions" className="text-sm">
              Use custom permissions instead of role preset
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* HIPAA Warning */}
      {hasHighRiskPermissions && (
        <Alert>
          <ShieldExclamationIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>HIPAA Compliance Notice:</strong> This role includes high-privilege permissions. 
            Ensure this access is necessary and document the business justification.
          </AlertDescription>
        </Alert>
      )}

      {/* Permission Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Permissions</CardTitle>
          <CardDescription>
            Configure what this team member can access and manage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Patient Access */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-900">Patient Access</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="view-all-patients" className="text-sm font-medium">
                    View All Patients
                  </Label>
                  <p className="text-xs text-gray-500">
                    {PERMISSION_DESCRIPTIONS.canViewAllPatients}
                  </p>
                  {permissions.canViewAllPatients && (
                    <p className="text-xs text-amber-600">
                      {HIPAA_WARNINGS.canViewAllPatients}
                    </p>
                  )}
                </div>
                <Switch
                  id="view-all-patients"
                  checked={permissions.canViewAllPatients}
                  onCheckedChange={(checked) => handlePermissionChange('canViewAllPatients', checked)}
                  disabled={disabled || !useCustomPermissions}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="create-patients" className="text-sm font-medium">
                    Create Patients
                  </Label>
                  <p className="text-xs text-gray-500">
                    {PERMISSION_DESCRIPTIONS.canCreatePatients}
                  </p>
                </div>
                <Switch
                  id="create-patients"
                  checked={permissions.canCreatePatients}
                  onCheckedChange={(checked) => handlePermissionChange('canCreatePatients', checked)}
                  disabled={disabled || !useCustomPermissions}
                />
              </div>
            </div>
          </div>

          {/* Calendar Access */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-900">Calendar Access</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="view-all-calendars" className="text-sm font-medium">
                    View All Calendars
                  </Label>
                  <p className="text-xs text-gray-500">
                    {PERMISSION_DESCRIPTIONS.canViewAllCalendars}
                  </p>
                </div>
                <Switch
                  id="view-all-calendars"
                  checked={permissions.canViewAllCalendars}
                  onCheckedChange={(checked) => handlePermissionChange('canViewAllCalendars', checked)}
                  disabled={disabled || !useCustomPermissions}
                />
              </div>
            </div>
          </div>

          {/* Management Permissions */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-900">Management Permissions</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="manage-billing" className="text-sm font-medium">
                    Manage Billing
                  </Label>
                  <p className="text-xs text-gray-500">
                    {PERMISSION_DESCRIPTIONS.canManageBilling}
                  </p>
                  {permissions.canManageBilling && (
                    <p className="text-xs text-amber-600">
                      {HIPAA_WARNINGS.canManageBilling}
                    </p>
                  )}
                </div>
                <Switch
                  id="manage-billing"
                  checked={permissions.canManageBilling}
                  onCheckedChange={(checked) => handlePermissionChange('canManageBilling', checked)}
                  disabled={disabled || !useCustomPermissions}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="manage-staff" className="text-sm font-medium">
                    Manage Staff
                  </Label>
                  <p className="text-xs text-gray-500">
                    {PERMISSION_DESCRIPTIONS.canManageStaff}
                  </p>
                  {permissions.canManageStaff && (
                    <p className="text-xs text-amber-600">
                      {HIPAA_WARNINGS.canManageStaff}
                    </p>
                  )}
                </div>
                <Switch
                  id="manage-staff"
                  checked={permissions.canManageStaff}
                  onCheckedChange={(checked) => handlePermissionChange('canManageStaff', checked)}
                  disabled={disabled || !useCustomPermissions}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="manage-settings" className="text-sm font-medium">
                    Manage Settings
                  </Label>
                  <p className="text-xs text-gray-500">
                    {PERMISSION_DESCRIPTIONS.canManageSettings}
                  </p>
                </div>
                <Switch
                  id="manage-settings"
                  checked={permissions.canManageSettings}
                  onCheckedChange={(checked) => handlePermissionChange('canManageSettings', checked)}
                  disabled={disabled || !useCustomPermissions}
                />
              </div>
            </div>
          </div>

          {/* Info Notice */}
          <Alert>
            <InformationCircleIcon className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Selected permissions will be applied immediately. 
              Changes are logged for HIPAA compliance.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
