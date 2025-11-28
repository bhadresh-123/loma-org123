import { z } from "zod";

export type ExtractedData = {
  concern?: string;
  sessionPreference?: 'inPerson' | 'remote' | 'noPreference';
  paymentMethod?: 'insurance' | 'privatePay';
  insuranceProvider?: string;
  maxPrice?: number;
  therapistPreferences?: {
    gender?: 'male' | 'female' | 'noPreference';
    culturalBackground?: string;
    licenseType?: 'psychologist' | 'therapist' | 'noPreference';
  };
};

export type AnalysisResponse = {
  response: string;
  extracted: ExtractedData | null;
};

// Validation schemas
const sessionPreferenceSchema = z.enum(['inPerson', 'remote', 'noPreference']);
const paymentMethodSchema = z.enum(['insurance', 'privatePay']);
const genderPreferenceSchema = z.enum(['male', 'female', 'noPreference']);
const licenseTypeSchema = z.enum(['psychologist', 'therapist', 'noPreference']);

const ACCEPTABLE_CONCERNS = [
  'Anxiety',
  'Depression',
  'Trauma and PTSD',
  'Relationship Issues',
  'Self-Esteem',
  'Grief',
  'Life Transitions',
  'Stress Management',
  'Family Conflicts',
  'Career Counseling',
  'Addiction',
  'Eating Disorders',
  'OCD',
  'Bipolar Disorder',
  'Personality Disorders',
  'ADHD',
  'Autism Spectrum',
  'LGBTQ+ Issues',
  'Cultural and Racial Identity',
  "Women's Issues"
];

const INSURANCE_PROVIDERS = [
  'Blue Cross Blue Shield',
  'Cigna',
  'Aetna',
  'Humana',
  'Kaiser Permanente',
  'Medicare',
  'Medicaid',
  'Oxford',
  'UnitedHealthcare'
];

function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

function findBestMatch(input: string, possibilities: string[]): string | null {
  const normalizedInput = normalizeText(input);

  // Direct match
  for (const possibility of possibilities) {
    if (normalizedInput.includes(normalizeText(possibility))) {
      return possibility;
    }
  }

  // Look for close matches or keywords
  for (const possibility of possibilities) {
    const keywords = normalizeText(possibility).split(' ');
    if (keywords.some(keyword => normalizedInput.includes(keyword) && keyword.length > 3)) {
      return possibility;
    }
  }

  return null;
}

function detectMentalHealthConcern(text: string): string | null {
  const normalizedText = normalizeText(text);

  // Common phrases that indicate anxiety
  if (normalizedText.includes('worried') || 
      normalizedText.includes("can't control") || 
      normalizedText.includes('nervous') ||
      normalizedText.includes('anxious')) {
    return 'Anxiety';
  }

  // Common phrases for depression
  if (normalizedText.includes('not feeling like myself') || 
      normalizedText.includes('depressed') || 
      normalizedText.includes('sad') ||
      normalizedText.includes('hopeless')) {
    return 'Depression';
  }

  return findBestMatch(text, ACCEPTABLE_CONCERNS);
}

function detectSessionPreference(text: string): 'inPerson' | 'remote' | 'noPreference' | null {
  const normalizedText = normalizeText(text);

  if (normalizedText.includes("don't care") || 
      normalizedText.includes("doesn't matter") || 
      normalizedText.includes('either') ||
      normalizedText.includes('no preference')) {
    return 'noPreference';
  }

  if (normalizedText.includes('in person') || 
      normalizedText.includes('face to face') || 
      normalizedText.includes('office')) {
    return 'inPerson';
  }

  if (normalizedText.includes('remote') || 
      normalizedText.includes('online') || 
      normalizedText.includes('virtual') || 
      normalizedText.includes('video')) {
    return 'remote';
  }

  return null;
}

function detectPaymentMethod(text: string): 'insurance' | 'privatePay' | null {
  const normalizedText = normalizeText(text);

  if (normalizedText.includes('insurance') || 
      normalizedText.includes('covered') || 
      normalizedText.includes('provider')) {
    return 'insurance';
  }

  if (normalizedText.includes('private') || 
      normalizedText.includes('pay') || 
      normalizedText.includes('cash') || 
      normalizedText.includes('credit')) {
    return 'privatePay';
  }

  return null;
}

function detectInsuranceProvider(text: string): string | null {
  return findBestMatch(text, INSURANCE_PROVIDERS);
}

