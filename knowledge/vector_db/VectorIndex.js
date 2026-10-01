/**
 * Local Vector & Semantic Retrieval Index
 * Implements TF-IDF vectorization and Cosine Similarity retrieval.
 * Operates 100% locally with zero external network or model downloads.
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../../core/config.js';

export class VectorIndex {
  constructor(options = {}) {
    this.dataDir = options.dataDir || config.dataDir;
    this.indexPath = path.join(this.dataDir, 'rag_index.json');
    this.documents = new Map(); // file -> metadata
    this.chunks = []; // array of { id, text, sourceFile, chunkIndex, tokens, vector, magnitude }
    this.docFreq = new Map(); // token -> count of chunks containing token
    this.totalChunks = 0;

    this._load();
  }

  _tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1 && !/^\d+$/.test(t));
  }

  _computeTermFrequencies(tokens) {
    const tf = new Map();
    for (const t of tokens) {
      tf.set(t, (tf.get(t) || 0) + 1);
    }
    const len = tokens.length || 1;
    const normalizedTf = new Map();
    for (const [t, count] of tf.entries()) {
      normalizedTf.set(t, count / len);
    }
    return normalizedTf;
  }

  /**
   * Rebuild the global IDF table and chunk vectors
   */
  _rebuildVectors() {
    this.totalChunks = this.chunks.length;
    this.docFreq.clear();

    // 1. Calculate document frequencies
    for (const chunk of this.chunks) {
      const uniqueTokens = new Set(chunk.tokens);
      for (const t of uniqueTokens) {
        this.docFreq.set(t, (this.docFreq.get(t) || 0) + 1);
      }
    }

    // 2. Compute TF-IDF vectors and magnitude for each chunk
    for (const chunk of this.chunks) {
      const vector = {};
      let sumSq = 0;

      for (const [token, tf] of chunk.tfMap.entries()) {
        const df = this.docFreq.get(token) || 1;
        const idf = Math.log(1 + (this.totalChunks / df));
        const tfidf = tf * idf;
        vector[token] = tfidf;
        sumSq += tfidf * tfidf;
      }

      chunk.vector = vector;
      chunk.magnitude = Math.sqrt(sumSq) || 1e-9;
    }

    this._save();
  }

  /**
   * Add chunks from a document to the index
   * @param {string} sourceFile
   * @param {Array<Object>} newChunks
   * @param {Object} [metadata]
   */
  addDocumentChunks(sourceFile, newChunks, metadata = {}) {
    // Remove existing chunks for this sourceFile to allow updates
    this.removeDocument(sourceFile);

    this.documents.set(sourceFile, {
      sourceFile,
      chunkCount: newChunks.length,
      indexedAt: new Date().toISOString(),
      ...metadata
    });

    for (const c of newChunks) {
      const tokens = this._tokenize(c.text);
      const tfMap = this._computeTermFrequencies(tokens);
      this.chunks.push({
        id: c.id,
        text: c.text,
        sourceFile: c.sourceFile || sourceFile,
        chunkIndex: c.chunkIndex,
        totalChunks: c.totalChunks,
        tokens,
        tfMap
      });
    }

    this._rebuildVectors();
  }

  /**
   * Remove a document and its chunks
   */
  removeDocument(sourceFile) {
    this.documents.delete(sourceFile);
    this.chunks = this.chunks.filter(c => c.sourceFile !== sourceFile);
    this._rebuildVectors();
  }

  /**
   * Query the index using Cosine Similarity over TF-IDF vectors
   * @param {string} queryText
   * @param {number} [topK=3]
   * @returns {Array<{text: string, filename: string, score: number, chunkIndex: number}>}
   */
  search(queryText, topK = 3) {
    if (this.chunks.length === 0) return [];

    const queryTokens = this._tokenize(queryText);
    if (queryTokens.length === 0) return [];

    const queryTf = this._computeTermFrequencies(queryTokens);
    const queryVector = {};
    let querySumSq = 0;

    for (const [token, tf] of queryTf.entries()) {
      const df = this.docFreq.get(token) || 1;
      const idf = Math.log(1 + (this.totalChunks / df));
      const val = tf * idf;
      queryVector[token] = val;
      querySumSq += val * val;
    }

    const queryMagnitude = Math.sqrt(querySumSq) || 1e-9;
    const scored = [];

    for (const chunk of this.chunks) {
      let dotProduct = 0;
      for (const [token, qVal] of Object.entries(queryVector)) {
        if (chunk.vector && chunk.vector[token]) {
          dotProduct += qVal * chunk.vector[token];
        }
      }

      const cosineSim = dotProduct / (queryMagnitude * chunk.magnitude);
      if (cosineSim > 0.01) {
        scored.push({
          id: chunk.id,
          text: chunk.text,
          filename: chunk.sourceFile,
          chunkIndex: chunk.chunkIndex,
          totalChunks: chunk.totalChunks,
          score: cosineSim
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  listDocuments() {
    return Array.from(this.documents.values());
  }

  clear() {
    this.documents.clear();
    this.chunks = [];
    this.docFreq.clear();
    this.totalChunks = 0;
    this._save();
  }

  _save() {
    try {
      const serialized = {
        documents: Array.from(this.documents.entries()),
        chunks: this.chunks.map(c => ({
          id: c.id,
          text: c.text,
          sourceFile: c.sourceFile,
          chunkIndex: c.chunkIndex,
          totalChunks: c.totalChunks,
          tokens: c.tokens,
          vector: c.vector,
          magnitude: c.magnitude
        }))
      };
      fs.writeFileSync(this.indexPath, JSON.stringify(serialized, null, 2), 'utf8');
    } catch {
      // ignore save error
    }
  }

  _load() {
    try {
      if (fs.existsSync(this.indexPath)) {
        const raw = fs.readFileSync(this.indexPath, 'utf8');
        const data = JSON.parse(raw);
        if (data.documents) {
          this.documents = new Map(data.documents);
        }
        if (Array.isArray(data.chunks)) {
          this.chunks = data.chunks.map(c => ({
            ...c,
            tfMap: this._computeTermFrequencies(c.tokens || [])
          }));
          this.totalChunks = this.chunks.length;
          // Rebuild docFreq
          for (const chunk of this.chunks) {
            const unique = new Set(chunk.tokens || []);
            for (const t of unique) {
              this.docFreq.set(t, (this.docFreq.get(t) || 0) + 1);
            }
          }
        }
      }
    } catch {
      // initialize empty
    }
  }
}

export default VectorIndex;
