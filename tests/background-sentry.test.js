/**
 * Background Voice Sentry Test Suite
 * Tests hands-free wake word detection, speaker biometric verification,
 * background computer command execution, and REST/WebSocket integration.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { BackgroundVoiceSentry } from '../voice/sentry/BackgroundVoiceSentry.js';
import { VoiceprintMatcher } from '../voice/biometrics/VoiceprintMatcher.js';
import { ComputerController } from '../tools/system/ComputerController.js';
import { ToolRegistry } from '../core/brain/ToolRegistry.js';
import { PermissionManager } from '../security/permissions/PermissionManager.js';
import filesystemPlugin from '../plugins/filesystem/index.js';
import systemPlugin from '../plugins/system/index.js';
import { app } from '../src/server.js';

let testServer;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    testServer = http.createServer(app);
    testServer.listen(0, '127.0.0.1', () => {
      const port = testServer.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => testServer.close(resolve));
});

test('BackgroundVoiceSentry: initializes in standby state with valid status', () => {
  const sentry = new BackgroundVoiceSentry();
  const status = sentry.getStatus();

  assert.equal(status.isRunning, false);
  assert.equal(status.pid, null);
  assert.equal(status.lastEvent, null);
});

test('BackgroundVoiceSentry: registers event listeners and unregisters cleanly', () => {
  const sentry = new BackgroundVoiceSentry();
  const received = [];
  const unsubscribe = sentry.onEvent((ev) => received.push(ev));

  sentry._notify({ type: 'STATUS', status: 'TEST_EVENT' });
  assert.equal(received.length, 1);
  assert.equal(received[0].type, 'STATUS');

  unsubscribe();
  sentry._notify({ type: 'STATUS', status: 'ANOTHER_EVENT' });
  assert.equal(received.length, 1); // Not called after unsubscribe
});

test('BackgroundVoiceSentry: ignores passive speech lacking wake words', async () => {
  const spoken = [];
  const events = [];
  const mockSynth = { speakSystem: async (t) => { spoken.push(t); return true; } };

  const sentry = new BackgroundVoiceSentry({
    synthesizer: mockSynth
  });
  sentry.onEvent((ev) => events.push(ev));

  await sentry.handleSpeechEvent({ text: 'just discussing something unrelated to the assistant' });

  assert.equal(spoken.length, 0);
  assert.equal(events.length, 0);
});

test('BackgroundVoiceSentry: prompts for voice induction when system is uncalibrated', async () => {
  const spoken = [];
  const events = [];
  const mockSynth = { speakSystem: async (t) => { spoken.push(t); return true; } };

  const mockMatcher = {
    isCalibrated: () => false,
    verifySpeaker: () => ({ isVerified: false })
  };

  const sentry = new BackgroundVoiceSentry({
    synthesizer: mockSynth,
    voiceprintMatcher: mockMatcher
  });
  sentry.onEvent((ev) => events.push(ev));

  await sentry.handleSpeechEvent({ text: 'Hey Laddu open calculator' });

  assert.equal(spoken.length, 1);
  assert.ok(spoken[0].includes('Voice authorization is required'));
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'NEEDS_VOICE_ENROLLMENT');
});

test('BackgroundVoiceSentry: blocks unauthorized voiceprints and speaks refusal', async () => {
  const spoken = [];
  const events = [];
  const mockSynth = { speakSystem: async (t) => { spoken.push(t); return true; } };

  // Mock VoiceprintMatcher that rejects unauthorized speakers
  const mockMatcher = {
    isCalibrated: () => true,
    verifySpeaker: () => ({
      isVerified: false,
      confidence: 0.22,
      speaker: { name: 'Unknown Stranger' }
    })
  };

  const sentry = new BackgroundVoiceSentry({
    synthesizer: mockSynth,
    voiceprintMatcher: mockMatcher
  });
  sentry.onEvent((ev) => events.push(ev));

  await sentry.handleSpeechEvent({ text: 'Hey Laddu open calculator' });

  assert.equal(spoken.length, 1);
  assert.ok(spoken[0].includes('do not recognize this voice authorization'));
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'UNAUTHORIZED_TRIGGER');
});

test('BackgroundVoiceSentry: acknowledges authorized wake-only phrases', async () => {
  const spoken = [];
  const events = [];
  const mockSynth = { speakSystem: async (t) => { spoken.push(t); return true; } };

  const mockMatcher = {
    verifySpeaker: () => ({
      isVerified: true,
      confidence: 0.94,
      speaker: { userId: 'user_primary', name: 'Tony Stark' }
    })
  };

  const sentry = new BackgroundVoiceSentry({
    synthesizer: mockSynth,
    voiceprintMatcher: mockMatcher
  });
  sentry.onEvent((ev) => events.push(ev));

  await sentry.handleSpeechEvent({ text: 'Hey Laddu' });

  assert.equal(spoken.length, 1);
  assert.ok(spoken[0].includes('Yes, Tony Stark?'));
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'WAKE_ACK');
});

test('BackgroundVoiceSentry: executes OS commands hands-free via ComputerController', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'laddu-sentry-os-'));
  const testSubfolder = path.join(tmpDir, 'SentryCreatedDir');

  const pm = new PermissionManager({ dataDir: tmpDir });
  pm.grant('filesystem.write', 'ALLOW');

  const registry = new ToolRegistry({ permissionManager: pm });
  registry.registerPlugin(filesystemPlugin);

  const computerController = new ComputerController({ toolRegistry: registry });

  const spoken = [];
  const events = [];
  const mockSynth = { speakSystem: async (t) => { spoken.push(t); return true; } };

  const mockMatcher = {
    verifySpeaker: () => ({
      isVerified: true,
      confidence: 0.95,
      speaker: { userId: 'user_primary', name: 'Commander' }
    })
  };

  const sentry = new BackgroundVoiceSentry({
    synthesizer: mockSynth,
    voiceprintMatcher: mockMatcher,
    computerController
  });
  sentry.onEvent((ev) => events.push(ev));

  // Issue voice command to create a folder
  await sentry.handleSpeechEvent({ text: `Hey Laddu create folder ${testSubfolder}` });

  assert.ok(fs.existsSync(testSubfolder));
  assert.ok(spoken.length >= 1);
  assert.ok(events.some(e => e.type === 'COMMAND_COMPLETED'));

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('BackgroundVoiceSentry: routes complex knowledge questions to AI brain', async () => {
  const spoken = [];
  const events = [];
  const mockSynth = { speakSystem: async (t) => { spoken.push(t); return true; } };

  const mockMatcher = {
    verifySpeaker: () => ({
      isVerified: true,
      confidence: 0.96,
      speaker: { userId: 'user_primary', name: 'Boss' }
    })
  };

  const mockBrain = {
    process: async (prompt, opts) => ({
      content: `The speed of light in vacuum is approximately 299,792,458 meters per second, ${opts.speaker.name}.`,
      role: { name: 'Teacher', icon: '🎓' }
    })
  };

  const sentry = new BackgroundVoiceSentry({
    synthesizer: mockSynth,
    voiceprintMatcher: mockMatcher,
    aiBrain: mockBrain
  });
  sentry.onEvent((ev) => events.push(ev));

  await sentry.handleSpeechEvent({ text: 'Hey Laddu what is the speed of light?' });

  assert.ok(spoken.length >= 1);
  assert.ok(spoken[0].includes('299,792,458'));
  assert.ok(events.some(e => e.type === 'COMMAND_COMPLETED'));
});

test('REST API: GET /api/sentry/status returns current sentry telemetry', async () => {
  const res = await fetch(`${baseUrl}/api/sentry/status`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.sentry);
  assert.equal(typeof data.sentry.isRunning, 'boolean');
});

test('REST API: POST /api/sentry/toggle, /start, and /stop manage sentry lifecycle', async () => {
  // Check stop
  const resStop = await fetch(`${baseUrl}/api/sentry/stop`, { method: 'POST' });
  assert.equal(resStop.status, 200);
  const dataStop = await resStop.json();
  assert.equal(dataStop.success, true);
  assert.equal(dataStop.sentry.isRunning, false);

  // Check toggle with explicit enabled: false
  const resToggle = await fetch(`${baseUrl}/api/sentry/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled: false })
  });
  assert.equal(resToggle.status, 200);
  const dataToggle = await resToggle.json();
  assert.equal(dataToggle.success, true);
  assert.equal(dataToggle.sentry.isRunning, false);
});

test('REST API: GET /api/diagnostics/self-check includes Background Voice Sentry check', async () => {
  const res = await fetch(`${baseUrl}/api/diagnostics/self-check`);
  assert.equal(res.status, 200);
  const data = await res.json();
  const sentryCheck = data.checks.find(c => c.name.includes('Background Voice Sentry'));
  assert.ok(sentryCheck);
  assert.equal(sentryCheck.status, 'PASS');
});