function getEmpathicResponse(questionNumber: number, extracted: ExtractedData | null, sessionData: SessionData | null): string {
  switch (questionNumber) {
    case 0: {
      if (!extracted?.concern) {
        return "I understand it might be difficult to express what you're going through. Could you tell me more about what brings you to therapy? For example, are you experiencing anxiety, depression, or something else?";
      }
      return `I hear that you're dealing with ${extracted.concern.toLowerCase()}. That must be challenging. Let's find you the right support.`;
    }
    case 1: {
      if (!extracted?.sessionPreference) {
        return "To help match you with the right therapist, could you let me know if you'd prefer in-person sessions, remote sessions, or have no preference?";
      }
      const format = extracted.sessionPreference === 'noPreference' ? 
        'are flexible about the session format' : 
        `prefer ${extracted.sessionPreference === 'inPerson' ? 'in-person' : 'remote'} sessions`;
      return `I understand you ${format}.`;
    }
    case 2: {
      if (!extracted?.paymentMethod) {
        return "Just to clarify - would you be using insurance or paying privately for your sessions?";
      }
      return extracted.paymentMethod === 'insurance'
        ? "Great, thanks for letting me know you'll be using insurance."
        : "I understand you'll be paying privately.";
    }
    case 3: {
      if (sessionData?.paymentMethod === 'insurance') {
        if (!extracted?.insuranceProvider) {
          return "Which insurance provider do you have? We accept Blue Cross Blue Shield, Cigna, Aetna, Humana, Kaiser Permanente, Medicare, Medicaid, Oxford, and UnitedHealthcare.";
        }
        return `Thank you for letting me know about your insurance with ${extracted.insuranceProvider}.`;
      } else {
        if (!extracted?.maxPrice) {
          return "What's your maximum budget per session?";
        }
        return `Thank you for sharing your budget information.`;
      }
    }
    case 4: {
      if (!extracted?.therapistPreferences) {
        return "Do you have any specific preferences about your therapist's background or qualifications? For example, would you prefer a male or female therapist, or someone with a particular cultural background?";
      }
      return "Thank you for sharing your preferences. I'll now show you some therapists who match your criteria.";
    }
    default:
      return "I understand. Could you tell me more about that?";
  }
}

export async function analyzeChatResponse(
  userInput: string,
  currentQuestion: number,
  conversationHistory: string,
  sessionData: SessionData
): Promise<AnalysisResponse> {
  try {
    // Local analysis of user input based on current question
    const response: AnalysisResponse = {
      response: "",
      extracted: null
    };

    switch (currentQuestion) {
      case 0: {
        const concern = detectMentalHealthConcern(userInput);
        if (concern) {
          response.extracted = { concern };
        }
        break;
      }
      case 1: {
        const sessionPreference = detectSessionPreference(userInput);
        if (sessionPreference) {
          response.extracted = { sessionPreference };
        }
        break;
      }
      case 2: {
        const paymentMethod = detectPaymentMethod(userInput);
        if (paymentMethod) {
          response.extracted = { paymentMethod };
          sessionData.paymentMethod = paymentMethod;
        }
        break;
      }
      case 3: {
        if (sessionData.paymentMethod === 'insurance') {
          const insuranceProvider = detectInsuranceProvider(userInput);
          if (insuranceProvider) {
            response.extracted = { insuranceProvider };
            sessionData.insuranceProvider = insuranceProvider;
          }
        } else {
          const priceMatch = userInput.match(/\$?(\d+)/);
          if (priceMatch) {
            response.extracted = { maxPrice: parseInt(priceMatch[1]) };
            sessionData.maxSessionPrice = parseInt(priceMatch[1]);
          }
        }
        break;
      }
      case 4: {
        // Simple preference extraction
        const preferences: ExtractedData['therapistPreferences'] = {};
        const normalizedInput = normalizeText(userInput);

        if (normalizedInput.includes('male')) {
          preferences.gender = 'male';
        } else if (normalizedInput.includes('female')) {
          preferences.gender = 'female';
        } else {
          preferences.gender = 'noPreference';
        }

        if (normalizedInput.includes('psychologist')) {
          preferences.licenseType = 'psychologist';
        } else if (normalizedInput.includes('therapist')) {
          preferences.licenseType = 'therapist';
        } else {
          preferences.licenseType = 'noPreference';
        }

        response.extracted = { therapistPreferences: preferences };
        sessionData.therapistPreferences = preferences;
        break;
      }
    }

    // Generate empathetic response
    // Generate focused, single-question responses based on conversation state
    if (currentQuestion === 0) {
      if (!response.extracted?.concern) {
        response.response = "I understand it might be difficult to express what you're going through. Could you tell me more specifically about what brings you to therapy? For example, are you experiencing anxiety, depression, or something else?";
      } else {
        response.response = `I hear that you're dealing with ${response.extracted.concern.toLowerCase()}. That must be challenging.`;
        // Don't increment question counter here - wait for session preference response
      }
    } else if (currentQuestion === 1 && !response.extracted?.sessionPreference) {
      response.response = "Could you let me know if you'd prefer in-person sessions, remote sessions, or have no preference?";
    } else {
      response.response = getEmpathicResponse(currentQuestion, response.extracted, sessionData);
    }

    // Add a small delay to simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    return response;
  } catch (error) {
    console.error('Error analyzing response:', error);
    return {
      response: "I apologize, but I'm having trouble processing your response. Could you please try again?",
      extracted: null
    };
  }
}
function getClarifyingQuestion(questionNumber: number): string {
  switch (questionNumber) {
    case 0:
      return "I understand it might be difficult to express, but could you tell me more specifically what's bringing you to therapy? For example, are you experiencing anxiety, depression, relationship issues, or something else?";
    case 1:
      return "Could you please specifically let me know if you'd prefer in-person sessions, remote sessions, or have no preference?";
    case 2:
      return "Just to clarify - would you be using insurance or paying privately for your sessions?";
    case 3:
      return "Which insurance provider do you have? We accept most major providers."
    case 4:
      return "Do you have any specific preferences about your therapist's gender, cultural background, or whether they're a psychologist or therapist?";
    default:
      return "Could you tell me more about what brings you to therapy?";
  }
}


