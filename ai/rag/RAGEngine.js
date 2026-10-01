/**
 * RAG Engine (Retrieval-Augmented Generation)
 * Parses, chunks, indexes, and queries personal knowledge documents.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DocumentParser } from '../../knowledge/documents/DocumentParser.js';
import { TextChunker } from '../../knowledge/documents/TextChunker.js';
import { VectorIndex } from '../../knowledge/vector_db/VectorIndex.js';

export class RAGEngine {
  constructor(options = {}) {
    this.vectorIndex = new VectorIndex(options);
    this.chunkSize = options.chunkSize || 600;
    this.chunkOverlap = options.chunkOverlap || 120;
  }

  /**
   * Ingest a single file into the knowledge base
   * @param {string} filePath
   * @returns {Promise<{filename: string, chunksCount: number}>}
   */
  async ingestFile(filePath) {
    if (!DocumentParser.isSupported(filePath)) {
      throw new Error(`Unsupported file type for: ${filePath}`);
    }

    const { text, metadata } = await DocumentParser.parse(filePath);
    if (!text || text.length === 0) {
      throw new Error(`No extractable text found in: ${filePath}`);
    }

    const chunks = TextChunker.chunk(text, {
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
      sourceFile: metadata.filename
    });

    this.vectorIndex.addDocumentChunks(metadata.filename, chunks, metadata);

    return {
      filename: metadata.filename,
      filePath,
      fileSize: metadata.fileSize,
      chunksCount: chunks.length,
      extractedCharacters: text.length
    };
  }

  /**
   * Ingest all supported files in a directory recursively
   */
  async ingestDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    const results = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isFile() && DocumentParser.isSupported(fullPath)) {
        try {
          const res = await this.ingestFile(fullPath);
          results.push(res);
        } catch (err) {
          console.warn(`Failed to ingest ${fullPath}:`, err.message);
        }
      }
    }

    return results;
  }

  /**
   * Query the knowledge base for relevant context passages
   * @param {string} queryText
   * @param {number} [topK=3]
   * @returns {Array<{text: string, filename: string, score: number}>}
   */
  async query(queryText, topK = 3) {
    return this.vectorIndex.search(queryText, topK);
  }

  /**
   * Get list of indexed documents
   */
  listDocuments() {
    return this.vectorIndex.listDocuments();
  }

  /**
   * Delete an indexed document
   */
  deleteDocument(filename) {
    this.vectorIndex.removeDocument(filename);
    return true;
  }

  /**
   * Clear all indexed documents
   */
  clear() {
    this.vectorIndex.clear();
    return true;
  }
}

export default RAGEngine;
