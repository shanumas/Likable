import OpenAI from "openai";
import { responseCache, createCacheKey } from "../cache";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

export interface CodeGenerationRequest {
  prompt: string;
  conversationHistory?: Array<{ role: string; content: string; }>;
  currentPrototype?: string; // Add current prototype HTML for targeted modifications
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
  const cacheKey = createCacheKey(request.prompt, request.conversationHistory, request.currentPrototype);
  const cachedResult = responseCache.get(cacheKey);
  if (cachedResult) {
    console.log("Returning cached result for:", request.prompt.slice(0, 50));
    return cachedResult;
  }

  // Determine if this is a modification request or new generation
  const isModification = request.currentPrototype && request.currentPrototype.trim().length > 0;

  console.log('request.currentPrototype', request.currentPrototype);
  
  console.log('Code generation request:', {
    isModification,
    currentPrototypeLength: request.currentPrototype?.length || 0,
    prompt: request.prompt.slice(0, 100) + '...'
  });

  const systemPrompt = isModification 
    ? `You are an expert frontend developer specialized in modifying existing web prototypes with targeted changes.

CRITICAL: You are modifying an existing HTML prototype. You MUST preserve the EXACT same structure, layout, colors, styling, and content. Only make the specific change requested by the user.

STRICT MODIFICATION RULES:
1. KEEP THE EXACT SAME HTML STRUCTURE - do not change the overall layout
2. KEEP THE EXACT SAME CSS STYLES - do not modify colors, fonts, spacing, or layout
3. KEEP THE EXACT SAME CONTENT - do not change any text, images, or sections unless specifically requested
4. KEEP THE EXACT SAME SECTIONS - do not add, remove, or reorder sections
5. KEEP THE EXACT SAME HEADER AND FOOTER - do not modify navigation or footer content unless specifically requested
6. ONLY modify the specific element or content that the user explicitly asks to change
7. If adding content, add it to the appropriate existing section without changing the section structure
8. If changing text, change only the specific text mentioned, not the entire section
9. If changing colors, change only the specific element mentioned, not the entire color scheme
10. Maintain the complete HTML document structure exactly as it is

CURRENT PROTOTYPE HTML:
${request.currentPrototype}

IMPORTANT: Your response must be a complete, valid HTML document that looks IDENTICAL to the current prototype except for the specific change requested. The layout, colors, fonts, spacing, and structure must remain exactly the same.

RESPONSE FORMAT: Return a JSON object with this exact structure:
{"html": "complete modified HTML document", "explanation": "brief description of the specific change made"}

The html field must contain the complete HTML document with your modification applied.`
    : `You are an expert frontend developer specialized in creating beautiful, modern web prototypes. 

CRITICAL: You are creating standalone websites/landing pages/applications based on user requests. DO NOT create interfaces that look like chat applications, development tools, or code editors unless specifically requested.

GENERATE CODE PROACTIVELY: When users provide sufficient information (like name, education, work experience, skills, certifications), immediately generate the complete website. Don't ask for more details unless absolutely critical information is missing.

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
19. Focus on creating the specific type of website requested (landing page, portfolio, etc.) - NOT development tools or chat interfaces`;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: systemPrompt
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
      temperature: isModification ? 0.1 : 0.7, // Lower temperature for modifications to be more conservative
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
