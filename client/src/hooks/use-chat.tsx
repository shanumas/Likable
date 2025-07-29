import React, { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import type { ChatMessage, CodeGenerationResult, ConversationState } from '@/lib/types';
import type { Conversation, Message, Prototype } from '@shared/schema';

interface UseChatReturn {
  conversation: ConversationState;
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  isGenerating: boolean;
  sendMessage: (content: string) => Promise<void>;
  generateCode: (prompt: string) => Promise<void>;
  createNewConversation: () => Promise<void>;
  currentPrototype: string | null;
  error: string | null;
}

export function useChat(): UseChatReturn {
  const [conversation, setConversation] = useState<ConversationState>({
    title: 'New Conversation',
    messages: [],
  });
  const [currentPrototype, setCurrentPrototype] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const queryClient = useQueryClient();

  // Fetch messages for current conversation
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['/api/conversations', conversation.id, 'messages'],
    enabled: !!conversation.id,
  });

  // Fetch current prototype
  const { data: prototype } = useQuery<Prototype>({
    queryKey: ['/api/conversations', conversation.id, 'prototype'],
    enabled: !!conversation.id,
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await apiRequest('POST', '/api/conversations', { title });
      return response.json() as Promise<Conversation>;
    },
    onSuccess: (data) => {
      setConversation(prev => ({ ...prev, id: data.id, title: data.title }));
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onError: (error) => {
      setError('Failed to create conversation: ' + (error as Error).message);
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, conversationId }: { content: string; conversationId: string }) => {
      // Create user message
      await apiRequest('POST', '/api/messages', {
        conversationId,
        role: 'user',
        content,
      });

      // Get AI response
      const chatResponse = await apiRequest('POST', '/api/chat', {
        prompt: content,
        conversationId,
      });
      
      const { response } = await chatResponse.json();
      
      // Create AI message
      await apiRequest('POST', '/api/messages', {
        conversationId,
        role: 'assistant',
        content: response,
      });

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversation.id, 'messages'] });
      setError(null);
    },
    onError: (error) => {
      setError('Failed to send message: ' + (error as Error).message);
    }
  });

  // Generate code mutation
  const generateCodeMutation = useMutation({
    // Add optimistic updates for faster UI response
    mutationFn: async ({ prompt, conversationId }: { prompt: string; conversationId: string }) => {
      const response = await apiRequest('POST', '/api/generate-code', {
        prompt,
        conversationId,
      });
      return response.json() as Promise<CodeGenerationResult>;
    },
    onMutate: () => {
      // Show generating toast
      toast({
        title: "Generating...",
        description: "Updating...",
        duration: Infinity, // Keep toast until generation completes
      });
    },
    onSuccess: async (codeResult) => {
      if (!conversation.id) return;

      // Check if AI is asking a question instead of generating code
      if (codeResult.question && !codeResult.html) {
        // AI is asking for more details - add the question as an assistant message
        await apiRequest('POST', '/api/messages', {
          conversationId: conversation.id,
          role: 'assistant',
          content: codeResult.question,
          metadata: { needsUserInput: true },
        });
        
        queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversation.id, 'messages'] });
        setError(null);
        
        // Show success toast for question
        toast({
          title: "Response received",
          description: "AI is asking for more details",
          duration: 3000,
        });
        return;
      }

      // Update or create prototype
      try {
        // Try to get existing prototype, but don't fail if it doesn't exist
        let existingPrototype: Prototype | null = null;
        try {
          existingPrototype = await queryClient.fetchQuery({
            queryKey: ['/api/conversations', conversation.id, 'prototype'],
          }) as Prototype;
        } catch (error) {
          // Prototype doesn't exist yet, which is fine
          existingPrototype = null;
        }

        if (existingPrototype) {
          await apiRequest('PUT', `/api/prototypes/${existingPrototype.id}`, {
            htmlContent: codeResult.html,
            cssContent: codeResult.css || '',
            jsContent: codeResult.js || '',
          });
        } else {
          await apiRequest('POST', '/api/prototypes', {
            conversationId: conversation.id,
            title: conversation.title + ' - Prototype',
            htmlContent: codeResult.html,
            cssContent: codeResult.css || '',
            jsContent: codeResult.js || '',
          });
        }

        setCurrentPrototype(codeResult.html);
        queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversation.id, 'prototype'] });
        
        // Add AI message about the code generation
        await apiRequest('POST', '/api/messages', {
          conversationId: conversation.id,
          role: 'assistant',
          content: `${codeResult.explanation}`,
          metadata: { codeGenerated: true },
        });
        
        queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversation.id, 'messages'] });
        setError(null); // Clear any previous errors
        
        // Show success toast
        toast({
          title: "Generation complete!",
          description: "Your prototype has been updated",
          duration: 3000,
        });
      } catch (error) {
        console.error('Failed to save prototype:', error);
        setError('Generated code but failed to save prototype');
        
        // Show error toast
        toast({
          title: "Generation failed",
          description: "Generated code but failed to save prototype",
          variant: "destructive",
          duration: 5000,
        });
      }
    },
    onError: (error) => {
      setError('Failed to generate code: ' + (error as Error).message);
      
      // Show error toast
      toast({
        title: "Generation failed",
        description: "Failed to generate code: " + (error as Error).message,
        variant: "destructive",
        duration: 5000,
      });
    }
  });

  const sendMessage = useCallback(async (content: string) => {
    let conversationId = conversation.id;
    
    if (!conversationId) {
      // Create conversation first
      const newConversation = await createConversationMutation.mutateAsync(content.slice(0, 50) + '...');
      conversationId = newConversation.id;
    }

    await sendMessageMutation.mutateAsync({ content, conversationId });
  }, [conversation.id, createConversationMutation, sendMessageMutation]);

  const generateCode = useCallback(async (prompt: string) => {
    let conversationId = conversation.id;
    
    if (!conversationId) {
      // Create conversation first
      const newConversation = await createConversationMutation.mutateAsync(prompt.slice(0, 50) + '...');
      conversationId = newConversation.id;
    }

    // Save user message first
    await apiRequest('POST', '/api/messages', {
      conversationId,
      role: 'user',
      content: prompt,
      metadata: {},
    });

    queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'messages'] });

    await generateCodeMutation.mutateAsync({ prompt, conversationId });
  }, [conversation.id, createConversationMutation, generateCodeMutation, queryClient]);

  const createNewConversation = useCallback(async () => {
    setConversation({
      title: 'New Conversation',
      messages: [],
    });
    setCurrentPrototype(null);
    setError(null);
  }, []);

  // Update current prototype when data changes
  React.useEffect(() => {
    if (prototype?.htmlContent) {
      setCurrentPrototype(prototype.htmlContent);
    }
  }, [prototype]);

  // Convert messages to ChatMessage format
  const chatMessages: ChatMessage[] = messages.map(msg => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    timestamp: new Date(msg.createdAt),
    metadata: msg.metadata,
  }));

  return {
    conversation: {
      ...conversation,
      messages: chatMessages,
    },
    messages: chatMessages,
    isLoading,
    isSending: sendMessageMutation.isPending || createConversationMutation.isPending,
    isGenerating: generateCodeMutation.isPending,
    sendMessage,
    generateCode,
    createNewConversation,
    currentPrototype,
    error,
  };
}
