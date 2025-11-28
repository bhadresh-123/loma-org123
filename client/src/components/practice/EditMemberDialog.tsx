import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PermissionConfig } from './PermissionConfig';
import { useUpdateMember, useRemoveMember } from '@/hooks/use-organization-members';
import { ROLE_PRESETS } from '@/config/rolePresets';
import { OrganizationMember, UpdateMemberData, Permissions } from '@/types/organization';
import { PencilIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: OrganizationMember | null;
  organizationId: number;
  isCurrentUser?: boolean;
}

export function EditMemberDialog({ 
  open, 
  onOpenChange, 
  member, 
  organizationId,
  isCurrentUser = false 
}: EditMemberDialogProps) {
  const [role, setRole] = useState<string>('');
  const [permissions, setPermissions] = useState<Permissions>({
    canViewAllPatients: false,
    canViewSelectedPatients: [],
    canViewAllCalendars: false,
    canViewSelectedCalendars: [],
    canManageBilling: false,
    canManageStaff: false,
    canManageSettings: false,
    canCreatePatients: true,
  });
  const [isActive, setIsActive] = useState(true);

  const updateMemberMutation = useUpdateMember();
  const removeMemberMutation = useRemoveMember();

  // Initialize form when member changes
  useEffect(() => {
    if (member) {
      setRole(member.role);
      setPermissions({
        canViewAllPatients: member.canViewAllPatients,
        canViewSelectedPatients: member.canViewSelectedPatients,
        canViewAllCalendars: member.canViewAllCalendars,
        canViewSelectedCalendars: member.canViewSelectedCalendars,
        canManageBilling: member.canManageBilling,
        canManageStaff: member.canManageStaff,
        canManageSettings: member.canManageSettings,
        canCreatePatients: member.canCreatePatients,
      });
      setIsActive(member.isActive);
    }
  }, [member]);

  const handleSubmit = async () => {
    if (!member) return;

    const updateData: UpdateMemberData = {
      role: role as any,
      ...permissions,
      isActive,
    };

    try {
      await updateMemberMutation.mutateAsync({
        organizationId,
        memberId: member.id,
        updateData,
      });
      
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleRemove = async () => {
    if (!member) return;

    try {
      await removeMemberMutation.mutateAsync({
        organizationId,
        memberId: member.id,
      });
      
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const rolePreset = ROLE_PRESETS[role];
  const hasChanges = member && (
    role !== member.role ||
    JSON.stringify(permissions) !== JSON.stringify({
      canViewAllPatients: member.canViewAllPatients,
      canViewSelectedPatients: member.canViewSelectedPatients,
      canViewAllCalendars: member.canViewAllCalendars,
      canViewSelectedCalendars: member.canViewSelectedCalendars,
      canManageBilling: member.canManageBilling,
      canManageStaff: member.canManageStaff,
      canManageSettings: member.canManageSettings,
      canCreatePatients: member.canCreatePatients,
    }) ||
    isActive !== member.isActive
  );

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PencilIcon className="h-5 w-5" />
            Edit Team Member
          </DialogTitle>
          <DialogDescription>
            Update {member.userName}'s role and permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Member Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Team Member</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {member.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{member.userName}</h3>
                  <p className="text-sm text-gray-500">{member.userEmail}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={rolePreset?.color || 'bg-gray-100 text-gray-800'}>
                    {rolePreset?.name || role}
                  </Badge>
                  <Badge variant={isActive ? "default" : "secondary"}>
                    {isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Restrictions for current user */}
          {isCurrentUser && (
            <Alert>
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> You cannot modify your own permissions to prevent account lockout. 
                Ask another business owner to make changes for you.
              </AlertDescription>
            </Alert>
          )}

          {/* Primary owner restrictions */}
          {member.isPrimaryOwner && (
            <Alert>
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertDescription>
                <strong>Primary Owner:</strong> This member is the primary owner of the practice. 
                Some restrictions may apply to prevent accidental lockout.
              </AlertDescription>
            </Alert>
          )}

          {/* Permission Configuration */}
          <PermissionConfig
            permissions={permissions}
            onPermissionsChange={setPermissions}
            role={role}
            onRoleChange={setRole}
            disabled={isCurrentUser}
          />

          {/* Action Buttons */}
          <div className="flex justify-between">
            <div>
              {!isCurrentUser && member.isActive && (
                <Button
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={removeMemberMutation.isPending}
                >
                  {removeMemberMutation.isPending ? 'Deactivating...' : 'Deactivate Member'}
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!hasChanges || updateMemberMutation.isPending || isCurrentUser}
              >
                {updateMemberMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
