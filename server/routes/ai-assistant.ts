import { Router } from 'express';
import { authenticateToken } from '../auth-simple';
import { secureAIService } from '../services/SecureAIService';
import { HIPAAAuditService } from '../services/ClinicalService';
import { ClinicalSessionService } from '../services/ClinicalSessionService';
import { OrganizationService } from '../services/OrganizationService';

const router = Router();

/**
 * AI Assistant Routes (Sigie)
 * 
 * Provides HIPAA-compliant AI assistant functionality
 * for clinical documentation and practice management assistance.
 */

// POST /api/ai-assistant - AI Assistant Chat
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { message, messages, context, persona } = req.body;
    const userId = req.user!.id;
    
    // Support both 'message' (single string) and 'messages' (array) formats
    let userMessage: string;
    let conversationHistory: Array<{ role: string; content: string }> = [];
    
    if (messages && Array.isArray(messages) && messages.length > 0) {
      // Extract the latest user message
      const latestUserMessage = messages
        .slice()
        .reverse()
        .find((msg: any) => msg.role === 'user');
      
      if (!latestUserMessage || !latestUserMessage.content) {
        return res.status(400).json({ error: 'No valid user message found in messages array' });
      }
      
      userMessage = latestUserMessage.content;
      // Format conversation history for context
      conversationHistory = messages
        .filter((msg: any) => msg.role && msg.content)
        .map((msg: any) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        }));
    } else if (message && typeof message === 'string') {
      userMessage = message;
    } else {
      return res.status(400).json({ error: 'Message or messages array is required' });
    }

    // Log AI interaction for audit
    await HIPAAAuditService.logPHIAccess({
      userId,
      action: 'ai_interaction',
      resourceType: 'ai_assistant',
      fieldsAccessed: context ? ['context'] : []
    });

    // Build prompt with conversation context if available
    let prompt = userMessage;
    if (conversationHistory.length > 1) {
      // Format conversation history into prompt
      const historyText = conversationHistory
        .slice(0, -1) // Exclude the last message (current user message)
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');
      prompt = `${historyText}\n\nUser: ${userMessage}\n\nAssistant:`;
    }

    // Build context string from context object and persona
    // SecureAIService expects sourceContext to be a string, not an object
    let contextString = '';
    if (context && typeof context === 'object') {
      const contextParts: string[] = [];
      
      // Add persona if provided
      if (persona) {
        contextParts.push(`Persona: ${persona}`);
      }
      
      // Add relevant context data with details
      if (context.clients && Array.isArray(context.clients) && context.clients.length > 0) {
        const clientNames = context.clients.slice(0, 10).map((c: any) => c.name).filter(Boolean).join(', ');
        contextParts.push(`Available clients: ${clientNames}${context.clients.length > 10 ? ' and more' : ''}`);
      }
      if (context.sessions && Array.isArray(context.sessions) && context.sessions.length > 0) {
        contextParts.push(`${context.sessions.length} session(s) in system`);
      }
      if (context.tasks && Array.isArray(context.tasks) && context.tasks.length > 0) {
        contextParts.push(`${context.tasks.length} task(s) pending`);
      }
      
      contextString = contextParts.join('. ');
    } else if (typeof context === 'string') {
      contextString = context;
    }
    
    // Add conversation history info
    if (conversationHistory.length > 1) {
      contextString += (contextString ? '. ' : '') + `Conversation history: ${conversationHistory.length} messages`;
    }

    // Use SecureAIService for HIPAA-compliant AI responses
    const response = await secureAIService.generateTextWithValidation(prompt, {
      sourceContext: contextString || undefined,
      enableContentVerification: !!contextString,
      maxTokens: 1000,
      temperature: 0.1
    });
    
    // Detect if user is requesting an action (like scheduling)
    const detectedAction = detectActionIntent(userMessage, context);
    
    // Log for debugging
    console.log('[AI Assistant] Intent detection result:', {
      userMessage,
      detectedAction: detectedAction ? detectedAction.action : 'none',
      hasPatientId: detectedAction?.parameters?.patientId ? 'yes' : 'no',
      clientName: detectedAction?.parameters?.clientName
    });
    
    // Return response in format expected by client
    const responseData: any = {
      message: response.content || '',
      response: response.content || '',
      confidence: response.confidence,
      requiresHumanReview: response.requiresHumanReview,
      warnings: response.warnings || []
    };
    
    // Include action if detected
    if (detectedAction) {
      console.log('[AI Assistant] Including action in response:', detectedAction);
      responseData.action = detectedAction;
    }
    
    res.json(responseData);
  } catch (error) {
    console.error('AI Assistant error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.user?.id,
      hasMessage: !!req.body.message || !!req.body.messages
    });
    
    // Return appropriate error response
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isAIServiceError = errorMessage.includes('AI service unavailable') || 
                             errorMessage.includes('API key') ||
                             errorMessage.includes('timeout');
    
    res.status(500).json({ 
      error: isAIServiceError ? 'AI service unavailable' : 'Internal server error',
      message: isAIServiceError 
        ? 'The AI assistant is temporarily unavailable. Please check API key configuration.'
        : 'An unexpected error occurred. Please try again later.'
    });
  }
});

