import { ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePrimaryOrganization } from '@/hooks/use-organizations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldExclamationIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { Link } from 'wouter';

interface BusinessOwnerGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function BusinessOwnerGuard({ children, fallback }: BusinessOwnerGuardProps) {
  const { user, isLoading: userLoading } = useAuth();
  const { organization, membership, isLoading: orgLoading } = usePrimaryOrganization();

  // Show loading state
  if (userLoading || orgLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user has organization membership
  if (!organization || !membership) {
    return fallback || (
      <div className="container mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <ShieldExclamationIcon className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <CardTitle>Organization Required</CardTitle>
            <CardDescription>
              You need to be part of an organization to access practice management features.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Please contact your practice administrator to be added to the organization.
            </p>
            <Button asChild>
              <Link href="/profile">Go to Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user has staff management permissions
  const canManageStaff = membership.role === 'business_owner' || membership.canManageStaff;

  if (!canManageStaff) {
    return fallback || (
      <div className="container mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <UserGroupIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              Only practice administrators can access staff management features.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Your current role: <span className="font-medium">{membership.role || 'Unknown'}</span>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Contact your practice owner to request staff management permissions.
            </p>
            <Button asChild>
              <Link href="/">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User has permission, render children
  return <>{children}</>;
}

/**
 * Hook to check if current user can manage staff
 */
export function useCanManageStaff(): boolean {
  const { membership } = usePrimaryOrganization();
  
  if (!membership) {
    return false;
  }

  return membership.role === 'business_owner' || membership.canManageStaff;
}
