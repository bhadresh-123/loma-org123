
import { z } from "zod";

const llamaResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.string()
    }),
    finish_reason: z.string()
  })),
  usage: z.object({
    total_tokens: z.number()
  })
});

type AnalysisResponse = {
  response: string;
  extracted: {
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
  } | null;
  complete: boolean;
};

const SYSTEM_PROMPT = `You are an empathetic therapy matching assistant. Your goal is to have a natural conversation to understand the client's needs and gather:

1. Presenting concerns (anxiety, depression, etc.)
2. Session format preference (in-person/remote)
3. Payment method (insurance/private pay) and details
4. Therapist preferences (gender, cultural background, license type)

Guidelines:
- Be warm and conversational
- Naturally guide the conversation to gather needed information
- Show empathy and understanding
- Only move forward when you have clear information
- Ask follow-up questions if needed

Format your response as JSON:
{
  "response": "your empathetic response and next question",
  "extracted": {
    // any new information gathered
  },
  "complete": boolean
}`;

export async function analyzeChatResponse(
  userInput: string,
  conversationHistory: string
): Promise<AnalysisResponse> {
  try {
    const response = await fetch('https://api.llama-api.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_LLAMA_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: `Conversation history:\n${conversationHistory}\n\nUser: ${userInput}`
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const parsed = llamaResponseSchema.parse(data);
    const result = JSON.parse(parsed.choices[0].message.content);

    return {
      response: result.response,
      extracted: result.extracted || null,
      complete: result.complete
    };
  } catch (error) {
    console.error('Error analyzing response:', error);
    return {
      response: "I apologize, but I'm having trouble processing your response. Could you please try again?",
      extracted: null,
      complete: false
    };
  }
}