function getSuccessResponse(questionNumber: number, extracted: ExtractedData): string {
    switch (questionNumber) {
        case 0:
          return `I hear that you're dealing with ${extracted.concern?.toLowerCase()}. That must be challenging. I understand how important it is to get the right support for this.`;
        case 1:
            return `I understand you'd feel most comfortable with ${extracted.sessionPreference === 'noPreference' ? 'keeping your options open' : extracted.sessionPreference === 'inPerson' ? 'meeting in person' : 'connecting remotely'}. Having the right format is important.`;
        case 2:
            return `Thank you for letting me know about your preference to ${extracted.paymentMethod === 'insurance' ? 'use insurance' : 'pay privately'}.`;
        case 3:
            return `I appreciate you sharing those payment details about your ${extracted.insuranceProvider ? 'insurance coverage' : 'budget preferences'}.`;
        case 4:
            return "Thank you for sharing your preferences about what matters to you in a therapist.";
        default:
            return "I understand what you've shared.";
    }
}

function getNextPrompt(questionNumber: number, data: ExtractedData): string {
  return data.paymentMethod === 'insurance'
    ? "Which insurance provider do you have?"
    : "What's the maximum amount you're comfortable paying per session?";
}

function getSystemPrompt(questionNumber: number): string {
  const basePrompt = `You are an empathetic therapy matching assistant. Your role is to:
1. Show understanding and empathy for the user's situation
2. Extract relevant information based on the current question
3. Provide a warm, supportive response
4. Format your response as JSON with two fields:
   - "response": your empathetic response
   - "extracted": an object containing the extracted information

Current focus: `;

  switch (questionNumber) {
    case 0:
      return basePrompt + `Understanding the presenting concern. Listen carefully and extract the main mental health concerns mentioned. Example extracted format:
      {
        "concern": "depression and anxiety"
      }`;
    case 1:
      return basePrompt + `Determining session preference. Extract whether they prefer in-person, remote, or have no preference. Example format:
      {
        "sessionPreference": "remote" | "inPerson" | "noPreference"
      }`;
    case 2:
      return basePrompt + `Understanding payment preferences. Determine if they want to use insurance or pay privately. Example format:
      {
        "paymentMethod": "insurance" | "privatePay"
      }`;
    case 3:
      return basePrompt + `Getting payment details. Based on their previous choice, extract either insurance provider or maximum price. Example format:
      {
        "insuranceProvider": "Aetna" // if they chose insurance
        // OR
        "maxPrice": 150 // if they chose private pay
      }`;
    case 4:
      return basePrompt + `Understanding therapist preferences. Extract any preferences about gender, cultural background, or license type. Example format:
      {
        "therapistPreferences": {
          "gender": "female" | "male" | "noPreference",
          "culturalBackground": "Asian American",
          "licenseType": "psychologist" | "therapist" | "noPreference"
        }
      }`;
    default:
      return basePrompt + "General conversation and support.";
  }
}

function getDefaultResponse(questionNumber: number): string {
  const responses = [
    "I understand you're looking for support. Could you tell me more about what brings you to therapy?",
    "Thank you for sharing that. Would you prefer in-person or remote therapy sessions?",
    "To help find the right match, would you prefer to use insurance or pay privately?",
    "Could you let me know your insurance provider?",
    "Do you have any preferences about your therapist's background or qualifications?"
  ];

  return responses[questionNumber] || responses[0];
}
export type SessionData = {
  presentingConcern?: string;
  sessionPreference?: 'inPerson' | 'remote' | 'noPreference';
  paymentMethod?: 'insurance' | 'privatePay';
  insuranceProvider?: string;
  maxSessionPrice?: number;
  therapistPreferences?: {
    gender?: 'male' | 'female' | 'noPreference';
    culturalBackground?: string;
    licenseType?: 'psychologist' | 'therapist' | 'noPreference';
  };
}
function getNextQuestion(data: SessionData): string | null {
  if (!data.presentingConcern) {
    return "What is your presenting concern?";
  }
  if (!data.sessionPreference) {
    return "Would you prefer in-person sessions, remote sessions, or do you have no preference?";
  }
  if (!data.paymentMethod) {
    return "Would you like to use insurance or pay privately for your sessions?";
  }
  if (data.paymentMethod === 'insurance' && !data.insuranceProvider) {
    return "Which insurance provider do you have?";
  }
  if (data.paymentMethod === 'privatePay' && !data.maxSessionPrice) {
    return "What's the maximum amount you're comfortable paying per session?";
  }
  if (!data.therapistPreferences) {
    return "Do you have any preferences regarding your therapist's gender, cultural background, or license type (psychologist vs therapist)?";
  }
  return null;
}