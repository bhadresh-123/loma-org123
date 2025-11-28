import { useLocalStorage } from '@/hooks/use-local-storage';
import { useCallback } from 'react';

export interface PracticeDetails {
  sessionFormat: string;
  location?: string;
  insuranceAccepted: string[];
  baseRate?: number;
  slidingScale: boolean;
  specialties: string[];
  identities: string[];
  defaultNoteFormat?: string;
}

const DEFAULT_PRACTICE_DETAILS: PracticeDetails = {
  sessionFormat: 'in_person',
  location: '',
  insuranceAccepted: [],
  baseRate: 0,
  slidingScale: false,
  specialties: [],
  identities: [],
  defaultNoteFormat: 'SOAP'
};

export function usePracticeDetails() {
  const [practiceDetails, setPracticeDetails] = useLocalStorage<PracticeDetails>(
    'practice_details',
    DEFAULT_PRACTICE_DETAILS
  );

  const updatePracticeDetails = useCallback(
    (newDetails: Partial<PracticeDetails>) => {
      setPracticeDetails(current => ({
        ...current,
        ...newDetails,
      }));
      return Promise.resolve({ success: true });
    },
    [setPracticeDetails]
  );

  return {
    practiceDetails,
    updatePracticeDetails,
  };
}