// POST /api/ai-assistant/action - Execute AI Action
router.post('/action', authenticateToken, async (req, res) => {
  try {
    const { action, parameters } = req.body;
    const userId = req.user!.id;
    
    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    // Log AI action for audit
    await HIPAAAuditService.logPHIAccess({
      userId,
      action: `ai_action_${action}`,
      resourceType: 'ai_assistant',
      fieldsAccessed: parameters ? Object.keys(parameters) : []
    });

    // Handle different AI actions
    switch (action) {
      case 'schedule_session':
        return await handleScheduleSession(req, res, parameters);
      
      case 'create_treatment_plan':
        return await handleCreateTreatmentPlan(req, res, parameters);
      
      case 'generate_session_notes':
        return await handleGenerateSessionNotes(req, res, parameters);
      
      case 'suggest_interventions':
        return await handleSuggestInterventions(req, res, parameters);
      
      case 'analyze_progress':
        return await handleAnalyzeProgress(req, res, parameters);
      
      default:
        res.status(400).json({ 
          error: 'Unknown action',
          message: `Action '${action}' is not supported`
        });
    }
  } catch (error) {
    console.error('AI Action error:', error);
    res.status(500).json({ 
      error: 'Action execution failed',
      message: 'Failed to execute AI action. Please try again.'
    });
  }
});

// Helper function to handle session scheduling
async function handleScheduleSession(req: any, res: any, parameters: any) {
  const { patientId, date, time, duration, type, clientName } = parameters;
  
  if (!patientId) {
    return res.status(400).json({ 
      error: 'Missing parameters',
      message: 'Patient ID is required for scheduling a session'
    });
  }

  if (!date || !time) {
    return res.status(400).json({ 
      error: 'Missing parameters',
      message: 'Date and time are required for scheduling a session'
    });
  }

  try {
    // Parse date and time into ISO datetime string
    let sessionDate: Date;
    
    // Handle relative dates like "tomorrow", "today"
    if (date.toLowerCase() === 'tomorrow') {
      sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() + 1);
    } else if (date.toLowerCase() === 'today') {
      sessionDate = new Date();
    } else {
      // Try to parse the date string
      sessionDate = new Date(date);
      if (isNaN(sessionDate.getTime())) {
        return res.status(400).json({
          error: 'Invalid date',
          message: 'Could not parse the date provided'
        });
      }
    }

    // Parse time (format: "2:00 PM" or "14:00" or "2pm")
    let hours = 0;
    let minutes = 0;
    
    const timeMatch = time.match(/(\d+)(?::(\d+))?\s*(am|pm)?/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1]);
      minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = timeMatch[3]?.toLowerCase();
      
      // Convert to 24-hour format
      if (period === 'pm' && hours !== 12) {
        hours += 12;
      } else if (period === 'am' && hours === 12) {
        hours = 0;
      } else if (!period && hours >= 1 && hours <= 6) {
        // Assume afternoon/evening for times 1-6 without AM/PM
        hours += 12;
      }
    } else {
      return res.status(400).json({
        error: 'Invalid time',
        message: 'Could not parse the time provided'
      });
    }

    sessionDate.setHours(hours, minutes, 0, 0);

    // Create the session data
    const sessionData = {
      patientId: parseInt(patientId),
      date: sessionDate.toISOString(),
      duration: duration ? parseInt(duration) : 50, // Default 50 minutes
      type: type || 'individual',
      status: 'scheduled'
    };

    // Call the clinical sessions API internally
    const userId = req.user!.id;
    
    // Get user's organization
    const userOrganizations = await OrganizationService.getUserOrganizations(userId);
    
    if (userOrganizations.length === 0) {
      return res.status(400).json({
        error: 'No organization',
        message: 'User must belong to an organization to create sessions'
      });
    }
    
    const organizationId = userOrganizations[0].organizationId;
    
    // Validate patient exists and belongs to organization
    const patient = await ClinicalSessionService.validatePatientAccess(sessionData.patientId, organizationId);
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        message: 'Patient not found or not accessible in this organization'
      });
    }
    
    // Create the session
    const newSession = await ClinicalSessionService.createSession({
      ...sessionData,
      organizationId,
      therapistId: userId
    });

    const formattedDate = sessionDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
    const formattedTime = sessionDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    res.json({
      action: 'schedule_session',
      success: true,
      result: {
        session: newSession,
        message: `Successfully scheduled a session with ${clientName || patient.name} on ${formattedDate} at ${formattedTime}.`
      },
      message: `Successfully scheduled a session with ${clientName || patient.name} on ${formattedDate} at ${formattedTime}.`
    });
  } catch (error) {
    console.error('Error scheduling session:', error);
    return res.status(500).json({
      error: 'Failed to schedule session',
      message: error instanceof Error ? error.message : 'An error occurred while scheduling the session'
    });
  }
}

