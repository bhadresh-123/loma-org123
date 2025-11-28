import { UseFormReturn } from 'react-hook-form';
import { ProfileFormData } from '../types/ProfileTypes';
import { ProfileLogger } from '../ProfileLogger';

export function useProfileForm(form: UseFormReturn<ProfileFormData>) {
  /**
   * Validate specific section of the form
   */
  const validateSection = async (section: keyof ProfileFormData): Promise<boolean> => {
    const startTime = ProfileLogger.startTiming(`validate_${section}`);
    
    try {
      const sectionData = form.getValues(section);
      const result = await form.trigger(section);
      
      if (!result) {
        const errors = form.formState.errors[section];
        ProfileLogger.logValidationError({
          section: section as string,
          field: 'section_validation',
          validationError: `Section validation failed: ${JSON.stringify(errors)}`,
          timestamp: new Date().toISOString(),
          sessionId: 'form-validation',
          userAgent: navigator.userAgent
        });
      }
      
      startTime();
      return result;
    } catch (error) {
      ProfileLogger.logError('form_validation_error', {
        error: error instanceof Error ? error.message : 'Unknown validation error',
        correlationId: ProfileLogger.generateCorrelationId(),
        timestamp: new Date().toISOString(),
        sessionId: 'form-validation',
        userAgent: navigator.userAgent
      });
      
      startTime();
      return false;
    }
  };

  /**
   * Get field-specific errors for display
   */
  const getFieldErrors = (fieldPath: string): string[] => {
    const errors = form.formState.errors;
    const fieldError = fieldPath.split('.').reduce((obj, key) => obj?.[key], errors as any);
    
    if (!fieldError) return [];
    
    if (typeof fieldError === 'object' && fieldError.message) {
      return [fieldError.message];
    }
    
    if (Array.isArray(fieldError)) {
      return fieldError.map(err => err?.message).filter(Boolean);
    }
    
    return [];
  };

  /**
   * Clear errors for specific field
   */
  const clearFieldErrors = (fieldPath: string) => {
    form.clearErrors(fieldPath as any);
  };

  /**
   * Watch specific field changes for real-time validation
   */
  const watchField = (fieldPath: string, callback?: (value: any) => void) => {
    return form.watch(fieldPath as any, callback);
  };

  /**
   * Set field value with validation
   */
  const setFieldValue = async (fieldPath: string, value: any, shouldValidate = true) => {
    form.setValue(fieldPath as any, value);
    
    if (shouldValidate) {
      await form.trigger(fieldPath as any);
    }
    
    ProfileLogger.logFormInteraction('field_change', {
      section: fieldPath.split('.')[0],
      field: fieldPath,
      value: typeof value === 'object' ? JSON.stringify(value) : value,
      validationPassed: !form.formState.errors[fieldPath.split('.')[0] as keyof ProfileFormData],
      timestamp: new Date().toISOString(),
      sessionId: 'form-interaction',
      userAgent: navigator.userAgent
    });
  };

  /**
   * Get form completion percentage
   */
  const getCompletionPercentage = (): number => {
    const values = form.getValues();
    const requiredFields = [
      'name', 'title', 'license', 'email', 'phone',
      'practiceDetails.address', 'practiceDetails.city', 'practiceDetails.state', 'practiceDetails.zipCode',
      'credentialing.ssn', 'credentialing.dateOfBirth', 'credentialing.npiNumber'
    ];
    
    const completedFields = requiredFields.filter(field => {
      const value = field.split('.').reduce((obj, key) => obj?.[key], values as any);
      return value && value.toString().trim() !== '';
    });
    
    return Math.round((completedFields.length / requiredFields.length) * 100);
  };

  /**
   * Check if section is complete
   */
  const isSectionComplete = (section: keyof ProfileFormData): boolean => {
    const sectionRequiredFields: Record<keyof ProfileFormData, string[]> = {
      name: ['name'],
      title: ['title'],
      license: ['license'],
      email: ['email'],
      phone: ['phone'],
      practiceDetails: ['address', 'city', 'state', 'zipCode', 'yearsOfExperience'],
      credentialing: ['ssn', 'dateOfBirth', 'birthCity', 'birthState', 'birthCountry', 'npiNumber', 'taxonomyCode'],
      lomaSettings: ['defaultNoteFormat', 'sessionDuration', 'timeZone'],
      insurance: []
    };
    
    const requiredFields = sectionRequiredFields[section] || [];
    const sectionData = form.getValues(section);
    
    return requiredFields.every(field => {
      const value = (sectionData as any)?.[field];
      return value !== undefined && value !== null && value.toString().trim() !== '';
    });
  };

  /**
   * Reset section to original values
   */
  const resetSection = (section: keyof ProfileFormData) => {
    const defaultValues = form.formState.defaultValues;
    if (defaultValues?.[section]) {
      form.setValue(section, defaultValues[section]);
    }
  };

  return {
    validateSection,
    getFieldErrors,
    clearFieldErrors,
    watchField,
    setFieldValue,
    getCompletionPercentage,
    isSectionComplete,
    resetSection
  };
}