import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConversationSchema, insertMessageSchema, insertPrototypeSchema } from "@shared/schema";
import { generateCode, generateChatResponse } from "./services/openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Conversations
  app.post("/api/conversations", async (req, res) => {
    try {
      const data = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(data);
      res.json(conversation);
    } catch (error) {
      res.status(400).json({ message: "Invalid conversation data", error: (error as Error).message });
    }
  });

  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations", error: (error as Error).message });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversation", error: (error as Error).message });
    }
  });

  // Messages
  app.post("/api/messages", async (req, res) => {
    try {
      const data = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(data);
      res.json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data", error: (error as Error).message });
    }
  });

  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getMessagesByConversationId(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages", error: (error as Error).message });
    }
  });

  // Prototypes
  app.post("/api/prototypes", async (req, res) => {
    try {
      const data = insertPrototypeSchema.parse(req.body);
      const prototype = await storage.createPrototype(data);
      res.json(prototype);
    } catch (error) {
      res.status(400).json({ message: "Invalid prototype data", error: (error as Error).message });
    }
  });

  app.put("/api/prototypes/:id", async (req, res) => {
    try {
      const data = insertPrototypeSchema.partial().parse(req.body);
      const prototype = await storage.updatePrototype(req.params.id, data);
      if (!prototype) {
        return res.status(404).json({ message: "Prototype not found" });
      }
      res.json(prototype);
    } catch (error) {
      res.status(400).json({ message: "Invalid prototype data", error: (error as Error).message });
    }
  });

  app.get("/api/conversations/:id/prototype", async (req, res) => {
    try {
      const prototype = await storage.getPrototypeByConversationId(req.params.id);
      if (!prototype) {
        return res.status(404).json({ message: "Prototype not found" });
      }
      res.json(prototype);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch prototype", error: (error as Error).message });
    }
  });

  // AI Code Generation
  app.post("/api/generate-code", async (req, res) => {
    try {
      const { prompt, conversationId } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }

      // Get conversation history for context
      let conversationHistory: Array<{ role: string; content: string; }> = [];
      if (conversationId) {
        const messages = await storage.getMessagesByConversationId(conversationId);
        conversationHistory = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      }

      // Get current prototype for targeted modifications
      let currentPrototype: string | undefined;
      if (conversationId) {
        const prototype = await storage.getPrototypeByConversationId(conversationId);
        if (prototype) {
          currentPrototype = prototype.htmlContent;
          console.log('Current prototype found, length:', currentPrototype.length);
        } else {
          console.log('No current prototype found for conversation:', conversationId);
        }
      }

      const codeResult = await generateCode({ 
        prompt, 
        conversationHistory: conversationHistory.slice(-10), // Last 10 messages for context
        currentPrototype // Pass current prototype for targeted modifications
      });

      res.json(codeResult);
    } catch (error) {
      console.error("Code generation error:", error);
      res.status(500).json({ 
        message: "Failed to generate code", 
        error: (error as Error).message 
      });
    }
  });

  // AI Chat Response
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, conversationId } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }

      // Get conversation history for context
      let conversationHistory: Array<{ role: string; content: string; }> = [];
      if (conversationId) {
        const messages = await storage.getMessagesByConversationId(conversationId);
        conversationHistory = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      }

      const response = await generateChatResponse(
        prompt, 
        conversationHistory.slice(-10) // Last 10 messages for context
      );

      res.json({ response });
    } catch (error) {
      console.error("Chat response error:", error);
      res.status(500).json({ 
        message: "Failed to generate chat response", 
        error: (error as Error).message 
      });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      openaiConfigured: !!process.env.OPENAI_API_KEY,
      timestamp: new Date().toISOString()
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