// Helper function to handle treatment plan creation
async function handleCreateTreatmentPlan(req: any, res: any, parameters: any) {
  const { patientId, diagnosis, goals, interventions } = parameters;
  
  if (!patientId || !diagnosis) {
    return res.status(400).json({ 
      error: 'Missing parameters',
      message: 'Patient ID and diagnosis are required for treatment plan creation'
    });
  }

  const aiService = secureAIService;
  const prompt = `Create a comprehensive treatment plan for a patient with diagnosis: ${diagnosis}. 
  Goals: ${goals || 'General improvement'}. 
  Suggested interventions: ${interventions || 'Evidence-based interventions'}.`;

  const response = await aiService.generateTextWithValidation(prompt, {
    enableContentVerification: true,
    maxTokens: 1500
  });

  res.json({
    action: 'create_treatment_plan',
    result: {
      treatmentPlan: response.content,
      confidence: response.confidence,
      requiresHumanReview: response.requiresHumanReview
    }
  });
}

// Helper function to handle session notes generation
async function handleGenerateSessionNotes(req: any, res: any, parameters: any) {
  const { sessionType, keyPoints, interventions, outcomes } = parameters;
  
  if (!sessionType) {
    return res.status(400).json({ 
      error: 'Missing parameters',
      message: 'Session type is required for note generation'
    });
  }

  const aiService = secureAIService;
  const prompt = `Generate professional session notes for a ${sessionType} session.
  Key points discussed: ${keyPoints || 'General session content'}.
  Interventions used: ${interventions || 'Standard therapeutic interventions'}.
  Session outcomes: ${outcomes || 'Positive progress'}.
  Format as SOAP notes.`;

  const response = await aiService.generateTextWithValidation(prompt, {
    enableContentVerification: true,
    maxTokens: 1000
  });

  res.json({
    action: 'generate_session_notes',
    result: {
      sessionNotes: response.content,
      confidence: response.confidence,
      requiresHumanReview: response.requiresHumanReview
    }
  });
}

// Helper function to handle intervention suggestions
async function handleSuggestInterventions(req: any, res: any, parameters: any) {
  const { diagnosis, symptoms, patientAge, sessionType } = parameters;
  
  if (!diagnosis) {
    return res.status(400).json({ 
      error: 'Missing parameters',
      message: 'Diagnosis is required for intervention suggestions'
    });
  }

  const aiService = secureAIService;
  const prompt = `Suggest evidence-based therapeutic interventions for a patient with diagnosis: ${diagnosis}.
  Symptoms: ${symptoms || 'General symptoms'}.
  Patient age: ${patientAge || 'Adult'}.
  Session type: ${sessionType || 'Individual therapy'}.
  Provide 3-5 specific, actionable interventions.`;

  const response = await aiService.generateTextWithValidation(prompt, {
    enableContentVerification: true,
    maxTokens: 800
  });

  res.json({
    action: 'suggest_interventions',
    result: {
      interventions: response.content,
      confidence: response.confidence,
      requiresHumanReview: response.requiresHumanReview
    }
  });
}

// Helper function to handle progress analysis
async function handleAnalyzeProgress(req: any, res: any, parameters: any) {
  const { sessionHistory, goals, timeFrame } = parameters;
  
  if (!sessionHistory) {
    return res.status(400).json({ 
      error: 'Missing parameters',
      message: 'Session history is required for progress analysis'
    });
  }

  const aiService = secureAIService;
  const prompt = `Analyze therapeutic progress based on the following session history: ${sessionHistory}.
  Treatment goals: ${goals || 'General improvement'}.
  Time frame: ${timeFrame || 'Recent sessions'}.
  Provide insights on progress, areas of improvement, and recommendations.`;

  const response = await aiService.generateTextWithValidation(prompt, {
    enableContentVerification: true,
    maxTokens: 1200
  });

  res.json({
    action: 'analyze_progress',
    result: {
      progressAnalysis: response.content,
      confidence: response.confidence,
      requiresHumanReview: response.requiresHumanReview
    }
  });
}

// ============================================================================
// INTENT DETECTION
// ============================================================================

/**
 * Detects user intent to perform actions like scheduling sessions
 * Returns an action object if intent is detected, null otherwise
 */
