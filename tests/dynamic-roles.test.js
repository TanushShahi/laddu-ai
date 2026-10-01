/**
 * Dynamic Adaptive Role Engine Test Suite
 * Tests conversational persona shifts between Friend, Teacher, Mentor, Assistant, and Counselor.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { DynamicRoleEngine, ROLE_PROFILES } from '../core/roles/DynamicRoleEngine.js';
import { ContextManager } from '../core/context/ContextManager.js';
import { AIBrain } from '../core/brain/AIBrain.js';

test('DynamicRoleEngine: lists all supported persona profiles with voice settings', () => {
  const engine = new DynamicRoleEngine();
  const roles = engine.listRoles();

  assert.equal(roles.length, 5);
  const ids = roles.map(r => r.id);
  assert.ok(ids.includes('friend'));
  assert.ok(ids.includes('teacher'));
  assert.ok(ids.includes('mentor'));
  assert.ok(ids.includes('assistant'));
  assert.ok(ids.includes('counselor'));

  roles.forEach(r => {
    assert.ok(r.name);
    assert.ok(r.icon);
    assert.ok(r.systemDirective);
    assert.ok(r.voiceSettings.rate);
    assert.ok(r.voiceSettings.pitch);
  });
});

test('DynamicRoleEngine: infers Teacher persona for educational and conceptual inquiries', () => {
  const engine = new DynamicRoleEngine();

  const r1 = engine.inferRoleFromNeed('Can you explain how quantum computing works?');
  assert.equal(r1.role, 'teacher');
  assert.ok(r1.confidence >= 0.80);

  const r2 = engine.inferRoleFromNeed('Teach me the difference between SQL and NoSQL');
  assert.equal(r2.role, 'teacher');

  const r3 = engine.inferRoleFromNeed('Explain like I am 5: what is general relativity?');
  assert.equal(r3.role, 'teacher');
});

test('DynamicRoleEngine: infers Mentor persona for career and strategic growth decisions', () => {
  const engine = new DynamicRoleEngine();

  const r1 = engine.inferRoleFromNeed('I need your career advice on whether to switch jobs');
  assert.equal(r1.role, 'mentor');
  assert.ok(r1.confidence >= 0.80);

  const r2 = engine.inferRoleFromNeed('Should I accept this offer or stay at my current startup?');
  assert.equal(r2.role, 'mentor');

  const r3 = engine.inferRoleFromNeed('How do I grow as a leader and make a hard life decision?');
  assert.equal(r3.role, 'mentor');
});

test('DynamicRoleEngine: infers Friend persona for casual sharing, feelings, and downtime', () => {
  const engine = new DynamicRoleEngine();

  const r1 = engine.inferRoleFromNeed('I had a rough day, just wanted to chat with you');
  assert.equal(r1.role, 'friend');

  const r2 = engine.inferRoleFromNeed('Tell me a funny story to cheer me up');
  assert.equal(r2.role, 'friend');

  const r3 = engine.inferRoleFromNeed('Hey buddy, what is up with you today?');
  assert.equal(r3.role, 'friend');
});

test('DynamicRoleEngine: infers Counselor persona for stress, overwhelm, and anxiety', () => {
  const engine = new DynamicRoleEngine();

  const r1 = engine.inferRoleFromNeed('I am feeling so overwhelmed and stressed out right now');
  assert.equal(r1.role, 'counselor');
  assert.ok(r1.confidence >= 0.85);

  const r2 = engine.inferRoleFromNeed('I have panic and anxiety, help me calm down and breathe');
  assert.equal(r2.role, 'counselor');
});

test('DynamicRoleEngine: incorporates voice acoustic features for emotional urgency', () => {
  const engine = new DynamicRoleEngine();

  // High pitch + high centroid + urgency keyword -> Counselor
  const acousticResult = engine.inferRoleFromNeed('I need help fast, worry is taking over', {
    pitch: 240,
    spectralCentroid: 2900,
    energyBands: [0.1, 0.4, 0.5]
  });
  assert.equal(acousticResult.role, 'counselor');
  assert.ok(acousticResult.reasoning.includes('acoustic'));
});

test('DynamicRoleEngine: honors manual role locking and unlocking', () => {
  const engine = new DynamicRoleEngine();

  // Lock to Mentor
  engine.setRole('mentor', true);
  assert.equal(engine.getActiveRole().id, 'mentor');
  assert.equal(engine.isLocked, true);

  // Even with an educational query, locked role persists
  const adapted = engine.adapt('Can you explain quantum physics?');
  assert.equal(adapted.profile.id, 'mentor');
  assert.equal(engine.getActiveRole().id, 'mentor');

  // Unlock and re-adapt
  engine.unlockRole();
  assert.equal(engine.isLocked, false);
  const reAdapted = engine.adapt('Can you explain quantum physics?');
  assert.equal(reAdapted.profile.id, 'teacher');
  assert.equal(engine.getActiveRole().id, 'teacher');
});

test('ContextManager: dynamically injects active persona directives into model prompt', () => {
  const cm = new ContextManager();
  cm.setRole('teacher', true);

  const messages = cm.getMessagesForModel();
  const sysMsg = messages[0].content;

  assert.ok(sysMsg.includes('MASTER TEACHER'));
  assert.ok(sysMsg.includes('building blocks'));
});

test('AIBrain: adapts role and includes role metadata in processing result', async () => {
  const brain = new AIBrain({ providerType: 'offline' });
  await brain.initialize();

  const res = await brain.process('Can you teach me how neural networks work?');
  assert.ok(res.content);
  assert.ok(res.role);
  assert.equal(res.role.id, 'teacher');
  assert.ok(res.role.voiceSettings);
  assert.equal(res.role.voiceSettings.rate, 0.95);
});
