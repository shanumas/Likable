import OpenAI from "openai";
import { responseCache, createCacheKey } from "../cache";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

export interface CodeGenerationRequest {
  prompt: string;
  conversationHistory?: Array<{ role: string; content: string; }>;
}

export interface CodeGenerationResponse {
  html: string;
  css?: string;
  js?: string;
  explanation: string;
  question?: string; // For asking user for missing details
}

export async function generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
  if (!openai.apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  // Check cache first for similar requests
  const cacheKey = createCacheKey(request.prompt, request.conversationHistory);
  const cachedResult = responseCache.get(cacheKey);
  if (cachedResult) {
    console.log("Returning cached result for:", request.prompt.slice(0, 50));
    return cachedResult;
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are an expert frontend developer specialized in creating beautiful, modern web prototypes. 

CRITICAL: You are creating standalone websites/landing pages/applications based on user requests. DO NOT create interfaces that look like chat applications, development tools, or code editors unless specifically requested.

GENERATE CODE PROACTIVELY: When users provide sufficient information (like name, education, work experience, skills, certifications), immediately generate the complete website. Don't ask for more details unless absolutely critical information is missing.

MODIFICATION REQUESTS: When users make requests that seem to modify existing content (like "not X, just Y" or "change X to Y"), interpret this as instructions to modify the current prototype. Use the conversation history to understand what currently exists and make the requested changes.

IMPORTANT INSTRUCTIONS:
1. For CV/Resume websites: If user provides name, education, work experience, skills, or certifications - GENERATE THE WEBSITE IMMEDIATELY
2. For business websites: If user provides business name, services, or contact info - GENERATE THE WEBSITE IMMEDIATELY  
3. For portfolios: If user provides name, skills, projects, or experience - GENERATE THE WEBSITE IMMEDIATELY
4. Only ask for details if absolutely critical information is missing (like user's name for a personal website)
5. Generate complete, working HTML prototypes with embedded CSS and JavaScript
6. Create the actual website/application the user is requesting (e.g., business landing page, portfolio, e-commerce site)
7. Use modern CSS techniques (Flexbox, Grid, CSS Variables)
8. Make designs responsive and mobile-friendly
9. CRITICAL: Always include Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script> in the <head> section
10. Include proper semantic HTML
11. Add interactive elements when appropriate
12. Make the design visually appealing with good typography, spacing, and colors
13. Always respond with valid JSON in one of these formats:

For questions (only if absolutely critical): {"question": "What is your name?", "html": "", "explanation": "Need user name for personal website"}
For code: {"html": "complete HTML with embedded CSS and JS", "explanation": "brief explanation"}

14. The HTML should be a complete document with DOCTYPE, head, and body
15. Embed CSS in <style> tags in the head
16. Embed JavaScript in <script> tags before closing body tag
17. Use CDN links for external libraries (Tailwind, fonts, icons)
18. Make it production-ready and visually impressive
19. Focus on creating the specific type of website requested (landing page, portfolio, etc.) - NOT development tools or chat interfaces`
    }
  ];

  // Add conversation history if provided
  if (request.conversationHistory) {
    messages.push(...request.conversationHistory.map(msg => ({
      role: msg.role as "user" | "assistant",
      content: msg.content
    })));
  }

  // Add the current prompt
  messages.push({
    role: "user",
    content: request.prompt
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000, // Reduced from 4000 for faster generation
      stream: false, // Ensure we get the full response at once
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }

    const parsed = JSON.parse(content);
    
    const result = {
      html: parsed.html || "",
      css: parsed.css || "",
      js: parsed.js || "",
      explanation: parsed.explanation || "Code generated successfully",
      question: parsed.question || undefined
    };

    // Cache the result for 5 minutes for similar requests
    responseCache.set(cacheKey, result, 5);

    return result;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate code: " + (error as Error).message);
  }
}

export async function generateChatResponse(prompt: string, conversationHistory?: Array<{ role: string; content: string; }>): Promise<string> {
  if (!openai.apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  // Check cache for chat responses too (shorter TTL)
  const cacheKey = `chat:${createCacheKey(prompt, conversationHistory)}`;
  const cachedResult = responseCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are Likable AI, an expert frontend development assistant. You help users create beautiful web prototypes quickly and efficiently.

IMPORTANT: When users ask for changes to their prototype:
- DO NOT show HTML/CSS/JavaScript code in your responses
- DO NOT provide code snippets or technical implementation details in chat
- Instead, acknowledge the change request and tell them you'll update the prototype
- Be concise and focus on what you're changing, not how you're implementing it
- The actual code changes will be handled automatically through the system

Your role:
- Help users clarify their frontend prototype requirements
- Acknowledge change requests without showing code
- Suggest improvements and best practices
- Ask clarifying questions when requirements are unclear
- Be encouraging and supportive
- Keep responses brief and action-focused

Example responses:
- "I'll update the heading to 'Likable' right away!"
- "I'll change the color scheme to blue tones."
- "I'll add that contact form to the page."

Never show code in your chat responses.`
    }
  ];

  // Add conversation history
  if (conversationHistory) {
    messages.push(...conversationHistory.map(msg => ({
      role: msg.role as "user" | "assistant",
      content: msg.content
    })));
  }

  // Add current prompt
  messages.push({
    role: "user",
    content: prompt
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 200, // Reduced for faster chat responses
    });

    const result = response.choices[0].message.content || "I apologize, but I couldn't generate a response. Please try again.";
    
    // Cache chat response for 2 minutes
    responseCache.set(cacheKey, result, 2);
    
    return result;
  } catch (error) {
    console.error("OpenAI chat error:", error);
    throw new Error("Failed to generate chat response: " + (error as Error).message);
  }
}
