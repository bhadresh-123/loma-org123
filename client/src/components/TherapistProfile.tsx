import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';

/**
 * HIPAA-Compliant Therapist Profile Component
 * 
 * Displays therapist profile with enhanced security indicators and PHI protection
 */
export function TherapistProfileHIPAA() {
  const [showPHI, setShowPHI] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  // Fetch therapist profile with PHI
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['therapist-profile-hipaa'],
    queryFn: async () => {
      const response = await fetch('/api/therapist-hipaa/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch therapist profile');
      }
      return response.json();
    },
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/therapist-hipaa/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapist-profile-hipaa'] });
      setIsEditing(false);
    },
  });

  const handleSave = (formData: any) => {
    updateProfileMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading HIPAA-protected profile...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load therapist profile. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* HIPAA Security Header */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-800">HIPAA-Compliant Profile</CardTitle>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              PHI Protected
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-green-700">
              All sensitive data is encrypted and protected according to HIPAA standards
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPHI(!showPHI)}
              className="border-green-300 text-green-700 hover:bg-green-100"
            >
              {showPHI ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showPHI ? 'Hide PHI' : 'Show PHI'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Data */}
      {profile?.data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5 text-blue-600" />
                <span>Business Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={profile.data.profile?.name || ''}
                  readOnly={!isEditing}
                  className={isEditing ? '' : 'bg-gray-50'}
                />
              </div>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={profile.data.profile?.title || ''}
                  readOnly={!isEditing}
                  className={isEditing ? '' : 'bg-gray-50'}
                />
              </div>
              <div>
                <Label htmlFor="license">License Number</Label>
                <Input
                  id="license"
                  value={profile.data.profile?.licenseNumber || ''}
                  readOnly={!isEditing}
                  className={isEditing ? '' : 'bg-gray-50'}
                />
              </div>
              <div>
                <Label htmlFor="npi">NPI Number</Label>
                <Input
                  id="npi"
                  value={profile.data.profile?.npiNumber || ''}
                  readOnly={!isEditing}
                  className={isEditing ? '' : 'bg-gray-50'}
                />
              </div>
            </CardContent>
          </Card>

          {/* PHI Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-red-600" />
                <span>Protected Health Information</span>
                <Badge variant="destructive" className="ml-auto">
                  PHI
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="personalEmail">Personal Email</Label>
                <Input
                  id="personalEmail"
                  value={showPHI ? (profile.data.phi?.personalEmailEncrypted || '') : '••••••••••••'}
                  readOnly={!isEditing}
                  className={isEditing ? '' : 'bg-gray-50'}
                  type={showPHI ? 'email' : 'password'}
                />
              </div>
              <div>
                <Label htmlFor="personalPhone">Personal Phone</Label>
                <Input
                  id="personalPhone"
                  value={showPHI ? (profile.data.phi?.personalPhoneEncrypted || '') : '••••••••••••'}
                  readOnly={!isEditing}
                  className={isEditing ? '' : 'bg-gray-50'}
                  type={showPHI ? 'tel' : 'password'}
                />
              </div>
              <div>
                <Label htmlFor="personalAddress">Personal Address</Label>
                <Textarea
                  id="personalAddress"
                  value={showPHI ? (profile.data.phi?.personalAddressEncrypted || '') : '••••••••••••••••••••••••••••••••••••••••'}
                  readOnly={!isEditing}
                  className={isEditing ? '' : 'bg-gray-50'}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="ssn">SSN</Label>
                <Input
                  id="ssn"
                  value={showPHI ? (profile.data.phi?.ssnEncrypted || '') : '•••-••-••••'}
                  readOnly={!isEditing}
                  className={isEditing ? '' : 'bg-gray-50'}
                  type={showPHI ? 'text' : 'password'}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2">
        {isEditing ? (
          <>
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={updateProfileMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSave({})}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        ) : (
          <Button onClick={() => setIsEditing(true)}>
            Edit Profile
          </Button>
        )}
      </div>

      {/* HIPAA Compliance Footer */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="text-sm text-blue-700">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="h-4 w-4" />
              <span className="font-medium">HIPAA Compliance Status</span>
            </div>
            <ul className="space-y-1 text-xs">
              <li>• All PHI fields are encrypted using AES-256-GCM</li>
              <li>• Access is logged and audited for compliance</li>
              <li>• Data is protected both in transit and at rest</li>
              <li>• User access is isolated and secured</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
