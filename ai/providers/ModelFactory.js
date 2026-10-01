/**
 * Model Provider Factory
 * Dynamically instantiates and manages AI model providers with fallback to offline local mode.
 */
import { OfflineLocalProvider } from './OfflineLocalProvider.js';
import { OllamaProvider } from './OllamaProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import { OpenAICompatibleProvider } from './OpenAICompatibleProvider.js';
import { config } from '../../core/config.js';

export class ModelFactory {
  static createProvider(type = config.aiProvider) {
    switch (type.toLowerCase()) {
      case 'ollama':
        return new OllamaProvider(config.ollama.baseUrl, config.ollama.model);

      case 'gemini':
        return new GeminiProvider(config.gemini.apiKey, config.gemini.model);

      case 'openai_compatible':
      case 'openai':
      case 'groq':
      case 'lmstudio':
        return new OpenAICompatibleProvider(
          config.openai.apiKey,
          config.openai.baseUrl,
          config.openai.model
        );

      case 'offline':
      default:
        return new OfflineLocalProvider();
    }
  }

  /**
   * Get an active, verified provider, falling back to OfflineLocalProvider if unreachable
   */
  static async getActiveProvider(preferredType = config.aiProvider) {
    const candidate = ModelFactory.createProvider(preferredType);
    try {
      const available = await candidate.isAvailable();
      if (available) {
        return candidate;
      }
    } catch {
      // ignore check error
    }

    // Gracefully fallback to OfflineLocalProvider
    return new OfflineLocalProvider();
  }

  /**
   * List all available provider options and their readiness
   */
  static async listProviders() {
    const providers = [
      { id: 'offline', name: 'Offline Local Engine', requiresKey: false },
      { id: 'ollama', name: 'Local Ollama (Llama 3/Mistral)', requiresKey: false },
      { id: 'gemini', name: 'Google Gemini (Free Tier)', requiresKey: true },
      { id: 'openai_compatible', name: 'OpenAI-Compatible / LM Studio / Groq', requiresKey: true }
    ];

    const results = [];
    for (const p of providers) {
      const instance = ModelFactory.createProvider(p.id);
      let ready = false;
      try {
        ready = await instance.isAvailable();
      } catch {
        ready = false;
      }
      results.push({
        ...p,
        isReady: ready
      });
    }
    return results;
  }
}

export default ModelFactory;
