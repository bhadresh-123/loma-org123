import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIValidationService, ValidationResult, ValidationOptions } from '../../services/AIValidationService';
import { secureAIService } from '../../services/SecureAIService';
import { HIPAAAuditService } from '../../services/HIPAAService';
import { z } from 'zod';

/**
 * AI Validation Service Unit Tests
 * 
 * Comprehensive tests for AI content validation, hallucination prevention,
 * confidence scoring, and PHI protection in AI responses
 */

// Mock dependencies
vi.mock('../../services/SecureAIService', () => ({
  secureAIService: {
    generateTextWithValidation: vi.fn()
  }
}));

vi.mock('../../services/HIPAAService', () => ({
  HIPAAAuditService: {
    logPHIAccess: vi.fn()
  }
}));

describe('AIValidationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset circuit breaker state
    (AIValidationService as any).failureCount = 0;
    (AIValidationService as any).lastFailureTime = 0;
    (AIValidationService as any).circuitBreakerState = 'CLOSED';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateAIResponse', () => {
    const testSchema = z.object({
      title: z.string(),
      description: z.string(),
      priority: z.enum(['low', 'medium', 'high']),
      dueDate: z.string().optional()
    });

    const testOptions: ValidationOptions = {
      schema: testSchema,
      maxRetries: 3,
      confidenceThreshold: 0.8,
      enableContentVerification: false,
      auditContext: {
        userId: 1,
        action: 'AI_VALIDATION',
        resourceType: 'TREATMENT_PLAN'
      }
    };

    it('should validate successful AI response', async () => {
      const prompt = 'Create a treatment plan for anxiety';
      const mockAIResponse = {
        text: JSON.stringify({
          title: 'Anxiety Treatment Plan',
          description: 'Comprehensive plan for managing anxiety symptoms',
          priority: 'high',
          dueDate: '2025-02-01'
        }),
        confidence: 0.9,
        requiresHumanReview: false,
        warnings: []
      };

      vi.mocked(secureAIService.generateTextWithValidation).mockResolvedValue(mockAIResponse);

      const result = await AIValidationService.validateAIResponse(prompt, testOptions);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        title: 'Anxiety Treatment Plan',
        description: 'Comprehensive plan for managing anxiety symptoms',
        priority: 'high',
        dueDate: '2025-02-01'
      });
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.requiresHumanReview).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle schema validation errors', async () => {
      const prompt = 'Create a treatment plan';
      const mockAIResponse = {
        text: JSON.stringify({
          title: 'Invalid Plan',
          description: 'Missing required fields',
          priority: 'invalid_priority' // Invalid enum value
        }),
        confidence: 0.7,
        requiresHumanReview: false,
        warnings: []
      };

      vi.mocked(secureAIService.generateTextWithValidation).mockResolvedValue(mockAIResponse);

      const result = await AIValidationService.validateAIResponse(prompt, testOptions);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Invalid enum value'));
      expect(result.data).toBeUndefined();
    });

    it('should handle malformed JSON responses', async () => {
      const prompt = 'Create a treatment plan';
      const mockAIResponse = {
        text: 'Invalid JSON response {',
        confidence: 0.5,
        requiresHumanReview: true,
        warnings: ['Malformed JSON']
      };

      vi.mocked(secureAIService.generateTextWithValidation).mockResolvedValue(mockAIResponse);

      const result = await AIValidationService.validateAIResponse(prompt, testOptions);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Invalid JSON'));
      expect(result.requiresHumanReview).toBe(true);
    });

    it('should handle AI service failures', async () => {
      const prompt = 'Create a treatment plan';
      
      vi.mocked(secureAIService.generateTextWithValidation).mockRejectedValue(new Error('AI service unavailable'));

      const result = await AIValidationService.validateAIResponse(prompt, testOptions);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('AI service unavailable');
      expect(result.requiresHumanReview).toBe(true);
    });

    it('should trigger circuit breaker after multiple failures', async () => {
      const prompt = 'Create a treatment plan';
      
      // Mock multiple failures
      vi.mocked(secureAIService.generateTextWithValidation).mockRejectedValue(new Error('Service error'));

      // Simulate multiple failures to trigger circuit breaker
      for (let i = 0; i < 6; i++) {
        await AIValidationService.validateAIResponse(prompt, testOptions);
      }

      // Circuit breaker should now be open
      const result = await AIValidationService.validateAIResponse(prompt, testOptions);

      expect(result.errors).toContain('AI service temporarily unavailable due to circuit breaker');
      expect(result.requiresHumanReview).toBe(true);
    });

    it('should log audit events when audit context provided', async () => {
      const prompt = 'Create a treatment plan';
      const mockAIResponse = {
        text: JSON.stringify({
          title: 'Test Plan',
          description: 'Test description',
          priority: 'medium'
        }),
        confidence: 0.9,
        requiresHumanReview: false,
        warnings: []
      };

      vi.mocked(secureAIService.generateTextWithValidation).mockResolvedValue(mockAIResponse);

      await AIValidationService.validateAIResponse(prompt, testOptions);

      expect(HIPAAAuditService.logPHIAccess).toHaveBeenCalledWith({
        userId: 1,
        action: 'AI_VALIDATION',
        resourceType: 'TREATMENT_PLAN',
        details: expect.objectContaining({
          promptLength: prompt.length,
          confidence: expect.any(Number),
          success: true
        })
      });
    });
  });

  describe('Content Verification', () => {
    it('should verify content against source when enabled', async () => {
      const prompt = 'Summarize this patient note';
      const sourceContext = 'Patient has anxiety disorder, prescribed medication, attending therapy sessions';
      
      const testSchema = z.object({
        summary: z.string(),
        keyPoints: z.array(z.string())
      });

      const options: ValidationOptions = {
        schema: testSchema,
        sourceContext,
        enableContentVerification: true,
        auditContext: {
          userId: 1,
          action: 'AI_SUMMARIZATION',
          resourceType: 'PATIENT_NOTE'
        }
      };

      const mockAIResponse = {
        text: JSON.stringify({
          summary: 'Patient diagnosed with anxiety disorder, receiving medication and therapy',
          keyPoints: ['Anxiety diagnosis', 'Medication prescribed', 'Therapy sessions']
        }),
        confidence: 0.9,
        requiresHumanReview: false,
        warnings: []
      };

      vi.mocked(secureAIService.generateTextWithValidation).mockResolvedValue(mockAIResponse);

      const result = await AIValidationService.validateAIResponse(prompt, options);

      expect(result.success).toBe(true);
      expect(result.sourceVerification).toBeDefined();
      expect(result.sourceVerification?.verified).toBe(true);
      expect(result.sourceVerification?.confidence).toBeGreaterThan(0.7);
    });

    it('should flag discrepancies in content verification', async () => {
      const prompt = 'Summarize this patient note';
      const sourceContext = 'Patient has anxiety disorder, prescribed medication';
      
      const testSchema = z.object({
        summary: z.string(),
        keyPoints: z.array(z.string())
      });

      const options: ValidationOptions = {
        schema: testSchema,
        sourceContext,
        enableContentVerification: true
      };

      const mockAIResponse = {
        text: JSON.stringify({
          summary: 'Patient diagnosed with depression, receiving therapy', // Wrong diagnosis
          keyPoints: ['Depression diagnosis', 'Therapy sessions'] // Missing medication
        }),
        confidence: 0.9,
        requiresHumanReview: false,
        warnings: []
      };

      vi.mocked(secureAIService.generateTextWithValidation).mockResolvedValue(mockAIResponse);

      const result = await AIValidationService.validateAIResponse(prompt, options);

      expect(result.success).toBe(true);
      expect(result.sourceVerification?.verified).toBe(false);
      expect(result.sourceVerification?.discrepancies).toContain(expect.stringContaining('diagnosis'));
      expect(result.requiresHumanReview).toBe(true);
    });
  });

  describe('Confidence Scoring', () => {
    it('should calculate high confidence for well-structured responses', async () => {
      const prompt = 'Create a treatment plan';
      const testSchema = z.object({
        title: z.string(),
        description: z.string(),
        priority: z.enum(['low', 'medium', 'high'])
      });

      const options: ValidationOptions = {
        schema: testSchema,
        confidenceThreshold: 0.8
      };

      const mockAIResponse = {
        text: JSON.stringify({
          title: 'Comprehensive Treatment Plan',
          description: 'Detailed plan with clear objectives and interventions',
          priority: 'high'
        }),
        confidence: 0.95,
        requiresHumanReview: false,
        warnings: []
      };

      vi.mocked(secureAIService.generateTextWithValidation).mockResolvedValue(mockAIResponse);

      const result = await AIValidationService.validateAIResponse(prompt, options);

      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.requiresHumanReview).toBe(false);
    });

    it('should flag low confidence responses for human review', async () => {
      const prompt = 'Create a treatment plan';
      const testSchema = z.object({
        title: z.string(),
        description: z.string(),
        priority: z.enum(['low', 'medium', 'high'])
      });

      const options: ValidationOptions = {
        schema: testSchema,
        confidenceThreshold: 0.8
      };

      const mockAIResponse = {
        text: JSON.stringify({
          title: 'Unclear Plan',
          description: 'Vague description',
          priority: 'medium'
        }),
        confidence: 0.6,
        requiresHumanReview: true,
        warnings: ['Low confidence response']
      };

      vi.mocked(secureAIService.generateTextWithValidation).mockResolvedValue(mockAIResponse);

      const result = await AIValidationService.validateAIResponse(prompt, options);

      expect(result.confidence).toBeLessThan(0.8);
      expect(result.requiresHumanReview).toBe(true);
      expect(result.uncertaintyFlags).toContain('Low confidence response');
    });

    it('should adjust confidence based on source verification', async () => {
      const prompt = 'Summarize patient note';
      const sourceContext = 'Patient has anxiety disorder';
      
      const testSchema = z.object({
        summary: z.string()
      });

      const options: ValidationOptions = {
        schema: testSchema,
        sourceContext,
        enableContentVerification: true
      };

      const mockAIResponse = {
        text: JSON.stringify({
          summary: 'Patient diagnosed with anxiety disorder'
        }),
        confidence: 0.8,
        requiresHumanReview: false,
        warnings: []
      };

      vi.mocked(secureAIService.generateTextWithValidation).mockResolvedValue(mockAIResponse);

      const result = await AIValidationService.validateAIResponse(prompt, options);

      expect(result.confidence).toBeGreaterThan(0.8); // Should be boosted by source verification
    });
  });

  describe('PHI Protection', () => {
    it('should detect and flag PHI in AI responses', async () => {
      const prompt = 'Create a patient summary';
      const testSchema = z.object({
        summary: z.string(),
        recommendations: z.array(z.string())
      });

      const options: ValidationOptions = {
        schema: testSchema,
        auditContext: {
          userId: 1,
          action: 'AI_SUMMARIZATION',
          resourceType: 'PATIENT_SUMMARY'
        }
      };

      const mockAIResponse = {
        text: JSON.stringify({
          summary: 'Patient John Doe (DOB: 01/01/1990, SSN: 123-45-6789) has anxiety',
          recommendations: ['Continue medication', 'Schedule follow-up']
        }),
        confidence: 0.9,
        requiresHumanReview: true,
        warnings: ['PHI detected in response']
      };

      vi.mocked(secureAIService.generateTextWithValidation).mockResolvedValue(mockAIResponse);

      const result = await AIValidationService.validateAIResponse(prompt, options);

      expect(result.success).toBe(true);
      expect(result.requiresHumanReview).toBe(true);
      expect(result.warnings).toContain('PHI detected in response');
    });

    it('should sanitize PHI from responses', async () => {
      const prompt = 'Create a treatment plan';
      const testSchema = z.object({
        title: z.string(),
        description: z.string()
      });

      const options: ValidationOptions = {
        schema: testSchema
      };

      const mockAIResponse = {
        text: JSON.stringify({
          title: 'Treatment Plan for Patient',
          description: 'Plan for patient with email patient@example.com and phone 555-123-4567'
        }),
        confidence: 0.9,
        requiresHumanReview: true,
        warnings: ['PHI detected and sanitized']
      };

      vi.mocked(secureAIService.generateTextWithValidation).mockResolvedValue(mockAIResponse);

      const result = await AIValidationService.validateAIResponse(prompt, options);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('PHI detected and sanitized');
      
      // Verify PHI was sanitized
      if (result.data) {
        expect(result.data.description).not.toContain('patient@example.com');
        expect(result.data.description).not.toContain('555-123-4567');
      }
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed requests with exponential backoff', async () => {
      const prompt = 'Create a treatment plan';
      const testSchema = z.object({
        title: z.string()
      });

      const options: ValidationOptions = {
        schema: testSchema,
        maxRetries: 3
      };

      let attemptCount = 0;
      vi.mocked(secureAIService.generateTextWithValidation).mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return {
          text: JSON.stringify({ title: 'Success after retries' }),
          confidence: 0.9,
          requiresHumanReview: false,
          warnings: []
        };
      });

      const result = await AIValidationService.validateAIResponse(prompt, options);

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Success after retries');
      expect(attemptCount).toBe(3);
    });

    it('should fail after max retries exceeded', async () => {
      const prompt = 'Create a treatment plan';
      const testSchema = z.object({
        title: z.string()
      });

      const options: ValidationOptions = {
        schema: testSchema,
        maxRetries: 2
      };

      vi.mocked(secureAIService.generateTextWithValidation).mockRejectedValue(new Error('Persistent failure'));

      const result = await AIValidationService.validateAIResponse(prompt, options);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Persistent failure');
      expect(result.requiresHumanReview).toBe(true);
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit breaker after threshold failures', async () => {
      const prompt = 'Create a treatment plan';
      const testSchema = z.object({
        title: z.string()
      });

      const options: ValidationOptions = {
        schema: testSchema
      };

      vi.mocked(secureAIService.generateTextWithValidation).mockRejectedValue(new Error('Service error'));

      // Trigger multiple failures
      for (let i = 0; i < 6; i++) {
        await AIValidationService.validateAIResponse(prompt, options);
      }

      // Circuit breaker should be open
      const result = await AIValidationService.validateAIResponse(prompt, options);

      expect(result.errors).toContain('AI service temporarily unavailable due to circuit breaker');
      expect(result.requiresHumanReview).toBe(true);
    });

    it('should reset circuit breaker after timeout', async () => {
      const prompt = 'Create a treatment plan';
      const testSchema = z.object({
        title: z.string()
      });

      const options: ValidationOptions = {
        schema: testSchema
      };

      // Mock time to simulate timeout
      const originalNow = Date.now;
      vi.spyOn(Date, 'now').mockImplementation(() => originalNow() + 70000); // 70 seconds later

      vi.mocked(secureAIService.generateTextWithValidation).mockRejectedValue(new Error('Service error'));

      // Trigger failures to open circuit breaker
      for (let i = 0; i < 6; i++) {
        await AIValidationService.validateAIResponse(prompt, options);
      }

      // Circuit breaker should reset after timeout
      vi.mocked(secureAIService.generateTextWithValidation).mockResolvedValue({
        text: JSON.stringify({ title: 'Success after reset' }),
        confidence: 0.9,
        requiresHumanReview: false,
        warnings: []
      });

      const result = await AIValidationService.validateAIResponse(prompt, options);

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Success after reset');

      vi.restoreAllMocks();
    });
  });

  describe('Schema Validation', () => {
    it('should validate complex nested schemas', async () => {
      const complexSchema = z.object({
        patient: z.object({
          id: z.number(),
          name: z.string(),
          conditions: z.array(z.string())
        }),
        treatment: z.object({
          goals: z.array(z.string()),
          interventions: z.array(z.object({
            type: z.string(),
            frequency: z.string(),
            duration: z.number()
          }))
        }),
        timeline: z.object({
          startDate: z.string(),
          milestones: z.array(z.object({
            date: z.string(),
            description: z.string()
          }))
        })
      });

      const prompt = 'Create comprehensive treatment plan';
      const options: ValidationOptions = {
        schema: complexSchema
      };

      const mockAIResponse = {
        text: JSON.stringify({
          patient: {
            id: 1,
            name: 'Test Patient',
            conditions: ['Anxiety', 'Depression']
          },
          treatment: {
            goals: ['Reduce anxiety', 'Improve mood'],
            interventions: [
              {
                type: 'CBT',
                frequency: 'Weekly',
                duration: 12
              }
            ]
          },
          timeline: {
            startDate: '2025-01-20',
            milestones: [
              {
                date: '2025-02-20',
                description: 'First review'
              }
            ]
          }
        }),
        confidence: 0.9,
        requiresHumanReview: false,
        warnings: []
      };

      vi.mocked(secureAIService.generateTextWithValidation).mockResolvedValue(mockAIResponse);

      const result = await AIValidationService.validateAIResponse(prompt, options);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.patient.conditions).toHaveLength(2);
      expect(result.data?.treatment.interventions).toHaveLength(1);
    });

    it('should handle optional fields correctly', async () => {
      const schemaWithOptional = z.object({
        title: z.string(),
        description: z.string(),
        priority: z.enum(['low', 'medium', 'high']).optional(),
        dueDate: z.string().optional(),
        notes: z.string().optional()
      });

      const prompt = 'Create minimal treatment plan';
      const options: ValidationOptions = {
        schema: schemaWithOptional
      };

      const mockAIResponse = {
        text: JSON.stringify({
          title: 'Minimal Plan',
          description: 'Basic treatment plan'
          // No optional fields
        }),
        confidence: 0.9,
        requiresHumanReview: false,
        warnings: []
      };

      vi.mocked(secureAIService.generateTextWithValidation).mockResolvedValue(mockAIResponse);

      const result = await AIValidationService.validateAIResponse(prompt, options);

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Minimal Plan');
      expect(result.data?.priority).toBeUndefined();
    });
  });

  describe('Performance', () => {
    it('should complete validation within reasonable time', async () => {
      const prompt = 'Create a treatment plan';
      const testSchema = z.object({
        title: z.string(),
        description: z.string()
      });

      const options: ValidationOptions = {
        schema: testSchema
      };

      const mockAIResponse = {
        text: JSON.stringify({
          title: 'Performance Test Plan',
          description: 'Testing response time'
        }),
        confidence: 0.9,
        requiresHumanReview: false,
        warnings: []
      };

      vi.mocked(secureAIService.generateTextWithValidation).mockResolvedValue(mockAIResponse);

      const startTime = Date.now();
      const result = await AIValidationService.validateAIResponse(prompt, options);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent validation requests', async () => {
      const prompt = 'Create a treatment plan';
      const testSchema = z.object({
        title: z.string()
      });

      const options: ValidationOptions = {
        schema: testSchema
      };

      const mockAIResponse = {
        text: JSON.stringify({ title: 'Concurrent Test Plan' }),
        confidence: 0.9,
        requiresHumanReview: false,
        warnings: []
      };

      vi.mocked(secureAIService.generateTextWithValidation).mockResolvedValue(mockAIResponse);

      // Run multiple concurrent validations
      const promises = Array(10).fill(null).map(() => 
        AIValidationService.validateAIResponse(prompt, options)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.data?.title).toBe('Concurrent Test Plan');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      const prompt = 'Create a treatment plan';
      const testSchema = z.object({
        title: z.string()
      });

      const options: ValidationOptions = {
        schema: testSchema,
        maxRetries: 1
      };

      vi.mocked(secureAIService.generateTextWithValidation).mockRejectedValue(new Error('Network timeout'));

      const result = await AIValidationService.validateAIResponse(prompt, options);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Network timeout');
      expect(result.requiresHumanReview).toBe(true);
    });

    it('should handle malformed AI responses', async () => {
      const prompt = 'Create a treatment plan';
      const testSchema = z.object({
        title: z.string()
      });

      const options: ValidationOptions = {
        schema: testSchema
      };

      const mockAIResponse = {
        text: 'Not JSON at all',
        confidence: 0.3,
        requiresHumanReview: true,
        warnings: ['Malformed response']
      };

      vi.mocked(secureAIService.generateTextWithValidation).mockResolvedValue(mockAIResponse);

      const result = await AIValidationService.validateAIResponse(prompt, options);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Invalid JSON'));
      expect(result.requiresHumanReview).toBe(true);
    });

    it('should handle audit logging failures without breaking validation', async () => {
      const prompt = 'Create a treatment plan';
      const testSchema = z.object({
        title: z.string()
      });

      const options: ValidationOptions = {
        schema: testSchema,
        auditContext: {
          userId: 1,
          action: 'AI_VALIDATION',
          resourceType: 'TREATMENT_PLAN'
        }
      };

      const mockAIResponse = {
        text: JSON.stringify({ title: 'Test Plan' }),
        confidence: 0.9,
        requiresHumanReview: false,
        warnings: []
      };

      vi.mocked(secureAIService.generateTextWithValidation).mockResolvedValue(mockAIResponse);
      vi.mocked(HIPAAAuditService.logPHIAccess).mockRejectedValue(new Error('Audit logging failed'));

      const result = await AIValidationService.validateAIResponse(prompt, options);

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Test Plan');
    });
  });
});
