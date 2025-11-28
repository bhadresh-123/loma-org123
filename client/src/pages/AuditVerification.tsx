import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldCheckIcon, CheckCircleIcon, XCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { ExclamationTriangleIcon, CircleStackIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface AuditGap {
  type: 'MISSING_AUDIT' | 'ORPHANED_AUDIT' | 'TIMESTAMP_MISMATCH';
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface AuditReport {
  summary: {
    totalAuditEntries: number;
    totalDbChanges: number;
    gaps: number;
    highSeverityGaps: number;
  };
  gaps: AuditGap[];
  coverage: number;
}

export default function AuditVerification() {
  const [hoursBack, setHoursBack] = useState(24);

  const { data: verificationData, isLoading, refetch, error } = useQuery({
    queryKey: ['/api/audit-verify/verify', hoursBack],
    queryFn: async () => {
      const response = await fetch(`/api/audit-verify/verify?hours=${hoursBack}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch audit verification');
      return response.json();
    },
    refetchInterval: false, // Manual refresh only
  });

  const report: AuditReport | undefined = verificationData?.report;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'bg-red-100 text-red-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGapTypeIcon = (type: string) => {
    switch (type) {
      case 'MISSING_AUDIT': return <XCircleIcon className="h-4 w-4 text-red-600" />;
      case 'ORPHANED_AUDIT': return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />;
      default: return <DocumentTextIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheckIcon className="h-8 w-8" />
            Audit Verification
          </h1>
          <p className="text-muted-foreground mt-1">
            "Auditing the Audit" - Verify HIPAA audit log completeness against database changes
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="hours">Last:</label>
            <select 
              id="hours"
              value={hoursBack} 
              onChange={(e) => setHoursBack(parseInt(e.target.value))}
              className="border rounded px-2 py-1"
            >
              <option value={1}>1 hour</option>
              <option value={6}>6 hours</option>
              <option value={24}>24 hours</option>
              <option value={72}>3 days</option>
              <option value={168}>1 week</option>
            </select>
          </div>
          
          <Button 
            onClick={() => refetch()} 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <ArrowPathIconCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Verifying...' : 'Run Verification'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to run audit verification: {error.message}
          </AlertDescription>
        </Alert>
      )}

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Audit Coverage</CardTitle>
                <CheckCircleIcon className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {report.coverage}%
                </div>
                <p className="text-xs text-muted-foreground">
                  PHI changes with audit logs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Audit Entries</CardTitle>
                <DocumentTextIcon className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report.summary.totalAuditEntries}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total logged events
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">DB Changes</CardTitle>
                <CircleStackIcon className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report.summary.totalDbChanges}
                </div>
                <p className="text-xs text-muted-foreground">
                  Database modifications
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gaps Found</CardTitle>
                {report.summary.gaps === 0 ? (
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                ) : (
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  report.summary.gaps === 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {report.summary.gaps}
                </div>
                <p className="text-xs text-muted-foreground">
                  {report.summary.highSeverityGaps} high severity
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Status Alert */}
          {report.summary.gaps === 0 ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Perfect Audit Compliance</AlertTitle>
              <AlertDescription className="text-green-700">
                All database changes have corresponding audit log entries. Your HIPAA audit trail is complete.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertTitle>Audit Gaps Detected</AlertTitle>
              <AlertDescription>
                Found {report.summary.gaps} audit gaps, including {report.summary.highSeverityGaps} high-severity issues that require immediate attention.
              </AlertDescription>
            </Alert>
          )}

          {/* Gaps Table */}
          {report.gaps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Audit Gaps Details</CardTitle>
                <CardDescription>
                  Detailed breakdown of missing or orphaned audit entries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.gaps.map((gap, index) => (
                      <TableRow key={index}>
                        <TableCell className="flex items-center gap-2">
                          {getGapTypeIcon(gap.type)}
                          {gap.type.replace('_', ' ')}
                        </TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(gap.severity)}>
                            {gap.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          {gap.description}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-900 mb-1">
                  HIPAA Compliance Note
                </h4>
                <p className="text-xs text-amber-800">
                  This verification ensures all PHI access events are properly logged per HIPAA Security Rule 164.312(b). 
                  Any gaps indicate potential compliance violations that must be investigated and resolved.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}