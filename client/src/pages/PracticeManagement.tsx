import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BusinessOwnerGuard } from '@/components/guards/BusinessOwnerGuard';
import { StaffMemberCard } from '@/components/practice/StaffMemberCard';
import { AddMemberDialog } from '@/components/practice/AddMemberDialog';
import { EditMemberDialog } from '@/components/practice/EditMemberDialog';
import { useOrganizationMembers } from '@/hooks/use-organization-members';
import { usePrimaryOrganization } from '@/hooks/use-organizations';
import { OrganizationMember } from '@/types/organization';
import { 
  UserPlusIcon, 
  UsersIcon, 
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function PracticeManagement() {
  const { organization } = usePrimaryOrganization();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { 
    data: members = [], 
    isLoading, 
    error 
  } = useOrganizationMembers(organization?.id || 0);

  // Filter members based on search term
  const filteredMembers = members.filter(member =>
    member.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeMembers = filteredMembers.filter(m => m.isActive);
  const inactiveMembers = filteredMembers.filter(m => !m.isActive);

  const handleEditMember = (member: OrganizationMember) => {
    setSelectedMember(member);
    setShowEditDialog(true);
  };

  const handleRemoveMember = (member: OrganizationMember) => {
    setSelectedMember(member);
    setShowEditDialog(true);
  };

  const handleViewPatients = (member: OrganizationMember) => {
    // TODO: Navigate to patients view filtered by this member
    console.log('View patients for member:', member.userName);
  };

  const handleCloseEditDialog = () => {
    setShowEditDialog(false);
    setSelectedMember(null);
  };

  if (!organization) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            No organization found. Please contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <BusinessOwnerGuard>
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Practice Management</h1>
            <p className="text-gray-600 mt-2">
              Manage your team members, roles, and permissions
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <UserPlusIcon className="h-4 w-4 mr-2" />
            Add Team Member
          </Button>
        </div>

        {/* Practice Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BuildingOfficeIcon className="h-5 w-5" />
              {organization.name}
            </CardTitle>
            <CardDescription>
              {organization.type === 'solo' && 'Solo Practice'}
              {organization.type === 'partnership' && 'Partnership'}
              {organization.type === 'group_practice' && 'Group Practice'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {activeMembers.length} active member{activeMembers.length !== 1 ? 's' : ''}
                </span>
              </div>
              {inactiveMembers.length > 0 && (
                <Badge variant="secondary">
                  {inactiveMembers.length} inactive
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading team members...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert>
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertDescription>
              Failed to load team members: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Empty State */}
        {!isLoading && !error && members.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Members Yet</h3>
              <p className="text-gray-600 mb-6">
                You're currently the only member of your practice. Add team members to collaborate and share responsibilities.
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <UserPlusIcon className="h-4 w-4 mr-2" />
                Add Your First Team Member
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Active Members */}
        {!isLoading && !error && activeMembers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Team Members</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeMembers.map((member) => (
                <StaffMemberCard
                  key={member.id}
                  member={member}
                  onEdit={handleEditMember}
                  onRemove={handleRemoveMember}
                  onViewPatients={handleViewPatients}
                  canEdit={true}
                  isCurrentUser={false} // TODO: Check if this is current user
                />
              ))}
            </div>
          </div>
        )}

        {/* Inactive Members */}
        {!isLoading && !error && inactiveMembers.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Inactive Team Members</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {inactiveMembers.map((member) => (
                <StaffMemberCard
                  key={member.id}
                  member={member}
                  onEdit={handleEditMember}
                  onRemove={handleRemoveMember}
                  onViewPatients={handleViewPatients}
                  canEdit={true}
                  isCurrentUser={false} // TODO: Check if this is current user
                />
              ))}
            </div>
          </div>
        )}

        {/* Dialogs */}
        <AddMemberDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          organizationId={organization.id}
        />

        <EditMemberDialog
          open={showEditDialog}
          onOpenChange={handleCloseEditDialog}
          member={selectedMember}
          organizationId={organization.id}
          isCurrentUser={false} // TODO: Check if this is current user
        />
      </div>
    </BusinessOwnerGuard>
  );
}
