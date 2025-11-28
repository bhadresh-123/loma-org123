import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/hooks/use-toast';

interface InviteData {
  organizationName: string;
  role: string;
  email: string;
  expiresAt: string;
}

export default function InviteAcceptance() {
  const { token } = useParams<{ token: string }>();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInviteData();
    }
  }, [token]);

  const fetchInviteData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/organizations/invites/${token}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load invite');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setInviteData(data.data);
      } else {
        throw new Error('Invalid invite data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invite');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!isAuthenticated || !user) {
      // Redirect to login with return URL
      window.location.href = `/auth-page?redirect=/invite/${token}`;
      return;
    }

    try {
      setIsAccepting(true);
      const response = await fetch(`/api/organizations/invites/${token}/accept`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invite');
      }

      if (data.success) {
        setAccepted(true);
        toast({
          title: 'Success',
          description: 'You have successfully joined the organization!',
        });
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        throw new Error(data.error || 'Failed to accept invite');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to accept invite',
      });
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <ArrowPathIcon className="h-8 w-8 animate-spin text-primary" />
              <p className="text-gray-600">Loading invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircleIcon className="h-5 w-5" />
              Invalid Invitation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button onClick={() => window.location.href = '/'} variant="outline" className="w-full">
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <CheckCircleIcon className="h-16 w-16 text-green-500" />
              <h2 className="text-2xl font-bold text-gray-900">Invitation Accepted!</h2>
              <p className="text-gray-600 text-center">
                You have successfully joined {inviteData?.organizationName}.
              </p>
              <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rolePresets: Record<string, { name: string; color: string }> = {
    business_owner: { name: 'Business Owner', color: 'bg-purple-100 text-purple-800' },
    admin: { name: 'Administrator', color: 'bg-blue-100 text-blue-800' },
    therapist: { name: 'Therapist', color: 'bg-green-100 text-green-800' },
    contractor_1099: { name: 'Contractor', color: 'bg-orange-100 text-orange-800' },
  };

  const roleInfo = rolePresets[inviteData?.role || ''] || { name: inviteData?.role || 'Member', color: 'bg-gray-100 text-gray-800' };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            Organization Invitation
          </CardTitle>
          <CardDescription>
            You've been invited to join an organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-600">Organization:</span>
              <p className="text-lg font-semibold mt-1">{inviteData?.organizationName}</p>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-600">Role:</span>
              <div className="mt-1">
                <Badge className={roleInfo.color}>{roleInfo.name}</Badge>
              </div>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-600">Email:</span>
              <p className="text-sm text-gray-700 mt-1">{inviteData?.email}</p>
            </div>

            {inviteData?.expiresAt && (
              <div>
                <span className="text-sm font-medium text-gray-600">Expires:</span>
                <p className="text-sm text-gray-700 mt-1">
                  {new Date(inviteData.expiresAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {!isAuthenticated && (
            <Alert>
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertDescription>
                You need to be logged in to accept this invitation. You'll be redirected to the login page.
              </AlertDescription>
            </Alert>
          )}

          {isAuthenticated && user && user.email !== inviteData?.email && (
            <Alert variant="destructive">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertDescription>
                This invitation was sent to {inviteData?.email}, but you're logged in as {user.email}. 
                Please log in with the email address the invitation was sent to.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleAcceptInvite}
              disabled={isAccepting || (isAuthenticated && user?.email !== inviteData?.email)}
              className="flex-1"
            >
              {isAccepting ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

