/**
 * Phase 3 Tests: Memory System, AES-256 Encryption, and Privacy Controls
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EncryptionService } from '../core/memory/EncryptionService.js';
import { MemoryStore } from '../core/memory/MemoryStore.js';
import { MemoryManager } from '../core/memory/MemoryManager.js';

const testDataDir = path.resolve(process.cwd(), './data/test_memory');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

test('EncryptionService: encrypts and decrypts with AES-256-GCM', () => {
  const encService = new EncryptionService('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
  const secret = 'JARVIS_ULTRA_SECRET_TOKEN_99';

  const encrypted = encService.encrypt(secret);
  assert.ok(encrypted.cipherText);
  assert.ok(encrypted.iv);
  assert.ok(encrypted.tag);
  assert.notEqual(encrypted.cipherText, secret);

  const decrypted = encService.decrypt(encrypted.cipherText, encrypted.iv, encrypted.tag);
  assert.equal(decrypted, secret);

  // Tampering check
  assert.throws(() => {
    encService.decrypt('corrupted_ciphertext', encrypted.iv, encrypted.tag);
  });
});

test('MemoryStore: handles CRUD with sensitive data encryption', () => {
  const store = new MemoryStore({ dataDir: testDataDir });
  store.clear();

  // Add normal memory
  const m1 = store.add({ key: 'user_name', value: 'Tony', category: 'personal' });
  assert.ok(m1.id);
  assert.equal(m1.value, 'Tony');

  // Add sensitive memory
  const m2 = store.add({ key: 'api_token', value: 'secret-xyz', category: 'security', isSensitive: true });
  assert.ok(m2.id);

  // Retrieve sensitive memory (should be automatically decrypted)
  const retrievedM2 = store.get(m2.id);
  assert.equal(retrievedM2.value, 'secret-xyz');
  assert.equal(retrievedM2.isSensitive, true);

  // Update
  store.update(m1.id, { value: 'Tony Stark' });
  const updatedM1 = store.get(m1.id);
  assert.equal(updatedM1.value, 'Tony Stark');

  // Search
  const searchResults = store.search('Tony');
  assert.equal(searchResults.length, 1);
  assert.equal(searchResults[0].key, 'user_name');

  // Delete
  store.delete(m1.id);
  assert.equal(store.get(m1.id), null);
});

test('MemoryManager: natural language remember and forget commands', () => {
  const manager = new MemoryManager({ dataDir: testDataDir });
  manager.clearAllMemories();

  // Remember command
  const res1 = manager.handleNaturalLanguage('Remember that my preferred language is TypeScript');
  assert.ok(res1);
  assert.equal(res1.action, 'added');
  assert.equal(res1.key, 'preferred language');
  assert.equal(res1.value, 'TypeScript');

  // Query search
  const found = manager.searchMemories('TypeScript');
  assert.equal(found.length, 1);
  assert.equal(found[0].value, 'TypeScript');

  // Forget command
  const res2 = manager.handleNaturalLanguage('Forget my preferred language');
  assert.ok(res2);
  assert.equal(res2.action, 'deleted');

  const afterDelete = manager.searchMemories('TypeScript');
  assert.equal(afterDelete.length, 0);
});
