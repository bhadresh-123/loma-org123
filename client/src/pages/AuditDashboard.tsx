import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDownTrayIcon, CalendarIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuditMetrics {
  totalEvents: number;
  phiAccesses: number;
  failedOperations: number;
  uniqueUsers: number;
  createOperations: number;
  readOperations: number;
  updateOperations: number;
  deleteOperations: number;
  exportOperations: number;
  searchOperations: number;
}

interface ComplianceMetrics {
  auditCoverage: number;
  successRate: number;
  userEngagement: number;
  averageDailyActivity: number;
}

interface RiskIndicator {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

export default function AuditDashboard() {
  const [dateRange, setDateRange] = useState('30');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Fetch compliance report
  const { data: complianceData, isLoading: isLoadingCompliance, refetch: refetchCompliance } = useQuery({
    queryKey: ['/api/audit/compliance-report', dateRange, selectedUserId],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      });
      
      if (selectedUserId) {
        params.append('userId', selectedUserId);
      }
      
      const response = await fetch(`/api/audit/compliance-report?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch compliance report');
      }
      
      return response.json();
    },
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  // Fetch real-time monitoring data
  const { data: monitoringData, isLoading: isLoadingMonitoring } = useQuery({
    queryKey: ['/api/audit/monitoring/realtime'],
    queryFn: async () => {
      const response = await fetch('/api/audit/monitoring/realtime', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch monitoring data');
      }
      
      return response.json();
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch audit statistics
  const { data: statisticsData, isLoading: isLoadingStatistics } = useQuery({
    queryKey: ['/api/audit/statistics', dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/audit/statistics?days=${dateRange}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }
      
      return response.json();
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'HIGH': return <XCircleIcon className="h-4 w-4" />;
      case 'MEDIUM': return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'LOW': return <CheckCircleIcon className="h-4 w-4" />;
      default: return <CheckCircleIcon className="h-4 w-4" />;
    }
  };

  const exportComplianceReport = async () => {
    try {
      const params = new URLSearchParams({
        startDate: new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        format: 'pdf'
      });
      
      const response = await fetch(`/api/audit/compliance-report/export?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (isLoadingCompliance || isLoadingMonitoring || isLoadingStatistics) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading audit dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">HIPAA Audit Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive audit logging and compliance monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => refetchCompliance()} variant="outline">
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportComplianceReport}>
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Real-time Alerts */}
      {monitoringData?.alerts && monitoringData.alerts.length > 0 && (
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Alert:</strong> {monitoringData.alerts[0].message}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Audit Events</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {complianceData?.summary?.totalEvents?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Last {dateRange} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PHI Accesses</CardTitle>
            <ExclamationTriangleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {complianceData?.summary?.phiAccesses?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {complianceData?.complianceMetrics?.auditCoverage?.toFixed(1) || '0'}% of total events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {complianceData?.complianceMetrics?.successRate?.toFixed(1) || '100'}%
            </div>
            <p className="text-xs text-muted-foreground">
              {complianceData?.summary?.failedOperations || 0} failed operations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {complianceData?.summary?.uniqueUsers || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique users with activity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity Breakdown</TabsTrigger>
          <TabsTrigger value="phi-access">PHI Access</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
          <TabsTrigger value="monitoring">Real-time Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Operation Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Operation Types</CardTitle>
                <CardDescription>Breakdown of audit events by operation type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Read Operations</span>
                    <Badge variant="outline">{complianceData?.summary?.readOperations || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Create Operations</span>
                    <Badge variant="outline">{complianceData?.summary?.createOperations || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Update Operations</span>
                    <Badge variant="outline">{complianceData?.summary?.updateOperations || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Delete Operations</span>
                    <Badge variant="outline">{complianceData?.summary?.deleteOperations || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Search Operations</span>
                    <Badge variant="outline">{complianceData?.summary?.searchOperations || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Export Operations</span>
                    <Badge variant="outline">{complianceData?.summary?.exportOperations || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Indicators */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Indicators</CardTitle>
                <CardDescription>Security and compliance risk assessment</CardDescription>
              </CardHeader>
              <CardContent>
                {complianceData?.riskIndicators?.length > 0 ? (
                  <div className="space-y-2">
                    {complianceData.riskIndicators.map((risk: RiskIndicator, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        {getSeverityIcon(risk.severity)}
                        <Badge variant={getSeverityColor(risk.severity) as any}>
                          {risk.severity}
                        </Badge>
                        <span className="text-sm">{risk.description}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>No risk indicators detected</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Monitoring (Last 24 Hours)</CardTitle>
              <CardDescription>Live audit system activity and anomaly detection</CardDescription>
            </CardHeader>
            <CardContent>
              {monitoringData?.anomalies?.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-medium">Detected Anomalies</h4>
                  {monitoringData.anomalies.map((anomaly: any, index: number) => (
                    <Alert key={index} variant={anomaly.severity === 'HIGH' ? 'destructive' : 'default'}>
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{anomaly.type}:</strong> {anomaly.description}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>No anomalies detected in the last 24 hours</span>
                </div>
              )}
              
              {monitoringData?.recentFailures?.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-2">Recent Failed Operations</h4>
                  <div className="space-y-2">
                    {monitoringData.recentFailures.slice(0, 5).map((failure: any, index: number) => (
                      <div key={index} className="text-sm border-l-2 border-red-500 pl-3">
                        <div className="font-medium">{failure.action} on {failure.resourceType}</div>
                        <div className="text-muted-foreground">
                          User {failure.userId} - {failure.failureReason}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(failure.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recommendations */}
      {complianceData?.recommendations && (
        <Card>
          <CardHeader>
            <CardTitle>Compliance Recommendations</CardTitle>
            <CardDescription>Suggested actions to improve HIPAA compliance</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {complianceData.recommendations.map((recommendation: string, index: number) => (
                <li key={index} className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}