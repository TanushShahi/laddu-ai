/**
 * Google Gemini AI Provider — Multimodal & Perplexity-Style Web Grounded
 * Connects to Google Gemini API (Generous Free Tier).
 * Supports: Vision/Image understanding, Live Google Search Grounding, and Document Q&A.
 */
import { BaseProvider } from './BaseProvider.js';

export class GeminiProvider extends BaseProvider {
  constructor(apiKey = '', model = 'gemini-2.5-flash') {
    super('gemini');
    this.apiKey = apiKey;
    this.model = model;
  }

  async isAvailable() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Test API key connectivity and model availability
   */
  async testConnection(testKey = null, testModel = null) {
    const key = (testKey || this.apiKey || '').trim();
    if (!key) {
      return { success: false, message: 'No Gemini API key provided.' };
    }

    const model = testModel || this.model || 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Respond with OK' }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      });

      if (res.ok) {
        return {
          success: true,
          model,
          message: `Connected successfully! Model ${model} (100% Free Tier) is active.`
        };
      }

      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errData.error?.message || `Google API error (HTTP ${res.status})`
      };
    } catch (err) {
      return { success: false, message: `Network error: ${err.message}` };
    }
  }

  async generateResponse(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured');
    }

    // Convert OpenAI style messages to Gemini contents format
    let systemInstruction = null;
    const contents = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === 'system') {
        systemInstruction = { parts: [{ text: msg.content }] };
      } else {
        const parts = [];

        // 1. Text content
        if (typeof msg.content === 'string') {
          parts.push({ text: msg.content });
        } else if (Array.isArray(msg.content)) {
          for (const item of msg.content) {
            if (item.type === 'text') parts.push({ text: item.text });
            else if (item.inlineData) parts.push({ inlineData: item.inlineData });
          }
        }

        // 2. Attach Multimodal Images to the last user message turn
        if (msg.role === 'user' && i === messages.length - 1 && options.images && Array.isArray(options.images)) {
          for (const img of options.images) {
            if (img.data) {
              parts.push({
                inlineData: {
                  mimeType: img.mimeType || 'image/jpeg',
                  data: img.data.replace(/^data:image\/[a-z]+;base64,/, '')
                }
              });
            }
          }
        }

        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts
        });
      }
    }

    const targetModel = options.model || this.model || 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${this.apiKey}`;

    const makeBody = (enableGrounding = true) => {
      const body = {
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 2048
        }
      };
      if (systemInstruction) {
        body.systemInstruction = systemInstruction;
      }
      // Enable Perplexity-style Google Search Grounding if requested or by default
      if (enableGrounding && options.webSearch !== false) {
        body.tools = [{ googleSearch: {} }];
      }
      return body;
    };

    let res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeBody(true))
    });

    // If tools: googleSearch fails (e.g. 400 on models without search grounding support), retry without tools
    if (!res.ok && res.status === 400) {
      console.warn('[GeminiProvider] Google Search grounding returned 400, retrying without tools...');
      res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeBody(false))
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    let text = candidate?.content?.parts?.[0]?.text || '';

    // Extract Google Search Grounding Metadata (Perplexity-style citations)
    const citations = [];
    const grounding = candidate?.groundingMetadata;

    if (grounding?.groundingChunks && Array.isArray(grounding.groundingChunks)) {
      grounding.groundingChunks.forEach((chunk, idx) => {
        if (chunk.web) {
          citations.push({
            source: chunk.web.title || `Source [${idx + 1}]`,
            url: chunk.web.uri,
            snippet: chunk.web.title || chunk.web.uri
          });
        }
      });
    }

    // Append neat markdown citations at bottom if grounded search sources exist
    if (citations.length > 0 && !text.includes('### Sources:')) {
      const uniqueSources = [];
      const seenUrls = new Set();
      for (const c of citations) {
        if (!seenUrls.has(c.url)) {
          seenUrls.add(c.url);
          uniqueSources.push(c);
        }
      }

      if (uniqueSources.length > 0) {
        text += '\n\n**🌐 Live Web Sources:**\n' +
          uniqueSources.slice(0, 5).map((s, i) => `[${i + 1}] [${s.source}](${s.url})`).join('\n');
      }
    }

    return {
      content: text,
      model: targetModel,
      citations,
      groundingMetadata: grounding,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0
      }
    };
  }
}

export default GeminiProvider;
