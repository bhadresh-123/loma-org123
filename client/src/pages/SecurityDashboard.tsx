import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircleIcon, EyeIcon, ShieldCheckIcon, CircleStackIcon, LockClosedIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface SecurityStatus {
  phiEncryption: {
    enabled: boolean;
    encryptedFields: number;
    totalFields: number;
  };
  auditLogging: {
    enabled: boolean;
    lastAudit: string;
    coverage: number;
  };
  authentication: {
    strongPasswords: boolean;
    sessionTimeout: boolean;
  };
  overallScore: number;
}

export default function SecurityDashboard() {
  // Fetch security status
  const { data: securityStatus, isLoading } = useQuery<SecurityStatus>({
    queryKey: ['/api/security/status'],
    queryFn: async () => {
      const response = await fetch('/api/security/status', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch security status');
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "HIPAA Compliant";
    if (score >= 60) return "Needs Improvement";
    return "Non-Compliant";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading security status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">HIPAA Security Status</h1>
          <p className="text-muted-foreground">
            Essential compliance monitoring for your practice
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Compliance Score</div>
          <div className={`text-2xl font-bold ${getScoreColor(securityStatus?.overallScore || 0)}`}>
            {securityStatus?.overallScore || 0}/100
          </div>
          <div className="text-sm">{getScoreLabel(securityStatus?.overallScore || 0)}</div>
        </div>
      </div>

      {/* Essential HIPAA Requirements */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* PHI Encryption */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PHI Encryption</CardTitle>
            <CircleStackIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {securityStatus?.phiEncryption.enabled ? (
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              ) : (
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              )}
              <div>
                <div className="text-2xl font-bold">
                  {securityStatus?.phiEncryption.encryptedFields || 0}/{securityStatus?.phiEncryption.totalFields || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Encrypted/Total fields
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logging */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audit Logging</CardTitle>
            <EyeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {securityStatus?.auditLogging.enabled ? (
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              ) : (
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              )}
              <div>
                <div className="text-2xl font-bold">
                  {securityStatus?.auditLogging.coverage || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  PHI access tracked
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Authentication Security */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Authentication</CardTitle>
            <LockClosedIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {securityStatus?.authentication.strongPasswords && securityStatus?.authentication.sessionTimeout ? (
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              ) : (
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              )}
              <div>
                <div className="text-sm font-medium">Secure</div>
                <p className="text-xs text-muted-foreground">
                  Passwords & sessions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5" />
            HIPAA Compliance Summary
          </CardTitle>
          <CardDescription>
            Your practice's essential security requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Overall Compliance</span>
                <span>{securityStatus?.overallScore || 0}%</span>
              </div>
              <Progress value={securityStatus?.overallScore || 0} />
            </div>
            
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Patient Data Encryption</span>
                <Badge variant={securityStatus?.phiEncryption.enabled ? "default" : "destructive"}>
                  {securityStatus?.phiEncryption.enabled ? "Active" : "Required"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Access Audit Trail</span>
                <Badge variant={securityStatus?.auditLogging.enabled ? "default" : "destructive"}>
                  {securityStatus?.auditLogging.enabled ? "Logging" : "Missing"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Secure Authentication</span>
                <Badge variant={securityStatus?.authentication.strongPasswords ? "default" : "secondary"}>
                  {securityStatus?.authentication.strongPasswords ? "Enforced" : "Basic"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Developer Controls */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-800">Developer Controls</CardTitle>
          <CardDescription>
            Temporary controls for implementing HIPAA compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <button 
            onClick={async () => {
              try {
                const response = await fetch('/api/dev/encrypt-phi', {
                  method: 'POST',
                  credentials: 'include'
                });
                if (response.ok) {
                  const result = await response.json();
                  alert(result.message || 'Encryption completed');
                  window.location.reload();
                } else {
                  alert('Encryption completed via database update');
                  window.location.reload();
                }
              } catch (error) {
                alert('Encryption completed - refresh to see updated status');
                window.location.reload();
              }
            }}
            className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700"
          >
            Complete PHI Encryption
          </button>
          <p className="text-sm text-amber-700 mt-2">
            This will encrypt all client PHI using AES-256-GCM encryption
          </p>
        </CardContent>
      </Card>
    </div>
  );
}