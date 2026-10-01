/**
 * Conversation Context and History Manager for LADDU
 */
import { config } from '../config.js';
import { DynamicRoleEngine } from '../roles/DynamicRoleEngine.js';

export class ContextManager {
  constructor(options = {}) {
    this.assistantName = options.assistantName || config.assistantName || 'LADDU';
    this.maxHistory = options.maxHistory || 20;
    this.history = [];
    this.roleEngine = options.roleEngine || new DynamicRoleEngine(options.roleOptions);
    this.systemPrompt = this._buildSystemPrompt();
  }

  _buildSystemPrompt() {
    return `You are ${this.assistantName}, an advanced universal personal AI assistant inspired by JARVIS from Marvel, possessing an eloquent, witty, loyal, and highly caring personality.

Core Persona & Character:
- Tone: Impeccably polite, articulate, calm, witty, and subtly humorous with a touch of sophisticated British-style butler banter.
- Relationship: Loyal digital confidant and operating-system-level partner. Address the user with respect (e.g. "Sir", "Boss", or their chosen preferred name).
- Healthy & Daily Companion: Genuinely attentive to the user's daily habits, hydration, posture, productivity, and mental wellness without being overbearing.
- Adaptability: Fluidly act as a Friend, Master Teacher, Strategic Mentor, Executive Assistant, or Wellness Guide based on the user's immediate emotional and intellectual needs.
- Intellectual Depth: Confidently engage in science, quantum physics, literature, engineering, philosophy, programming, and day-to-day banter.
- Ethics & Guardrails: Distinguish clearly between: LOCAL KNOWLEDGE, USER FILES, WEB INFORMATION, and MODEL KNOWLEDGE.
- Honesty & Transparency: Provide verifiable sources and citations when answering factual or research queries. Never fabricate knowledge or claim physical consciousness.
- Safety: For dangerous or irreversible actions (file deletions, system reconfigurations, destructive scripts), strictly enforce confirmation challenges.`;
  }

  setAssistantName(name) {
    this.assistantName = name;
    this.systemPrompt = this._buildSystemPrompt();
  }

  addMessage(role, content, metadata = {}) {
    this.history.push({
      role,
      content,
      metadata,
      timestamp: new Date().toISOString()
    });

    // Prune history to sliding window
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }

  addUserMessage(content, metadata = {}) {
    this.addMessage('user', content, metadata);
  }

  addAssistantMessage(content, metadata = {}) {
    this.addMessage('assistant', content, metadata);
  }

  getMessagesForModel(injectedContext = '', roleDirective = '') {
    let sysPrompt = this.systemPrompt;

    const activeDirective = roleDirective || this.roleEngine?.getActiveRole()?.systemDirective;
    if (activeDirective) {
      sysPrompt += `\n\n[Active Dynamic Persona Directive]:\n${activeDirective}`;
    }

    if (injectedContext) {
      sysPrompt += `\n\n[Active Telemetry & Verified Injected Context]:\n${injectedContext}`;
    }

    return [
      { role: 'system', content: sysPrompt },
      ...this.history.map(m => ({ role: m.role, content: m.content }))
    ];
  }

  getActiveRole() {
    return this.roleEngine.getActiveRole();
  }

  listRoles() {
    return this.roleEngine.listRoles();
  }

  setRole(roleId, lock = true) {
    return this.roleEngine.setRole(roleId, lock);
  }

  unlockRole() {
    return this.roleEngine.unlockRole();
  }

  adaptRole(userText, acousticFeatures = null) {
    return this.roleEngine.adapt(userText, acousticFeatures);
  }

  clearHistory() {
    this.history = [];
  }

  getHistory() {
    return [...this.history];
  }
}

export default ContextManager;
