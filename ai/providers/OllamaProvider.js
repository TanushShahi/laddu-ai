/**
 * Ollama AI Provider
 * Connects to local Ollama instance (100% free and open-source).
 * Supports models like Llama 3, Mistral, Phi-3, Qwen, DeepSeek, etc.
 */
import { BaseProvider } from './BaseProvider.js';

export class OllamaProvider extends BaseProvider {
  constructor(baseUrl = 'http://localhost:11434', model = 'llama3') {
    super('ollama');
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
  }

  async isAvailable() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  async generateResponse(messages, options = {}) {
    const payload = {
      model: options.model || this.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7
      }
    };

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Ollama API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return {
      content: data.message?.content || '',
      model: this.model,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0
      }
    };
  }

  async streamResponse(messages, onChunk, options = {}) {
    const payload = {
      model: options.model || this.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
      options: {
        temperature: options.temperature ?? 0.7
      }
    };

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Ollama streaming error: ${res.status} ${res.statusText}`);
    }

    let fullText = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          const chunk = parsed.message?.content || '';
          if (chunk) {
            fullText += chunk;
            if (onChunk) onChunk(chunk);
          }
        } catch {
          // ignore partial JSON parse errors in chunk
        }
      }
    }

    return { content: fullText, model: this.model };
  }
}

export default OllamaProvider;
