import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PermissionConfig } from './PermissionConfig';
import { useSendInvite } from '@/hooks/use-organization-members';
import { ROLE_PRESETS } from '@/config/rolePresets';
import { Permissions } from '@/types/organization';
import { UserPlusIcon } from '@heroicons/react/24/outline';

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: number;
}

export function AddMemberDialog({ open, onOpenChange, organizationId }: AddMemberDialogProps) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState<string>('');
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

  const sendInviteMutation = useSendInvite();

  const handleNext = () => {
    if (step === 1 && email && role) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!email || !role) return;

    try {
      await sendInviteMutation.mutateAsync({
        organizationId,
        email,
        role,
        permissions,
      });
      
      // Reset form and close dialog
      setStep(1);
      setEmail('');
      setRole('');
      setPermissions({
        canViewAllPatients: false,
        canViewSelectedPatients: [],
        canViewAllCalendars: false,
        canViewSelectedCalendars: [],
        canManageBilling: false,
        canManageStaff: false,
        canManageSettings: false,
        canCreatePatients: true,
      });
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleCancel = () => {
    setStep(1);
    setEmail('');
    setRole('');
    setPermissions({
      canViewAllPatients: false,
      canViewSelectedPatients: [],
      canViewAllCalendars: false,
      canViewSelectedCalendars: [],
      canManageBilling: false,
      canManageStaff: false,
      canManageSettings: false,
      canCreatePatients: true,
    });
    onOpenChange(false);
  };

  const rolePreset = ROLE_PRESETS[role];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlusIcon className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new therapist or staff member to your practice.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invite Team Member</CardTitle>
                <CardDescription>
                  Enter the email address of the therapist you want to invite. They will receive an email with instructions to join your practice.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-input">Email Address</Label>
                  <Input
                    id="email-input"
                    type="email"
                    placeholder="therapist@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    An invitation email will be sent to this address.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role-select">Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
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

                {rolePreset && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{rolePreset.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                onClick={handleNext}
                disabled={!email || !role}
              >
                Next: Configure Permissions
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invite Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Email:</span>
                    <span className="ml-2">{email}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Role:</span>
                    <Badge className={rolePreset?.color || 'bg-gray-100 text-gray-800 ml-2'}>
                      {rolePreset?.name || role}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <PermissionConfig
              permissions={permissions}
              onPermissionsChange={setPermissions}
              role={role}
              onRoleChange={setRole}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={sendInviteMutation.isPending}
              >
                {sendInviteMutation.isPending ? 'Sending Invite...' : 'Send Invitation'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
