import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ROLE_PRESETS } from '@/config/rolePresets';
import { OrganizationMember } from '@/types/organization';
import { 
  EllipsisVerticalIcon, 
  PencilIcon, 
  UserMinusIcon, 
  UserPlusIcon,
  EyeIcon,
  ShieldCheckIcon,
  CalendarIcon,
  CreditCardIcon,
  CogIcon
} from '@heroicons/react/24/outline';

interface StaffMemberCardProps {
  member: OrganizationMember;
  onEdit: (member: OrganizationMember) => void;
  onRemove: (member: OrganizationMember) => void;
  onViewPatients?: (member: OrganizationMember) => void;
  canEdit: boolean;
  isCurrentUser?: boolean;
}

export function StaffMemberCard({ 
  member, 
  onEdit, 
  onRemove, 
  onViewPatients,
  canEdit,
  isCurrentUser = false 
}: StaffMemberCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const rolePreset = ROLE_PRESETS[member.role];
  
  const getInitials = (name: string | undefined | null) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPermissionIcons = () => {
    const icons = [];
    
    if (member.canViewAllPatients) {
      icons.push(<EyeIcon key="patients" className="h-4 w-4 text-blue-500" title="Can view all patients" />);
    }
    
    if (member.canViewAllCalendars) {
      icons.push(<CalendarIcon key="calendars" className="h-4 w-4 text-green-500" title="Can view all calendars" />);
    }
    
    if (member.canManageBilling) {
      icons.push(<CreditCardIcon key="billing" className="h-4 w-4 text-purple-500" title="Can manage billing" />);
    }
    
    if (member.canManageStaff) {
      icons.push(<UserPlusIcon key="staff" className="h-4 w-4 text-orange-500" title="Can manage staff" />);
    }
    
    if (member.canManageSettings) {
      icons.push(<CogIcon key="settings" className="h-4 w-4 text-gray-500" title="Can manage settings" />);
    }
    
    return icons;
  };

  const getStatusBadge = () => {
    if (!member.isActive) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Inactive</Badge>;
    }
    
    if (member.isPrimaryOwner) {
      return <Badge variant="default" className="bg-purple-100 text-purple-800">Primary Owner</Badge>;
    }
    
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
  };

  return (
    <Card 
      className={`transition-all duration-200 ${isHovered ? 'shadow-md' : 'shadow-sm'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarImage src="" alt={member.userName} />
              <AvatarFallback className="bg-gray-100 text-gray-600">
                {getInitials(member.userName)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-gray-900 truncate">
                  {member.userName || 'Unknown User'}
                </h3>
                {member.isPrimaryOwner && (
                  <ShieldCheckIcon className="h-4 w-4 text-purple-500" title="Primary Owner" />
                )}
              </div>
              
              <p className="text-sm text-gray-500 truncate mb-2">
                {member.userEmail || 'No email'}
              </p>
              
              <div className="flex items-center gap-2 mb-2">
                <Badge className={rolePreset?.color || 'bg-gray-100 text-gray-800'}>
                  {rolePreset?.name || member.role}
                </Badge>
                {getStatusBadge()}
              </div>
              
              <div className="flex items-center gap-1">
                {getPermissionIcons()}
                {getPermissionIcons().length === 0 && (
                  <span className="text-xs text-gray-400">Basic permissions</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onViewPatients && member.canViewAllPatients && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewPatients(member)}
                className="text-blue-600 hover:text-blue-700"
              >
                <EyeIcon className="h-4 w-4" />
              </Button>
            )}
            
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <EllipsisVerticalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(member)}>
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Edit Permissions
                  </DropdownMenuItem>
                  
                  {!isCurrentUser && member.isActive && (
                    <DropdownMenuItem 
                      onClick={() => onRemove(member)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <UserMinusIcon className="h-4 w-4 mr-2" />
                      Deactivate
                    </DropdownMenuItem>
                  )}
                  
                  {!isCurrentUser && !member.isActive && (
                    <DropdownMenuItem onClick={() => onEdit(member)}>
                      <UserPlusIcon className="h-4 w-4 mr-2" />
                      Reactivate
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        
        {/* Employment Info */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              Started: {new Date(member.employmentStartDate).toLocaleDateString()}
            </span>
            {member.employmentEndDate && (
              <span>
                Ended: {new Date(member.employmentEndDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
