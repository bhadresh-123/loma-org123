/**
 * AI Service Monitoring and Alerting System
 * 
 * Provides comprehensive monitoring, metrics collection, and alerting
 * for AI services, validation, and PHI processing.
 */

import { EventEmitter } from 'events';
import { HIPAAAuditService } from '../services/HIPAAService';
import crypto from 'crypto';

export interface AIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageConfidence: number;
  averageProcessingTime: number;
  phiEntitiesProcessed: number;
  humanReviewRequired: number;
  circuitBreakerTrips: number;
  lastUpdated: Date;
}

export interface AlertThresholds {
  lowConfidenceThreshold: number;
  highFailureRateThreshold: number;
  slowProcessingThreshold: number;
  highPHIThreshold: number;
  circuitBreakerThreshold: number;
}

export interface Alert {
  id: string;
  type: 'confidence' | 'failure_rate' | 'processing_time' | 'phi_risk' | 'circuit_breaker' | 'validation_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  metadata: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
}

export class AIServiceMonitor extends EventEmitter {
  private static instance: AIServiceMonitor;
  private metrics: AIMetrics;
  private alerts: Map<string, Alert> = new Map();
  private thresholds: AlertThresholds;
  private requestHistory: Array<{
    timestamp: Date;
    success: boolean;
    confidence: number;
    processingTime: number;
    phiEntities: number;
    requiresReview: boolean;
    error?: string;
  }> = [];

  private constructor() {
    super();
    this.metrics = this.initializeMetrics();
    this.thresholds = this.initializeThresholds();
    this.startMonitoring();
  }

  static getInstance(): AIServiceMonitor {
    if (!AIServiceMonitor.instance) {
      AIServiceMonitor.instance = new AIServiceMonitor();
    }
    return AIServiceMonitor.instance;
  }

