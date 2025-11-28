import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/contexts/ToastContext";

export default function AuthTest() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user");
      if (!res.ok) {
        if (res.status === 401) {
          return null;
        }
        throw new Error("Failed to get user");
      }
      return res.json();
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, name }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Registration failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration successful",
        description: "You are now logged in!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Login failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/logout", {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Logout failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Logout successful",
        description: "You have been logged out",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isSubmitting = registerMutation.isPending || loginMutation.isPending || logoutMutation.isPending;

  return (
    <div className="container max-w-md mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Test</CardTitle>
          <CardDescription>
            Test the auth API endpoints directly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>
          {!user && (
            <div className="space-y-2">
              <Label htmlFor="name">Name (for registration)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
          )}

          <div className="pt-4 pb-2 border-t">
            <h3 className="font-medium">Current User</h3>
            {isLoading ? (
              <p>Loading...</p>
            ) : user ? (
              <pre className="bg-slate-100 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-gray-500">Not logged in</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {!user ? (
            <>
              <Button
                onClick={() => loginMutation.mutate()}
                className="w-full"
                disabled={isSubmitting || !username || !password}
              >
                Login
              </Button>
              <Button
                onClick={() => registerMutation.mutate()}
                className="w-full"
                variant="outline"
                disabled={isSubmitting || !username || !password || !name}
              >
                Register
              </Button>
            </>
          ) : (
            <Button
              onClick={() => logoutMutation.mutate()}
              className="w-full"
              variant="destructive"
              disabled={isSubmitting}
            >
              Logout
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}