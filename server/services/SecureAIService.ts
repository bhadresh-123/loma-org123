/**
 * Secure AI Service Replacement
 * 
 * Replaces Hugging Face API with secure, HIPAA-compliant alternatives
 * and implements data anonymization for AI processing
 */

import { HfInference } from '@huggingface/inference';
import OpenAI from 'openai';
import crypto from 'crypto';
import { HIPAAAuditService } from './ClinicalService';

interface AIServiceConfig {
  provider: 'openai' | 'anthropic' | 'local' | 'disabled';
  apiKey?: string;
  model?: string;
  endpoint?: string;
}

interface ProcessedData {
  original: string;
  anonymized: string;
  entities: Array<{
    type: string;
    value: string;
    replacement: string;
  }>;
}

interface AIGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
  enableContentVerification?: boolean;
  sourceContext?: string;
  auditContext?: {
    userId: number;
    action: string;
    resourceType: string;
  };
}

interface AIGenerationResult {
  content: string;
  confidence: number;
  processingTime: number;
  phiEntitiesProcessed: number;
  requiresHumanReview: boolean;
  warnings: string[];
}

class SecureAIService {
  private config: AIServiceConfig;
  private openai?: OpenAI;
  private hf?: HfInference;

  constructor() {
    this.config = this.initializeConfig();
    this.initializeClients();
  }

  private initializeConfig(): AIServiceConfig {
    // Prioritize HIPAA-compliant services
    if (process.env.OPENAI_API_KEY) {
      return {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-3.5-turbo'
      };
    }

    if (process.env.ANTHROPIC_API_KEY) {
      return {
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-3-sonnet-20240229'
      };
    }

    // Fallback to local processing
    return {
      provider: 'local',
      model: 'local-processing'
    };
  }

