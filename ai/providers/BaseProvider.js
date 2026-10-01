/**
 * Base AI Model Provider Interface
 */
export class BaseProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Check if this provider is currently available and healthy
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    throw new Error('Method isAvailable() must be implemented');
  }

  /**
   * Generate a complete text response
   * @param {Array<{role: string, content: string}>} messages
   * @param {Object} [options]
   * @returns {Promise<{content: string, model: string, usage?: Object, citations?: Array}>}
   */
  async generateResponse(messages, options = {}) {
    throw new Error('Method generateResponse() must be implemented');
  }

  /**
   * Stream response tokens
   * @param {Array<{role: string, content: string}>} messages
   * @param {Function} onChunk - callback(token: string)
   * @param {Object} [options]
   * @returns {Promise<{content: string, model: string}>}
   */
  async streamResponse(messages, onChunk, options = {}) {
    // Default fallback to non-streaming if provider doesn't support streaming
    const res = await this.generateResponse(messages, options);
    if (onChunk && typeof onChunk === 'function') {
      onChunk(res.content);
    }
    return res;
  }
}

export default BaseProvider;
