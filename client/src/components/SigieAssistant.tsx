import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";
import { CheckCircleIcon, ExclamationCircleIcon, PaperAirplaneIcon, XCircleIcon, ArrowPathIcon, EllipsisHorizontalIcon, ClipboardIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import SigieIcon from "./SigieIcon";
import SigiePersonaIcon from "./SigiePersonaIcon";
import { useCurrentPersona } from "@/hooks/use-current-persona";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ActionRequest {
  action: "schedule_session" | "add_task" | "reschedule_session" | "analyze_practice" | "generate_treatment_plan" | "optimize_schedule" | "billing_recommendations" | "client_risk_assessment" | "compliance_check" | "session_preparation" | "outcome_tracking" | "cpt_code_suggestion" | "practice_architect" | "clinical_admin" | "billing_manager" | "cfo_analysis" | "clinical_copilot";
  parameters: Record<string, any>;
  description: string;
}

// Separate component for chat input to prevent re-creation and focus loss
const ChatInput = ({ 
  value, 
  onChange, 
  onSubmit, 
  onKeyDown, 
  placeholder, 
  disabled, 
  className 
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Maintain focus after submit
  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [disabled]);
  
  return (
    <Textarea
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      autoFocus
    />
  );
};

const PERSONAS = {
  practice_architect: {
    title: "Practice Architect",
    description: "Business Formation & Setup",
    color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    questions: [
      "Help me set up my LLC structure",
      "What insurance paneling should I prioritize?",
      "Guide me through HIPAA compliance setup",
      "What business formation steps am I missing?",
      "Help me get my NPI and EIN numbers"
    ]
  },
  clinical_admin: {
    title: "Clinical Admin",
    description: "Operations & Documentation",
    color: "bg-green-50 border-green-200 hover:bg-green-100",
    questions: [
      "Show me my documentation backlog",
      "Optimize my scheduling efficiency",
      "Create intake workflow templates",
      "Track my session completion rates",
      "Organize my client management tasks"
    ]
  },
  billing_manager: {
    title: "Billing Manager",
    description: "Revenue & Claims",
    color: "bg-yellow-50 border-yellow-200 hover:bg-yellow-100",
    questions: [
      "Analyze my revenue collection rates",
      "What CPT codes should I use?",
      "Review my pending claims status",
      "Optimize my billing workflows",
      "Track insurance reimbursements"
    ]
  },
  cfo: {
    title: "CFO",
    description: "Financial Strategy & Growth",
    color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
    questions: [
      "Show me practice profitability analysis",
      "What are my growth opportunities?",
      "Analyze my expense breakdown",
      "Forecast my revenue projections",
      "Compare my KPIs to benchmarks"
    ]
  },
  clinical_copilot: {
    title: "Clinical Co-Pilot",
    description: "Treatment & Sessions",
    color: "bg-pink-50 border-pink-200 hover:bg-pink-100",
    questions: [
      "Prepare me for Nancy's next session",
      "Generate treatment plan for anxiety",
      "Suggest evidence-based interventions",
      "Create session note templates",
      "Review client progress patterns"
    ]
  }
};

interface ChatContentProps {
  selectedPersona: string | null;
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  handlePersonaSelect: (persona: string) => void;
  handleBackToPersonas: () => void;
  handleGeneralQuestion: () => void;
  handleSendMessage: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleQuestionSelect: (question: string) => void;
  copyToClipboard: (text: string) => void;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  pendingAction: ActionRequest | null;
  actionLoading: boolean;
  handleExecuteAction: () => void;
  handleCancelAction: () => void;
}

// External ChatContent component to prevent re-creation and maintain input focus
const ChatContent = ({ 
  selectedPersona, 
  messages, 
  input, 
  setInput, 
  isLoading, 
  handlePersonaSelect, 
  handleBackToPersonas, 
  handleGeneralQuestion, 
  handleSendMessage, 
  handleKeyDown, 
  handleQuestionSelect, 
  copyToClipboard, 
  scrollAreaRef,
  pendingAction,
  actionLoading,
  handleExecuteAction,
  handleCancelAction
}: ChatContentProps) => (
  <div className="flex flex-col h-full min-h-0">
    <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
      {!selectedPersona ? (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Choose Your Sigie Specialist
            </h2>
            <p className="text-sm text-gray-600">
              Select a specialist for targeted assistance, or ask any question below
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(PERSONAS).map(([key, persona]) => (
              <button
                key={key}
                onClick={() => handlePersonaSelect(key)}
                className={cn(
                  "p-3 border rounded-lg text-left transition-all duration-200",
                  persona.color,
                  "hover:shadow-md"
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <SigiePersonaIcon persona={key} size={40} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm">{persona.title}</h3>
                    <p className="text-xs text-gray-600">{persona.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="border-t pt-3">
            <div className="text-center mb-3">
              <p className="text-xs text-muted-foreground">
                Or ask me anything directly:
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ChatInput
                value={input}
                onChange={setInput}
                onSubmit={handleGeneralQuestion}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGeneralQuestion();
                  }
                }}
                placeholder="Ask Sigie anything about your practice..."
                className="flex-1 min-h-10 text-sm p-2 resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={handleGeneralQuestion}
                size="sm"
                disabled={isLoading || !input.trim()}
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToPersonas}
              className="text-muted-foreground"
            >
              ← Back to specialists
            </Button>
            <div className="flex items-center space-x-2">
              {selectedPersona === 'general' ? (
                <>
                  <span className="text-2xl">🤖</span>
                  <span className="font-medium">General Assistant</span>
                </>
              ) : (
                <>
                  <SigiePersonaIcon persona={selectedPersona} size={32} />
                  <span className="font-medium">{PERSONAS[selectedPersona as keyof typeof PERSONAS].title}</span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] p-3 rounded-lg",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.role === "assistant" ? (
                    <div className="relative group">
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        {message.content.split('\n').map((line, i) => (
                          <p key={i} className="mb-2 last:mb-0">
                            {line}
                          </p>
                        ))}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <EllipsisHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={(e) => {
                            e.preventDefault();
                            copyToClipboard(message.content);
                          }}>
                            <ClipboardIcon className="h-4 w-4 mr-2" />
                            Copy
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            )}
            
            {/* Action confirmation */}
            {pendingAction && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <ExclamationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      Ready to {pendingAction.action.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      {pendingAction.action === 'schedule_session' && 
                        `Session with ${pendingAction.parameters.clientName} on ${pendingAction.parameters.date} at ${pendingAction.parameters.time}`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={(e) => {
                      e.preventDefault();
                      handleExecuteAction();
                    }}
                    disabled={actionLoading}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {actionLoading ? (
                      <>
                        <ArrowPathIcon className="h-3 w-3 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      'Confirm'
                    )}
                  </Button>
                  <Button 
                    onClick={(e) => {
                      e.preventDefault();
                      handleCancelAction();
                    }}
                    disabled={actionLoading}
                    variant="outline" 
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Quick question suggestions */}
          {selectedPersona && selectedPersona !== 'general' && messages.length <= 1 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Quick questions:</p>
              <div className="flex flex-wrap gap-2">
                {PERSONAS[selectedPersona as keyof typeof PERSONAS].questions.map((question, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      handleQuestionSelect(question);
                    }}
                    className="text-xs"
                    disabled={isLoading}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ScrollArea>

    {selectedPersona && (
      <div className="p-4 border-t bg-background flex-shrink-0">
        <div className="flex items-end space-x-2">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSendMessage}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 min-h-[50px] max-h-24 resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="h-[50px] w-[50px] flex-shrink-0"
          >
            {isLoading ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <PaperAirplaneIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    )}
  </div>
);

export default function SigieAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSidePanel, setIsSidePanel] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<ActionRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get the appropriate persona based on current page
  const currentPersona = useCurrentPersona();

  // Fetch data that Sigie might need to answer questions
  const { data: clients } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: () => fetch('/api/patients', { credentials: 'include' }).then(res => res.json()),
  });

  const { data: sessions } = useQuery({
    queryKey: ['/api/clinical-sessions'],
    queryFn: () => fetch('/api/clinical-sessions', { credentials: 'include' }).then(res => res.json()),
  });

  const { data: tasks } = useQuery({
    queryKey: ['/api/tasks'],
    queryFn: () => fetch('/api/tasks', { credentials: 'include' }).then(res => res.json()),
  });

  const { data: notifications } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: () => fetch('/api/notifications', { credentials: 'include' }).then(res => res.json()),
  });

  useEffect(() => {
    // Scroll to bottom when messages change
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        // The ScrollArea component has a viewport div that we need to scroll
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }
    };

    // Use setTimeout to ensure DOM has updated
    const timeoutId = setTimeout(scrollToBottom, 0);
    return () => clearTimeout(timeoutId);
  }, [messages]);

  // Debug: log when pendingAction changes
  useEffect(() => {
    console.log('[Sigie] pendingAction changed:', pendingAction);
    if (pendingAction) {
      console.log('[Sigie] Should show confirmation dialog now');
    }
  }, [pendingAction]);

  const handlePersonaSelect = (persona: string) => {
    setSelectedPersona(persona);
    
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: `Hi! I'm your ${PERSONAS[persona as keyof typeof PERSONAS].title}. I'm here to help with ${PERSONAS[persona as keyof typeof PERSONAS].description.toLowerCase()}. What would you like assistance with today?`,
      timestamp: new Date(),
    };
    
    setMessages([welcomeMessage]);
  };

  // Auto-select the current persona when opening Sigie
  useEffect(() => {
    if (isOpen && !selectedPersona) {
      handlePersonaSelect(currentPersona);
    }
  }, [isOpen, currentPersona, selectedPersona]);

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    // Maintain focus on input after sending
    setTimeout(() => {
      const textarea = document.querySelector('textarea[placeholder="Type your message..."]') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
      }
    }, 0);

    try {
      const contextData = {
        clients: clients || [],
        sessions: sessions || [],
        tasks: tasks || [],
        notifications: notifications || [],
        selectedPersona,
      };

      console.log('[Sigie] Sending context with clients:', contextData.clients?.map((c: any) => ({id: c.id, name: c.name})));

      // Only send user messages, not welcome messages from the system
      const conversationMessages = messages
        .filter(msg => msg.role === "user" || (msg.role === "assistant" && !msg.content.includes("I'm your")))
        .concat(userMessage);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          messages: conversationMessages,
          context: contextData,
          persona: selectedPersona
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      
      console.log('[Sigie] Response received:', {
        hasMessage: !!data.message,
        hasAction: !!data.action,
        action: data.action
      });
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      if (data.action) {
        console.log('[Sigie] Setting pending action:', data.action);
        setPendingAction(data.action);
      } else {
        console.log('[Sigie] No action in response');
      }
    } catch (error) {
      let errorContent = "I'm sorry, I encountered an error. Please try again.";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorContent = "The request timed out. Please check your connection and try again.";
        } else if (error.message.includes('Failed to fetch')) {
          errorContent = "Unable to connect to the server. Please check your connection.";
        }
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: errorContent,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      
      // Maintain focus on input after loading completes
      setTimeout(() => {
        const textarea = document.querySelector('textarea[placeholder="Type your message..."]') as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
        }
      }, 0);
    }
  };

  const handleQuestionSelect = (question: string) => {
    setInput(question);
    handleSendMessage(question);
  };

  const handleBackToPersonas = () => {
    setSelectedPersona(null);
    setMessages([]);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsSidePanel(false);
    // Reset to allow auto-selection on next open
    setSelectedPersona(null);
    setMessages([]);
  };

  const handleSwitchToSidePanel = () => {
    setIsOpen(false);
    setIsSidePanel(true);
  };

  const handleSwitchToModal = () => {
    setIsSidePanel(false);
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleGeneralQuestion = () => {
    if (!input.trim()) return;
    
    // Set to general mode (no specific persona)
    setSelectedPersona('general');
    
    // Create welcome message for general mode
    const welcomeMessage: Message = {
      id: "general-welcome",
      role: "assistant",
      content: "Hi! I'm here to help with any questions about your therapy practice. How can I assist you today?",
      timestamp: new Date(),
    };
    
    setMessages([welcomeMessage]);
    
    // Send the user's question
    handleSendMessage();
    
    // Maintain focus on input after sending
    setTimeout(() => {
      const textarea = document.querySelector('textarea[placeholder="Ask Sigie anything about your practice..."]') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
      }
    }, 0);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "The message has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy the message to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleExecuteAction = async () => {
    if (!pendingAction) return;
    
    setActionLoading(true);
    
    try {
      // Add browser timezone to the request
      const requestData = {
        ...pendingAction,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      
      const response = await fetch('/api/ai-assistant/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestData),
      });

      if (!response.ok) throw new Error('Failed to execute action');

      const result = await response.json();
      
      // Only add a message if the backend didn't provide one
      if (result.message) {
        const actionMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: result.message,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, actionMessage]);
      }
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/clinical-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `I'm sorry, I wasn't able to ${pendingAction.action.replace('_', ' ')}. ${error instanceof Error ? error.message : 'Please try again or do it manually.'}`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setPendingAction(null);
      setActionLoading(false);
    }
  };
  
  const handleCancelAction = () => {
    setPendingAction(null);
  };

  return (
    <>
      {/* Floating icon */}
      <div 
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(true);
        }}
        className="fixed bottom-3 right-3 cursor-pointer transition-transform hover:scale-105"
        aria-label="Open Sigie Assistant"
      >
        <SigiePersonaIcon persona={currentPersona} size={70} />
      </div>

      {/* Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[85vh] h-[85vh] p-0 flex flex-col">
          <div className="flex flex-col flex-1 min-h-0">
            <DialogHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <SigiePersonaIcon persona={currentPersona} size={32} />
                  <DialogTitle>{PERSONAS[currentPersona as keyof typeof PERSONAS]?.title || 'Sigie'}</DialogTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSwitchToSidePanel}
                  title="Switch to side panel"
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            <ChatContent
              selectedPersona={selectedPersona}
              messages={messages}
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              handlePersonaSelect={handlePersonaSelect}
              handleBackToPersonas={handleBackToPersonas}
              handleGeneralQuestion={handleGeneralQuestion}
              handleSendMessage={handleSendMessage}
              handleKeyDown={handleKeyDown}
              handleQuestionSelect={handleQuestionSelect}
              copyToClipboard={copyToClipboard}
              scrollAreaRef={scrollAreaRef}
              pendingAction={pendingAction}
              actionLoading={actionLoading}
              handleExecuteAction={handleExecuteAction}
              handleCancelAction={handleCancelAction}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Side Panel */}
      {isSidePanel && (
        <div className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-lg z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-3">
              <SigiePersonaIcon persona={currentPersona} size={32} />
              <span className="font-semibold">{PERSONAS[currentPersona as keyof typeof PERSONAS]?.title || 'Sigie'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwitchToModal}
                title="Switch to modal view"
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                title="Close"
              >
                ×
              </Button>
            </div>
          </div>
          <ChatContent
            selectedPersona={selectedPersona}
            messages={messages}
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            handlePersonaSelect={handlePersonaSelect}
            handleBackToPersonas={handleBackToPersonas}
            handleGeneralQuestion={handleGeneralQuestion}
            handleSendMessage={handleSendMessage}
            handleKeyDown={handleKeyDown}
            handleQuestionSelect={handleQuestionSelect}
            copyToClipboard={copyToClipboard}
            scrollAreaRef={scrollAreaRef}
            pendingAction={pendingAction}
            actionLoading={actionLoading}
            handleExecuteAction={handleExecuteAction}
            handleCancelAction={handleCancelAction}
          />
        </div>
      )}
      
      {/* Action confirmation dialog */}
      <Dialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
          </DialogHeader>
          
          {pendingAction && (
            <Alert>
              <AlertTitle className="flex items-center">
                {pendingAction.action === 'schedule_session' && 'Schedule Session'}
                {pendingAction.action === 'add_task' && 'Add Task'}
                {pendingAction.action === 'reschedule_session' && 'Reschedule Session'}
              </AlertTitle>
              <AlertDescription>
                {pendingAction.action === 'schedule_session' && 
                  (() => {
                    const { clientName, date, time } = pendingAction.parameters;
                    
                    // Format the date
                    let formattedDate = '';
                    if (date?.toLowerCase() === 'tomorrow') {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      formattedDate = `tomorrow, ${tomorrow.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}`;
                    } else if (date?.toLowerCase() === 'today') {
                      const today = new Date();
                      formattedDate = `today, ${today.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}`;
                    } else {
                      formattedDate = date;
                    }
                    
                    // Format the time with AM/PM
                    let formattedTime = time;
                    if (time && !time.match(/[ap]m/i)) {
                      const timeNum = parseInt(time.split(':')[0]);
                      if (timeNum >= 1 && timeNum <= 6) {
                        formattedTime = time.includes(':') ? `${time} PM` : `${time}:00 PM`;
                      } else if (timeNum >= 7 && timeNum <= 11) {
                        formattedTime = time.includes(':') ? `${time} AM` : `${time}:00 AM`;
                      } else {
                        formattedTime = time.includes(':') ? `${time} PM` : `${time}:00 PM`;
                      }
                    }
                    
                    return `Schedule a session for ${clientName} ${formattedDate} at ${formattedTime}`;
                  })()
                }
                {pendingAction.action === 'add_task' && pendingAction.parameters.description}
                {pendingAction.action === 'reschedule_session' && 
                  `Reschedule session with ${pendingAction.parameters.clientName}`
                }
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelAction} disabled={actionLoading}>
              <XCircleIcon className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleExecuteAction} disabled={actionLoading}>
              {actionLoading ? (
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircleIcon className="h-4 w-4 mr-2" />
              )}
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}