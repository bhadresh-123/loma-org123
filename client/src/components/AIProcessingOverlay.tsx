import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { ArrowPathIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface AIProcessingStep {
  id: string;
  title: string;
  status: "waiting" | "processing" | "completed" | "error";
  details?: string;
}

interface AIProcessingOverlayProps {
  open: boolean;
  onClose: () => void;
  steps: AIProcessingStep[];
  currentStepId: string;
  progress: number;
  transcript?: string;
  onCancel?: () => void;
}

export default function AIProcessingOverlay({
  open,
  onClose,
  steps,
  currentStepId,
  progress,
  transcript,
  onCancel
}: AIProcessingOverlayProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const getStepIcon = (status: AIProcessingStep["status"]) => {
    switch (status) {
      case "processing":
        return <ArrowPathIcon className="h-4 w-4 animate-spin" />;
      case "completed":
        return <div className="h-2 w-2 rounded-full bg-green-500" />;
      case "error":
        return <XCircleIcon className="h-4 w-4 text-destructive" />;
      default:
        return <div className="h-2 w-2 rounded-full bg-muted" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Generating AI Notes</h2>
          <Progress value={progress} className="w-[100px]" />
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 mt-4">
            {steps.map((step) => (
              <div key={step.id} className="space-y-2">
                <div 
                  className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer
                    ${currentStepId === step.id ? 'bg-muted' : ''}`}
                  onClick={() => toggleStep(step.id)}
                >
                  <div className="flex items-center space-x-3">
                    {getStepIcon(step.status)}
                    <span className="font-medium">{step.title}</span>
                    {step.status === "processing" && (
                      <Badge variant="secondary" className="ml-2">
                        In Progress
                      </Badge>
                    )}
                  </div>
                  {step.details && (
                    expandedSteps.has(step.id) ? 
                      <ChevronUpIcon className="h-4 w-4" /> : 
                      <ChevronDownIcon className="h-4 w-4" />
                  )}
                </div>

                {expandedSteps.has(step.id) && step.details && (
                  <div className="pl-8 pr-4">
                    <pre className="whitespace-pre-wrap text-sm bg-muted p-2 rounded-md">
                      {step.details}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            You can close this overlay without interrupting the process
          </p>
          {onCancel && (
            <Button 
              variant="outline" 
              onClick={onCancel}
              className="ml-2"
            >
              Cancel Generation
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
