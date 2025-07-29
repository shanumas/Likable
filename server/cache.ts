// Simple in-memory cache for responses
class SimpleCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttlMinutes: number = 10): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    this.cache.forEach((item, key) => {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    });
  }
}

export const responseCache = new SimpleCache();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  responseCache.cleanup();
}, 5 * 60 * 1000);

// Create cache key from prompt and conversation context
export function createCacheKey(prompt: string, conversationHistory?: Array<{ role: string; content: string }>): string {
  const contextStr = conversationHistory?.slice(-3).map(m => `${m.role}:${m.content.slice(0, 100)}`).join('|') || '';
  return `${prompt.slice(0, 200)}|${contextStr}`.replace(/\s+/g, ' ');
}