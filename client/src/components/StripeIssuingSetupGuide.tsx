import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowTopRightOnSquareIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

export default function StripeIssuingSetupGuide() {
  return (
    <div className="space-y-6">
      <Alert>
        <InformationCircleIcon className="h-4 w-4" />
        <AlertDescription>
          Card issuing requires Stripe Issuing to be enabled on your platform. Follow these steps to get started.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 1: Platform Onboarding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your platform needs to be onboarded for Stripe Issuing before you can issue cards.
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.open('https://dashboard.stripe.com/issuing/overview', '_blank')}
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2" />
              Visit Stripe Issuing Dashboard
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 2: Enable Issuing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Once your platform is onboarded, you can enable issuing capabilities for Connect accounts.
            </p>
            <div className="text-sm space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-medium">1.</span>
                <span>Go to your Stripe Dashboard</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium">2.</span>
                <span>Navigate to Issuing section</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium">3.</span>
                <span>Follow the onboarding process</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium">4.</span>
                <span>Enable issuing for your platform</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 3: Business Banking Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You'll also need a business banking account set up before issuing cards.
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = '/business-banking'}
            >
              Set Up Business Banking
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              If you need assistance with Stripe Issuing setup, contact support or refer to the documentation.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('https://stripe.com/docs/issuing', '_blank')}
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-1" />
                Documentation
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('https://support.stripe.com', '_blank')}
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-1" />
                Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}