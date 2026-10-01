/**
 * OpenAI-Compatible AI Provider
 * Connects to any standard /v1/chat/completions endpoint:
 * LM Studio (Local/Free), Groq (Free Tier), OpenRouter, vLLM, LocalAI, OpenAI.
 */
import { BaseProvider } from './BaseProvider.js';

export class OpenAICompatibleProvider extends BaseProvider {
  constructor(apiKey = '', baseUrl = 'https://api.openai.com/v1', model = 'gpt-4o-mini') {
    super('openai_compatible');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
  }

  async isAvailable() {
    // If local endpoint (localhost or 127.0.0.1), no API key is required
    const isLocal = this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1');
    if (isLocal) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${this.baseUrl}/models`, { signal: controller.signal });
        clearTimeout(timeoutId);
        return res.ok;
      } catch {
        return false;
      }
    }
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generateResponse(messages, options = {}) {
    const targetModel = options.model || this.model;
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const payload = {
      model: targetModel,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      stream: false
    };

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI-compatible API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      model: targetModel,
      usage: data.usage || {}
    };
  }

  async streamResponse(messages, onChunk, options = {}) {
    const targetModel = options.model || this.model;
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const payload = {
      model: targetModel,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      stream: true
    };

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI-compatible streaming error (${res.status}): ${errText}`);
    }

    let fullText = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        if (trimmed === 'data: [DONE]') break;
        try {
          const jsonStr = trimmed.replace(/^data:\s*/, '');
          const parsed = JSON.parse(jsonStr);
          const chunk = parsed.choices?.[0]?.delta?.content || '';
          if (chunk) {
            fullText += chunk;
            if (onChunk) onChunk(chunk);
          }
        } catch {
          // ignore stream chunk parse errors
        }
      }
    }

    return { content: fullText, model: targetModel };
  }
}

export default OpenAICompatibleProvider;
