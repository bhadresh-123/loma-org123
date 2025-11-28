/**
 * Centralized AI Validation Service
 * 
 * Provides comprehensive validation, hallucination prevention, and confidence scoring
 * for all AI-generated content in the application.
 */

import { z } from 'zod';
import { secureAIService } from './SecureAIService';
import { HIPAAAuditService } from './ClinicalService';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  confidence: number;
  uncertaintyFlags: string[];
  requiresHumanReview: boolean;
  errors: string[];
  warnings: string[];
  processingTime: number;
  sourceVerification?: {
    verified: boolean;
    confidence: number;
    discrepancies: string[];
  };
}

export interface ValidationOptions {
  schema: z.ZodSchema<any>;
  sourceContext?: string;
  maxRetries?: number;
  confidenceThreshold?: number;
  enableContentVerification?: boolean;
  requireHumanReview?: boolean;
  auditContext?: {
    userId: number;
    action: string;
    resourceType: string;
  };
}

export class AIValidationService {
  private static readonly DEFAULT_CONFIDENCE_THRESHOLD = 0.8;
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private static readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

  private static failureCount = 0;
  private static lastFailureTime = 0;
  private static circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  /**
   * Main validation method for AI responses
   */
  static async validateAIResponse<T>(
    prompt: string,
    options: ValidationOptions
  ): Promise<ValidationResult<T>> {
    const startTime = Date.now();
    const result: ValidationResult<T> = {
      success: false,
      confidence: 0,
      uncertaintyFlags: [],
      requiresHumanReview: false,
      errors: [],
      warnings: [],
      processingTime: 0
    };

    try {
      // Check circuit breaker
      if (!this.isCircuitBreakerClosed()) {
        result.errors.push('AI service temporarily unavailable due to circuit breaker');
        result.requiresHumanReview = true;
        return result;
      }

      // Generate AI response with PHI protection
      const aiResponse = await this.generateWithRetry(prompt, options.maxRetries || this.DEFAULT_MAX_RETRIES);
      
      // Extract and parse JSON
      const parsedData = this.extractAndParseJSON(aiResponse);
      
      // Validate against schema
      const schemaValidation = this.validateSchema(parsedData, options.schema);
      if (!schemaValidation.success) {
        result.errors.push(...schemaValidation.errors);
        return result;
      }

      // Content verification if enabled
      if (options.enableContentVerification && options.sourceContext) {
        result.sourceVerification = await this.verifyAgainstSource(
          parsedData,
          options.sourceContext
        );
      }

      // Calculate confidence score
      result.confidence = this.calculateConfidenceScore(
        parsedData,
        aiResponse,
        result.sourceVerification
      );

      // Check if human review is required
      result.requiresHumanReview = this.shouldRequireHumanReview(
        result.confidence,
        result.uncertaintyFlags,
        options.confidenceThreshold || this.DEFAULT_CONFIDENCE_THRESHOLD
      );

      // Audit logging
      if (options.auditContext) {
        await this.logValidationAttempt(options.auditContext, result);
      }

      result.success = true;
      result.data = parsedData as T;
      result.processingTime = Date.now() - startTime;

      // Reset circuit breaker on success
      this.resetCircuitBreaker();

      return result;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      result.processingTime = Date.now() - startTime;
      
      // Update circuit breaker
      this.recordFailure();
      
      return result;
    }
  }

