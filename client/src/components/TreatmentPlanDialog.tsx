import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/contexts/ToastContext";
import { PlusIcon, ExclamationCircleIcon, ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface TreatmentPlan {
  id: number;
  patientId: number;
  userId: number;
  content: string;
  goals: {
    text: string;
    created: string;
  };
  version: number;
  createdAt: string;
}

interface TreatmentPlanDialogProps {
  patientId: number;
  open: boolean;
  onClose: () => void;
}

interface AIGenerateResponse {
  success: boolean;
  treatmentPlan?: {
    content: string;
    goals: string;
  };
  error?: string;
}

export default function TreatmentPlanDialog({ patientId, open, onClose }: TreatmentPlanDialogProps) {
  const [content, setContent] = useState("");
  const [goals, setGoals] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [presentingConcerns, setPresentingConcerns] = useState("");
  const [therapeuticApproach, setTherapeuticApproach] = useState("");
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [showCreationOptions, setShowCreationOptions] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: treatmentPlans, isLoading } = useQuery<TreatmentPlan[]>({
    queryKey: ["/api/patients", patientId, "treatment-plans"],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/treatment-plans`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const generatePlanMutation = useMutation({
    mutationFn: async (data: { presenting: string; approach: string }): Promise<AIGenerateResponse> => {
      const res = await fetch('/api/patient-treatment-plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presentingConcerns: data.presenting.trim(),
          therapeuticApproach: data.approach.trim(),
          patientId
        }),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.treatmentPlan) {
        setContent(data.treatmentPlan.content);
        setGoals(data.treatmentPlan.goals);
        setIsCreatingNew(true);
        toast({
          title: "Success",
          description: "Treatment plan generated successfully. Please review and save.",
        });
      }
      setShowAIDialog(false);
      setIsGenerating(false);
      setPresentingConcerns("");
      setTherapeuticApproach("");
      setAcceptedDisclaimer(false);
      setShowCreationOptions(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate treatment plan",
        variant: "destructive",
      });
      setIsGenerating(false);
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: { content: string; goals: string }) => {
      const res = await fetch(`/api/patients/${patientId}/treatment-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: data.content.trim(),
          goals: {
            text: data.goals.trim(),
            created: new Date().toISOString()
          }
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create treatment plan");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "treatment-plans"] });
      setContent("");
      setGoals("");
      setIsCreatingNew(false);
      setShowCreationOptions(false);
      toast({
        title: "Success",
        description: "Treatment plan created successfully",
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String(error.message)
          : "Failed to create treatment plan";

      toast({
        title: "Error creating treatment plan",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleCreatePlan = () => {
    const trimmedContent = content.trim();
    const trimmedGoals = goals.trim();

    if (!trimmedContent || !trimmedGoals) {
      toast({
        title: "Validation Error",
        description: "Both goals and content are required",
        variant: "destructive",
      });
      return;
    }

    createPlanMutation.mutate({ content: trimmedContent, goals: trimmedGoals });
  };

  const handleGeneratePlan = async () => {
    if (!acceptedDisclaimer) return;

    const trimmedPresenting = presentingConcerns.trim();
    const trimmedApproach = therapeuticApproach.trim();

    if (!trimmedPresenting || !trimmedApproach) {
      toast({
        title: "Validation Error",
        description: "Both presenting concerns and therapeutic approach are required",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generatePlanMutation.mutateAsync({
        presenting: trimmedPresenting,
        approach: trimmedApproach
      });

      if (result.success && result.treatmentPlan) {
        setContent(result.treatmentPlan.content);
        setGoals(result.treatmentPlan.goals);
        setIsCreatingNew(true);
        toast({
          title: "Plan Generated",
          description: "Please review and edit the treatment plan before saving.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate treatment plan",
        variant: "destructive",
      });
    } finally {
      setShowAIDialog(false);
      setIsGenerating(false);
      setPresentingConcerns("");
      setTherapeuticApproach("");
      setAcceptedDisclaimer(false);
      setShowCreationOptions(false);
    }
  };

  const handleStartNewVersion = () => {
    setShowCreationOptions(true);
  };

  const handleManualCreation = () => {
    setIsCreatingNew(true);
    setShowCreationOptions(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Treatment Plan Management</DialogTitle>
            <DialogDescription>
              {isCreatingNew
                ? "Review and edit the treatment plan before saving. All changes create a new version for record-keeping."
                : "View and manage treatment plans. Each version is preserved for accurate record-keeping."}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <ArrowPathIcon className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  {!isCreatingNew && !showCreationOptions && treatmentPlans && treatmentPlans.length > 0 && (
                    <div className="space-y-4">
                      {treatmentPlans.map((plan) => (
                        <div key={plan.id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <h3 className="text-sm font-medium">Version {plan.version}</h3>
                            <span className="text-sm text-muted-foreground">
                              Created on {new Date(plan.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2">Goals</h4>
                              <div className="p-4 rounded-md bg-muted/50">
                                <pre className="whitespace-pre-wrap">{plan.goals.text}</pre>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-2">Content</h4>
                              <div className="p-4 rounded-md bg-muted/50">
                                <pre className="whitespace-pre-wrap">{plan.content}</pre>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {showCreationOptions && (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <Button onClick={handleManualCreation} className="w-full">
                          <PlusIcon className="w-4 h-4 mr-2" />
                          Write Treatment Plan Manually
                        </Button>
                        <Button onClick={() => setShowAIDialog(true)} className="w-full">
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate AI Treatment Plan
                        </Button>
                      </div>
                    </div>
                  )}

                  {isCreatingNew && (
                    <div className="space-y-4">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="goals" className="text-sm font-medium mb-2">Treatment Goals</Label>
                          <Textarea
                            id="goals"
                            value={goals}
                            onChange={(e) => setGoals(e.target.value)}
                            placeholder="Enter or edit the treatment goals..."
                            className="min-h-[150px] font-mono text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="content" className="text-sm font-medium mb-2">Treatment Plan Content</Label>
                          <Textarea
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Enter or edit the treatment plan content..."
                            className="min-h-[300px] font-mono text-sm"
                          />
                        </div>
                      </div>

                      <Alert>
                        <ExclamationCircleIcon className="h-4 w-4" />
                        <AlertDescription>
                          Review and edit the treatment plan as needed. Once saved, it will create a new version and cannot be modified.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {!isCreatingNew && !showCreationOptions && (
                    <Button onClick={handleStartNewVersion} className="w-full">
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Create New Version
                    </Button>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            {(isCreatingNew || showCreationOptions) && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreatingNew(false);
                    setShowCreationOptions(false);
                    setContent("");
                    setGoals("");
                  }}
                >
                  Cancel
                </Button>
                {isCreatingNew && (
                  <Button
                    onClick={handleCreatePlan}
                    disabled={!content.trim() || !goals.trim() || createPlanMutation.isPending}
                  >
                    {createPlanMutation.isPending && (
                      <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Treatment Plan
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate AI Treatment Plan</DialogTitle>
            <DialogDescription>
              Provide information about the client to generate a professional treatment plan using AI.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="presentingConcerns">Presenting Concerns</Label>
              <Textarea
                id="presentingConcerns"
                value={presentingConcerns}
                onChange={(e) => setPresentingConcerns(e.target.value)}
                placeholder="Describe the client's presenting concerns and symptoms..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="therapeuticApproach">Therapeutic Approach</Label>
              <Textarea
                id="therapeuticApproach"
                value={therapeuticApproach}
                onChange={(e) => setTherapeuticApproach(e.target.value)}
                placeholder="Describe your planned therapeutic approach and modalities..."
                className="min-h-[100px]"
              />
            </div>

            <Alert>
              <AlertDescription>
                By proceeding, you acknowledge that:
                <ul className="list-disc pl-4 mt-2 space-y-1">
                  <li>The generated plan will be based on the information provided</li>
                  <li>You are responsible for reviewing and verifying all generated content</li>
                  <li>The final saved plan will be considered your official treatment documentation</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="disclaimer"
                checked={acceptedDisclaimer}
                onCheckedChange={(checked) => setAcceptedDisclaimer(checked as boolean)}
              />
              <label
                htmlFor="disclaimer"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I understand and accept the responsibility for this AI-generated plan
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAIDialog(false);
                setPresentingConcerns("");
                setTherapeuticApproach("");
                setAcceptedDisclaimer(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGeneratePlan}
              disabled={
                !acceptedDisclaimer ||
                isGenerating ||
                !presentingConcerns.trim() ||
                !therapeuticApproach.trim()
              }
            >
              {isGenerating && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
              Generate Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}