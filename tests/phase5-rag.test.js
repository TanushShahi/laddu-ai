/**
 * Phase 5 Tests: File Intelligence, Document Parsing, Chunking, Vector Index, and RAG Engine
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DocumentParser } from '../knowledge/documents/DocumentParser.js';
import { TextChunker } from '../knowledge/documents/TextChunker.js';
import { VectorIndex } from '../knowledge/vector_db/VectorIndex.js';
import { RAGEngine } from '../ai/rag/RAGEngine.js';

const testDir = path.resolve(process.cwd(), './data/test_rag');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

const sampleDocPath = path.join(testDir, 'sample_physics_notes.txt');
const sampleDocContent = `
Chapter 5: Quantum Mechanics and Wave-Particle Duality
Quantum mechanics is a fundamental theory in physics that provides a description of the physical properties of nature at the scale of atoms and subatomic particles.
It is the foundation of all quantum physics including quantum chemistry, quantum field theory, quantum technology, and quantum information science.
Classical physics, the collection of theories that existed before the advent of quantum mechanics, describes many aspects of nature at an ordinary scale, but is not sufficient for describing them at small scales.
Wave-particle duality posits that every particle or quantum entity may be described as either a particle or a wave.
`;

fs.writeFileSync(sampleDocPath, sampleDocContent, 'utf8');

test('DocumentParser: parses text and extracts metadata', async () => {
  assert.equal(DocumentParser.isSupported(sampleDocPath), true);
  assert.equal(DocumentParser.isSupported('unsupported.xyz'), false);

  const parsed = await DocumentParser.parse(sampleDocPath);
  assert.ok(parsed.text.includes('Quantum Mechanics'));
  assert.equal(parsed.metadata.filename, 'sample_physics_notes.txt');
  assert.equal(parsed.metadata.extension, '.txt');
});

test('TextChunker: splits text into overlapping chunks', () => {
  const chunks = TextChunker.chunk(sampleDocContent, {
    chunkSize: 200,
    chunkOverlap: 40,
    sourceFile: 'physics.txt'
  });

  assert.ok(chunks.length >= 2);
  assert.equal(chunks[0].sourceFile, 'physics.txt');
  assert.equal(chunks[0].chunkIndex, 0);
  assert.ok(chunks[0].text.length > 0);
  assert.equal(chunks[0].totalChunks, chunks.length);
});

test('VectorIndex: ranks documents by cosine similarity accurately', () => {
  const index = new VectorIndex({ dataDir: testDir });
  index.clear();

  const chunksDoc1 = [
    { id: '1', text: 'Quantum computers use qubits and quantum superposition.', chunkIndex: 0, totalChunks: 1, sourceFile: 'quantum.txt' }
  ];
  const chunksDoc2 = [
    { id: '2', text: 'Italian pasta recipes often feature tomato sauce, basil, and olive oil.', chunkIndex: 0, totalChunks: 1, sourceFile: 'recipes.txt' }
  ];

  index.addDocumentChunks('quantum.txt', chunksDoc1);
  index.addDocumentChunks('recipes.txt', chunksDoc2);

  // Search for quantum
  const results = index.search('qubits superposition', 2);
  assert.ok(results.length >= 1);
  assert.equal(results[0].filename, 'quantum.txt');
  assert.ok(results[0].score > 0);

  // Search for cooking
  const cookResults = index.search('pasta recipe tomato', 2);
  assert.ok(cookResults.length >= 1);
  assert.equal(cookResults[0].filename, 'recipes.txt');
  assert.ok(cookResults[0].score > 0);
});

test('RAGEngine: ingests files, lists documents, and executes grounded retrieval', async () => {
  const rag = new RAGEngine({ dataDir: testDir });
  rag.clear();

  const ingestRes = await rag.ingestFile(sampleDocPath);
  assert.equal(ingestRes.filename, 'sample_physics_notes.txt');
  assert.ok(ingestRes.chunksCount >= 1);

  const docs = rag.listDocuments();
  assert.equal(docs.length, 1);
  assert.equal(docs[0].sourceFile, 'sample_physics_notes.txt');

  const queryRes = await rag.query('explain wave particle duality in physics', 2);
  assert.ok(queryRes.length >= 1);
  assert.equal(queryRes[0].filename, 'sample_physics_notes.txt');
  assert.ok(queryRes[0].text.includes('Wave-particle duality'));
});