  /**
   * Generate AI response with retry logic and circuit breaker
   */
  private static async generateWithRetry(
    prompt: string, 
    maxRetries: number
  ): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await secureAIService.generateText(prompt, {
          maxTokens: 1000,
          temperature: 0.1
        });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('AI generation failed after all retries');
  }

  /**
   * Extract and parse JSON from AI response
   */
  private static extractAndParseJSON(response: string): any {
    try {
      // Try direct parsing first
      return JSON.parse(response);
    } catch {
      // Extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                       response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonText.replace(/\\n/g, ' '));
      }
      
      throw new Error('No valid JSON found in AI response');
    }
  }

  /**
   * Validate data against Zod schema
   */
  private static validateSchema(data: any, schema: z.ZodSchema<any>): {
    success: boolean;
    errors: string[];
  } {
    try {
      schema.parse(data);
      return { success: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => {
          const path = err.path.join('.');
          return `${path}: ${err.message}`;
        });
        return { success: false, errors };
      }
      return { success: false, errors: [String(error)] };
    }
  }

  /**
   * Verify AI response against source context
   */
  private static async verifyAgainstSource(
    aiData: any,
    sourceContext: string
  ): Promise<{
    verified: boolean;
    confidence: number;
    discrepancies: string[];
  }> {
    const discrepancies: string[] = [];
    let verifiedCount = 0;
    let totalChecks = 0;

    // Check for factual consistency
    const sourceLower = sourceContext.toLowerCase();
    
    // Verify key facts mentioned in AI response
    if (typeof aiData === 'object' && aiData !== null) {
      for (const [key, value] of Object.entries(aiData)) {
        if (typeof value === 'string' && value.length > 10) {
          totalChecks++;
          const valueLower = value.toLowerCase();
          
          // Check if key information is present in source
          const keyWords = value.split(' ').filter(word => word.length > 3);
          const foundWords = keyWords.filter(word => sourceLower.includes(word.toLowerCase()));
          
          if (foundWords.length / keyWords.length > 0.5) {
            verifiedCount++;
          } else {
            discrepancies.push(`Field '${key}' may contain information not in source context`);
          }
        }
      }
    }

    const confidence = totalChecks > 0 ? verifiedCount / totalChecks : 0;
    
    return {
      verified: confidence > 0.7,
      confidence,
      discrepancies
    };
  }

  /**
   * Calculate confidence score for AI response
   */
  private static calculateConfidenceScore(
    data: any,
    originalResponse: string,
    sourceVerification?: { verified: boolean; confidence: number; discrepancies: string[] }
  ): number {
    let confidence = 0.5; // Base confidence

    // Schema validation bonus
    confidence += 0.2;

    // Response completeness bonus
    if (typeof data === 'object' && data !== null) {
      const fieldCount = Object.keys(data).length;
      if (fieldCount >= 3) confidence += 0.1;
      if (fieldCount >= 5) confidence += 0.1;
    }

    // Source verification bonus
    if (sourceVerification) {
      confidence += sourceVerification.confidence * 0.2;
    }

    // Response quality indicators
    if (originalResponse.length > 100) confidence += 0.05;
    if (!originalResponse.includes('I cannot') && !originalResponse.includes('I don\'t know')) {
      confidence += 0.05;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Determine if human review is required
   */
  private static shouldRequireHumanReview(
    confidence: number,
    uncertaintyFlags: string[],
    threshold: number
  ): boolean {
    return confidence < threshold || uncertaintyFlags.length > 0;
  }

  /**
   * Circuit breaker implementation
   */
  private static isCircuitBreakerClosed(): boolean {
    if (this.circuitBreakerState === 'CLOSED') return true;
    
    if (this.circuitBreakerState === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.CIRCUIT_BREAKER_TIMEOUT) {
        this.circuitBreakerState = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    
    return true; // HALF_OPEN
  }

  private static recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreakerState = 'OPEN';
    }
  }

  private static resetCircuitBreaker(): void {
    this.failureCount = 0;
    this.circuitBreakerState = 'CLOSED';
  }

  /**
   * Log validation attempt for audit purposes
   */
  private static async logValidationAttempt(
    context: { userId: number; action: string; resourceType: string },
    result: ValidationResult<any>
  ): Promise<void> {
    try {
      await HIPAAAuditService.logPHIAccess({
        userId: context.userId,
        action: `ai_validation_${context.action}`,
        resourceType: context.resourceType,
        fieldsAccessed: ['ai_response'],
        responseStatus: result.success ? 200 : 400,
        responseTime: result.processingTime,
        correlationId: crypto.randomUUID()
      });
    } catch (error) {
      console.error('Failed to log AI validation attempt:', error);
    }
  }

  /**
   * Get service health status
   */
  static getHealthStatus(): {
    circuitBreakerState: string;
    failureCount: number;
    lastFailureTime: number;
    aiServiceStatus: any;
  } {
    return {
      circuitBreakerState: this.circuitBreakerState,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      aiServiceStatus: secureAIService.getServiceStatus()
    };
  }
}

// Export commonly used schemas
export const CommonSchemas = {
  notesResponse: z.object({
    mood: z.enum(['happy', 'sad', 'angry', 'anxious', 'neutral', 'tired', 'confused', 'calm']),
    subjective: z.string().optional(),
    objective: z.string().optional(),
    assessment: z.string().optional(),
    plan: z.string().optional(),
    situation: z.string().optional(),
    narrative: z.string().optional(),
    emotion: z.string().optional()
  }),
  
  treatmentPlan: z.object({
    goals: z.array(z.string()),
    interventions: z.array(z.string()),
    timeline: z.string(),
    progressMetrics: z.array(z.string())
  }),
  
  cvData: z.object({
    education: z.array(z.object({
      university: z.string(),
      degree: z.string(),
      major: z.string(),
      startDate: z.string().nullable(),
      endDate: z.string().nullable(),
      graduationDate: z.string().nullable(),
      gpa: z.string().nullable(),
      honors: z.string().nullable()
    })),
    workExperience: z.array(z.object({
      organization: z.string(),
      position: z.string(),
      location: z.string(),
      startDate: z.string().nullable(),
      endDate: z.string().nullable(),
      isCurrent: z.boolean(),
      description: z.string().nullable(),
      responsibilities: z.array(z.string()),
      achievements: z.array(z.string())
    }))
  })
};

export default AIValidationService;
