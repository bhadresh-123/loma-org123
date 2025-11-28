import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/contexts/ToastContext";
import { ArrowDownTrayIcon, DocumentArrowDownIcon, ArrowPathIcon, ClipboardIcon, ArrowUpTrayIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Label } from "@/components/ui/label";
import type { Session } from "@/types/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AIProcessingOverlay from "./AIProcessingOverlay";
import TreatmentPlanDialog from "./TreatmentPlanDialog";
import SessionAssessments from "./SessionAssessments";
import { useNoteSettings } from '@/hooks/use-note-settings';


interface SessionWithClient extends Session {
  patient: {
    name: string;
  };
}

interface SessionNotesProps {
  session: SessionWithClient;
  onClose: () => void;
  open: boolean;
}

interface NotesStructure {
  mood: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  focus?: string;
  intervention?: string;
  response?: string;
  goal?: string;
  appearance?: string;
  behavior?: string;
  speech?: string;
  thoughtProcess?: string;
  thoughtContent?: string;
  cognition?: string;
  insight?: string;
  problem?: string;
  evaluation?: string;
  data?: string;
  situation?: string;
  narrative?: string;
  emotion?: string;
}

interface AIGenerateResponse {
  success: boolean;
  notes?: NotesStructure;
  error?: string;
}

interface ProcessingStep {
  id: string;
  title: string;
  status: "waiting" | "processing" | "completed" | "error";
  details?: string;
}

