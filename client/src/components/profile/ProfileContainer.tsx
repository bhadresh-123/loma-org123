import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ProfileFormData, profileFormSchema } from './types/ProfileTypes';
import { ProfileErrorBoundary } from './ProfileErrorBoundary';
import { ProfileLogger } from './ProfileLogger';
import { useProfileForm } from './hooks/useProfileForm';
import { useProfile } from '@/hooks/useProfile';
import {
  BasicInfoSection,
  PracticeDetailsSection,
  CredentialingSection,
  LomaSettingsSection,
  InsuranceSection,
} from './sections';
import { UserIcon, ShieldCheckIcon, DocumentTextIcon, CreditCardIcon, CogIcon } from '@heroicons/react/24/outline';
import { safeString, safeNumber, safeBoolean, safeArray } from '@/utils/formHelpers';

interface ProfileContainerProps {
  userId?: number;
  sessionId: string;
}

export function ProfileContainer({ userId, sessionId }: ProfileContainerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<string>('basic');

  // Fetch user profile data using the consolidated hook
  const { data: profile, isLoading, error } = useProfile();

  // Initialize form with profile data
  // Using consistent empty defaults to prevent uncontrolled-to-controlled warnings
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      title: '',
      license: '',
      email: '',
      phone: '',
      practiceDetails: {
        practiceName: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        gender: '',
        race: '',
        personalPhone: '',
        personalEmail: '',
        yearsOfExperience: 0,
        sessionFormat: 'in_person',
        baseRate: 0,
        slidingScale: false,
        languages: [],
        therapistIdentities: [],
        specialties: [],
        biography: '',
        qualifications: '',
      },
      credentialing: {
        ssn: '',
        dateOfBirth: '',
        birthCity: '',
        birthState: '',
        birthCountry: '',
        isUsCitizen: false,
        workPermitVisa: '',
        npiNumber: '',
        taxonomyCode: '',
        einNumber: '',
        legalBusinessName: '',
      },
      lomaSettings: {
        defaultNoteFormat: 'SOAP',
        sessionDuration: 50,
        timeZone: 'America/Chicago',
      },
      insurance: {
        acceptedProviders: [],
        isInsuranceProvider: false,
      },
    },
  });

  const profileFormHooks = useProfileForm(form);

  // Update form when profile data loads
  useEffect(() => {
    if (profile) {
      // Transform flat profile data to nested form structure
      // Using safe coercion functions to prevent null/undefined React warnings
      const formData: ProfileFormData = {
        name: safeString(profile.name),
        title: safeString(profile.title),
        license: safeString(profile.licenseNumber),
        email: safeString(profile.email),
        phone: safeString(profile.phone),
        practiceDetails: {
          practiceName: safeString(profile.practiceName),
          address: safeString(profile.addressEncrypted),
          city: safeString(profile.city),
          state: safeString(profile.state),
          zipCode: safeString(profile.zipCode),
          gender: safeString(profile.gender),
          race: safeString(profile.race),
          personalPhone: safeString(profile.personalPhone),
          personalEmail: safeString(profile.personalEmail),
          yearsOfExperience: safeNumber(profile.yearsOfExperience, 0),
          sessionFormat: (profile.sessionFormat as 'in_person' | 'online' | 'hybrid') || 'in_person',
          baseRate: safeNumber(profile.baseRate, 0),
          slidingScale: safeBoolean(profile.slidingScale, false),
          languages: safeArray(profile.languages),
          therapistIdentities: safeArray(profile.therapistIdentities),
          specialties: safeArray(profile.specialties),
          biography: safeString(profile.biography),
          qualifications: safeString(profile.qualifications),
        },
        credentialing: {
          ssn: safeString(profile.ssnEncrypted),
          dateOfBirth: safeString(profile.dateOfBirthEncrypted),
          birthCity: safeString(profile.birthCityEncrypted),
          birthState: safeString(profile.birthStateEncrypted),
          birthCountry: safeString(profile.birthCountryEncrypted),
          isUsCitizen: safeBoolean(profile.isUsCitizen, false),
          workPermitVisa: safeString(profile.workPermitVisa),
          npiNumber: safeString(profile.npiNumber),
          taxonomyCode: safeString(profile.taxonomyCode),
          einNumber: safeString(profile.einNumber),
          legalBusinessName: safeString(profile.legalBusinessName),
        },
        lomaSettings: {
          defaultNoteFormat: (profile.defaultNoteFormat as 'SOAP' | 'DAP' | 'FIRP' | 'GIRP' | 'BIRP') || 'SOAP',
          sessionDuration: safeNumber(profile.sessionDuration, 50),
          timeZone: safeString(profile.timeZone) || 'America/Chicago',
        },
        insurance: {
          acceptedProviders: safeArray(profile.acceptedProviders),
          isInsuranceProvider: safeBoolean(profile.isInsuranceProvider, false),
        },
      };
      
      form.reset(formData);
    }
  }, [profile, form]);

  // Save profile mutation - using the proper hook
  const saveProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      ProfileLogger.logUserAction({
        userId,
        sessionId,
        section: activeSection,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      });

      // Transform nested form data to flat structure for API
      const flatData = {
        name: data.name,
        title: data.title,
        license: data.license,
        email: data.email,
        phone: data.phone,
        // Practice details
        practiceName: data.practiceDetails?.practiceName,
        addressEncrypted: data.practiceDetails?.address,
        city: data.practiceDetails?.city,
        state: data.practiceDetails?.state,
        zipCode: data.practiceDetails?.zipCode,
        yearsOfExperience: data.practiceDetails?.yearsOfExperience,
        sessionFormat: data.practiceDetails?.sessionFormat,
        baseRate: data.practiceDetails?.baseRate,
        slidingScale: data.practiceDetails?.slidingScale,
        languages: data.practiceDetails?.languages,
        therapistIdentities: data.practiceDetails?.therapistIdentities,
        specialties: data.practiceDetails?.specialties,
        biography: data.practiceDetails?.biography,
        qualifications: data.practiceDetails?.qualifications,
        // Credentialing
        ssnEncrypted: data.credentialing?.ssn,
        dateOfBirthEncrypted: data.credentialing?.dateOfBirth,
        birthCityEncrypted: data.credentialing?.birthCity,
        birthStateEncrypted: data.credentialing?.birthState,
        birthCountryEncrypted: data.credentialing?.birthCountry,
        npiNumber: data.credentialing?.npiNumber,
        taxonomyCode: data.credentialing?.taxonomyCode,
        // LOMA Settings
        defaultNoteFormat: data.lomaSettings?.defaultNoteFormat,
        sessionDuration: data.lomaSettings?.sessionDuration,
        timeZone: data.lomaSettings?.timeZone,
        // Insurance
        acceptedProviders: data.insurance?.acceptedProviders,
        isInsuranceProvider: data.insurance?.isInsuranceProvider,
      };

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flatData),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
    },
    onError: (error) => {
      ProfileLogger.logError({
        correlationId: `profile-save-${Date.now()}`,
        section: activeSection,
        message: error.message,
        recoverable: true,
      });
      toast({
        title: 'Save Failed',
        description: 'Failed to save profile. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    console.log('[FRONTEND] Profile save triggered with data:', {
      topLevel: {
        name: data.name,
        title: data.title,
        license: data.license,
        email: data.email,
        phone: data.phone
      },
      practiceDetails: data.practiceDetails ? 'present' : 'missing',
      credentialing: data.credentialing ? 'present' : 'missing',
      lomaSettings: data.lomaSettings ? 'present' : 'missing',
      insurance: data.insurance ? 'present' : 'missing'
    });
    saveProfileMutation.mutate(data);
  };

  const completionPercentage = profileFormHooks.getCompletionPercentage();

  const sections = [
    {
      id: 'basic',
      title: 'Basic Information',
      icon: UserIcon,
      component: BasicInfoSection,
    },
    {
      id: 'practice',
      title: 'Practice Details',
      icon: DocumentTextIcon,
      component: PracticeDetailsSection,
    },
    {
      id: 'credentialing',
      title: 'Credentialing',
      icon: ShieldCheckIcon,
      component: CredentialingSection,
    },
    {
      id: 'settings',
      title: 'LOMA Settings',
      icon: CogIcon,
      component: LomaSettingsSection,
    },
    {
      id: 'insurance',
      title: 'Insurance',
      icon: CreditCardIcon,
      component: InsuranceSection,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading profile...</p>
          <p className="mt-1 text-xs text-muted-foreground">This may take a few moments</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isTimeout = error.message?.includes('timeout');
    const isAuthError = error.message?.includes('Authentication required');
    const isServerError = error.message?.includes('Server error');
    
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="mb-4">
              {isTimeout && (
                <>
                  <div className="text-red-600 text-lg mb-2">⏱️ Loading Timeout</div>
                  <p className="text-sm text-muted-foreground mb-2">
                    The profile is taking too long to load. This might be due to database issues.
                  </p>
                </>
              )}
              {isAuthError && (
                <>
                  <div className="text-red-600 text-lg mb-2">🔒 Authentication Required</div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Please log in again to access your profile.
                  </p>
                </>
              )}
              {isServerError && (
                <>
                  <div className="text-red-600 text-lg mb-2">⚠️ Server Error</div>
                  <p className="text-sm text-muted-foreground mb-2">
                    There's a temporary server issue. Please try again in a few moments.
                  </p>
                </>
              )}
              {!isTimeout && !isAuthError && !isServerError && (
                <>
                  <div className="text-red-600 text-lg mb-2">❌ Failed to Load Profile</div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {error.message || 'An unexpected error occurred'}
                  </p>
                </>
              )}
            </div>
            
            <div className="space-y-2">
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['profile'] })}
                className="w-full"
              >
                🔄 Try Again
              </Button>
              
              {isAuthError && (
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/auth-page'}
                  className="w-full"
                >
                  🔑 Go to Login
                </Button>
              )}
              
              {isTimeout && (
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  🔄 Refresh Page
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ActiveSectionComponent = sections.find(s => s.id === activeSection)?.component;

  return (
    <ProfileErrorBoundary userId={userId} sessionId={sessionId}>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your professional profile and preferences</p>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Profile Completion</span>
              <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            {sections.map((section) => {
              const Icon = section.icon;
              const isComplete = profileFormHooks.isSectionComplete(section.id as keyof ProfileFormData);
              return (
                <TabsTrigger 
                  key={section.id} 
                  value={section.id}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{section.title}</span>
                  {isComplete && (
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="mt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {sections.map((section) => {
                  const Component = section.component;
                  return (
                    <TabsContent key={section.id} value={section.id}>
                      <Component
                        form={form}
                        isLoading={saveProfileMutation.isPending}
                        onSaveComplete={() => {
                          // Save completed, edit state handled in individual sections
                        }}
                        onSubmit={onSubmit}
                      />
                    </TabsContent>
                  );
                })}


              </form>
            </Form>
          </div>
        </Tabs>
      </div>
    </ProfileErrorBoundary>
  );
}