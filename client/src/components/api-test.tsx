import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/contexts/ToastContext";

export default function ApiTest() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const callDiagnosticEndpoint = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth-test");
      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
      toast({
        title: "API test successful",
        description: `Database connected: ${data.dbConnected}, User count: ${data.userCount}`,
      });
    } catch (error) {
      console.error("API test error:", error);
      toast({
        title: "API test failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle>API Diagnostic Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={callDiagnosticEndpoint} 
            disabled={loading}
          >
            {loading ? "Testing..." : "Run Database Diagnostic Test"}
          </Button>
          
          {result && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Database Status:</h3>
              <div className="bg-slate-100 p-3 rounded-md">
                <p className="text-sm">Connection: <span className={result.dbConnected ? "text-green-600 font-medium" : "text-red-600 font-medium"}>{result.dbConnected ? "Connected" : "Disconnected"}</span></p>
                <p className="text-sm">User Count: {result.userCount}</p>
                <p className="text-sm">Session Authenticated: <span className={result.session?.authenticated ? "text-green-600 font-medium" : "text-red-600 font-medium"}>{result.session?.authenticated ? "Yes" : "No"}</span></p>
              </div>
              
              <h3 className="text-sm font-medium mt-4 mb-2">User Table Schema:</h3>
              <div className="overflow-auto max-h-60">
                <pre className="bg-slate-100 p-3 rounded-md text-xs">
                  {JSON.stringify(result.userSchema, null, 2)}
                </pre>
              </div>
              
              {result.session?.user && (
                <>
                  <h3 className="text-sm font-medium mt-4 mb-2">Current Session User:</h3>
                  <pre className="bg-slate-100 p-3 rounded-md text-xs">
                    {JSON.stringify(result.session.user, null, 2)}
                  </pre>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}