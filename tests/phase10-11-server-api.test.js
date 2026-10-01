/**
 * Phase 10 & 11 Tests: Express & WebSocket Server, REST Endpoints, and Static HUD Delivery
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

test('REST API: GET /api/status returns nominal system health', async () => {
  const res = await fetch(`${baseUrl}/api/status`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.assistantName === 'LADDU' || data.assistantName === 'JARVIS');
  assert.equal(data.status, 'ONLINE');
  assert.ok(data.provider);
  assert.ok(data.systemHealth);
});

test('REST API: POST /api/chat handles user requests and generates response', async () => {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello Jarvis, are you online?' })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.content);
  assert.ok(data.content.includes('operational'));
});

test('REST API: GET /api/permissions returns permission dashboard', async () => {
  const res = await fetch(`${baseUrl}/api/permissions`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.permissions));
  assert.ok(data.permissions.some(p => p.key === 'filesystem.read'));
});

test('REST API: GET /api/diagnostics/self-check runs all system probes', async () => {
  const res = await fetch(`${baseUrl}/api/diagnostics/self-check`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.checks.length >= 5);
  assert.ok(data.checks.every(c => ['PASS', 'WARN'].includes(c.status)));
});

test('Frontend Delivery: GET / and /mobile.html return valid HUD interfaces', async () => {
  const resHome = await fetch(`${baseUrl}/`);
  assert.equal(resHome.status, 200);
  const htmlHome = await resHome.text();
  assert.ok(htmlHome.includes('L.A.D.D.U.') || htmlHome.includes('LADDU') || htmlHome.includes('J.A.R.V.I.S.'));
  assert.ok(htmlHome.includes('voiceVisualizer'));

  const resMobile = await fetch(`${baseUrl}/mobile.html`);
  assert.equal(resMobile.status, 200);
  const htmlMobile = await resMobile.text();
  assert.ok(htmlMobile.includes('MOBILE COMPANION'));
});
