/**
 * Multi-Device Compatibility, Network Pairing & PWA Test Suite
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
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

test('Cross-Device API: GET /api/network/info returns local IP addresses and device pairing URLs', async () => {
  const res = await fetch(`${baseUrl}/api/network/info`);
  assert.equal(res.status, 200);
  const data = await res.json();

  assert.ok(Array.isArray(data.localIps));
  assert.ok(data.port);
  assert.ok(Array.isArray(data.urls));
  assert.ok(data.primaryUrl);
  assert.ok(data.primaryUrl.startsWith('http://'));
});

test('Roles API: GET /api/roles lists all 5 persona roles with active role', async () => {
  const res = await fetch(`${baseUrl}/api/roles`);
  assert.equal(res.status, 200);
  const data = await res.json();

  assert.ok(data.activeRole);
  assert.ok(Array.isArray(data.roles));
  assert.equal(data.roles.length, 5);
  const ids = data.roles.map(r => r.id);
  assert.ok(ids.includes('friend'));
  assert.ok(ids.includes('teacher'));
  assert.ok(ids.includes('mentor'));
});

test('Roles API: POST /api/roles/set and /api/roles/unlock manage manual persona override', async () => {
  // Set role to Mentor
  const setRes = await fetch(`${baseUrl}/api/roles/set`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roleId: 'mentor', lock: true })
  });
  assert.equal(setRes.status, 200);
  const setData = await setRes.json();
  assert.equal(setData.success, true);
  assert.equal(setData.activeRole.id, 'mentor');
  assert.equal(setData.isLocked, true);

  // Unlock role for automatic dynamic inference
  const unlockRes = await fetch(`${baseUrl}/api/roles/unlock`, { method: 'POST' });
  assert.equal(unlockRes.status, 200);
  const unlockData = await unlockRes.json();
  assert.equal(unlockData.success, true);
  assert.equal(unlockData.isLocked, false);
});

test('PWA Delivery: GET /manifest.json returns valid web app manifest', async () => {
  const res = await fetch(`${baseUrl}/manifest.json`);
  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(data.name, 'LADDU — Universal Personal AI Assistant');
  assert.equal(data.display, 'standalone');
  assert.equal(data.start_url, '/');
  assert.ok(data.icons.length >= 1);
});

test('PWA Delivery: GET /sw.js returns Service Worker cache controller', async () => {
  const res = await fetch(`${baseUrl}/sw.js`);
  assert.equal(res.status, 200);
  const script = await res.text();

  assert.ok(script.includes('laddu-cache'));
  assert.ok(script.includes('addEventListener'));
  assert.ok(script.includes('fetch'));
});

test('Voice Induction API: GET /api/voice/status and POST /api/voice/enroll synchronize across devices', async () => {
  const statusRes = await fetch(`${baseUrl}/api/voice/status`);
  assert.equal(statusRes.status, 200);
  const statusData = await statusRes.json();
  assert.equal(statusData.success, true);
  assert.equal(typeof statusData.isEnrolled, 'boolean');
  assert.equal(typeof statusData.needsEnrollment, 'boolean');

  // Enroll primary speaker via API
  const enrollRes = await fetch(`${baseUrl}/api/voice/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'user_primary',
      name: 'Primary Operator',
      features: { pitchMean: 138.0, centroidMean: 1680.0, energyBands: [0.35, 0.45, 0.20] }
    })
  });
  assert.equal(enrollRes.status, 200);
  const enrollData = await enrollRes.json();
  assert.equal(enrollData.success, true);
  assert.equal(enrollData.profile.name, 'Primary Operator');
  assert.equal(enrollData.profile.calibrated, true);
  assert.equal(enrollData.enrollmentStatus.isEnrolled, true);
});
