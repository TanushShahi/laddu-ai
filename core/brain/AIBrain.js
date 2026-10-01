/**
 * Central AI Brain of JARVIS
 * Coordinates context, memory injection, model selection, reasoning, and response generation.
 */
import { ContextManager } from '../context/ContextManager.js';
import { ModelFactory } from '../../ai/providers/ModelFactory.js';
import { config } from '../config.js';

export class AIBrain {
  constructor(options = {}) {
    this.contextManager = new ContextManager({
      assistantName: options.assistantName || config.assistantName
    });
    this.providerType = options.providerType || config.aiProvider;
    this.provider = null;
    this.memoryManager = options.memoryManager || null;
    this.ragEngine = options.ragEngine || null;
    this.toolRegistry = options.toolRegistry || null;
  }

  async initialize() {
    this.provider = await ModelFactory.getActiveProvider(this.providerType);
    return this.provider;
  }

  async setProvider(type) {
    this.providerType = type;
    this.provider = await ModelFactory.getActiveProvider(type);
    return this.provider;
  }

  getProviderInfo() {
    return {
      activeProvider: this.provider?.name || 'offline-local',
      preferredType: this.providerType
    };
  }

  /**
   * Process a user message through reasoning, context, and the active model
   * @param {string} userMessage
   * @param {Object} [options]
   * @param {Function} [options.onToken] - Streaming callback
   * @param {Function} [options.onStateChange] - State transition callback (thinking, executing, etc.)
   */
  async process(userMessage, options = {}) {
    if (!this.provider) {
      await this.initialize();
    }

    if (options.onStateChange) options.onStateChange('THINKING');

    // 1. Record user turn
    this.contextManager.addUserMessage(userMessage);

    // 2. Retrieve relevant long-term memory if available
    let memoryContext = '';
    if (this.memoryManager) {
      try {
        const memories = await this.memoryManager.searchMemories(userMessage, 3);
        if (memories.length > 0) {
          memoryContext = memories.map(m => `- ${m.key}: ${m.value}`).join('\n');
        }
      } catch (err) {
        console.warn('Memory search error:', err.message);
      }
    }

    // 3. Retrieve relevant RAG document context if available
    let ragContext = '';
    let ragCitations = [];
    if (this.ragEngine) {
      try {
        const ragResults = await this.ragEngine.query(userMessage, 3);
        if (ragResults.length > 0) {
          ragContext = ragResults.map(r => `[From Document: ${r.filename} (Score: ${r.score.toFixed(2)})]\n${r.text}`).join('\n\n');
          ragCitations = ragResults.map(r => ({
            source: r.filename,
            score: r.score,
            snippet: r.text.substring(0, 150) + '...'
          }));
        }
      } catch (err) {
        console.warn('RAG query error:', err.message);
      }
    }

    // Combine injected contexts
    const injectedBlocks = [];
    if (options.documents && Array.isArray(options.documents) && options.documents.length > 0) {
      const docBlocks = options.documents.map(d =>
        `[ATTACHED DOCUMENT: ${d.filename || 'document'}]\n${(d.text || '').substring(0, 12000)}`
      ).join('\n\n');
      injectedBlocks.push(`USER ATTACHED DOCUMENTS:\n${docBlocks}`);
    }
    if (memoryContext) {
      injectedBlocks.push(`USER LONG-TERM MEMORIES:\n${memoryContext}`);
    }
    if (ragContext) {
      injectedBlocks.push(`RETRIEVED KNOWLEDGE DOCUMENTS:\n${ragContext}`);
    }
    const combinedInjectedContext = injectedBlocks.join('\n\n');

    // 4. Adapt conversational role dynamically based on inquiry & voice acoustic cues
    const roleAdaptation = this.contextManager.adaptRole(userMessage, options.audioFeatures || options.features);

    // 5. Construct messages payload
    const messages = this.contextManager.getMessagesForModel(combinedInjectedContext, roleAdaptation.directive);

    // 6. Query Model Provider
    let responseText = '';
    let modelName = this.provider.name;
    let modelCitations = [];

    try {
      if (options.onToken && typeof this.provider.streamResponse === 'function') {
        const result = await this.provider.streamResponse(messages, options.onToken, options);
        responseText = result.content;
        modelName = result.model || modelName;
        if (result.citations) modelCitations = result.citations;
      } else {
        const result = await this.provider.generateResponse(messages, options);
        responseText = result.content;
        modelName = result.model || modelName;
        if (result.citations) modelCitations = result.citations;
      }
    } catch (err) {
      // Automatic fallback to offline provider on failure
      console.warn(`Provider ${this.provider.name} failed: ${err.message}. Falling back to offline engine.`);
      const offlineProvider = await ModelFactory.getActiveProvider('offline');
      const fallbackResult = await offlineProvider.generateResponse(messages, options);
      responseText = fallbackResult.content;
      modelName = 'offline-local-engine (fallback)';
    }

    // 7. Record assistant turn
    this.contextManager.addAssistantMessage(responseText);

    if (options.onStateChange) options.onStateChange('COMPLETED');

    const allCitations = [...ragCitations, ...modelCitations];

    return {
      content: responseText,
      model: modelName,
      citations: allCitations,
      role: {
        id: roleAdaptation.profile.id,
        name: roleAdaptation.profile.name,
        icon: roleAdaptation.profile.icon,
        tone: roleAdaptation.profile.tone,
        reasoning: roleAdaptation.inference?.reasoning,
        confidence: roleAdaptation.inference?.confidence,
        voiceSettings: roleAdaptation.voiceSettings
      },
      timestamp: new Date().toISOString()
    };
  }

  getActiveRole() {
    return this.contextManager.getActiveRole();
  }

  listRoles() {
    return this.contextManager.listRoles();
  }

  setRole(roleId, lock = true) {
    return this.contextManager.setRole(roleId, lock);
  }

  unlockRole() {
    return this.contextManager.unlockRole();
  }
}

export default AIBrain;
