export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

export interface CodeGenerationResult {
  html: string;
  css?: string;
  js?: string;
  explanation: string;
  question?: string; // For when AI asks for missing details
}

export interface ApiConfig {
  openaiApiKey?: string;
  isConfigured: boolean;
}

export interface ConversationState {
  id?: string;
  title: string;
  messages: ChatMessage[];
  currentPrototype?: {
    id: string;
    html: string;
    css?: string;
    js?: string;
  };
}
