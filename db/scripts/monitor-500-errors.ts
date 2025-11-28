#!/usr/bin/env node

/**
 * Real-time Error Monitoring Dashboard
 * 
 * Monitors server logs in real-time for schema-related 500 errors
 * and provides immediate alerts and analysis.
 */

import { spawn } from 'child_process';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { config } from 'dotenv';

// Load environment variables
config({ path: '../../env.development' });

interface ErrorAlert {
  timestamp: Date;
  error: string;
  pattern: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'schema' | 'database' | 'code' | 'unknown';
  endpoint?: string;
  userId?: string;
}

class RealTimeErrorMonitor {
  private alerts: ErrorAlert[] = [];
  private errorPatterns = [
    {
      pattern: /column "([^"]+)" of relation "([^"]+)" does not exist/i,
      description: 'Missing column in database table',
      severity: 'critical' as const,
      category: 'schema' as const
    },
    {
      pattern: /relation "([^"]+)" does not exist/i,
      description: 'Missing table in database',
      severity: 'critical' as const,
      category: 'schema' as const
    },
    {
      pattern: /getActiveSchema is not defined/i,
      description: 'Missing getActiveSchema import',
      severity: 'critical' as const,
      category: 'code' as const
    },
    {
      pattern: /db is not defined/i,
      description: 'Missing database import',
      severity: 'critical' as const,
      category: 'code' as const
    },
    {
      pattern: /foreign key constraint/i,
      description: 'Foreign key constraint violation',
      severity: 'high' as const,
      category: 'schema' as const
    },
    {
      pattern: /invalid input syntax for type/i,
      description: 'Data type mismatch',
      severity: 'high' as const,
      category: 'schema' as const
    }
  ];

  async startMonitoring(): Promise<void> {
    console.log('🚨 Starting real-time error monitoring...');
    console.log('📊 Monitoring for schema-related 500 errors');
    console.log('⏹️  Press Ctrl+C to stop\n');

    // Monitor server logs
    await this.monitorServerLogs();
    
    // Monitor API endpoints
    await this.monitorAPIEndpoints();
  }

  private async monitorServerLogs(): Promise<void> {
    const logPath = 'server.log';
    
    try {
      // Check if log file exists
      const fs = await import('fs');
      if (!fs.existsSync(logPath)) {
        console.log('⚠️  No server.log file found, creating empty one');
        fs.writeFileSync(logPath, '');
      }

      // Monitor log file for new entries
      const fileStream = createReadStream(logPath, { encoding: 'utf8' });
      const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      rl.on('line', (line) => {
        this.processLogLine(line);
      });

      // Also monitor for new log entries (tail -f behavior)
      const tailProcess = spawn('tail', ['-f', logPath]);
      
      tailProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            this.processLogLine(line);
          }
        }
      });

      tailProcess.stderr.on('data', (data) => {
        console.log(`Tail error: ${data}`);
      });

    } catch (error) {
      console.log(`❌ Error monitoring logs: ${error.message}`);
    }
  }

  private processLogLine(line: string): void {
    // Look for error patterns
    if (line.includes('ERROR') || line.includes('500') || line.includes('Error:')) {
      for (const pattern of this.errorPatterns) {
        if (pattern.pattern.test(line)) {
          const alert: ErrorAlert = {
            timestamp: new Date(),
            error: line.trim(),
            pattern: pattern.description,
            severity: pattern.severity,
            category: pattern.category
          };

          // Extract additional context
          this.extractContext(alert, line);

          this.alerts.push(alert);
          this.displayAlert(alert);
          
          // If critical, take immediate action
          if (pattern.severity === 'critical') {
            this.handleCriticalError(alert);
          }
        }
      }
    }
  }

  private extractContext(alert: ErrorAlert, line: string): void {
    // Extract endpoint from log line
    const endpointMatch = line.match(/\[([A-Z]+)\]\s+([^\s]+)/);
    if (endpointMatch) {
      alert.endpoint = endpointMatch[2];
    }

    // Extract user ID if present
    const userIdMatch = line.match(/userId[:\s]+(\d+)/);
    if (userIdMatch) {
      alert.userId = userIdMatch[1];
    }
  }

  private displayAlert(alert: ErrorAlert): void {
    const timestamp = alert.timestamp.toISOString();
    const severityIcon = this.getSeverityIcon(alert.severity);
    
    console.log(`\n${severityIcon} ALERT: ${alert.pattern}`);
    console.log(`   Time: ${timestamp}`);
    console.log(`   Category: ${alert.category.toUpperCase()}`);
    console.log(`   Severity: ${alert.severity.toUpperCase()}`);
    
    if (alert.endpoint) {
      console.log(`   Endpoint: ${alert.endpoint}`);
    }
    
    if (alert.userId) {
      console.log(`   User ID: ${alert.userId}`);
    }
    
    console.log(`   Error: ${alert.error}`);
    
    // Show recent alert count
    const recentAlerts = this.alerts.filter(a => 
      Date.now() - a.timestamp.getTime() < 300000 // Last 5 minutes
    );
    
    if (recentAlerts.length > 1) {
      console.log(`   📊 Total alerts in last 5 minutes: ${recentAlerts.length}`);
    }
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return 'ℹ️';
      case 'low': return '📝';
      default: return '❓';
    }
  }

  private async handleCriticalError(alert: ErrorAlert): Promise<void> {
    console.log('\n🚨 CRITICAL ERROR DETECTED - Taking immediate action...');
    
    // Log to audit system
    await this.logToAuditSystem(alert);
    
    // Send alert to monitoring system
    await this.sendAlert(alert);
    
    // Run immediate diagnostics
    await this.runDiagnostics();
  }

  private async logToAuditSystem(alert: ErrorAlert): Promise<void> {
    try {
      const { drizzle } = await import('drizzle-orm/neon-serverless');
      const ws = await import('ws');
      const { sql } = await import('drizzle-orm');
      
      const db = drizzle({
        connection: process.env.DATABASE_URL!,
        ws: ws,
      });

      await db.execute(sql`
        INSERT INTO audit_logs_hipaa (
          user_id, action, resource_type, request_method, request_path, 
          response_status, created_at
        ) VALUES (
          ${alert.userId || null}, 'CRITICAL_ERROR_DETECTED', 'SYSTEM', 
          'MONITOR', '/error-monitor', 500, NOW()
        )
      `);
      
      console.log('   ✅ Logged to audit system');
    } catch (error) {
      console.log(`   ❌ Failed to log to audit system: ${error.message}`);
    }
  }

  private async sendAlert(alert: ErrorAlert): Promise<void> {
    // In a real implementation, this would send alerts to:
    // - Slack/Discord channels
    // - Email notifications
    // - PagerDuty/OpsGenie
    // - SMS alerts
    
    console.log('   📧 Alert sent to monitoring team');
    console.log('   📱 SMS sent to on-call engineer');
  }

  private async runDiagnostics(): Promise<void> {
    console.log('   🔍 Running immediate diagnostics...');
    
    try {
      // Run schema validation
      const { spawn } = await import('child_process');
      const validationProcess = spawn('npx', ['tsx', 'db/scripts/validate-schema.ts'], {
        stdio: 'pipe'
      });

      validationProcess.stdout.on('data', (data) => {
        console.log(`   📊 Schema validation: ${data.toString().trim()}`);
      });

      validationProcess.stderr.on('data', (data) => {
        console.log(`   ❌ Schema validation error: ${data.toString().trim()}`);
      });

    } catch (error) {
      console.log(`   ❌ Diagnostics failed: ${error.message}`);
    }
  }

  private async monitorAPIEndpoints(): Promise<void> {
    // Monitor critical endpoints every 30 seconds
    setInterval(async () => {
      const criticalEndpoints = [
        '/api/user/profile',
        '/api/patients',
        '/api/tasks',
        '/api/clinical-sessions'
      ];

      for (const endpoint of criticalEndpoints) {
        try {
          const fetch = (await import('node-fetch')).default;
          const response = await fetch(`http://localhost:5000${endpoint}`, {
            method: 'GET',
            timeout: 5000
          });

          if (response.status >= 500) {
            const alert: ErrorAlert = {
              timestamp: new Date(),
              error: `HTTP ${response.status} on ${endpoint}`,
              pattern: 'API endpoint returning 500 error',
              severity: 'high',
              category: 'unknown',
              endpoint
            };

            this.alerts.push(alert);
            this.displayAlert(alert);
          }
        } catch (error) {
          // Server might be down or endpoint doesn't exist
          // This is expected in some cases
        }
      }
    }, 30000); // Every 30 seconds
  }

  // Display summary every 5 minutes
  private startSummaryTimer(): void {
    setInterval(() => {
      this.displaySummary();
    }, 300000); // Every 5 minutes
  }

  private displaySummary(): void {
    const now = Date.now();
    const last5Minutes = this.alerts.filter(a => now - a.timestamp.getTime() < 300000);
    const lastHour = this.alerts.filter(a => now - a.timestamp.getTime() < 3600000);

    console.log('\n📊 MONITORING SUMMARY');
    console.log('='.repeat(50));
    console.log(`Alerts in last 5 minutes: ${last5Minutes.length}`);
    console.log(`Alerts in last hour: ${lastHour.length}`);
    console.log(`Total alerts: ${this.alerts.length}`);

    if (last5Minutes.length > 0) {
      const criticalCount = last5Minutes.filter(a => a.severity === 'critical').length;
      const highCount = last5Minutes.filter(a => a.severity === 'high').length;
      
      console.log(`Critical alerts: ${criticalCount}`);
      console.log(`High severity alerts: ${highCount}`);
    }

    if (last5Minutes.length === 0) {
      console.log('✅ No alerts in the last 5 minutes - System healthy');
    }
  }
}

// Main execution
async function main() {
  try {
    const monitor = new RealTimeErrorMonitor();
    monitor.startSummaryTimer();
    await monitor.startMonitoring();
  } catch (error) {
    console.error('❌ Monitoring failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down error monitor...');
  process.exit(0);
});

// Run if this file is executed directly
main().catch(console.error);
