import { Switch, Route, Router } from "wouter";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import Dashboard from "./pages/Dashboard";
import ClientManagement from "./pages/ClientManagement";
import ClientDetails from "./pages/ClientDetails";
import Sessions from "./pages/Sessions";
import Scheduling from "./pages/Scheduling";
import Tasks from "./pages/Tasks";
import ProfileUnified from "./pages/ProfileUnified";
import DocumentUpload from "./pages/DocumentUpload";
import BillingManagement from "./pages/BillingManagement";
import Billing from "./pages/Billing";
import PracticeManagement from "./pages/PracticeManagement";
// Removed unused business formation features:
// - FindTherapist, TherapistSearch, SearchResults, StartJourney
// These are not part of the core mental health platform
import Sidebar from "./components/Sidebar";
import { Header } from "./components/Header";
import SigieAssistant from "./components/SigieAssistant";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Calendar from "./pages/Calendar";
import { NotificationSettingsPage } from "./pages/NotificationSettingsPage";
import BusinessBanking from "./pages/BusinessBanking";
import CardManagement from "./pages/CardManagement";
import SpendingTracker from "./pages/SpendingTracker";
import AuthPage from "./pages/auth-page";
import AuthTestPage from "./pages/auth-test-page";
import Claims from "./pages/Claims";
import SecurityDashboard from "./pages/SecurityDashboard";
import AuditVerification from "./pages/AuditVerification";
import InviteAcceptance from "./pages/InviteAcceptance";
import { ToastProvider } from "@/contexts/ToastContext";
import { TimezoneProvider } from "@/contexts/TimezoneContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "@/components/ui/toaster";


import { ProtectedRoute } from "./components/ProtectedRoute";

function AppLayout({ children }: { children: React.ReactNode }): JSX.Element {
  const { data: authStatus } = useAuthStatus();
  
  // Only show layout with sidebar if user is authenticated
  if (!authStatus?.isAuthenticated) {
    return <>{children}</>;
  }
  
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 md:p-6 bg-background overflow-x-hidden">
          {children}
        </main>
      </div>
      <SigieAssistant />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TimezoneProvider>
          <Router>
            <Switch>
              <Route path="/auth-page">
                <AuthPage />
              </Route>
              <Route path="/auth-test">
                <AuthTestPage />
              </Route>
              <Route path="/invite/:token">
                <InviteAcceptance />
              </Route>
            
            <Route path="/">
              <AppLayout>
                <ProtectedRoute component={Dashboard} />
              </AppLayout>
            </Route>
            {/* Removed /start-journey route - not part of core mental health platform */}
            <Route path="/clients">
              <AppLayout>
                <ProtectedRoute component={ClientManagement} />
              </AppLayout>
            </Route>
            <Route path="/clients/:id">
              {({ id }) => (
                <AppLayout>
                  <ProtectedRoute component={ClientDetails} id={id} />
                </AppLayout>
              )}
            </Route>
            <Route path="/sessions">
              <AppLayout>
                <ProtectedRoute component={Sessions} />
              </AppLayout>
            </Route>
            <Route path="/scheduling">
              <AppLayout>
                <ProtectedRoute component={Scheduling} />
              </AppLayout>
            </Route>
            <Route path="/calendar">
              <AppLayout>
                <ProtectedRoute component={Calendar} />
              </AppLayout>
            </Route>
            <Route path="/tasks">
              <AppLayout>
                <ProtectedRoute component={Tasks} />
              </AppLayout>
            </Route>
            <Route path="/documents">
              <AppLayout>
                <ProtectedRoute component={DocumentUpload} />
              </AppLayout>
            </Route>
            <Route path="/profile">
              <AppLayout>
                <ProtectedRoute component={ProfileUnified} />
              </AppLayout>
            </Route>
            <Route path="/profile-test">
              <AppLayout>
                <ProtectedRoute component={ProfileUnified} />
              </AppLayout>
            </Route>
            <Route path="/practice-management">
              <AppLayout>
                <ProtectedRoute component={PracticeManagement} />
              </AppLayout>
            </Route>
            <Route path="/billing">
              <AppLayout>
                <ProtectedRoute component={Billing} />
              </AppLayout>
            </Route>
            <Route path="/billing-management">
              <AppLayout>
                <ProtectedRoute component={BillingManagement} />
              </AppLayout>
            </Route>
            <Route path="/billing/:patientId">
              {({ patientId }) => (
                <AppLayout>
                  <ProtectedRoute component={BillingManagement} patientId={patientId} />
                </AppLayout>
              )}
            </Route>
            {/* Removed unused therapist search routes - not part of core mental health platform */}
            {/* <Route path="/therapist-match">
              <AppLayout>
                <ProtectedRoute component={TherapistMatch} />
              </AppLayout>
            </Route> */}
            <Route path="/notification-settings">
              <AppLayout>
                <ProtectedRoute component={NotificationSettingsPage} />
              </AppLayout>
            </Route>
            <Route path="/business-banking">
              <AppLayout>
                <ProtectedRoute component={BusinessBanking} />
              </AppLayout>
            </Route>
            <Route path="/card-management">
              <AppLayout>
                <ProtectedRoute component={CardManagement} />
              </AppLayout>
            </Route>
            <Route path="/spending-tracker">
              <AppLayout>
                <ProtectedRoute component={SpendingTracker} />
              </AppLayout>
            </Route>
            <Route path="/claims">
              <AppLayout>
                <ProtectedRoute component={Claims} />
              </AppLayout>
            </Route>
            <Route path="/security">
              <AppLayout>
                <ProtectedRoute component={SecurityDashboard} />
              </AppLayout>
            </Route>

          </Switch>
        </Router>
        <Toaster />
      </TimezoneProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;