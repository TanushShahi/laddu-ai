/**
 * Phase 1 Tests: AI Brain, Context Manager, Model Providers, and Offline Fallback
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ContextManager } from '../core/context/ContextManager.js';
import { OfflineLocalProvider } from '../ai/providers/OfflineLocalProvider.js';
import { ModelFactory } from '../ai/providers/ModelFactory.js';
import { AIBrain } from '../core/brain/AIBrain.js';

test('ContextManager: handles conversation history and sliding window', () => {
  const cm = new ContextManager({ assistantName: 'JARVIS', maxHistory: 3 });
  assert.equal(cm.assistantName, 'JARVIS');

  cm.addUserMessage('Message 1');
  cm.addAssistantMessage('Reply 1');
  cm.addUserMessage('Message 2');
  cm.addAssistantMessage('Reply 2');

  const history = cm.getHistory();
  assert.equal(history.length, 3, 'Should prune history to maxHistory of 3');
  assert.equal(history[0].content, 'Reply 1');
  assert.equal(history[2].content, 'Reply 2');

  const messages = cm.getMessagesForModel();
  assert.equal(messages[0].role, 'system');
  assert.ok(messages[0].content.includes('JARVIS'));
});

test('OfflineLocalProvider: handles greetings, identity, status, math, and knowledge', async () => {
  const provider = new OfflineLocalProvider();
  assert.equal(await provider.isAvailable(), true);

  // Status check
  const statusRes = await provider.generateResponse([{ role: 'user', content: 'system status' }]);
  assert.ok(statusRes.content.includes('operational'));

  // Identity check
  const idRes = await provider.generateResponse([{ role: 'user', content: 'who are you' }]);
  assert.ok(idRes.content.includes('LADDU') || idRes.content.includes('JARVIS'));

  // Math evaluation
  const mathRes = await provider.generateResponse([{ role: 'user', content: 'what is 25 * 4 + 10' }]);
  assert.equal(mathRes.content, 'Result: 110');

  // Local knowledge lookup
  const ragRes = await provider.generateResponse([{ role: 'user', content: 'explain rag' }]);
  assert.ok(ragRes.content.includes('Retrieval-Augmented Generation'));
});

test('ModelFactory: falls back to OfflineLocalProvider if remote model is unavailable', async () => {
  const active = await ModelFactory.getActiveProvider('ollama');
  assert.ok(active, 'Should return an active provider');
  // If Ollama is not running locally, it gracefully falls back to offline-local
  assert.ok(['ollama', 'offline-local'].includes(active.name));
});

test('AIBrain: processes query, records context, and returns structured result', async () => {
  const brain = new AIBrain({ providerType: 'offline' });
  await brain.initialize();

  const stateChanges = [];
  const result = await brain.process('Hello Jarvis, are you online?', {
    onStateChange: (state) => stateChanges.push(state)
  });

  assert.ok(result.content.length > 0);
  assert.ok(result.model.includes('offline'));
  assert.ok(stateChanges.includes('THINKING'));
  assert.ok(stateChanges.includes('COMPLETED'));

  const history = brain.contextManager.getHistory();
  assert.equal(history.length, 2);
  assert.equal(history[0].role, 'user');
  assert.equal(history[1].role, 'assistant');
});