  private initializeClients() {
    if (this.config.provider === 'openai' && this.config.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.config.apiKey,
        timeout: 30000,
        maxRetries: 2
      });
    }

    // Keep Hugging Face as last resort with strict controls
    if (process.env.HUGGINGFACE_API_KEY && this.config.provider !== 'openai') {
      this.hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
    }
  }

  /**
   * Anonymize PHI data before sending to AI services
   */
  private anonymizePHI(text: string): ProcessedData {
    const entities: Array<{ type: string; value: string; replacement: string }> = [];
    let anonymized = text;

    // Common PHI patterns
    const patterns = [
      {
        type: 'name',
        regex: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
        replacement: '[CLIENT_NAME]'
      },
      {
        type: 'email',
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        replacement: '[EMAIL]'
      },
      {
        type: 'phone',
        regex: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
        replacement: '[PHONE]'
      },
      {
        type: 'ssn',
        regex: /\b\d{3}-\d{2}-\d{4}\b/g,
        replacement: '[SSN]'
      },
      {
        type: 'address',
        regex: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/g,
        replacement: '[ADDRESS]'
      },
      {
        type: 'date',
        regex: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
        replacement: '[DATE]'
      }
    ];

    patterns.forEach(pattern => {
      const matches = anonymized.match(pattern.regex);
      if (matches) {
        matches.forEach(match => {
          entities.push({
            type: pattern.type,
            value: match,
            replacement: pattern.replacement
          });
        });
        anonymized = anonymized.replace(pattern.regex, pattern.replacement);
      }
    });

    return {
      original: text,
      anonymized,
      entities
    };
  }

  /**
   * Restore PHI data after AI processing
   */
  private restorePHI(text: string, entities: Array<{ type: string; value: string; replacement: string }>): string {
    let restored = text;
    
    entities.forEach(entity => {
      restored = restored.replace(entity.replacement, entity.value);
    });

    return restored;
  }

  /**
   * Enhanced secure text generation with PHI protection and advanced validation
   */
  async generateText(prompt: string, options: AIGenerationOptions = {}): Promise<string> {
    const result = await this.generateTextWithValidation(prompt, options);
    return result.content;
  }

  /**
   * Generate text with comprehensive validation and confidence scoring
   */
  async generateTextWithValidation(prompt: string, options: AIGenerationOptions = {}): Promise<AIGenerationResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    
    try {
      // Anonymize PHI in the prompt
      const processedData = this.anonymizePHI(prompt);
      
      // Enhanced audit logging
      console.log('[AI_SECURITY] PHI anonymized:', {
        originalLength: processedData.original.length,
        anonymizedLength: processedData.anonymized.length,
        entitiesFound: processedData.entities.length,
        entityTypes: Array.from(new Set(processedData.entities.map(e => e.type))),
        timestamp: new Date().toISOString()
      });

      // Audit logging for HIPAA compliance
      if (options.auditContext) {
        await HIPAAAuditService.logPHIAccess({
          userId: options.auditContext.userId,
          action: `ai_generation_${options.auditContext.action}`,
          resourceType: options.auditContext.resourceType,
          fieldsAccessed: ['ai_prompt'],
          correlationId: crypto.randomUUID()
        });
      }

      let responseText = '';
      let confidence = 0.5; // Base confidence

      // Try OpenAI first (HIPAA-compliant with BAA)
      if (this.openai) {
        try {
          const response = await this.openai.chat.completions.create({
            model: options.model || this.config.model || 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: this.buildSystemPrompt(options.sourceContext)
              },
              {
                role: 'user',
                content: processedData.anonymized
              }
            ],
            max_tokens: options.maxTokens || 500,
            temperature: options.temperature || 0.1,
          });

          responseText = response.choices[0]?.message?.content || '';
          confidence += 0.3; // OpenAI bonus
        } catch (error) {
          console.error('[AI_SECURITY] OpenAI failed:', error);
          throw error;
        }
      }
      // Try Anthropic Claude (HIPAA-compliant with BAA)
      else if (this.config.provider === 'anthropic') {
        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: options.model || this.config.model || 'claude-3-sonnet-20240229',
              max_tokens: options.maxTokens || 500,
              messages: [
                {
                  role: 'user',
                  content: processedData.anonymized
                }
              ]
            })
          });

          if (!response.ok) {
            throw new Error(`Anthropic API error: ${response.status}`);
          }

          const result = await response.json();
          responseText = result.content[0]?.text || '';
          confidence += 0.3; // Anthropic bonus
        } catch (error) {
          console.error('[AI_SECURITY] Anthropic failed:', error);
          throw error;
        }
      }
      // Fallback to Hugging Face with strict controls
      else if (this.hf) {
        console.warn('[AI_SECURITY] Using Hugging Face fallback - PHI data will be anonymized');
        warnings.push('Using non-HIPAA compliant service');
        
        const response = await this.hf.textGeneration({
          model: 'microsoft/DialoGPT-medium',
          inputs: processedData.anonymized,
          parameters: {
            max_new_tokens: options.maxTokens || 500,
            temperature: options.temperature || 0.1,
            top_p: 0.95,
            return_full_text: false,
          },
        });

        responseText = response.generated_text;
        confidence += 0.1; // Lower confidence for non-HIPAA service
      }
      // Local processing fallback
      else {
        console.warn('[AI_SECURITY] No AI services available - using local processing');
        warnings.push('Using local processing fallback');
        responseText = this.localProcessing(processedData.anonymized);
        confidence = 0.2; // Very low confidence for local processing
      }

      // Restore PHI in the response
      const finalResponse = this.restorePHI(responseText, processedData.entities);

      // Content verification if enabled
      if (options.enableContentVerification && options.sourceContext) {
        const verificationResult = this.verifyContent(finalResponse, options.sourceContext);
        confidence += verificationResult.confidenceBonus;
        if (verificationResult.warnings.length > 0) {
          warnings.push(...verificationResult.warnings);
        }
      }

      // Calculate final confidence
      confidence = Math.min(confidence, 1.0);
      const requiresHumanReview = confidence < 0.7 || warnings.length > 0;

      // Log the restoration for audit purposes
      console.log('[AI_SECURITY] PHI restored in response:', {
        responseLength: finalResponse.length,
        entitiesRestored: processedData.entities.length,
        confidence,
        requiresHumanReview,
        processingTime: Date.now() - startTime
      });

      return {
        content: finalResponse,
        confidence,
        processingTime: Date.now() - startTime,
        phiEntitiesProcessed: processedData.entities.length,
        requiresHumanReview,
        warnings
      };

    } catch (error) {
      console.error('[AI_SECURITY] Text generation failed:', error);
      throw new Error('AI service unavailable');
    }
  }

  /**
   * Build enhanced system prompt with context awareness
   */
  private buildSystemPrompt(sourceContext?: string): string {
    let prompt = `You are Sigie, an AI assistant for mental health practice management. You help therapists with their daily tasks.

IMPORTANT: When a user asks you to schedule a session, you must ALWAYS respond by saying you will schedule it. 
For example, if they say "schedule a session with Kevin Gates on 11/11 at 11am", respond with:
"I'll schedule that session for Kevin Gates on November 11th at 11:00 AM. Let me create that appointment for you now."

Be proactive and helpful. When scheduling is mentioned, confirm what you understand and indicate you're taking action.

Available actions you can take:
- Schedule sessions (when user mentions "schedule", "book", or "set up" a session)
- Create tasks
- Analyze practice data
- Generate treatment plans

Always be professional, empathetic, and action-oriented. When you can take an action, tell the user you're doing it.`;
    
    if (sourceContext) {
      prompt += `\n\nContext: ${sourceContext}`;
      prompt += '\n\nUse the context information to help the user. If they mention a client name, check if that client exists in the context.';
    }
    
    return prompt;
  }

  /**
   * Verify content against source context
   */
  private verifyContent(content: string, sourceContext: string): {
    confidenceBonus: number;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let confidenceBonus = 0;

    const contentLower = content.toLowerCase();
    const sourceLower = sourceContext.toLowerCase();

    // Check for consistency
    const contentWords = content.split(' ').filter(word => word.length > 3);
    const foundWords = contentWords.filter(word => sourceLower.includes(word.toLowerCase()));
    
    const consistencyRatio = foundWords.length / contentWords.length;
    
    if (consistencyRatio > 0.7) {
      confidenceBonus += 0.2;
    } else if (consistencyRatio < 0.3) {
      warnings.push('Response may contain information not present in source context');
    }

    // Check for hallucination indicators
    const hallucinationIndicators = [
      'i cannot find',
      'i don\'t have information',
      'based on my knowledge',
      'i believe',
      'it seems like'
    ];

    const hasIndicators = hallucinationIndicators.some(indicator => 
      contentLower.includes(indicator)
    );

    if (hasIndicators) {
      warnings.push('Response contains uncertainty indicators');
    } else {
      confidenceBonus += 0.1;
    }

    return { confidenceBonus, warnings };
  }

  /**
   * Local processing fallback
   */
  private localProcessing(text: string): string {
    // Simple template-based responses for common patterns
    if (text.includes('treatment plan')) {
      return 'Treatment plan generation requires AI services. Please configure OpenAI or Anthropic API key.';
    }
    
    if (text.includes('session notes')) {
      return 'Session note processing requires AI services. Please configure OpenAI or Anthropic API key.';
    }

    return 'AI processing unavailable. Please configure a HIPAA-compliant AI service.';
  }

  /**
   * Check if service is HIPAA-compliant
   */
  isHIPAACompliant(): boolean {
    return this.config.provider === 'openai' || this.config.provider === 'anthropic';
  }

  /**
   * Get service status
   */
  getServiceStatus(): {
    provider: string;
    available: boolean;
    hipaaCompliant: boolean;
    fallbackAvailable: boolean;
  } {
    return {
      provider: this.config.provider,
      available: !!(this.openai || this.config.provider === 'anthropic' || this.hf),
      hipaaCompliant: this.isHIPAACompliant(),
      fallbackAvailable: !!(this.hf || this.config.provider === 'local')
    };
  }
}

// Export singleton instance
export const secureAIService = new SecureAIService();

// Export for backward compatibility
export default secureAIService;
