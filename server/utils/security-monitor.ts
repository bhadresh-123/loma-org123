import { Request } from 'express';
import { db, getActiveSchema } from '../../db';
import { eq, and, gte } from 'drizzle-orm';
import { auditLogger, AuditAction, ResourceType } from './audit-system';
import * as crypto from 'crypto';

export interface SecurityAnalysis {
  riskScore: number;
  threats: SecurityThreat[];
  recommendations: string[];
  shouldBlock: boolean;
}

export interface SecurityThreat {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  evidence: string;
  recommendation?: string;
}

export interface SecurityIncident {
  type: string;
  userId?: number;
  ipAddress?: string;
  userAgent?: string;
  description: string;
  riskScore: number;
  evidence: any;
}

export interface IncidentResponse {
  incidentId: string;
  severity: string;
  actions: string[];
  recommendations: string[];
}

export interface AutomatedResponse {
  actions: string[];
  recommendations: string[];
}

export class SecurityMonitor {
  private static readonly THREAT_PATTERNS = {
    SQL_INJECTION: /(\b(union|select|insert|update|delete|drop|create|alter)\b.*\b(from|where|and|or)\b)|('.*'.*=.*')|(--.*)|(\/\*.*\*\/)/i,
    XSS_ATTEMPT: /<script[^>]*>.*?<\/script>|javascript:|on\w+\s*=|<iframe|<object|<embed/i,
    PATH_TRAVERSAL: /(\.\.[\/\\]|\.\.%2f|\.\.%5c|%2e%2e%2f|%2e%2e%5c)/i,
    COMMAND_INJECTION: /(\||&|;|`|\$\(|<|>|\{|\})/,
    LDAP_INJECTION: /(\(\||\(\&|\*\)|\|\|)/i
  };

  private static readonly RISK_THRESHOLDS = {
    LOW: 10,
    MEDIUM: 25,
    HIGH: 50,
    CRITICAL: 75
  };

  static async analyzeRequest(req: Request): Promise<SecurityAnalysis> {
    const analysis: SecurityAnalysis = {
      riskScore: 0,
      threats: [],
      recommendations: [],
      shouldBlock: false
    };

    // Analyze URL parameters
    const urlAnalysis = this.analyzeUrlParameters(req.url || '');
    analysis.riskScore += urlAnalysis.riskScore;
    analysis.threats.push(...urlAnalysis.threats);

    // Analyze request body
    if (req.body) {
      const bodyAnalysis = this.analyzeRequestBody(req.body);
      analysis.riskScore += bodyAnalysis.riskScore;
      analysis.threats.push(...bodyAnalysis.threats);
    }

    // Analyze headers
    const headerAnalysis = this.analyzeHeaders(req.headers);
    analysis.riskScore += headerAnalysis.riskScore;
    analysis.threats.push(...headerAnalysis.threats);

    // Rate limiting analysis
    const rateLimitAnalysis = await this.analyzeRateLimit(req.ip);
    analysis.riskScore += rateLimitAnalysis.riskScore;
    analysis.threats.push(...rateLimitAnalysis.threats);

    // Determine action
    analysis.shouldBlock = analysis.riskScore >= this.RISK_THRESHOLDS.HIGH;
    analysis.recommendations = this.generateSecurityRecommendations(analysis);

    // Log security analysis if concerning
    if (analysis.riskScore >= this.RISK_THRESHOLDS.MEDIUM) {
      await this.logSecurityEvent(req, analysis);
    }

    return analysis;
  }

  static async handleSecurityIncident(
    incident: SecurityIncident
  ): Promise<IncidentResponse> {
    const incidentId = crypto.randomUUID();
    
    // Classify incident severity
    const severity = this.classifyIncidentSeverity(incident);
    
    // Create incident record
    await db.insert(securityIncidents).values({
      id: incidentId,
      type: incident.type,
      severity,
      user_id: incident.userId || null,
      ip_address: incident.ipAddress || null,
      user_agent: incident.userAgent || null,
      description: incident.description,
      risk_score: incident.riskScore,
      evidence: incident.evidence,
      status: 'OPEN',
      created_at: new Date()
    });

    // Execute automated response
    const response = await this.executeAutomatedResponse(incident, severity);
    
    // Send alerts
    await this.sendSecurityAlerts(incident, severity);
    
    // Log incident
    await auditLogger.logEvent({
      userId: incident.userId || 0,
      action: AuditAction.CREATE,
      resourceType: ResourceType.SYSTEM,
      success: true,
      ipAddress: incident.ipAddress,
      additionalData: {
        incidentId,
        incidentType: incident.type,
        severity,
        automatedResponse: response.actions
      }
    });

    return {
      incidentId,
      severity,
      actions: response.actions,
      recommendations: response.recommendations
    };
  }

  static async getSecurityMetrics(timeframe: number = 24): Promise<any> {
    const since = new Date(Date.now() - timeframe * 60 * 60 * 1000);

    const incidents = await db.select()
      .from(securityIncidents)
      .where(gte(securityIncidents.created_at, since));

    const metrics = {
      totalIncidents: incidents.length,
      criticalIncidents: incidents.filter(i => i.severity === 'CRITICAL').length,
      highIncidents: incidents.filter(i => i.severity === 'HIGH').length,
      mediumIncidents: incidents.filter(i => i.severity === 'MEDIUM').length,
      lowIncidents: incidents.filter(i => i.severity === 'LOW').length,
      uniqueIPs: new Set(incidents.map(i => i.ip_address).filter(Boolean)).size,
      incidentTypes: this.groupByField(incidents, 'type'),
      timeDistribution: this.groupByHour(incidents)
    };

    return metrics;
  }

  private static analyzeUrlParameters(url: string): SecurityAnalysis {
    const analysis: SecurityAnalysis = {
      riskScore: 0,
      threats: [],
      recommendations: [],
      shouldBlock: false
    };

    // Check for injection attempts
    Object.entries(this.THREAT_PATTERNS).forEach(([threatType, pattern]) => {
      if (pattern.test(url)) {
        analysis.threats.push({
          type: threatType,
          severity: 'HIGH',
          evidence: 'Malicious pattern detected in URL',
          recommendation: 'Block request and investigate source'
        });
        analysis.riskScore += 30;
      }
    });

    // Check for suspicious parameters
    const suspiciousParams = ['admin', 'root', 'password', 'config', 'system'];
    suspiciousParams.forEach(param => {
      if (url.toLowerCase().includes(param)) {
        analysis.threats.push({
          type: 'SUSPICIOUS_PARAMETER',
          severity: 'MEDIUM',
          evidence: `Suspicious parameter detected: ${param}`,
          recommendation: 'Monitor for additional suspicious activity'
        });
        analysis.riskScore += 10;
      }
    });

    return analysis;
  }

  private static analyzeRequestBody(body: any): SecurityAnalysis {
    const analysis: SecurityAnalysis = {
      riskScore: 0,
      threats: [],
      recommendations: [],
      shouldBlock: false
    };

    const bodyString = JSON.stringify(body);

    // Check for injection patterns in body
    Object.entries(this.THREAT_PATTERNS).forEach(([threatType, pattern]) => {
      if (pattern.test(bodyString)) {
        analysis.threats.push({
          type: threatType,
          severity: 'HIGH',
          evidence: 'Malicious pattern detected in request body',
          recommendation: 'Block request and log incident'
        });
        analysis.riskScore += 35;
      }
    });

    // Check for oversized requests
    if (bodyString.length > 100000) { // 100KB
      analysis.threats.push({
        type: 'OVERSIZED_REQUEST',
        severity: 'MEDIUM',
        evidence: `Request body size: ${bodyString.length} bytes`,
        recommendation: 'Implement request size limits'
      });
      analysis.riskScore += 15;
    }

    return analysis;
  }

  private static analyzeHeaders(headers: any): SecurityAnalysis {
    const analysis: SecurityAnalysis = {
      riskScore: 0,
      threats: [],
      recommendations: [],
      shouldBlock: false
    };

    // Check for suspicious user agents
    const userAgent = headers['user-agent'] || '';
    const suspiciousAgents = ['sqlmap', 'nikto', 'nmap', 'burp', 'scanner'];
    
    suspiciousAgents.forEach(agent => {
      if (userAgent.toLowerCase().includes(agent)) {
        analysis.threats.push({
          type: 'MALICIOUS_USER_AGENT',
          severity: 'HIGH',
          evidence: `Suspicious user agent: ${agent}`,
          recommendation: 'Block IP and investigate'
        });
        analysis.riskScore += 40;
      }
    });

    // Check for missing security headers
    if (!headers['x-requested-with'] && !headers['origin']) {
      analysis.threats.push({
        type: 'MISSING_SECURITY_HEADERS',
        severity: 'LOW',
        evidence: 'Missing standard security headers',
        recommendation: 'Verify request legitimacy'
      });
      analysis.riskScore += 5;
    }

    return analysis;
  }

  private static async analyzeRateLimit(ipAddress: string): Promise<SecurityAnalysis> {
    // TODO: Implement rate limiting analysis
    return {
      riskScore: 0,
      threats: [],
      recommendations: [],
      shouldBlock: false
    };
  }

  private static classifyIncidentSeverity(incident: SecurityIncident): string {
    if (incident.riskScore >= this.RISK_THRESHOLDS.CRITICAL) return 'CRITICAL';
    if (incident.riskScore >= this.RISK_THRESHOLDS.HIGH) return 'HIGH';
    if (incident.riskScore >= this.RISK_THRESHOLDS.MEDIUM) return 'MEDIUM';
    return 'LOW';
  }

  private static async executeAutomatedResponse(
    incident: SecurityIncident, 
    severity: string
  ): Promise<AutomatedResponse> {
    const actions = [];
    const recommendations = [];

    switch (severity) {
      case 'CRITICAL':
        if (incident.ipAddress) {
          await this.blockIpAddress(incident.ipAddress, 24 * 60); // 24 hours
          actions.push('IP_BLOCKED');
        }
        
        if (incident.userId) {
          await this.terminateAllUserSessions(incident.userId);
          actions.push('SESSIONS_TERMINATED');
        }
        
        recommendations.push('Investigate immediately');
        recommendations.push('Consider law enforcement notification');
        break;

      case 'HIGH':
        if (incident.ipAddress) {
          await this.throttleIpAddress(incident.ipAddress, 60); // 1 hour
          actions.push('IP_THROTTLED');
        }
        
        recommendations.push('Investigate within 1 hour');
        recommendations.push('Consider blocking if pattern continues');
        break;

      case 'MEDIUM':
        if (incident.ipAddress) {
          await this.increaseMonitoring(incident.ipAddress, 30); // 30 minutes
          actions.push('MONITORING_INCREASED');
        }
        
        recommendations.push('Monitor for escalation');
        recommendations.push('Review in next 4 hours');
        break;

      default:
        recommendations.push('Log for trend analysis');
        break;
    }

    return { actions, recommendations };
  }

  private static generateSecurityRecommendations(analysis: SecurityAnalysis): string[] {
    const recommendations = [];

    if (analysis.riskScore >= this.RISK_THRESHOLDS.HIGH) {
      recommendations.push('Block this request immediately');
      recommendations.push('Investigate source IP address');
    }

    if (analysis.threats.some(t => t.type.includes('INJECTION'))) {
      recommendations.push('Implement input validation');
      recommendations.push('Use parameterized queries');
    }

    if (analysis.threats.some(t => t.type === 'MALICIOUS_USER_AGENT')) {
      recommendations.push('Block automated scanning tools');
    }

    return recommendations;
  }

  private static async logSecurityEvent(req: Request, analysis: SecurityAnalysis): Promise<void> {
    await auditLogger.logEvent({
      userId: req.user?.id || 0,
      action: AuditAction.READ,
      resourceType: ResourceType.SYSTEM,
      success: false,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      additionalData: {
        securityAnalysis: analysis,
        requestUrl: req.url,
        requestMethod: req.method,
        securityThreat: true
      }
    });
  }

  private static async sendSecurityAlerts(incident: SecurityIncident, severity: string): Promise<void> {
    // Log to console for immediate visibility
    console.warn(`🚨 Security Alert [${severity}]: ${incident.type} - ${incident.description}`);
    
    // Send email alerts for HIGH and CRITICAL incidents
    if (severity === 'HIGH' || severity === 'CRITICAL') {
      try {
        const emailService = (await import('./email-service.js')).default;
        await emailService.sendSecurityAlert({
          severity,
          incidentType: incident.type,
          description: incident.description,
          ipAddress: incident.ipAddress,
          userId: incident.userId,
          timestamp: incident.timestamp,
          automatedActions: incident.automatedResponse?.actions || [],
          recommendations: incident.automatedResponse?.recommendations || []
        });
      } catch (error) {
        // Email alerting is optional - log error but don't fail
        console.error('Failed to send security alert email:', error);
      }
    }
  }

  private static async blockIpAddress(ipAddress: string, durationMinutes: number): Promise<void> {
    // TODO: Implement IP blocking
    console.log(`Blocking IP ${ipAddress} for ${durationMinutes} minutes`);
  }

  private static async throttleIpAddress(ipAddress: string, durationMinutes: number): Promise<void> {
    // TODO: Implement IP throttling
    console.log(`Throttling IP ${ipAddress} for ${durationMinutes} minutes`);
  }

  private static async increaseMonitoring(ipAddress: string, durationMinutes: number): Promise<void> {
    // TODO: Implement enhanced monitoring
    console.log(`Increasing monitoring for IP ${ipAddress} for ${durationMinutes} minutes`);
  }

  private static async terminateAllUserSessions(userId: number): Promise<void> {
    // TODO: Implement session termination
    console.log(`Terminating all sessions for user ${userId}`);
  }

  private static groupByField(items: any[], field: string): Record<string, number> {
    return items.reduce((acc, item) => {
      const key = item[field] || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  private static groupByHour(items: any[]): Record<string, number> {
    return items.reduce((acc, item) => {
      const hour = new Date(item.created_at).getHours();
      const key = `${hour}:00`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }
}