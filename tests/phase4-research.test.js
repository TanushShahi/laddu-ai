/**
 * Phase 4 Tests: Web Research Agent, Multi-Source Retrieval, and Citations
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { WikipediaClient } from '../knowledge/wikipedia/WikipediaClient.js';
import { WebSearchClient } from '../knowledge/web/WebSearchClient.js';
import { ArxivClient } from '../knowledge/web/ArxivClient.js';
import { ResearchAgent } from '../knowledge/web/ResearchAgent.js';

test('WikipediaClient: searches for encyclopedia articles', async () => {
  const wiki = new WikipediaClient();
  const results = await wiki.search('Computer Science', 2);
  assert.ok(Array.isArray(results));
  if (results.length > 0) {
    assert.ok(results[0].title);
    assert.ok(results[0].url.includes('wikipedia.org'));
    assert.equal(results[0].source, 'Wikipedia');
  }
});

test('ArxivClient: formats academic search results', async () => {
  const arxiv = new ArxivClient();
  const results = await arxiv.search('neural network', 1);
  assert.ok(Array.isArray(results));
  if (results.length > 0) {
    assert.ok(results[0].title);
    assert.equal(results[0].source, 'arXiv Academic');
  }
});

test('ResearchAgent: decomposes queries and compiles structured research report', async () => {
  const agent = new ResearchAgent();

  // Test query decomposition
  const subQueries = agent.decomposeQuery('PostgreSQL database');
  assert.ok(subQueries.length >= 2);
  assert.ok(subQueries.some(q => q.includes('comparison')));

  // Test report compilation with mock sources
  const mockSources = [
    {
      source: 'Wikipedia',
      title: 'PostgreSQL',
      snippet: 'PostgreSQL is a free and open-source relational database management system.',
      url: 'https://en.wikipedia.org/wiki/PostgreSQL'
    },
    {
      source: 'Web Search',
      title: 'PostgreSQL 16 Features',
      snippet: 'PostgreSQL 16 improves performance for query execution and parallel workloads.',
      url: 'https://postgresql.org'
    }
  ];

  const analysis = agent._analyzeSources(mockSources);
  assert.equal(analysis.isMultiSource, true);
  assert.equal(analysis.hasConsensus, true);

  const report = agent._compileReport('PostgreSQL', mockSources, analysis);
  assert.ok(report.includes('# Research Report: PostgreSQL'));
  assert.ok(report.includes('## 1. Executive Summary'));
  assert.ok(report.includes('## 4. Source Citations & References'));
  assert.ok(report.includes('https://en.wikipedia.org/wiki/PostgreSQL'));
  assert.ok(report.includes('## 5. Limitations & Assumptions'));
});

test('ResearchAgent: handles offline fallback seamlessly', () => {
  const agent = new ResearchAgent();
  const fallback = agent._generateOfflineFallbackReport('Quantum Computing');
  assert.ok(fallback.report.includes('Offline Fallback'));
  assert.equal(fallback.sourceCount, 0);
});
