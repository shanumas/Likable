import { type Conversation, type Message, type Prototype, type InsertConversation, type InsertMessage, type InsertPrototype, conversations, messages, prototypes } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Conversations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversations(): Promise<Conversation[]>;
  
  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversationId(conversationId: string): Promise<Message[]>;
  
  // Prototypes
  createPrototype(prototype: InsertPrototype): Promise<Prototype>;
  updatePrototype(id: string, prototype: Partial<InsertPrototype>): Promise<Prototype | undefined>;
  getPrototypeByConversationId(conversationId: string): Promise<Prototype | undefined>;
}

export class MemStorage implements IStorage {
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;
  private prototypes: Map<string, Prototype>;

  constructor() {
    this.conversations = new Map();
    this.messages = new Map();
    this.prototypes = new Map();
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const now = new Date();
    const conversation: Conversation = { 
      ...insertConversation, 
      id, 
      createdAt: now,
      updatedAt: now
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = { 
      ...insertMessage, 
      id, 
      createdAt: new Date(),
      metadata: insertMessage.metadata || null
    };
    this.messages.set(id, message);
    
    // Update conversation updatedAt
    const conversation = this.conversations.get(insertMessage.conversationId);
    if (conversation) {
      conversation.updatedAt = new Date();
      this.conversations.set(conversation.id, conversation);
    }
    
    return message;
  }

  async getMessagesByConversationId(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createPrototype(insertPrototype: InsertPrototype): Promise<Prototype> {
    const id = randomUUID();
    const now = new Date();
    const prototype: Prototype = { 
      ...insertPrototype, 
      id, 
      createdAt: now,
      updatedAt: now,
      cssContent: insertPrototype.cssContent || null,
      jsContent: insertPrototype.jsContent || null
    };
    this.prototypes.set(id, prototype);
    return prototype;
  }

  async updatePrototype(id: string, updateData: Partial<InsertPrototype>): Promise<Prototype | undefined> {
    const existing = this.prototypes.get(id);
    if (!existing) return undefined;
    
    const updated: Prototype = {
      ...existing,
      ...updateData,
      updatedAt: new Date()
    };
    this.prototypes.set(id, updated);
    return updated;
  }

  async getPrototypeByConversationId(conversationId: string): Promise<Prototype | undefined> {
    return Array.from(this.prototypes.values())
      .find(prototype => prototype.conversationId === conversationId);
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getConversations(): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.updatedAt));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    
    // Update conversation updatedAt
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, insertMessage.conversationId));
    
    return message;
  }

  async getMessagesByConversationId(conversationId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createPrototype(insertPrototype: InsertPrototype): Promise<Prototype> {
    const [prototype] = await db
      .insert(prototypes)
      .values(insertPrototype)
      .returning();
    return prototype;
  }

  async updatePrototype(id: string, updateData: Partial<InsertPrototype>): Promise<Prototype | undefined> {
    const [prototype] = await db
      .update(prototypes)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(prototypes.id, id))
      .returning();
    return prototype || undefined;
  }

  async getPrototypeByConversationId(conversationId: string): Promise<Prototype | undefined> {
    const [prototype] = await db
      .select()
      .from(prototypes)
      .where(eq(prototypes.conversationId, conversationId));
    return prototype || undefined;
  }
}

export const storage = new DatabaseStorage();
