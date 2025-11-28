import React from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
const IssuingActivationGuide: React.FC = () => {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Activate Stripe Issuing</CardTitle>
        <CardDescription>
          To use card issuing features, you need to activate Stripe Issuing on your platform account first.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm space-y-2">
          <p>We've detected that you haven't completed the Stripe Issuing activation process for your platform.</p>
          <p>To enable card issuing features in your app, please follow these steps:</p>
          
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li>Go to the Stripe Issuing setup page in your Stripe Dashboard</li>
            <li>Complete the onboarding process for Stripe Issuing</li>
            <li>Once approved, come back to this page to create cards</li>
          </ol>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="default" 
          onClick={() => window.open("https://dashboard.stripe.com/issuing/overview", "_blank")}
        >
          <ArrowTopRightOnSquareIcon className="mr-2 h-4 w-4" />
          Set Up Stripe Issuing
        </Button>
      </CardFooter>
    </Card>
  );
};

export default IssuingActivationGuide;