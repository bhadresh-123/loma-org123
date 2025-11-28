import { CreditCardIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface StripeIssuingNoticeProps {
  onDismiss?: () => void;
  message?: string;
}

export function StripeIssuingNotice({ onDismiss, message }: StripeIssuingNoticeProps) {
  const navigate = useNavigate();
  
  const handleSignUp = () => {
    navigate('/business-banking');
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-2xl mx-auto border-2">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <CreditCardIcon className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Business Cards</CardTitle>
          <CardDescription className="text-base mt-2">
            Issue and manage virtual and physical business cards for your team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-6 rounded-lg">
            <h3 className="font-semibold mb-3">Get started with business banking to:</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Issue virtual and physical cards instantly</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Set spending limits and controls per card</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Track expenses and transactions in real-time</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Manage your business finances in one place</span>
              </li>
            </ul>
          </div>

          <div className="text-center space-y-4">
            <Button 
              size="lg" 
              onClick={handleSignUp}
              className="w-full max-w-sm"
            >
              <CreditCardIcon className="mr-2 h-5 w-5" />
              Sign Up for Business Banking
            </Button>
            <p className="text-sm text-muted-foreground">
              Set up takes just a few minutes with Stripe
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}