/**
 * Text Chunker
 * Splits extracted document text into overlapping semantic passages for RAG retrieval.
 */
import crypto from 'node:crypto';

export class TextChunker {
  /**
   * Split document text into chunks
   * @param {string} text
   * @param {Object} [options]
   * @param {number} [options.chunkSize=600] - characters per chunk
   * @param {number} [options.chunkOverlap=120] - overlap characters
   * @param {string} [options.sourceFile='']
   * @returns {Array<Object>}
   */
  static chunk(text, options = {}) {
    if (!text || typeof text !== 'string') return [];

    const chunkSize = options.chunkSize || 600;
    const chunkOverlap = options.chunkOverlap || 120;
    const sourceFile = options.sourceFile || 'unknown';

    const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
    const chunks = [];
    let start = 0;
    let index = 0;

    while (start < normalized.length) {
      let end = start + chunkSize;

      // Try to break at a natural boundary (newline, period, space)
      if (end < normalized.length) {
        const boundary = normalized.lastIndexOf('\n', end);
        const sentenceBoundary = normalized.lastIndexOf('. ', end);
        const spaceBoundary = normalized.lastIndexOf(' ', end);

        if (boundary > start + chunkSize * 0.5) {
          end = boundary + 1;
        } else if (sentenceBoundary > start + chunkSize * 0.5) {
          end = sentenceBoundary + 2;
        } else if (spaceBoundary > start + chunkSize * 0.5) {
          end = spaceBoundary + 1;
        }
      } else {
        end = normalized.length;
      }

      const chunkText = normalized.substring(start, end).trim();
      if (chunkText.length > 0) {
        chunks.push({
          id: crypto.randomUUID(),
          chunkIndex: index,
          text: chunkText,
          sourceFile,
          charStart: start,
          charEnd: end,
          length: chunkText.length
        });
        index++;
      }

      if (end >= normalized.length) break;
      start = end - chunkOverlap;
    }

    // Set totalChunks on each chunk
    chunks.forEach(c => { c.totalChunks = chunks.length; });

    return chunks;
  }
}

export default TextChunker;