export default function SessionNotes({ session, onClose, open }: SessionNotesProps) {
  // Use new note settings hook
  const { noteSettings, isLoading: isLoadingSettings } = useNoteSettings();
  
  // Legacy user info query for backward compatibility
  const { data: userInfo } = useQuery({
    queryKey: ['user-info'],
    queryFn: async () => {
      const response = await fetch('/api/user-info');
      if (!response.ok) throw new Error('Failed to fetch user info');
      return response.json();
    }
  });
  
  const [noteFormat, setNoteFormat] = useState('SOAP');
  
  // Update note format when user data loads
  useEffect(() => {
    console.log('SessionNotes userInfo loaded:', { defaultNoteFormat: userInfo?.defaultNoteFormat, default_note_format: userInfo?.default_note_format });
    
    const noteFormatValue = userInfo?.defaultNoteFormat || userInfo?.default_note_format;
    if (noteFormatValue && noteFormatValue !== 'SOAP') {
      console.log('Setting note format to:', noteFormatValue);
      setNoteFormat(noteFormatValue);
    }
  }, [userInfo]);
  const [notes, setNotes] = useState<NotesStructure>({
    mood: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });

  const noteFormats = [
    { value: 'SOAP', label: 'SOAP - Subjective, Objective, Assessment, Plan' },
    { value: 'DAP', label: 'DAP - Data, Assessment, Plan' },
    { value: 'BIRP', label: 'BIRP - Behavior, Intervention, Response, Plan' },
    { value: 'PIE', label: 'PIE - Problem, Intervention, Evaluation' },
    { value: 'SIRP', label: 'SIRP - Situation, Intervention, Response, Plan' },
    { value: 'CBE', label: 'CBE - Cognition, Behavior, Emotion' },
    { value: 'Narrative', label: 'Narrative - Free-form narrative note' },
    { value: 'FIRP', label: 'FIRP - Focus, Intervention, Response, Plan' },
    { value: 'GIRP', label: 'GIRP - Goal, Intervention, Response, Plan' },
    { value: 'MSE', label: 'MSE - Mental Status Examination' }
  ];
  const [isDirty, setIsDirty] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcript, setTranscript] = useState<File | null>(null);
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [transcriptText, setTranscriptText] = useState<string>("");
  const [inputMethod, setInputMethod] = useState<"file" | "text">("text");
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { id: "compress", title: "Optimizing Transcript", status: "waiting" },
    { id: "chunk", title: "Preparing Content Chunks", status: "waiting" },
    { id: "process", title: "Processing with AI Model", status: "waiting" },
    { id: "combine", title: "Combining Results", status: "waiting" },
  ]);
    const [currentStep, setCurrentStep] = useState<string>("");
  const [showProcessing, setShowProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
    const [optimizedTranscript, setOptimizedTranscript] = useState<string>("");
  const [showTreatmentPlan, setShowTreatmentPlan] = useState(false);

  const { data: previousSession } = useQuery<SessionWithClient>({
    queryKey: ["/api/patients", session.patientId, "previous-session", session.id],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${session.patientId}/previous-session/${session.id}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(await res.text());
      }
      return res.json();
    }
  });

  useEffect(() => {
    if (session.sessionClinicalNotes) {
      try {
        const parsedNotes = JSON.parse(session.sessionClinicalNotes);
        if (typeof parsedNotes === 'object' && parsedNotes !== null) {
          setNotes({
            mood: parsedNotes.mood || '',
            subjective: parsedNotes.subjective || '',
            objective: parsedNotes.objective || '',
            assessment: parsedNotes.assessment || '',
            plan: parsedNotes.plan || '',
            focus: parsedNotes.focus || '',
            intervention: parsedNotes.intervention || '',
            response: parsedNotes.response || '',
            goal: parsedNotes.goal || '',
            appearance: parsedNotes.appearance || '',
            behavior: parsedNotes.behavior || '',
            speech: parsedNotes.speech || '',
            thoughtProcess: parsedNotes.thoughtProcess || '',
            thoughtContent: parsedNotes.thoughtContent || '',
            cognition: parsedNotes.cognition || '',
            insight: parsedNotes.insight || '',
            problem: parsedNotes.problem || '',
            evaluation: parsedNotes.evaluation || '',
            data: parsedNotes.data || '',
            situation: parsedNotes.situation || '',
            narrative: parsedNotes.narrative || '',
            emotion: parsedNotes.emotion || ''
          });
        }
      } catch {
        setNotes({
          mood: '',
          subjective: session.sessionClinicalNotes || '',
          objective: '',
          assessment: '',
          plan: ''
        });
      }
    }
  }, [session.sessionClinicalNotes]);

  const updateNotesMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/clinical-sessions/${session.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionClinicalNotesEncrypted: JSON.stringify(notes),
          status: 'completed'
        }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinical-sessions"] });
      setIsDirty(false);
      toast({
        title: "Success",
        description: "Session notes saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save notes",
        variant: "destructive",
      });
    },
  });

  const generateNotesMutation = useMutation({
    mutationFn: async (formData: FormData): Promise<AIGenerateResponse> => {
      setShowProcessing(true);
      setProgress(0);

      // Update compress step
      setCurrentStep("compress");
      setProcessingSteps(steps => steps.map(step =>
        step.id === "compress" ? { ...step, status: "processing" } : step
      ));

      const res = await fetch('/api/notes/generate', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      // Setup server-sent events for progress updates
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Failed to setup progress tracking");
      }

      let buffer = "";
      let finalResponse: AIGenerateResponse | null = null;

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete messages from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const data = JSON.parse(line);

              if (data.type === "progress") {
                setProgress(data.progress);

                // Update step status
                if (data.step !== currentStep) {
                  setCurrentStep(data.step);
                  setProcessingSteps(steps => steps.map(step => ({
                    ...step,
                    status: step.id === data.step ? "processing" :
                             step.id === currentStep ? "completed" :
                             step.status
                  })));
                }

                // Update step details if provided
                if (data.details) {
                  setProcessingSteps(steps => steps.map(step =>
                    step.id === data.step ? { ...step, details: data.details } : step
                  ));
                }
              } else {
                // This should be our final response with the notes
                finalResponse = data;
              }
            } catch (e) {
              console.error("Failed to parse update:", line, e);
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            finalResponse = JSON.parse(buffer);
          } catch (e) {
            console.error("Failed to parse final buffer:", buffer, e);
          }
        }

        if (!finalResponse) {
          throw new Error("No final response received from server");
        }

        return finalResponse;
      } finally {
        reader.releaseLock();
      }
    },
    onSuccess: (data) => {
      if (data.success && data.notes) {
        setNotes(data.notes);
        setIsDirty(true);
        toast({
          title: "Success",
          description: "AI notes generated successfully. Please review and save.",
        });
      }
      setShowProcessing(false);
        setCurrentStep("");
      setProcessingSteps(steps => steps.map(step => ({
        ...step,
        status: "waiting",
        details: undefined
      })));
      setShowAIDialog(false);
      setTranscript(null);
      setTranscriptText("");
        setAcceptedDisclaimer(false);
    },
    onError: (error) => {
      setShowProcessing(false);
        setCurrentStep("");
      setProcessingSteps(steps => steps.map(step => ({
        ...step,
        status: step.status === "processing" ? "error" : step.status
      })));
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate notes",
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    await updateNotesMutation.mutateAsync();
  };

  const handleCopyPrevious = (section: keyof NotesStructure) => {
    if (!previousSession?.notes) {
      toast({
        title: "No Previous Notes",
        description: "No previous session notes found to copy from.",
        variant: "destructive",
      });
      return;
    }

    try {
      const prevNotes = JSON.parse(previousSession.notes);
      if (prevNotes[section]) {
        setNotes(prev => ({
          ...prev,
          [section]: prevNotes[section]
        }));
        setIsDirty(true);
        toast({
          title: "Success",
          description: `Previous ${section} notes copied successfully`,
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Could not copy previous notes",
        variant: "destructive",
      });
    }
  };

  const handleNotesChange = (section: keyof NotesStructure, value: string) => {
    setNotes(prev => ({
      ...prev,
      [section]: value
    }));
    setIsDirty(true);
  };

    const handleMoodSelect = (mood: string) => {
      handleNotesChange('mood', mood);
    };

  const handleDownload = () => {
    const element = document.createElement("a");
    
    // Format notes based on the selected note format
    const clientName = session.patient?.name || 'Unknown Client';
    let formattedNotes = `${noteFormat} Notes - ${clientName}\n` +
      `Date: ${new Date(session.date).toLocaleDateString()}\n\n` +
      `Mood: ${notes.mood ? MOOD_OPTIONS.find(m => m.value === notes.mood)?.emoji || notes.mood : 'Not recorded'}\n\n`;
      
    // Add different sections based on note format
    switch (noteFormat) {
      case 'SOAP':
        formattedNotes += `SUBJECTIVE:\n${notes.subjective || ''}\n\n` +
          `OBJECTIVE:\n${notes.objective || ''}\n\n` +
          `ASSESSMENT:\n${notes.assessment || ''}\n\n` +
          `PLAN:\n${notes.plan || ''}`;
        break;
      case 'DAP':
        formattedNotes += `DATA:\n${notes.data || ''}\n\n` +
          `ASSESSMENT:\n${notes.assessment || ''}\n\n` +
          `PLAN:\n${notes.plan || ''}`;
        break;
      case 'BIRP':
        formattedNotes += `BEHAVIOR:\n${notes.behavior || ''}\n\n` +
          `INTERVENTION:\n${notes.intervention || ''}\n\n` +
          `RESPONSE:\n${notes.response || ''}\n\n` +
          `PLAN:\n${notes.plan || ''}`;
        break;
      case 'PIE':
        formattedNotes += `PROBLEM:\n${notes.problem || ''}\n\n` +
          `INTERVENTION:\n${notes.intervention || ''}\n\n` +
          `EVALUATION:\n${notes.evaluation || ''}`;
        break;
      case 'SIRP':
        formattedNotes += `SITUATION:\n${notes.situation || ''}\n\n` +
          `INTERVENTION:\n${notes.intervention || ''}\n\n` +
          `RESPONSE:\n${notes.response || ''}\n\n` +
          `PLAN:\n${notes.plan || ''}`;
        break;
      case 'CBE':
        formattedNotes += `COGNITION:\n${notes.cognition || ''}\n\n` +
          `BEHAVIOR:\n${notes.behavior || ''}\n\n` +
          `EMOTION:\n${notes.emotion || ''}`;
        break;
      case 'Narrative':
        formattedNotes += `NARRATIVE:\n${notes.narrative || ''}`;
        break;
      case 'FIRP':
        formattedNotes += `FOCUS:\n${notes.focus || ''}\n\n` +
          `INTERVENTION:\n${notes.intervention || ''}\n\n` +
          `RESPONSE:\n${notes.response || ''}\n\n` +
          `PLAN:\n${notes.plan || ''}`;
        break;
      case 'GIRP':
        formattedNotes += `GOAL:\n${notes.goal || ''}\n\n` +
          `INTERVENTION:\n${notes.intervention || ''}\n\n` +
          `RESPONSE:\n${notes.response || ''}\n\n` +
          `PLAN:\n${notes.plan || ''}`;
        break;
      case 'MSE':
        formattedNotes += `APPEARANCE:\n${notes.appearance || ''}\n\n` +
          `BEHAVIOR:\n${notes.behavior || ''}\n\n` +
          `SPEECH:\n${notes.speech || ''}\n\n` +
          `THOUGHT PROCESS:\n${notes.thoughtProcess || ''}\n\n` +
          `THOUGHT CONTENT:\n${notes.thoughtContent || ''}\n\n` +
          `COGNITION:\n${notes.cognition || ''}\n\n` +
          `INSIGHT:\n${notes.insight || ''}`;
        break;
      default:
        // Fallback to SOAP if format is not recognized
        formattedNotes += `SUBJECTIVE:\n${notes.subjective || ''}\n\n` +
          `OBJECTIVE:\n${notes.objective || ''}\n\n` +
          `ASSESSMENT:\n${notes.assessment || ''}\n\n` +
          `PLAN:\n${notes.plan || ''}`;
    }

    const file = new Blob([formattedNotes], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${noteFormat.toLowerCase()}-notes-${clientName}-${new Date(session.date).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTranscript(file);
    }
  };

  const handleGenerateNotes = async () => {
    if (!acceptedDisclaimer) return;
    if ((inputMethod === "file" && !transcript) || (inputMethod === "text" && !transcriptText)) {
      toast({
        title: "Error",
        description: "Please provide a transcript either by file upload or text input",
        variant: "destructive",
      });
      return;
    }

      setIsGenerating(true);
      try {
          const formData = new FormData();
        if (inputMethod === "file" && transcript) {
            formData.append('transcript', transcript);
            formData.append('inputType', 'file');
        } else {
            formData.append('transcript', transcriptText);
            formData.append('inputType', 'text');
        }
          formData.append('sessionId', session.id.toString());
          formData.append('noteFormat', noteFormat);

          await generateNotesMutation.mutateAsync(formData);
      } finally {
        setIsGenerating(false);
      }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const MOOD_OPTIONS = [
    { emoji: "😊", label: "Happy", value: "happy" },
    { emoji: "😢", label: "Sad", value: "sad" },
    { emoji: "😠", label: "Angry", value: "angry" },
    { emoji: "😨", label: "Anxious", value: "anxious" },
    { emoji: "😐", label: "Neutral", value: "neutral" },
    { emoji: "😴", label: "Tired", value: "tired" },
      { emoji: "🤔", label: "Confused", value: "confused" },
    { emoji: "😌", label: "Calm", value: "calm" },
  ] as const;

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent side="right" className="w-[90vw] sm:max-w-[80vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Session Notes{session.patient?.name ? ` - ${session.patient.name}` : ''}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-6">
            <div className="flex justify-between items-center">
            <Button
                variant="outline"
                onClick={() => setShowTreatmentPlan(true)}
            >
                <ClipboardIcon className="h-4 w-4 mr-2" />
                Treatment Plan
            </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={!Object.values(notes).some(note => note.length > 0)}
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Download Notes
              </Button>
              <Button
                onClick={() => setShowAIDialog(true)}
                className="ml-2"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Generate AI Notes
              </Button>
            </div>

              <section className="space-y-2">
              <Label className="text-lg font-semibold">Client's Mood</Label>
              <div className="flex flex-wrap gap-2">
                  {MOOD_OPTIONS.map((mood) => (
                      <Button
                          key={mood.value}
                          variant={notes.mood === mood.value ? "default" : "outline"}
                          className="text-lg p-2"
                          onClick={() => handleMoodSelect(mood.value)}
                      >
                          <span title={mood.label}>{mood.emoji}</span>
                      </Button>
                  ))}
              </div>
          </section>

            {/* Assessment Management Section */}
            <SessionAssessments
              sessionId={session.id}
              sessionType={session.type}
            />

            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-4">
                <Label htmlFor="noteFormat" className="text-lg font-semibold">
                  Note Format
                </Label>
                <select
                  id="noteFormat"
                  value={noteFormat}
                  onChange={(e) => setNoteFormat(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {noteFormats.map(format => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </select>
              </div>
              {noteFormat === 'GIRP' && (
                <>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="goal" className="text-lg font-semibold">
                        Goal
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('goal')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="goal"
                      value={notes.goal || ""}
                      onChange={(e) => handleNotesChange('goal', e.target.value)}
                      placeholder="The specific goal or objective for the session..."
                      className="min-h-[150px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <Label htmlFor="intervention" className="text-lg font-semibold">
                      Intervention
                    </Label>
                    <Textarea
                      id="intervention"
                      value={notes.intervention || ""}
                      onChange={(e) => handleNotesChange('intervention', e.target.value)}
                      placeholder="What therapeutic interventions were used..."
                      className="min-h-[150px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <Label htmlFor="response" className="text-lg font-semibold">
                      Response
                    </Label>
                    <Textarea
                      id="response"
                      value={notes.response || ""}
                      onChange={(e) => handleNotesChange('response', e.target.value)}
                      placeholder="How did the client respond to the intervention..."
                      className="min-h-[150px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <Label htmlFor="plan" className="text-lg font-semibold">
                      Plan
                    </Label>
                    <Textarea
                      id="plan"
                      value={notes.plan || ""}
                      onChange={(e) => handleNotesChange('plan', e.target.value)}
                      placeholder="Plan for next session or homework assigned..."
                      className="min-h-[150px]"
                    />
                  </section>
                </>
              )}

              {noteFormat === 'FIRP' && (
                <>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="focus" className="text-lg font-semibold">
                        Focus
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('focus')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="focus"
                      value={notes.focus || ""}
                      onChange={(e) => handleNotesChange('focus', e.target.value)}
                      placeholder="What was the focus of the session (specific issue or goal)..."
                      className="min-h-[150px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <Label htmlFor="intervention" className="text-lg font-semibold">
                      Intervention
                    </Label>
                    <Textarea
                      id="intervention"
                      value={notes.intervention || ""}
                      onChange={(e) => handleNotesChange('intervention', e.target.value)}
                      placeholder="What therapeutic interventions were used..."
                      className="min-h-[150px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <Label htmlFor="response" className="text-lg font-semibold">
                      Response
                    </Label>
                    <Textarea
                      id="response"
                      value={notes.response || ""}
                      onChange={(e) => handleNotesChange('response', e.target.value)}
                      placeholder="How did the client respond to the intervention..."
                      className="min-h-[150px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <Label htmlFor="plan" className="text-lg font-semibold">
                      Plan
                    </Label>
                    <Textarea
                      id="plan"
                      value={notes.plan || ""}
                      onChange={(e) => handleNotesChange('plan', e.target.value)}
                      placeholder="Plan for next session or homework assigned..."
                      className="min-h-[150px]"
                    />
                  </section>
                </>
              )}

              {noteFormat === 'BIRP' && (
                <>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="behavior" className="text-lg font-semibold">
                        Behavior
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('behavior')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="behavior"
                      value={notes.behavior || ""}
                      onChange={(e) => handleNotesChange('behavior', e.target.value)}
                      placeholder="Observable client behaviors and statements..."
                      className="min-h-[150px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="intervention" className="text-lg font-semibold">
                        Intervention
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('intervention')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="intervention"
                      value={notes.intervention || ""}
                      onChange={(e) => handleNotesChange('intervention', e.target.value)}
                      placeholder="Therapeutic interventions and techniques used..."
                      className="min-h-[150px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="response" className="text-lg font-semibold">
                        Response
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('response')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="response"
                      value={notes.response || ""}
                      onChange={(e) => handleNotesChange('response', e.target.value)}
                      placeholder="Client's response to interventions..."
                      className="min-h-[150px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="plan" className="text-lg font-semibold">
                        Plan
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('plan')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="plan"
                      value={notes.plan || ""}
                      onChange={(e) => handleNotesChange('plan', e.target.value)}
                      placeholder="Future treatment plans and goals..."
                      className="min-h-[150px]"
                    />
                  </section>
                </>
              )}

              {noteFormat === 'PIE' && (
                <>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="problem" className="text-lg font-semibold">
                        Problem
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('problem')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="problem"
                      value={notes.problem || ""}
                      onChange={(e) => handleNotesChange('problem', e.target.value)}
                      placeholder="Identify the client's presenting problems..."
                      className="min-h-[150px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="intervention" className="text-lg font-semibold">
                        Intervention
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('intervention')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="intervention"
                      value={notes.intervention || ""}
                      onChange={(e) => handleNotesChange('intervention', e.target.value)}
                      placeholder="Actions taken to address the problems..."
                      className="min-h-[150px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="evaluation" className="text-lg font-semibold">
                        Evaluation
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('evaluation')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="evaluation"
                      value={notes.evaluation || ""}
                      onChange={(e) => handleNotesChange('evaluation', e.target.value)}
                      placeholder="Assessment of intervention effectiveness..."
                      className="min-h-[150px]"
                    />
                  </section>
                </>
              )}


              {noteFormat === 'MSE' && (
                <>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="appearance" className="text-lg font-semibold">
                        Appearance & Behavior
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('appearance')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="appearance"
                      value={notes.appearance || ""}
                      onChange={(e) => handleNotesChange('appearance', e.target.value)}
                      placeholder="Client's appearance and presentation..."
                      className="min-h-[100px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="behavior" className="text-lg font-semibold">
                        Behavior
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('behavior')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="behavior"
                      value={notes.behavior || ""}
                      onChange={(e) => handleNotesChange('behavior', e.target.value)}
                      placeholder="Observable behaviors during session..."
                      className="min-h-[100px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="speech" className="text-lg font-semibold">
                        Speech
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('speech')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="speech"
                      value={notes.speech || ""}
                      onChange={(e) => handleNotesChange('speech', e.target.value)}
                      placeholder="Speech patterns and characteristics..."
                      className="min-h-[100px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="thoughtProcess" className="text-lg font-semibold">
                        Thought Process
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('thoughtProcess')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="thoughtProcess"
                      value={notes.thoughtProcess || ""}
                      onChange={(e) => handleNotesChange('thoughtProcess', e.target.value)}
                      placeholder="Organization and flow of thoughts..."
                      className="min-h-[100px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="thoughtContent" className="text-lg font-semibold">
                        Thought Content
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('thoughtContent')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="thoughtContent"
                      value={notes.thoughtContent || ""}
                      onChange={(e) => handleNotesChange('thoughtContent', e.target.value)}
                      placeholder="Content and themes of thoughts..."
                      className="min-h-[100px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="cognition" className="text-lg font-semibold">
                        Cognition
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('cognition')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="cognition"
                      value={notes.cognition || ""}
                      onChange={(e) => handleNotesChange('cognition', e.target.value)}
                      placeholder="Memory, attention, and cognitive functioning..."
                      className="min-h-[100px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="insight" className="text-lg font-semibold">
                        Insight
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('insight')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="insight"
                      value={notes.insight || ""}
                      onChange={(e) => handleNotesChange('insight', e.target.value)}
                      placeholder="Level of understanding and self-awareness..."
                      className="min-h-[100px]"
                    />
                  </section>
                </>
              )}

              {noteFormat === 'Narrative' && (
                <>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="narrative" className="text-lg font-semibold">
                        Session Narrative
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('narrative')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="narrative"
                      value={notes.narrative || ""}
                      onChange={(e) => handleNotesChange('narrative', e.target.value)}
                      placeholder="Provide a comprehensive narrative of the session including presenting issues, interventions used, client response, and plan..."
                      className="min-h-[400px]"
                    />
                  </section>
                </>
              )}

              {noteFormat === 'CBE' && (
                <>
                  <section className="space-y-2"><div className="flex justify-between items-center">
                      <Label htmlFor="cognition" className="text-lg font-semibold">
                        Cognition
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('cognition')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="cognition"
                      value={notes.cognition || ""}
                      onChange={(e) => handleNotesChange('cognition', e.target.value)}
                      placeholder="Client's thoughts, beliefs, and thought patterns..."
                      className="min-h-[150px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="behavior" className="text-lg font-semibold">
                        Behavior
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('behavior')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="behavior"
                      value={notes.behavior || ""}
                      onChange={(e) => handleNotesChange('behavior', e.target.value)}
                      placeholder="Observable behaviors and actions..."
                      className="min-h-[150px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="emotion" className="text-lg font-semibold">
                        Emotion
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('emotion')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="emotion"
                      value={notes.emotion || ""}
                      onChange={(e) => handleNotesChange('emotion', e.target.value)}
                      placeholder="Client's emotional state and affect..."
                      className="min-h-[150px]"
                    />
                  </section>
                </>
              )}

              {noteFormat === 'SIRP' && (
                <>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="situation" className="text-lg font-semibold">
                        Situation
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('situation')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="situation"
                      value={notes.situation || ""}
                      onChange={(e) => handleNotesChange('situation', e.target.value)}
                      placeholder="Description of the current situation or presenting problem..."
                      className="min-h-[150px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="intervention" className="text-lg font-semibold">
                        Intervention
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('intervention')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="intervention"
                      value={notes.intervention || ""}
                      onChange={(e) => handleNotesChange('intervention', e.target.value)}
                      placeholder="Therapeutic interventions and techniques used..."
                      className="min-h-[150px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="response" className="text-lg font-semibold">
                        Response
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('response')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="response"
                      value={notes.response || ""}
                      onChange={(e) => handleNotesChange('response', e.target.value)}
                      placeholder="Client's response to the interventions..."
                      className="min-h-[150px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="plan" className="text-lg font-semibold">
                        Plan
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('plan')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="plan"
                      value={notes.plan || ""}
                      onChange={(e) => handleNotesChange('plan', e.target.value)}
                      placeholder="Treatment plan and next steps..."
                      className="min-h-[150px]"
                    />
                  </section>
                </>
              )}

              {noteFormat === 'DAP' && (
                <>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="data" className="text-lg font-semibold">
                        Data
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('data')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="data"
                      value={notes.data || ""}
                      onChange={(e) => handleNotesChange('data', e.target.value)}
                      placeholder="Objective information and observations about the client..."
                      className="min-h-[150px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="assessment" className="text-lg font-semibold">
                        Assessment
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('assessment')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="assessment"
                      value={notes.assessment || ""}
                      onChange={(e) => handleNotesChange('assessment', e.target.value)}
                      placeholder="Clinical assessment and interpretation of the data..."
                      className="min-h-[150px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="plan" className="text-lg font-semibold">
                        Plan
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('plan')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="plan"
                      value={notes.plan || ""}
                      onChange={(e) => handleNotesChange('plan', e.target.value)}
                      placeholder="Treatment plan and next steps..."
                      className="min-h-[150px]"
                    />
                  </section>
                </>
              )}

              {(noteFormat === 'SOAP' || !noteFormat) && (
                <>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="subjective" className="text-lg font-semibold">
                        Subjective
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('subjective')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="subjective"
                      value={notes.subjective || ""}
                      onChange={(e) => handleNotesChange('subjective', e.target.value)}
                      placeholder="Client's reported symptoms, concerns, progress..."
                      className="min-h-[150px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="objective" className="text-lg font-semibold">
                        Objective
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('objective')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="objective"
                      value={notes.objective || ""}
                      onChange={(e) => handleNotesChange('objective', e.target.value)}
                      placeholder="Observable facts, mental status examination findings..."
                      className="min-h-[150px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="assessment" className="text-lg font-semibold">
                        Assessment
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('assessment')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="assessment"
                      value={notes.assessment || ""}
                      onChange={(e) => handleNotesChange('assessment', e.target.value)}
                      placeholder="Clinical assessment, diagnosis considerations..."
                      className="min-h-[150px]"
                    />
                  </section>
                  <section className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="plan" className="text-lg font-semibold">
                        Plan
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrevious('plan')}
                        disabled={!previousSession?.notes}
                      >
                        <ClipboardIcon className="h-4 w-4 mr-2" />
                        Copy Previous
                      </Button>
                    </div>
                    <Textarea
                      id="plan"
                      value={notes.plan || ""}
                      onChange={(e) => handleNotesChange('plan', e.target.value)}
                      placeholder="Treatment plan, interventions, follow-up plans..."
                      className="min-h-[150px]"
                    />
                  </section>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 sticky bottom-0 bg-background p-4 border-t">
              <Button
                onClick={handleSave}
                disabled={updateNotesMutation.isPending || !isDirty}
              >
                {updateNotesMutation.isPending && (
                  <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                )}
                <DocumentArrowDownIcon className="mr-2 h-4 w-4" />
                Save Notes
              </Button>
            </div>

            {isDirty && (
              <p className="text-sm text-muted-foreground">
                You have unsaved changes. Don't forget to save before closing.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-3xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate AI Notes</DialogTitle>
            <DialogDescription>
              Provide your session transcript to generate professional notes using AI.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="aiNoteFormat" className="text-md font-semibold">
                Note Format
              </Label>
              <select
                id="aiNoteFormat"
                value={noteFormat}
                onChange={(e) => setNoteFormat(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {noteFormats.map(format => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-4">
              <Button
                variant={inputMethod === "text" ? "default" : "outline"}
                onClick={() => setInputMethod("text")}
              >
                Paste Text
              </Button>
              <Button
                variant={inputMethod === "file" ? "default" : "outline"}
                onClick={() => setInputMethod("file")}
              >
                Upload File
              </Button>
            </div>

            {inputMethod === "text" ? (
              <div className="space-y-2">
                <Label htmlFor="transcriptText">Session Transcript</Label>
                <Textarea
                  id="transcriptText"
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  placeholder="Paste your session transcript here..."
                  className="min-h-[200px]"
                />
              </div>
            ) : (
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="transcript">Session Transcript</Label>
                <input
                  type="file"
                  accept=".txt,.doc,.docx"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={openFileDialog}
                  className="w-full"
                >
                  <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                  {transcript ? transcript.name : 'Upload Transcript'}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Accepts .txt, .doc, and .docx files
                </p>
              </div>
            )}

            <Alert>
              <AlertDescription>
                By proceeding, you acknowledge that:
                <ul className="list-disc pl-4 mt-2 space-y-1">
                  <li>The generated notes will be based on the provided transcript</li>
                  <li>You are responsible for reviewing and verifying all generated content</li>
                  <li>These notes may be subject to legal requirements and court subpoenas</li>
                  <li>The final saved notes will be considered your official session documentation</li>
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
                I understand and accept the responsibility for these AI-generated notes
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAIDialog(false);
                  setTranscript(null);
                setTranscriptText("");
                setAcceptedDisclaimer(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateNotes}
              disabled={
                !acceptedDisclaimer ||
                isGenerating ||
                (inputMethod === "file" ? !transcript : !transcriptText)
              }
            >
                {isGenerating && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
              Generate Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AIProcessingOverlay
        open={showProcessing}
        onClose={() => setShowProcessing(false)}
        steps={processingSteps}
        currentStepId={currentStep}
        progress={progress}
        onCancel={generateNotesMutation.isPending ? () => generateNotesMutation.reset() : undefined}
      />
      <TreatmentPlanDialog
        patientId={session.patientId}
        open={showTreatmentPlan}
        onClose={() => setShowTreatmentPlan(false)}
      />
    </>
  );
}