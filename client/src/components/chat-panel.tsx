import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Bot, User, Paperclip, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/types';

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  isGenerating: boolean;
  onSendMessage: (message: string) => void;
  onGenerateCode: (prompt: string) => void;
  onClearChat: () => void;
  error: string | null;
}

export function ChatPanel({
  messages,
  isLoading,
  isSending,
  isGenerating,
  onSendMessage,
  onGenerateCode,
  onClearChat,
  error
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending, isGenerating]);

  const handleSubmit = () => {
    const message = input.trim();
    if (!message || isSending) return;

    // Check if this looks like a code generation or modification request
    const codeKeywords = ['create', 'build', 'make', 'generate', 'design', 'prototype', 'landing page', 'website', 'app', 'component', 'change', 'update', 'modify', 'edit', 'add', 'remove', 'fix', 'replace', 'color', 'text', 'heading', 'button', 'style', 'cv', 'resume', 'portfolio'];
    
    // Also check for patterns that suggest content changes (more liberal detection)
    const contentChangePatterns = [
      /not .+, just .+/i, // "not X, just Y" pattern
      /instead of .+/i,    // "instead of X" pattern
      /should be .+/i,     // "should be X" pattern
      /want .+ to .+/i,    // "want X to Y" pattern
    ];
    
    const isCodeRequest = codeKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    ) || contentChangePatterns.some(pattern => pattern.test(message));

    // If there's an active prototype and user is making any request, assume it's a modification
    const hasActivePrototype = messages.some(msg => msg.metadata?.codeGenerated);
    
    // If AI has asked for details and user responds, treat as code generation
    const aiAskedForDetails = messages.some(msg => 
      msg.role === 'assistant' && 
      (msg.content.toLowerCase().includes('what') || 
       msg.content.toLowerCase().includes('details') ||
       msg.content.toLowerCase().includes('include'))
    );
    
    // If user provides information (education, work, skills, etc.), treat as code generation
    const userProvidedInfo = /(education|work|experience|skills|certifications|name|email|phone|address|company|business)/i.test(message);
    
    if (isCodeRequest || hasActivePrototype || aiAskedForDetails || userProvidedInfo) {
      onGenerateCode(message);
    } else {
      onSendMessage(message);
    }

    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    return timestamp.toLocaleDateString();
  };

  return (
    <div className="w-full lg:w-2/5 bg-surface flex flex-col border-r border-slate-700">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-50 mb-2">AI Assistant</h2>
            <p className="text-sm text-slate-400">Describe your frontend prototype and I'll help you build it</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearChat}
            className="text-slate-400 hover:text-slate-200"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="px-6 py-2">
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-300">
              {error}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="text-white w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="bg-slate-800 rounded-2xl rounded-tl-md px-4 py-3 max-w-xs">
                <p className="text-sm text-slate-200">
                  Hi! I'm your AI assistant. I can help you create frontend prototypes quickly. What would you like to build today?
                </p>
              </div>
              <span className="text-xs text-slate-500 ml-2 mt-1 block">Just now</span>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex items-start space-x-3",
              message.role === 'user' ? "justify-end" : ""
            )}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="text-white w-4 h-4" />
              </div>
            )}
            
            <div className={cn("flex-1", message.role === 'user' ? "max-w-xs" : "")}>
              <div
                className={cn(
                  "rounded-2xl px-4 py-3",
                  message.role === 'user'
                    ? "bg-primary rounded-tr-md ml-auto text-white"
                    : "bg-slate-800 rounded-tl-md max-w-sm text-slate-200"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.metadata?.codeGenerated && (
                  <Badge variant="secondary" className="mt-2 bg-green-500/20 text-green-300">
                    Code Generated
                  </Badge>
                )}
              </div>
              <span
                className={cn(
                  "text-xs text-slate-500 mt-1 block",
                  message.role === 'user' ? "text-right mr-2" : "ml-2"
                )}
              >
                {formatTime(message.timestamp)}
              </span>
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="text-slate-300 w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {(isSending || isGenerating) && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="text-white w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="bg-slate-800 rounded-2xl rounded-tl-md px-4 py-3 max-w-xs">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <span className="text-sm text-slate-400">
                    {isGenerating ? 'Generating code...' : 'AI is thinking...'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="px-6 py-4 border-t border-slate-700">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            placeholder="Describe what you want to build..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-slate-800 border-slate-600 rounded-xl px-4 py-3 pr-12 text-sm text-slate-200 placeholder-slate-500 resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
            rows={3}
            disabled={isSending || isGenerating}
          />
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isSending || isGenerating}
            size="icon"
            className="absolute bottom-3 right-3 w-8 h-8 bg-primary hover:bg-blue-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200 text-xs">
              <Paperclip className="w-3 h-3 mr-1" />
              Attach
            </Button>
          </div>
          <span className="text-xs text-slate-500">Press Enter to send</span>
        </div>
      </div>
    </div>
  );
}
