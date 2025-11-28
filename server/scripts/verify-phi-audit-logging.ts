#!/usr/bin/env tsx

/**
 * PHI Audit Logging Verification Script
 * 
 * This script verifies that all PHI access routes have proper audit logging
 * and that the audit logging system is working correctly.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

interface RouteInfo {
  file: string;
  route: string;
  method: string;
  hasAuditLogging: boolean;
  hasDatabaseLogging: boolean;
  hasFileLogging: boolean;
  auditType?: string;
  issues: string[];
}

interface VerificationResult {
  totalRoutes: number;
  routesWithAuditLogging: number;
  routesWithDatabaseLogging: number;
  routesWithFileLogging: number;
  routesWithoutAuditLogging: number;
  coveragePercentage: number;
  routes: RouteInfo[];
  summary: {
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  };
}

class PHIAuditVerifier {
  private routesDir = join(process.cwd(), 'server/routes');
  private phiRoutes = [
    'clients.ts',
    'sessions.ts', 
    'documents.ts',
    'notes.ts',
    'treatment-plans.ts',
    'users.ts',
    'assessments.ts',
    'forms.ts'
  ];

  async verifyAuditLogging(): Promise<VerificationResult> {
    console.log('🔍 Starting PHI Audit Logging Verification...\n');
    
    const routes: RouteInfo[] = [];
    
    // Check each PHI route file
    for (const routeFile of this.phiRoutes) {
      const filePath = join(this.routesDir, routeFile);
      if (existsSync(filePath)) {
        const routeInfo = await this.analyzeRouteFile(filePath);
        routes.push(...routeInfo);
      } else {
        console.log(`⚠️  Route file not found: ${routeFile}`);
      }
    }
    
    // Calculate statistics
    const totalRoutes = routes.length;
    const routesWithAuditLogging = routes.filter(r => r.hasAuditLogging).length;
    const routesWithDatabaseLogging = routes.filter(r => r.hasDatabaseLogging).length;
    const routesWithFileLogging = routes.filter(r => r.hasFileLogging).length;
    const routesWithoutAuditLogging = routes.filter(r => !r.hasAuditLogging).length;
    const coveragePercentage = totalRoutes > 0 ? (routesWithAuditLogging / totalRoutes) * 100 : 0;
    
    // Generate summary
    const summary = this.generateSummary(routes, coveragePercentage);
    
    return {
      totalRoutes,
      routesWithAuditLogging,
      routesWithDatabaseLogging,
      routesWithFileLogging,
      routesWithoutAuditLogging,
      coveragePercentage,
      routes,
      summary
    };
  }

  private async analyzeRouteFile(filePath: string): Promise<RouteInfo[]> {
    const content = readFileSync(filePath, 'utf-8');
    const routes: RouteInfo[] = [];
    
    // Find all route definitions
    const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = routeRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const route = match[2];
      
      const routeInfo: RouteInfo = {
        file: filePath.split('/').pop() || '',
        route,
        method,
        hasAuditLogging: false,
        hasDatabaseLogging: false,
        hasFileLogging: false,
        issues: []
      };
      
      // Check for audit logging patterns
      const routeStartIndex = match.index;
      const routeEndIndex = this.findRouteEndIndex(content, routeStartIndex);
      const routeContent = content.substring(routeStartIndex, routeEndIndex);
      
      // Check for database audit logging
      if (routeContent.includes('logPHIAccessToDatabase') || 
          routeContent.includes('logDetailedPHIAccessToDatabase')) {
        routeInfo.hasDatabaseLogging = true;
        routeInfo.hasAuditLogging = true;
        routeInfo.auditType = 'database';
      }
      
      // Check for file-based audit logging
      if (routeContent.includes('logAuditEvent') || 
          routeContent.includes('auditPHIAccess') ||
          routeContent.includes('auditAuthEvent')) {
        routeInfo.hasFileLogging = true;
        if (!routeInfo.hasAuditLogging) {
          routeInfo.hasAuditLogging = true;
          routeInfo.auditType = 'file';
        }
      }
      
      // Check for HIPAA middleware
      if (routeContent.includes('auditHIPAAPHIAccess') ||
          routeContent.includes('requireHIPAAFeature')) {
        routeInfo.hasAuditLogging = true;
        routeInfo.auditType = 'hipaa-middleware';
      }
      
      // Identify issues
      if (!routeInfo.hasAuditLogging) {
        routeInfo.issues.push('No audit logging detected');
      }
      
      if (routeInfo.hasFileLogging && !routeInfo.hasDatabaseLogging) {
        routeInfo.issues.push('Using file-based logging only - should migrate to database');
      }
      
      // Check for PHI access patterns
      const phiPatterns = [
        'req\\.body\\.',
        'req\\.params\\.',
        'req\\.query\\.',
        'res\\.json\\(',
        'res\\.send\\(',
        'db\\.select',
        'db\\.insert',
        'db\\.update',
        'db\\.delete'
      ];
      
      const hasPHIAccess = phiPatterns.some(pattern => 
        new RegExp(pattern).test(routeContent)
      );
      
      if (hasPHIAccess && !routeInfo.hasAuditLogging) {
        routeInfo.issues.push('PHI access detected but no audit logging');
      }
      
      routes.push(routeInfo);
    }
    
    return routes;
  }

  private findRouteEndIndex(content: string, startIndex: number): number {
    let braceCount = 0;
    let inRoute = false;
    
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      
      if (char === '(') {
        braceCount++;
        inRoute = true;
      } else if (char === ')') {
        braceCount--;
        if (inRoute && braceCount === 0) {
          // Find the end of the route handler
          let j = i + 1;
          while (j < content.length && /\s/.test(content[j])) {
            j++;
          }
          if (content[j] === ',') {
            return j + 1;
          }
          return j;
        }
      }
    }
    
    return content.length;
  }

  private generateSummary(routes: RouteInfo[], coveragePercentage: number) {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check coverage
    if (coveragePercentage < 100) {
      issues.push(`${100 - coveragePercentage}% of PHI routes lack audit logging`);
      recommendations.push('Add audit logging to all PHI access routes');
    }
    
    // Check for file-only logging
    const fileOnlyRoutes = routes.filter(r => r.hasFileLogging && !r.hasDatabaseLogging);
    if (fileOnlyRoutes.length > 0) {
      issues.push(`${fileOnlyRoutes.length} routes using file-based logging only`);
      recommendations.push('Migrate file-based logging to database logging');
    }
    
    // Check for routes with issues
    const routesWithIssues = routes.filter(r => r.issues.length > 0);
    if (routesWithIssues.length > 0) {
      issues.push(`${routesWithIssues.length} routes have audit logging issues`);
      recommendations.push('Review and fix audit logging issues');
    }
    
    // Check for missing database logging
    const missingDatabaseLogging = routes.filter(r => r.hasAuditLogging && !r.hasDatabaseLogging);
    if (missingDatabaseLogging.length > 0) {
      issues.push(`${missingDatabaseLogging.length} routes missing database audit logging`);
      recommendations.push('Implement database audit logging for all routes');
    }
    
    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    };
  }

  printReport(result: VerificationResult): void {
    console.log('📊 PHI Audit Logging Verification Report');
    console.log('=====================================\n');
    
    console.log('📈 Coverage Statistics:');
    console.log(`  Total PHI Routes: ${result.totalRoutes}`);
    console.log(`  Routes with Audit Logging: ${result.routesWithAuditLogging}`);
    console.log(`  Routes with Database Logging: ${result.routesWithDatabaseLogging}`);
    console.log(`  Routes with File Logging: ${result.routesWithFileLogging}`);
    console.log(`  Routes without Audit Logging: ${result.routesWithoutAuditLogging}`);
    console.log(`  Coverage Percentage: ${result.coveragePercentage.toFixed(1)}%\n`);
    
    console.log('🔍 Route Analysis:');
    result.routes.forEach(route => {
      const status = route.hasAuditLogging ? '✅' : '❌';
      const auditType = route.auditType || 'none';
      console.log(`  ${status} ${route.method} ${route.route} (${route.file}) - ${auditType}`);
      
      if (route.issues.length > 0) {
        route.issues.forEach(issue => {
          console.log(`    ⚠️  ${issue}`);
        });
      }
    });
    
    console.log('\n📋 Summary:');
    if (result.summary.compliant) {
      console.log('  ✅ All PHI routes have proper audit logging');
    } else {
      console.log('  ❌ Audit logging issues detected:');
      result.summary.issues.forEach(issue => {
        console.log(`    • ${issue}`);
      });
    }
    
    if (result.summary.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      result.summary.recommendations.forEach(rec => {
        console.log(`    • ${rec}`);
      });
    }
    
    console.log('\n🎯 HIPAA Compliance Status:');
    if (result.coveragePercentage >= 100 && result.routesWithDatabaseLogging >= result.routesWithAuditLogging) {
      console.log('  ✅ FULLY COMPLIANT - All PHI access is properly logged to database');
    } else if (result.coveragePercentage >= 90) {
      console.log('  ⚠️  MOSTLY COMPLIANT - Minor gaps in audit logging coverage');
    } else {
      console.log('  ❌ NOT COMPLIANT - Significant gaps in audit logging coverage');
    }
  }
}

// Main execution
async function main() {
  try {
    const verifier = new PHIAuditVerifier();
    const result = await verifier.verifyAuditLogging();
    verifier.printReport(result);
    
    // Exit with appropriate code
    process.exit(result.summary.compliant ? 0 : 1);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { PHIAuditVerifier };