function detectActionIntent(message: string, context?: any): any {
  const lowerMessage = message.toLowerCase();
  
  console.log('[Intent Detection] Analyzing message:', message);
  console.log('[Intent Detection] Context clients:', context?.clients?.map((c: any) => c.name));
  
  // Detect scheduling intent
  const schedulingKeywords = ['schedule', 'book', 'set up', 'arrange', 'create session', 'new session', 'appointment'];
  const isSchedulingRequest = schedulingKeywords.some(keyword => lowerMessage.includes(keyword));
  
  console.log('[Intent Detection] Is scheduling request:', isSchedulingRequest);
  
  if (isSchedulingRequest) {
    // Try to extract scheduling details from the message
    const action: any = {
      action: 'schedule_session',
      parameters: {},
      description: 'Schedule a new session'
    };
    
    // Extract patient/client name
    // Patterns: "with [name]", "for [name]", "[name]'s session", "schedule [name] on"
    const clientNamePatterns = [
      /(?:with|for)\s+([A-Za-z][A-Za-z0-9\s]+?)(?:\s+on|\s+at|\s+tomorrow|\s+today|$)/i,
      /([A-Za-z][A-Za-z0-9\s]+?)'s?\s+session/i,
      /(?:schedule|book)\s+([A-Za-z][A-Za-z0-9\s]+?)\s+(?:on|at|for|tomorrow|today)/i
    ];
    
    let clientName = null;
    for (const pattern of clientNamePatterns) {
      const match = message.match(pattern);
      if (match) {
        clientName = match[1].trim();
        console.log('[Intent Detection] Extracted client name:', clientName);
        break;
      }
    }
    
    // Try to find patient ID from context if we have a client name
    if (clientName && context && context.clients) {
      console.log('[Intent Detection] Looking for client:', clientName);
      const client = context.clients.find((c: any) => 
        c.name && c.name.toLowerCase().includes(clientName.toLowerCase())
      );
      if (client) {
        console.log('[Intent Detection] Found matching client:', client.name, 'ID:', client.id);
        action.parameters.patientId = client.id;
        action.parameters.clientName = client.name;
      } else {
        console.log('[Intent Detection] No matching client found');
        // Still set the client name even if ID not found
        action.parameters.clientName = clientName;
      }
    }
    
    // Extract date
    // Patterns: "tomorrow", "today", "on Monday", "11/11", "on 12/25", etc.
    if (lowerMessage.includes('tomorrow')) {
      action.parameters.date = 'tomorrow';
    } else if (lowerMessage.includes('today')) {
      action.parameters.date = 'today';
    } else {
      // Try to extract a specific date (with or without "on")
      // Handles: "11/11", "on 11/11", "12/25/2024", etc.
      const datePattern = /(?:on\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/;
      const dateMatch = message.match(datePattern);
      if (dateMatch) {
        let dateStr = dateMatch[1];
        // If no year provided, add current year
        if (!dateStr.includes('/202') && !dateStr.includes('/20')) {
          const currentYear = new Date().getFullYear();
          dateStr += `/${currentYear}`;
        }
        action.parameters.date = dateStr;
      }
    }
    
    // Extract time
    // Patterns: "at 2pm", "at 2:00", "at 14:00", "2pm", "2:00 PM"
    const timePatterns = [
      /at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
      /(\d{1,2}:\d{2}\s*(?:am|pm))/i,
      /(\d{1,2}\s*(?:am|pm))/i
    ];
    
    for (const pattern of timePatterns) {
      const match = message.match(pattern);
      if (match) {
        action.parameters.time = match[1];
        break;
      }
    }
    
    // Extract session type
    const types = ['individual', 'couple', 'family', 'group', 'intake'];
    for (const type of types) {
      if (lowerMessage.includes(type)) {
        action.parameters.type = type;
        break;
      }
    }
    
    // Extract duration if mentioned
    const durationPattern = /(\d+)\s*(?:minute|min)/i;
    const durationMatch = message.match(durationPattern);
    if (durationMatch) {
      action.parameters.duration = parseInt(durationMatch[1]);
    }
    
    // Only return the action if we have minimum required info
    console.log('[Intent Detection] Final action parameters:', action.parameters);
    
    if (action.parameters.patientId && action.parameters.date && action.parameters.time) {
      console.log('[Intent Detection] Returning complete action');
      return action;
    } else if (action.parameters.clientName || clientName) {
      // Return action even if incomplete - let the backend validation handle it
      console.log('[Intent Detection] Returning partial action (missing some details)');
      return action;
    } else {
      console.log('[Intent Detection] Not enough info to return action');
    }
  }
  
  // Add more intent detection here for other actions...
  
  return null;
}

export default router;
