import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClockIcon, DocumentTextIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
interface CPTRecommendationProps {
  assessmentCategory: string;
  selectedClientBillingType?: string;
}

interface CPTCode {
  code: string;
  description: string;
  type: 'intake' | 'administration' | 'interpretation';
  units: number;
  addOn?: boolean;
  note?: string;
}

interface AssessmentRecommendation {
  id: number;
  assessmentName: string;
  abbreviation: string;
  category: string;
  recommendedCodes: CPTCode[];
  estimatedTotalTime: string;
  estimatedUnits: number;
  billingNotes: string;
}

async function fetchCPTRecommendations(category: string): Promise<AssessmentRecommendation[]> {
  const response = await fetch(`/api/assessments/category/${encodeURIComponent(category)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch assessments');
  }
  const assessments = await response.json();
  
  // Get CPT recommendations for the first assessment in this category
  if (assessments.length > 0) {
    const cptResponse = await fetch(`/api/cpt-recommendations/assessment/${assessments[0].id}`);
    if (cptResponse.ok) {
      const recommendation = await cptResponse.json();
      return [recommendation];
    }
  }
  
  return [];
}

export function CPTRecommendation({ assessmentCategory, selectedClientBillingType }: CPTRecommendationProps) {
  const { data: recommendations, isLoading, error } = useQuery({
    queryKey: ['cpt-recommendations', assessmentCategory],
    queryFn: () => fetchCPTRecommendations(assessmentCategory),
    enabled: !!assessmentCategory,
  });

  if (isLoading) {
    return (
      <Alert>
        <DocumentTextIcon className="h-4 w-4" />
        <AlertDescription>Loading billing recommendations...</AlertDescription>
      </Alert>
    );
  }

  if (error || !recommendations || recommendations.length === 0) {
    return null;
  }

  const recommendation = recommendations[0];
  const isInsuranceBilling = selectedClientBillingType === 'insurance';

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
          <CurrencyDollarIcon className="h-4 w-4" />
          Billing Recommendation - {recommendation.assessmentName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <ClockIcon className="h-3 w-3 text-gray-500" />
            <span>{recommendation.estimatedTotalTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <DocumentTextIcon className="h-3 w-3 text-gray-500" />
            <span>{recommendation.estimatedUnits} billing units</span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-700">Recommended CPT Codes:</h4>
          <div className="grid grid-cols-1 gap-2">
            {recommendation.recommendedCodes.map((code, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={code.type === 'intake' ? 'default' : code.type === 'administration' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {code.code}
                  </Badge>
                  <span className="text-xs text-gray-600">{code.description}</span>
                  {code.addOn && <Badge variant="outline" className="text-xs">Add-on</Badge>}
                </div>
                <span className="text-xs font-medium">{code.units}x</span>
              </div>
            ))}
          </div>
        </div>

        {recommendation.billingNotes && (
          <div className="text-xs text-gray-600 bg-white p-2 rounded border">
            <strong>Notes:</strong> {recommendation.billingNotes}
          </div>
        )}

        {!isInsuranceBilling && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertDescription className="text-xs text-amber-800">
              Client uses private pay billing. CPT codes shown for reference and potential insurance claims.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}