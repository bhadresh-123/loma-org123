import { Redirect } from "wouter";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { ArrowPathIcon } from '@heroicons/react/24/outline';

type ProtectedRouteProps = {
  component: React.ComponentType<any>;
  [x: string]: any;
};

export function ProtectedRoute({ component: Component, ...rest }: ProtectedRouteProps) {
  const { data: authStatus, isLoading } = useAuthStatus();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ArrowPathIcon className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading...</span>
      </div>
    );
  }

  if (!authStatus?.isAuthenticated) {
    return <Redirect to="/auth-page" />;
  }

  return <Component {...rest} />;
}