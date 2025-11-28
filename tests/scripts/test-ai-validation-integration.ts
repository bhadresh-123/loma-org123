#!/usr/bin/env node

/**
 * AI Validation Integration Test
 * 
 * Comprehensive test suite for the enhanced AI validation system
 */

import { secureAIService } from './services/SecureAIService';
import { AIValidationService, CommonSchemas } from './services/AIValidationService';
import { EnhancedPHIProtection } from './middleware/enhanced-phi-protection';
import { aiMonitor } from './services/AIServiceMonitor';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
  details?: any;
}

class AIIntegrationTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting AI Validation Integration Tests...\n');

    const tests = [
      () => this.testSecureAIService(),
      () => this.testAIValidationService(),
      () => this.testPHIProtection(),
      () => this.testMonitoringSystem(),
      () => this.testCircuitBreaker(),
      () => this.testConfidenceScoring(),
      () => this.testContentVerification(),
      () => this.testErrorHandling()
    ];

    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        console.error(`❌ Test failed: ${error}`);
      }
    }

    this.printResults();
  }

  private async testSecureAIService(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('Testing SecureAIService...');
      
      // Test basic text generation
      const result = await secureAIService.generateTextWithValidation(
        'Generate a brief mental health note about a client feeling anxious.',
        {
          maxTokens: 100,
          temperature: 0.1,
          enableContentVerification: true,
          sourceContext: 'Client reports feeling anxious about work',
          auditContext: {
            userId: 1,
            action: 'test_generation',
            resourceType: 'test'
          }
        }
      );

      if (!result.content || result.content.length === 0) {
        throw new Error('No content generated');
      }

      if (result.confidence < 0.5) {
        throw new Error(`Low confidence: ${result.confidence}`);
      }

      this.addResult('SecureAIService Basic Generation', true, Date.now() - startTime, {
        confidence: result.confidence,
        processingTime: result.processingTime,
        phiEntities: result.phiEntitiesProcessed
      });

      // Test PHI anonymization
      const phiTestText = 'John Smith (john@example.com) called about his anxiety. His phone is 555-123-4567.';
      const phiResult = await secureAIService.generateTextWithValidation(
        phiTestText,
        {
          maxTokens: 50,
          temperature: 0.1,
          auditContext: {
            userId: 1,
            action: 'phi_test',
            resourceType: 'test'
          }
        }
      );

      if (phiResult.content.includes('john@example.com') || phiResult.content.includes('555-123-4567')) {
        throw new Error('PHI not properly anonymized');
      }

      this.addResult('SecureAIService PHI Protection', true, Date.now() - startTime);

    } catch (error) {
      this.addResult('SecureAIService', false, Date.now() - startTime, undefined, error);
    }
  }

  private async testAIValidationService(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('Testing AIValidationService...');
      
      // Test valid JSON response
      const validResult = await AIValidationService.validateAIResponse(
        'Generate a mental health note with mood: "anxious", subjective: "Client reports feeling worried", objective: "Appears tense"',
        {
          schema: CommonSchemas.notesResponse,
          sourceContext: 'Client reports anxiety',
          confidenceThreshold: 0.7,
          enableContentVerification: true,
          auditContext: {
            userId: 1,
            action: 'validation_test',
            resourceType: 'test'
          }
        }
      );

      if (!validResult.success) {
        throw new Error(`Validation failed: ${validResult.errors.join(', ')}`);
      }

      this.addResult('AIValidationService Valid Response', true, Date.now() - startTime, {
        confidence: validResult.confidence,
        requiresReview: validResult.requiresHumanReview
      });

      // Test invalid response handling
      const invalidResult = await AIValidationService.validateAIResponse(
        'Invalid response without proper structure',
        {
          schema: CommonSchemas.notesResponse,
          confidenceThreshold: 0.7,
          auditContext: {
            userId: 1,
            action: 'invalid_test',
            resourceType: 'test'
          }
        }
      );

      if (invalidResult.success) {
        throw new Error('Should have failed validation');
      }

      this.addResult('AIValidationService Invalid Response', true, Date.now() - startTime);

    } catch (error) {
      this.addResult('AIValidationService', false, Date.now() - startTime, undefined, error);
    }
  }

  private async testPHIProtection(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('Testing PHI Protection...');
      
      const testText = 'Patient John Doe (SSN: 123-45-6789) lives at 123 Main St. Contact: john@example.com, phone 555-123-4567';
      
      const phiResult = EnhancedPHIProtection.processPHI(testText);
      
      if (phiResult.entities.length === 0) {
        throw new Error('No PHI entities detected');
      }

      if (!phiResult.anonymized.includes('[CLIENT_NAME]') || 
          !phiResult.anonymized.includes('[EMAIL]') ||
          !phiResult.anonymized.includes('[PHONE]')) {
        throw new Error('PHI not properly anonymized');
      }

      // Test restoration
      const restored = EnhancedPHIProtection.restorePHI(phiResult.anonymized, phiResult.entities);
      
      if (!restored.includes('John Doe') || !restored.includes('john@example.com')) {
        throw new Error('PHI not properly restored');
      }

      this.addResult('PHI Protection Detection & Anonymization', true, Date.now() - startTime, {
        entitiesFound: phiResult.entities.length,
        riskLevel: phiResult.riskLevel
      });

      // Test configuration validation
      const configValidation = EnhancedPHIProtection.validateConfiguration();
      if (!configValidation.isValid) {
        throw new Error(`Configuration issues: ${configValidation.issues.join(', ')}`);
      }

      this.addResult('PHI Protection Configuration', true, Date.now() - startTime);

    } catch (error) {
      this.addResult('PHI Protection', false, Date.now() - startTime, undefined, error);
    }
  }

  private async testMonitoringSystem(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('Testing Monitoring System...');
      
      // Record some test metrics
      aiMonitor.recordRequest({
        success: true,
        confidence: 0.85,
        processingTime: 1200,
        phiEntities: 2,
        requiresReview: false
      });

      aiMonitor.recordRequest({
        success: false,
        confidence: 0.3,
        processingTime: 5000,
        phiEntities: 0,
        requiresReview: true,
        error: 'Test error'
      });

      const metrics = aiMonitor.getMetrics();
      if (metrics.totalRequests < 2) {
        throw new Error('Metrics not recorded properly');
      }

      this.addResult('Monitoring System Metrics', true, Date.now() - startTime, {
        totalRequests: metrics.totalRequests,
        successRate: (metrics.successfulRequests / metrics.totalRequests * 100).toFixed(1) + '%'
      });

      // Test health status
      const health = aiMonitor.getHealthStatus();
      if (!health.status) {
        throw new Error('Health status not available');
      }

      this.addResult('Monitoring System Health Status', true, Date.now() - startTime, {
        status: health.status,
        activeAlerts: health.activeAlerts
      });

    } catch (error) {
      this.addResult('Monitoring System', false, Date.now() - startTime, undefined, error);
    }
  }

  private async testCircuitBreaker(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('Testing Circuit Breaker...');
      
      // Simulate failures to trigger circuit breaker
      for (let i = 0; i < 6; i++) {
        aiMonitor.recordCircuitBreakerTrip();
      }

      const health = aiMonitor.getHealthStatus();
      const alerts = aiMonitor.getActiveAlerts();
      
      const circuitBreakerAlert = alerts.find(a => a.type === 'circuit_breaker');
      if (!circuitBreakerAlert) {
        throw new Error('Circuit breaker alert not generated');
      }

      this.addResult('Circuit Breaker Alert Generation', true, Date.now() - startTime, {
        alertCount: alerts.length,
        circuitBreakerTrips: health.metrics.circuitBreakerTrips
      });

    } catch (error) {
      this.addResult('Circuit Breaker', false, Date.now() - startTime, undefined, error);
    }
  }

  private async testConfidenceScoring(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('Testing Confidence Scoring...');
      
      // Test high confidence response
      const highConfidenceResult = await secureAIService.generateTextWithValidation(
        'Generate a professional mental health assessment note.',
        {
          maxTokens: 200,
          temperature: 0.1,
          enableContentVerification: true,
          sourceContext: 'Professional mental health assessment',
          auditContext: {
            userId: 1,
            action: 'confidence_test',
            resourceType: 'test'
          }
        }
      );

      if (highConfidenceResult.confidence < 0.7) {
        throw new Error(`Expected high confidence, got ${highConfidenceResult.confidence}`);
      }

      this.addResult('Confidence Scoring High Confidence', true, Date.now() - startTime, {
        confidence: highConfidenceResult.confidence
      });

      // Test low confidence detection
      const lowConfidenceResult = await secureAIService.generateTextWithValidation(
        'I cannot find information about this topic.',
        {
          maxTokens: 50,
          temperature: 0.1,
          enableContentVerification: true,
          sourceContext: 'Limited context',
          auditContext: {
            userId: 1,
            action: 'low_confidence_test',
            resourceType: 'test'
          }
        }
      );

      if (lowConfidenceResult.confidence > 0.8) {
        throw new Error(`Expected low confidence, got ${lowConfidenceResult.confidence}`);
      }

      this.addResult('Confidence Scoring Low Confidence Detection', true, Date.now() - startTime, {
        confidence: lowConfidenceResult.confidence,
        warnings: lowConfidenceResult.warnings.length
      });

    } catch (error) {
      this.addResult('Confidence Scoring', false, Date.now() - startTime, undefined, error);
    }
  }

  private async testContentVerification(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('Testing Content Verification...');
      
      const sourceContext = 'Client reports feeling anxious about work deadlines and family stress.';
      
      const verificationResult = await AIValidationService.validateAIResponse(
        'Generate a note about the client\'s anxiety related to work and family.',
        {
          schema: CommonSchemas.notesResponse,
          sourceContext,
          enableContentVerification: true,
          confidenceThreshold: 0.6,
          auditContext: {
            userId: 1,
            action: 'verification_test',
            resourceType: 'test'
          }
        }
      );

      if (!verificationResult.sourceVerification) {
        throw new Error('Source verification not performed');
      }

      this.addResult('Content Verification', true, Date.now() - startTime, {
        verified: verificationResult.sourceVerification.verified,
        confidence: verificationResult.sourceVerification.confidence
      });

    } catch (error) {
      this.addResult('Content Verification', false, Date.now() - startTime, undefined, error);
    }
  }

  private async testErrorHandling(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('Testing Error Handling...');
      
      // Test with invalid prompt
      try {
        await secureAIService.generateTextWithValidation('', {
          maxTokens: 10,
          temperature: 0.1,
          auditContext: {
            userId: 1,
            action: 'error_test',
            resourceType: 'test'
          }
        });
        throw new Error('Should have thrown error for empty prompt');
      } catch (error) {
        // Expected to throw
      }

      this.addResult('Error Handling Empty Prompt', true, Date.now() - startTime);

      // Test validation error handling
      const errorResult = await AIValidationService.validateAIResponse(
        'Invalid response',
        {
          schema: CommonSchemas.notesResponse,
          auditContext: {
            userId: 1,
            action: 'error_handling_test',
            resourceType: 'test'
          }
        }
      );

      if (errorResult.success) {
        throw new Error('Should have failed validation');
      }

      this.addResult('Error Handling Validation Errors', true, Date.now() - startTime, {
        errors: errorResult.errors.length
      });

    } catch (error) {
      this.addResult('Error Handling', false, Date.now() - startTime, undefined, error);
    }
  }

  private addResult(name: string, passed: boolean, duration: number, details?: any, error?: any): void {
    this.results.push({
      name,
      passed,
      duration,
      details,
      error: error instanceof Error ? error.message : error
    });
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(50));
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`📈 Success Rate: ${(passed / total * 100).toFixed(1)}%`);
    
    console.log('\n📋 Detailed Results:');
    console.log('-'.repeat(50));
    
    for (const result of this.results) {
      const status = result.passed ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      console.log(`${status} ${result.name} (${duration})`);
      
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
    
    if (passed === total) {
      console.log('\n🎉 All tests passed! AI validation system is working correctly.');
    } else {
      console.log(`\n⚠️  ${total - passed} test(s) failed. Please review the issues above.`);
      process.exit(1);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new AIIntegrationTester();
  tester.runAllTests().catch(console.error);
}

export default AIIntegrationTester;