  private initializeMetrics(): AIMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageConfidence: 0,
      averageProcessingTime: 0,
      phiEntitiesProcessed: 0,
      humanReviewRequired: 0,
      circuitBreakerTrips: 0,
      lastUpdated: new Date()
    };
  }

  private initializeThresholds(): AlertThresholds {
    return {
      lowConfidenceThreshold: 0.7,
      highFailureRateThreshold: 0.2,
      slowProcessingThreshold: 5000, // 5 seconds
      highPHIThreshold: 10,
      circuitBreakerThreshold: 5
    };
  }

  /**
   * Record an AI request
   */
  recordRequest(params: {
    success: boolean;
    confidence: number;
    processingTime: number;
    phiEntities: number;
    requiresReview: boolean;
    error?: string;
  }): void {
    const record = {
      timestamp: new Date(),
      ...params
    };

    this.requestHistory.push(record);
    
    // Keep only last 1000 requests
    if (this.requestHistory.length > 1000) {
      this.requestHistory = this.requestHistory.slice(-1000);
    }

    this.updateMetrics();
    this.checkAlerts();
    
    // Emit metrics update event
    this.emit('metricsUpdated', this.metrics);
  }

  /**
   * Record circuit breaker trip
   */
  recordCircuitBreakerTrip(): void {
    this.metrics.circuitBreakerTrips++;
    this.createAlert({
      type: 'circuit_breaker',
      severity: 'high',
      message: 'AI service circuit breaker activated',
      metadata: {
        tripCount: this.metrics.circuitBreakerTrips,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Record PHI processing event
   */
  recordPHIProcessing(params: {
    entityCount: number;
    riskLevel: 'low' | 'medium' | 'high';
    requiresReview: boolean;
    userId: number;
    action: string;
  }): void {
    this.metrics.phiEntitiesProcessed += params.entityCount;

    if (params.riskLevel === 'high' || params.entityCount > this.thresholds.highPHIThreshold) {
      this.createAlert({
        type: 'phi_risk',
        severity: params.riskLevel === 'high' ? 'high' : 'medium',
        message: `High PHI risk detected: ${params.entityCount} entities, risk level: ${params.riskLevel}`,
        metadata: {
          entityCount: params.entityCount,
          riskLevel: params.riskLevel,
          requiresReview: params.requiresReview,
          userId: params.userId,
          action: params.action
        }
      });
    }
  }

  /**
   * Update metrics based on request history
   */
  private updateMetrics(): void {
    const recentRequests = this.requestHistory.slice(-100); // Last 100 requests
    
    this.metrics.totalRequests = this.requestHistory.length;
    this.metrics.successfulRequests = this.requestHistory.filter(r => r.success).length;
    this.metrics.failedRequests = this.requestHistory.filter(r => !r.success).length;
    
    if (recentRequests.length > 0) {
      this.metrics.averageConfidence = recentRequests.reduce((sum, r) => sum + r.confidence, 0) / recentRequests.length;
      this.metrics.averageProcessingTime = recentRequests.reduce((sum, r) => sum + r.processingTime, 0) / recentRequests.length;
      this.metrics.humanReviewRequired = recentRequests.filter(r => r.requiresReview).length;
    }
    
    this.metrics.lastUpdated = new Date();
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(): void {
    const recentRequests = this.requestHistory.slice(-50); // Last 50 requests
    
    if (recentRequests.length < 10) return; // Need minimum data

    // Check confidence threshold
    const lowConfidenceCount = recentRequests.filter(r => r.confidence < this.thresholds.lowConfidenceThreshold).length;
    if (lowConfidenceCount > recentRequests.length * 0.3) {
      this.createAlert({
        type: 'confidence',
        severity: 'medium',
        message: `Low confidence responses detected: ${lowConfidenceCount}/${recentRequests.length} requests below threshold`,
        metadata: {
          lowConfidenceCount,
          totalRequests: recentRequests.length,
          threshold: this.thresholds.lowConfidenceThreshold
        }
      });
    }

    // Check failure rate
    const failureRate = recentRequests.filter(r => !r.success).length / recentRequests.length;
    if (failureRate > this.thresholds.highFailureRateThreshold) {
      this.createAlert({
        type: 'failure_rate',
        severity: 'high',
        message: `High failure rate detected: ${(failureRate * 100).toFixed(1)}%`,
        metadata: {
          failureRate,
          threshold: this.thresholds.highFailureRateThreshold,
          failedRequests: recentRequests.filter(r => !r.success).length
        }
      });
    }

    // Check processing time
    const slowRequests = recentRequests.filter(r => r.processingTime > this.thresholds.slowProcessingThreshold).length;
    if (slowRequests > recentRequests.length * 0.2) {
      this.createAlert({
        type: 'processing_time',
        severity: 'medium',
        message: `Slow processing detected: ${slowRequests}/${recentRequests.length} requests exceeded threshold`,
        metadata: {
          slowRequests,
          totalRequests: recentRequests.length,
          threshold: this.thresholds.slowProcessingThreshold
        }
      });
    }
  }

  /**
   * Create a new alert
   */
  private createAlert(params: {
    type: Alert['type'];
    severity: Alert['severity'];
    message: string;
    metadata: Record<string, any>;
  }): void {
    const alert: Alert = {
      id: crypto.randomUUID(),
      type: params.type,
      severity: params.severity,
      message: params.message,
      timestamp: new Date(),
      metadata: params.metadata,
      resolved: false
    };

    // Check if similar alert already exists
    const existingAlert = Array.from(this.alerts.values()).find(a => 
      a.type === alert.type && 
      !a.resolved && 
      Date.now() - a.timestamp.getTime() < 300000 // 5 minutes
    );

    if (!existingAlert) {
      this.alerts.set(alert.id, alert);
      this.emit('alert', alert);
      
      // Log critical alerts
      if (alert.severity === 'critical' || alert.severity === 'high') {
        console.error(`[AI_MONITOR] ${alert.severity.toUpperCase()} ALERT: ${alert.message}`, alert.metadata);
      }
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.emit('alertResolved', alert);
      return true;
    }
    return false;
  }

  /**
   * Get current metrics
   */
  getMetrics(): AIMetrics {
    return { ...this.metrics };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(a => !a.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Update alert thresholds
   */
  updateThresholds(newThresholds: Partial<AlertThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    this.emit('thresholdsUpdated', this.thresholds);
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    metrics: AIMetrics;
    activeAlerts: number;
    criticalAlerts: number;
  } {
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalAlerts > 0) {
      status = 'critical';
    } else if (activeAlerts.length > 0) {
      status = 'warning';
    }

    return {
      status,
      metrics: this.metrics,
      activeAlerts: activeAlerts.length,
      criticalAlerts
    };
  }

  /**
   * Start background monitoring
   */
  private startMonitoring(): void {
    // Clean up old alerts every hour
    setInterval(() => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      for (const [id, alert] of this.alerts.entries()) {
        if (alert.timestamp < cutoff) {
          this.alerts.delete(id);
        }
      }
    }, 60 * 60 * 1000); // 1 hour

    // Log metrics every 5 minutes
    setInterval(() => {
      console.log('[AI_MONITOR] Metrics:', {
        totalRequests: this.metrics.totalRequests,
        successRate: this.metrics.totalRequests > 0 ? (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(1) + '%' : '0%',
        averageConfidence: this.metrics.averageConfidence.toFixed(2),
        averageProcessingTime: this.metrics.averageProcessingTime.toFixed(0) + 'ms',
        activeAlerts: this.getActiveAlerts().length
      });
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): {
    timestamp: string;
    metrics: AIMetrics;
    alerts: Alert[];
    health: ReturnType<typeof this.getHealthStatus>;
  } {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      alerts: this.getAllAlerts(),
      health: this.getHealthStatus()
    };
  }
}

// Export singleton instance
export const aiMonitor = AIServiceMonitor.getInstance();

// Export types
export type { AIMetrics, AlertThresholds, Alert };

export default AIServiceMonitor;
