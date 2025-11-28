import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from '@/utils/dateFnsCompat';
import { ClockIcon, DocumentTextIcon, EyeIcon, ShieldCheckIcon, UserIcon } from '@heroicons/react/24/outline';

interface AuditLog {
  timestamp: string;
  userId: number | null;
  userName?: string;
  action: string;
  resourceType?: string;
  resourceId?: number;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  details?: string;
}

interface ClientAuditLogsProps {
  patientId: number;
  clientName: string;
}

export default function ClientAuditLogs({ patientId, clientName }: ClientAuditLogsProps) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/audit/logs', patientId],
    refetchInterval: 2000, // Refetch every 2 seconds for real-time updates
    refetchIntervalInBackground: true, // Continue refreshing in background
    staleTime: 0, // Always fetch fresh data
    queryFn: async () => {
      const response = await fetch(`/api/audit/logs?limit=100`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      const result = await response.json();
      
      // Filter logs for this specific client
      const clientLogs = result.logs.filter((log: AuditLog) => 
        log.resourceType === 'CLIENT' && 
        (log.resourceId === patientId || log.details?.includes(`#${patientId}`) || log.details?.includes(clientName))
      );
      
      return { ...result, logs: clientLogs };
    }
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'PHI_ACCESS': return <EyeIcon className="h-4 w-4" />;
      case 'PHI_CREATE': return <DocumentTextIcon className="h-4 w-4" />;
      case 'PHI_UPDATE': return <DocumentTextIcon className="h-4 w-4" />;
      case 'PHI_DELETE': return <DocumentTextIcon className="h-4 w-4" />;
      default: return <ShieldCheckIcon className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'PHI_ACCESS': return 'bg-blue-100 text-blue-800';
      case 'PHI_CREATE': return 'bg-green-100 text-green-800';
      case 'PHI_UPDATE': return 'bg-yellow-100 text-yellow-800';
      case 'PHI_DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatUserAgent = (userAgent?: string) => {
    if (!userAgent) return 'Unknown';
    if (userAgent.includes('Chrome')) return 'Chrome Browser';
    if (userAgent.includes('Firefox')) return 'Firefox Browser';
    if (userAgent.includes('Safari')) return 'Safari Browser';
    if (userAgent.includes('curl')) return 'API Access';
    return 'Web Browser';
  };

  const formatDetails = (details?: string, currentClientId?: number, currentClientName?: string) => {
    if (!details) return 'No additional details';
    
    // Remove redundant client reference when viewing client-specific logs
    let formatted = details;
    if (currentClientId && currentClientName) {
      // Remove "Client #275 (clientName)" patterns since we're already viewing this client
      formatted = formatted
        .replace(new RegExp(`Client #${currentClientId}\\s*\\([^)]*\\)\\s*`, 'gi'), '')
        .replace(new RegExp(`Client #${currentClientId}\\s*`, 'gi'), '')
        .replace(new RegExp(`\\b${currentClientName}\\b`, 'gi'), '');
    }
    
    // Clean up extra spaces and make more readable
    formatted = formatted
      .replace(/\s+/g, ' ')
      .replace(/^[,\s]+|[,\s]+$/g, '') // Remove leading/trailing commas and spaces
      .replace(/^updated fields:\s*/i, 'Updated: ') // Make field updates more concise
      .trim();
    
    return formatted || 'Record accessed';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading audit logs...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheckIcon className="h-5 w-5" />
          HIPAA Audit Trail - {clientName}
        </CardTitle>
        <CardDescription>
          Complete access log for this client's protected health information (PHI).
          All access is logged per HIPAA Security Rule 164.312(b) requirements.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <EyeIcon className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Total Access Events</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{data?.logs?.length || 0}</div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <UserIcon className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Unique Users</span>
            </div>
            <div className="text-2xl font-bold text-green-900">
              {new Set(data?.logs?.map((log: AuditLog) => log.userId)).size || 0}
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <ClockIcon className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Last Access</span>
            </div>
            <div className="text-sm font-bold text-purple-900">
              {data?.logs?.[0] ? format(new Date(data.logs[0].timestamp), 'MMM dd, HH:mm') : 'Never'}
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        {data?.logs?.length > 0 ? (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Access Method</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.logs.map((log: AuditLog, index: number) => (
                  <TableRow key={index} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs">
                      {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <Badge className={getActionColor(log.action)}>
                          {log.action.replace('PHI_', '')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-3 w-3 text-muted-foreground" />
                        {log.userName || (log.userId ? `User ${log.userId}` : 'System')}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatUserAgent(log.userAgent)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.ipAddress}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs">
                      {formatDetails(log.details, patientId, clientName)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <ShieldCheckIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No Audit Events Found</h3>
            <p className="text-sm">
              No PHI access events have been recorded for this client yet.
            </p>
          </div>
        )}

        {/* HIPAA Compliance Notice */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-900 mb-1">
                HIPAA Compliance Notice
              </h4>
              <p className="text-xs text-amber-800">
                This audit log is maintained in compliance with HIPAA Security Rule 164.312(b) 
                and contains all access events to this client's protected health information. 
                Logs are retained for 6 years and are available for compliance audits.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}