/**
 * High-Level Memory Manager
 * Provides user privacy controls, natural language memory extraction, and search capabilities.
 */
import { MemoryStore } from './MemoryStore.js';

export class MemoryManager {
  constructor(options = {}) {
    this.store = new MemoryStore(options);
  }

  addMemory(key, value, category = 'general', isSensitive = false) {
    return this.store.add({ key, value, category, isSensitive });
  }

  getMemory(id) {
    return this.store.get(id);
  }

  listMemories(category = null) {
    return this.store.list(category);
  }

  updateMemory(id, fields) {
    return this.store.update(id, fields);
  }

  deleteMemory(id) {
    return this.store.delete(id);
  }

  clearAllMemories() {
    return this.store.clear();
  }

  searchMemories(query, limit = 5) {
    return this.store.search(query, limit);
  }

  exportMemories() {
    const memories = this.store.list();
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      count: memories.length,
      memories
    };
  }

  /**
   * Detect and handle natural language memory commands:
   * e.g., "Remember that my preferred language is Python"
   * e.g., "Forget my preferred language"
   * e.g., "What is my preferred language?"
   */
  handleNaturalLanguage(text) {
    const trimmed = text.trim();

    // 1. Remember command
    const rememberMatch = trimmed.match(/^remember(?:\s+that)?\s+my\s+([^=:]+?)\s+(?:is|=|:)\s+(.+)$/i);
    if (rememberMatch) {
      const key = rememberMatch[1].trim();
      const value = rememberMatch[2].trim();
      const isSensitive = /password|secret|key|token|card|pin/i.test(key);
      const category = /project/i.test(key) ? 'project' : 'preference';

      // Check if already exists, update or add
      const existing = this.store.search(key, 1);
      if (existing.length > 0 && existing[0].key.toLowerCase() === key.toLowerCase()) {
        this.store.update(existing[0].id, { value, isSensitive });
        return {
          action: 'updated',
          message: `I have updated your memory: ${key} is now "${value}".`,
          key,
          value
        };
      }

      this.store.add({ key, value, category, isSensitive });
      return {
        action: 'added',
        message: `I will remember that your ${key} is "${value}".`,
        key,
        value
      };
    }

    // 2. Forget command
    const forgetMatch = trimmed.match(/^(?:forget|delete memory for|remove memory for)\s+(?:that\s+)?(?:my\s+)?(.+)$/i);
    if (forgetMatch) {
      const target = forgetMatch[1].trim();
      const matches = this.store.search(target, 5);
      if (matches.length === 0) {
        return { action: 'not_found', message: `I could not find any memory matching "${target}".` };
      }
      for (const m of matches) {
        this.store.delete(m.id);
      }
      return {
        action: 'deleted',
        message: `I have forgotten ${matches.length} memory item(s) related to "${target}".`,
        deletedCount: matches.length
      };
    }

    return null;
  }
}

export default MemoryManager;
