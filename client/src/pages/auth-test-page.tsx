import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/contexts/ToastContext";

const AuthTestPage = () => {
  const { toast } = useToast();
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    name: "",
    title: "",
    license: "",
    specialties: "",
    practiceName: ""
  });
  const [userInfo, setUserInfo] = useState<any>(null);
  const [dbInfo, setDbInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Check if user is logged in
  const checkAuth = async () => {
    try {
      const res = await fetch("/api/user");
      if (res.ok) {
        const data = await res.json();
        setUserInfo(data);
      } else {
        setUserInfo(null);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      setUserInfo(null);
    }
  };

  // Get database information
  const getDbInfo = async () => {
    try {
      const res = await fetch("/api/auth-test");
      if (res.ok) {
        const data = await res.json();
        setDbInfo(data);
      }
    } catch (error) {
      console.error("Error getting DB info:", error);
    }
  };

  useEffect(() => {
    checkAuth();
    getDbInfo();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData)
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Login successful",
          description: `Welcome, ${data.name}!`
        });
        checkAuth();
      } else {
        const error = await res.json();
        toast({
          title: "Login failed",
          description: error.message || "Invalid credentials",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Login error",
        description: "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData)
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Registration successful",
          description: `Welcome, ${data.name}!`
        });
        checkAuth();
      } else {
        const error = await res.json();
        toast({
          title: "Registration failed",
          description: error.message || "Failed to register",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Registration error",
        description: "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/logout", {
        method: "POST"
      });

      if (res.ok) {
        toast({
          title: "Logout successful",
          description: "You've been logged out"
        });
        setUserInfo(null);
      } else {
        toast({
          title: "Logout failed",
          description: "Failed to logout",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Logout error",
        description: "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-10 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Authentication Test Page</h1>
      
      {/* User Status */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>User Status</CardTitle>
          <CardDescription>
            {userInfo ? "You are logged in" : "You are not logged in"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userInfo ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="font-medium">User ID:</div>
                <div>{userInfo.id}</div>
                <div className="font-medium">Username:</div>
                <div>{userInfo.username}</div>
                <div className="font-medium">Name:</div>
                <div>{userInfo.name}</div>
                <div className="font-medium">Title:</div>
                <div>{userInfo.title || 'N/A'}</div>
                <div className="font-medium">License:</div>
                <div>{userInfo.license || 'N/A'}</div>
                <div className="font-medium">Specialties:</div>
                <div>{userInfo.specialties || 'N/A'}</div>
              </div>
              <Button onClick={handleLogout} disabled={loading}>
                {loading ? "Logging out..." : "Logout"}
              </Button>
            </div>
          ) : (
            <p>Please login or register to access the system.</p>
          )}
        </CardContent>
      </Card>

      {/* Auth Forms */}
      {!userInfo && (
        <Tabs defaultValue="login" className="mb-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>Enter your credentials to login</CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input 
                      id="username" 
                      value={loginData.username}
                      onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Register</CardTitle>
                <CardDescription>Create a new account</CardDescription>
              </CardHeader>
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-username">Username</Label>
                    <Input 
                      id="reg-username" 
                      value={registerData.username}
                      onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input 
                      id="reg-password" 
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      value={registerData.name}
                      onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="practiceName">Practice Name</Label>
                    <Input 
                      id="practiceName" 
                      value={registerData.practiceName}
                      onChange={(e) => setRegisterData({...registerData, practiceName: e.target.value})}
                      placeholder="e.g., Smith Therapy Services"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title (optional)</Label>
                    <Input 
                      id="title" 
                      value={registerData.title}
                      onChange={(e) => setRegisterData({...registerData, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="license">License (optional)</Label>
                    <Input 
                      id="license" 
                      value={registerData.license}
                      onChange={(e) => setRegisterData({...registerData, license: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialties">Specialties (optional)</Label>
                    <Input 
                      id="specialties" 
                      value={registerData.specialties}
                      onChange={(e) => setRegisterData({...registerData, specialties: e.target.value})}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Registering..." : "Register"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Database Info */}
      <Card>
        <CardHeader>
          <CardTitle>Database Information</CardTitle>
          <CardDescription>Information about the database and schema</CardDescription>
        </CardHeader>
        <CardContent>
          {dbInfo ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Database Connection:</h3>
                <p>{dbInfo.dbConnected ? '✅ Connected' : '❌ Not Connected'}</p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">User Count:</h3>
                <p>{dbInfo.userCount} users in database</p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">ORM Test:</h3>
                <p>{dbInfo.ormTest ? '✅ ORM Working' : '❌ ORM Not Working'}</p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium">User Schema:</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Column</th>
                        <th className="text-left py-2">Type</th>
                        <th className="text-left py-2">Nullable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbInfo.userSchema?.map((column: any, index: number) => (
                        <tr key={index} className="border-b">
                          <td className="py-2">{column.column_name}</td>
                          <td className="py-2">{column.data_type}</td>
                          <td className="py-2">{column.is_nullable === 'YES' ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {dbInfo.sampleUser && (
                <div>
                  <h3 className="text-lg font-medium">Sample User:</h3>
                  <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                    {JSON.stringify(dbInfo.sampleUser, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <p>Loading database information...</p>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={getDbInfo} variant="outline">
            Refresh Database Info
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthTestPage;