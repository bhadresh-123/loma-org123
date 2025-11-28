import { useState } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { PasswordRequirements } from "@/components/PasswordRequirements";
import Logo from "@/components/Logo";

const AuthPage = () => {
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    title: "",
    license: "",
    specialties: "",
    practiceName: ""
  });
  const [activeTab, setActiveTab] = useState("login");

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(registerData);
  };

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {/* Left column: Authentication forms */}
      <div className="flex items-center justify-center p-8 bg-muted/30">
        <div className="w-full max-w-md">
          <div className="mb-12 text-center">
            <div className="flex justify-center mb-8">
              <h1 className="text-6xl font-bold" style={{ 
                fontFamily: 'Dancing Script, Brush Script MT, cursive',
                color: '#DA6A51',
                fontWeight: '700',
                letterSpacing: '0.05em',
                textShadow: 'none',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale'
              }}>
                Loma
              </h1>
            </div>
            <p className="text-lg font-medium mb-2 text-foreground">Your AI partner for launching and growing your therapy practice.</p>
            <p className="text-sm font-medium mb-8 text-secondary">Your practice, your way.</p>
          </div>

          <Tabs defaultValue={activeTab} className="w-full" onValueChange={setActiveTab}>
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
                    <div className="text-sm text-muted-foreground">
                      <p>Demo credentials:</p>
                      <p>Username: demo_therapist</p>
                      <p>Password: Demo123!</p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      disabled={loginMutation.isPending} 
                      className="w-full text-white font-medium py-3 rounded-lg"
                      style={{ backgroundColor: '#DA6A51' }}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Login"
                      )}
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
                      {registerData.password && (
                        <PasswordRequirements 
                          password={registerData.password}
                          role="business_owner"
                          className="mt-2"
                        />
                      )}
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
                      <Label htmlFor="email">Email (optional)</Label>
                      <Input 
                        id="email" 
                        type="email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                        placeholder="your@email.com"
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
                    <Button 
                      type="submit" 
                      disabled={registerMutation.isPending} 
                      className="w-full text-white font-medium py-3 rounded-lg"
                      style={{ backgroundColor: '#DA6A51' }}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                          Registering...
                        </>
                      ) : (
                        "Register"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right column: Hero section */}
      <div className="hidden md:flex flex-col items-center justify-center p-12 bg-accent/20">
        <div className="max-w-lg text-left">
          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <div className="w-3 h-3 rounded-full mt-2 flex-shrink-0 bg-primary"></div>
              <div>
                <p className="font-bold text-lg mb-1 text-foreground">Own Your Insurance Panels</p>
                <p className="text-sm text-foreground">Get paneled directly, keep 100% of your payouts</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-3 h-3 rounded-full mt-2 flex-shrink-0 bg-primary"></div>
              <div>
                <p className="font-bold text-lg mb-1 text-foreground">AI-Powered Notes & Claims</p>
                <p className="text-sm text-foreground">Finish notes and submit insurance in minutes, not hours</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-3 h-3 rounded-full mt-2 flex-shrink-0 bg-primary"></div>
              <div>
                <p className="font-bold text-lg mb-1 text-foreground">All-in-One Practice Hub</p>
                <p className="text-sm text-foreground">Everything you need: EHR, billing, scheduling — no extra tools required</p>
              </div>
            </div>
            
            <div className="mt-10 pt-6 border-t border-primary">
              <p className="text-lg font-semibold flex items-center text-secondary">
                <span className="mr-2">👉</span>
                Let's build your practice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;