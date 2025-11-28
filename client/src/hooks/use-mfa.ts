/**
 * MFA Hook - Multi-Factor Authentication State Management
 * 
 * HIPAA 1.4.4 Compliance: Admin users must have MFA enabled
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface MFAStatus {
  enabled: boolean;
  setupRequired: boolean;
  gracePeriodEnds?: string;
}

interface MFASetupResponse {
  message: string;
  qrCodeUri: string;
  secret: string;
  recoveryCodes: string[];
}

export function useMFAStatus() {
  return useQuery<MFAStatus>({
    queryKey: ['/api/mfa/status'],
    queryFn: async () => {
      const res = await fetch('/api/mfa/status', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch MFA status');
      }
      return res.json();
    },
  });
}

export function useMFASetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation<MFASetupResponse, Error>({
    mutationFn: async () => {
      const res = await fetch('/api/mfa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to set up MFA');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mfa/status'] });
    },
    onError: (error) => {
      toast({
        title: 'MFA Setup Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useMFAVerify() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; message: string }, Error, { code: string }>({
    mutationFn: async ({ code }) => {
      const res = await fetch('/api/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Invalid verification code');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mfa/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: 'MFA Enabled',
        description: 'Multi-factor authentication has been enabled successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Verification Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useMFAAuthenticate() {
  const { toast } = useToast();

  return useMutation<
    { success: boolean; message: string },
    Error,
    { code: string; useRecoveryCode?: boolean }
  >({
    mutationFn: async ({ code, useRecoveryCode }) => {
      const res = await fetch('/api/mfa/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code, useRecoveryCode }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Invalid code');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Authenticated',
        description: 'MFA verification successful.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Authentication Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useMFADisable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; message: string }, Error, { code: string }>({
    mutationFn: async ({ code }) => {
      const res = await fetch('/api/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to disable MFA');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mfa/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: 'MFA Disabled',
        description: 'Multi-factor authentication has been disabled.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Disable Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useMFA() {
  const [showMFAPrompt, setShowMFAPrompt] = useState(false);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  
  const status = useMFAStatus();
  const setup = useMFASetup();
  const verify = useMFAVerify();
  const authenticate = useMFAAuthenticate();
  const disable = useMFADisable();

  return {
    // Status
    status: status.data,
    isLoading: status.isLoading,
    
    // Actions
    setupMFA: setup.mutate,
    verifyMFA: verify.mutate,
    authenticateMFA: authenticate.mutate,
    disableMFA: disable.mutate,
    
    // Setup response (QR code, recovery codes)
    setupResponse: setup.data,
    
    // UI state
    showMFAPrompt,
    setShowMFAPrompt,
    showRecoveryCodes,
    setShowRecoveryCodes,
    
    // Loading states
    isSettingUp: setup.isPending,
    isVerifying: verify.isPending,
    isAuthenticating: authenticate.isPending,
    isDisabling: disable.isPending,
  };
}

