import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from '@/utils/dateFnsCompat';

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

export function AuditLogs() {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/audit/logs'],
    queryFn: async () => {
      const response = await fetch('/api/audit/logs?limit=500', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json();
    }
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'PHI_ACCESS': return 'bg-blue-100 text-blue-800';
      case 'PHI_CREATE': return 'bg-green-100 text-green-800';
      case 'PHI_UPDATE': return 'bg-yellow-100 text-yellow-800';
      case 'PHI_DELETE': return 'bg-red-100 text-red-800';
      case 'LOGIN_ATTEMPT': return 'bg-purple-100 text-purple-800';
      case 'FAILED_ACCESS': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading audit logs...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">HIPAA Audit Logs</h1>
        <p className="text-muted-foreground">
          Complete audit trail of all PHI access and system activities
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats?.totalEvents || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats?.recentEvents || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data?.stats?.failedAccess || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">6 Years</div>
            <div className="text-xs text-muted-foreground">HIPAA Compliant</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>
            Detailed log of all PHI access and system activities (most recent first)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.logs?.map((log: AuditLog, index: number) => (
                <TableRow key={index}>
                  <TableCell className="font-mono text-xs">
                    {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    {log.userName || (log.userId ? `User ${log.userId}` : 'Anonymous')}
                  </TableCell>
                  <TableCell>
                    <Badge className={getActionColor(log.action)}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.resourceType && (
                      <div className="text-xs">
                        {log.resourceType}
                        {log.resourceId && ` #${log.resourceId}`}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.ipAddress}
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.success ? "default" : "destructive"}>
                      {log.success ? "Success" : "Failed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                    {log.details}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}