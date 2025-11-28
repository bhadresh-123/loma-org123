import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { ProfileLogger } from './ProfileLogger';

interface ProfileErrorBoundaryProps {
  children: ReactNode;
  userId?: number;
  sessionId: string;
  fallback?: ReactNode;
}

interface ProfileErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  correlationId?: string;
  retryCount: number;
}

export class ProfileErrorBoundary extends Component<
  ProfileErrorBoundaryProps,
  ProfileErrorBoundaryState
> {
  private maxRetries = 3;

  constructor(props: ProfileErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ProfileErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const correlationId = this.generateCorrelationId();
    
    // Log comprehensive error details
    ProfileLogger.logError('profile_error_boundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      correlationId,
      userId: this.props.userId,
      sessionId: this.props.sessionId,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    this.setState({
      error,
      errorInfo,
      correlationId
    });
  }

  private generateCorrelationId(): string {
    return `profile-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      ProfileLogger.logUserAction('error_boundary_retry', {
        userId: this.props.userId,
        sessionId: this.props.sessionId,
        section: 'error_boundary',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        correlationId: this.state.correlationId,
        retryCount: this.state.retryCount + 1
      });

      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        correlationId: undefined,
        retryCount: this.state.retryCount + 1
      });
    }
  };

  private handleReload = () => {
    ProfileLogger.logUserAction('error_boundary_reload', {
      userId: this.props.userId,
      sessionId: this.props.sessionId,
      section: 'error_boundary',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      correlationId: this.state.correlationId
    });

    window.location.reload();
  };

  private getErrorMessage(): string {
    const { error } = this.state;
    
    if (!error) return 'An unexpected error occurred';

    // Classify error types for better user messaging
    if (error.message.includes('ChunkLoadError')) {
      return 'Failed to load application resources. This may be due to a network issue or recent update.';
    }
    
    if (error.message.includes('Network')) {
      return 'Network connection issue. Please check your internet connection and try again.';
    }
    
    if (error.message.includes('Permission')) {
      return 'Permission denied. Please refresh the page or contact support if the issue persists.';
    }
    
    if (error.message.includes('Validation')) {
      return 'Data validation error. Please check your input and try again.';
    }

    return 'An unexpected error occurred while loading your profile. Our team has been notified.';
  }

  private getRecoveryActions(): { text: string; action: () => void; primary?: boolean }[] {
    const actions = [];
    
    // Always show reload option
    actions.push({
      text: 'Reload Page',
      action: this.handleReload,
      primary: true
    });

    // Show retry if under limit
    if (this.state.retryCount < this.maxRetries) {
      actions.unshift({
        text: `Retry (${this.maxRetries - this.state.retryCount} remaining)`,
        action: this.handleRetry,
        primary: false
      });
    }

    return actions;
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.getErrorMessage();
      const recoveryActions = this.getRecoveryActions();

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <ExclamationTriangleIcon className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-xl">Profile Loading Error</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertTitle>Error Details</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>

              {this.state.correlationId && (
                <div className="text-sm text-muted-foreground text-center">
                  <p>Error ID: {this.state.correlationId}</p>
                  <p>Include this ID when contacting support</p>
                </div>
              )}

              <div className="flex flex-col space-y-2">
                {recoveryActions.map((action, index) => (
                  <Button
                    key={index}
                    onClick={action.action}
                    variant={action.primary ? "default" : "outline"}
                    className="w-full"
                  >
                    {action.text === 'Reload Page' && <ArrowPathIconCw className="h-4 w-4 mr-2" />}
                    {action.text}
                  </Button>
                ))}
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    Developer Details
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                    {this.state.error.stack}
                  </pre>
                  {this.state.errorInfo && (
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}