import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ExclamationCircleIcon, CheckCircleIcon, ClockIcon, CreditCardIcon, ShieldCheckIcon, ArrowTopRightOnSquareIcon, ArrowUpIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { ArrowPathIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { useLocation } from 'wouter';
import BusinessBankingTabs from '@/components/BusinessBankingTabs';

interface StripeConnectAccount {
  accountId: string;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  defaultCurrency: string;
  balance: {
    available: number;
    pending: number;
    lastUpdated: string;
  };
  recentTransactions: unknown[];
  pendingPayouts: unknown[];
}

interface GetConnectAccountResponse {
  success: boolean;
  hasAccount: boolean;
  accountId?: string;
  onboardingComplete?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  defaultCurrency?: string;
  balance?: {
    available: number;
    pending: number;
    lastUpdated: string;
  };
  recentTransactions?: unknown[];
  pendingPayouts?: unknown[];
  error?: string;
}

interface CreateConnectAccountResponse {
  success: boolean;
  accountId: string;
  accountLinkUrl: string;
  error?: string;
}

export default function BusinessBanking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const [connectAccount, setConnectAccount] = useState<StripeConnectAccount | null>(null);
  
  // Get URL parameters for onboarding flow
  const refresh = searchParams.get('refresh') === 'true';
  const success = searchParams.get('success') === 'true';
  
  // Show success message if returning from successful onboarding
  useEffect(() => {
    if (success) {
      toast({
        title: 'Success',
        description: 'Your business banking account has been set up successfully!',
        variant: 'default'
      });
      // Clean up URL parameters
      window.history.replaceState({}, '', '/business-banking');
    }
  }, [success, toast]);
  
  // Query to fetch Connect account status
  const { data: accountData, isLoading: isLoadingAccount, error: accountError, refetch } = useQuery<GetConnectAccountResponse>({
    queryKey: ['/api/connect/get-connect-account'],
    queryFn: async () => {
      const response = await fetch('/api/connect/get-connect-account');
      if (!response.ok) {
        // Handle 503 Service Unavailable specifically
        if (response.status === 503) {
          throw new Error('Service temporarily unavailable. Please try again in a few moments.');
        }
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch account' }));
        throw new Error(errorData.error || 'Failed to fetch account');
      }
      return response.json();
    },
    refetchInterval: connectAccount?.onboardingComplete ? 60000 : 10000,
    retry: 2,
    retryDelay: 1000,
  });
  
  // Mutation to create Connect account
  const { mutate: createConnectAccount, isPending: isCreatingAccount } = useMutation<CreateConnectAccountResponse>({
    mutationFn: async () => {
      const response = await fetch('/api/connect/create-connect-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create account');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.accountLinkUrl) {
        window.location.href = data.accountLinkUrl;
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create business account',
        variant: 'destructive'
      });
    }
  });
  
  // Mutation to continue onboarding
  const { mutate: continueOnboarding, isPending: isCreatingLink } = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/connect/create-account-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accountId: connectAccount?.accountId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create account link');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to continue onboarding',
        variant: 'destructive'
      });
    }
  });
  
  // Mutation to get dashboard link
  const { mutate: getDashboardLink, isPending: isGettingDashboardLink } = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/connect/dashboard-link');
      
      if (!response.ok) {
        throw new Error('Failed to get dashboard link');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get dashboard link',
        variant: 'destructive'
      });
    }
  });
  
  // Update connectAccount state when data changes
  useEffect(() => {
    if (accountData?.hasAccount && accountData.accountId) {
      setConnectAccount({
        accountId: accountData.accountId,
        onboardingComplete: accountData.onboardingComplete || false,
        chargesEnabled: accountData.chargesEnabled || false,
        payoutsEnabled: accountData.payoutsEnabled || false,
        defaultCurrency: accountData.defaultCurrency || 'usd',
        balance: accountData.balance || { available: 0, pending: 0, lastUpdated: new Date().toISOString() },
        recentTransactions: accountData.recentTransactions || [],
        pendingPayouts: accountData.pendingPayouts || []
      });
    } else {
      setConnectAccount(null);
    }
  }, [accountData]);
  
  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Loading state
  if (isLoadingAccount) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <ArrowPathIcon className="mx-auto h-8 w-8 animate-spin mb-4" />
            <h3 className="text-lg font-medium">Loading business banking...</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Checking your account status
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (accountError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <ExclamationCircleIcon className="h-4 w-4" />
          <AlertDescription>
            Failed to load business banking information. Please try refreshing the page.
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-4"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // No account - show onboarding
  if (!connectAccount) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <BuildingOfficeIcon className="mx-auto h-16 w-16 text-primary mb-4" />
            <h1 className="text-3xl font-bold mb-2">Business Banking</h1>
            <p className="text-lg text-muted-foreground">
              Set up your business bank account to receive payments directly
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 mr-2 text-green-600" />
                  Secure & Compliant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Bank-level security with PCI DSS compliance. Your financial data is protected 
                  with the same standards used by major financial institutions.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ArrowUpIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Direct Deposits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Receive client payments directly to your business account. No more waiting 
                  for transfers or dealing with third-party delays.
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle>Get Started with Business Banking</CardTitle>
              <CardDescription>
                Connect your business bank account in just a few minutes
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 mr-1 text-green-600" />
                    Secure Setup
                  </div>
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 mr-1 text-green-600" />
                    Instant Verification
                  </div>
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 mr-1 text-green-600" />
                    Same-Day Deposits
                  </div>
                </div>
                
                <Button 
                  size="lg" 
                  onClick={() => createConnectAccount()}
                  disabled={isCreatingAccount}
                  className="w-full max-w-xs"
                >
                  {isCreatingAccount ? (
                    <>
                      <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <CreditCardIcon className="mr-2 h-4 w-4" />
                      Set Up Business Banking
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  You'll be redirected to Stripe to complete the secure setup process
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // Account exists but onboarding not complete
  if (!connectAccount.onboardingComplete) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto">
          <Alert className="mb-6">
            <ClockIcon className="h-4 w-4" />
            <AlertDescription>
              Your business banking setup is in progress. Complete the remaining steps to start receiving payments.
            </AlertDescription>
          </Alert>
          
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Complete Your Setup</CardTitle>
              <CardDescription>
                Finish setting up your business banking account
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-medium text-yellow-800 mb-1">Setup Required</h4>
                  <p className="text-sm text-yellow-700">
                    Additional information is needed to activate your account
                  </p>
                </div>
                
                <Button 
                  size="lg" 
                  onClick={() => continueOnboarding()}
                  disabled={isCreatingLink}
                  className="w-full max-w-xs"
                >
                  {isCreatingLink ? (
                    <>
                      <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Continue Setup'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // Account fully set up - show dashboard
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Business Banking</h1>
          <p className="text-muted-foreground">Manage your business finances</p>
        </div>
        <Button 
          variant="outline"
          onClick={() => getDashboardLink()}
          disabled={isGettingDashboardLink}
        >
          {isGettingDashboardLink ? (
            <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
          )}
          Stripe Dashboard
        </Button>
      </div>
      
      <BusinessBankingTabs connectAccount={connectAccount} />
    </div>
  );
}