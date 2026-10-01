import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import fs from 'node:fs';
import { WebSocket } from 'ws';
import { sslManager } from '../core/security/SSLManager.js';
import { app, server, httpsServer } from '../src/server.js';
import { config } from '../core/config.js';

test('SSLManager: verifies PKCS#12 certificate and private key credentials', () => {
  const creds = sslManager.getCredentials();
  assert.equal(creds.isAvailable, true, 'SSL credentials should be available');
  assert.ok(creds.pfx && Buffer.isBuffer(creds.pfx), 'pfx should be a valid Buffer');
  assert.ok(creds.pfx.length > 500, 'PFX buffer should contain certificate payload');
  assert.equal(typeof creds.passphrase, 'string', 'Passphrase should be string');
  assert.ok(fs.existsSync(creds.pfxPath), 'PFX file must exist on disk');
});

test('HTTPS Server: initializes and serves requests over secure TLS/SSL', async () => {
  assert.ok(httpsServer, 'httpsServer instance should be created when SSL is available');

  await new Promise((resolve) => {
    httpsServer.listen(0, '127.0.0.1', resolve);
  });

  const port = httpsServer.address().port;

  // Make an HTTPS request accepting self-signed certificate
  const res = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: '127.0.0.1',
      port,
      path: '/api/network/info',
      method: 'GET',
      rejectUnauthorized: false
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
      });
    });
    req.on('error', reject);
    req.end();
  });

  assert.equal(res.statusCode, 200, 'HTTPS endpoint should return 200 OK');
  assert.equal(res.data.httpsEnabled, true, 'Network info should indicate httpsEnabled: true');
  assert.ok(res.data.secureUrl.startsWith('https://'), 'Secure URL should default to secure HTTPS');
  assert.ok(res.data.httpsPort === config.httpsPort, 'httpsPort should match configuration');

  await new Promise(resolve => httpsServer.close(resolve));
});

test('HTTPS Server: accepts secure WebSocket (wss://) connections', async () => {
  await new Promise(resolve => httpsServer.listen(0, '127.0.0.1', resolve));
  const port = httpsServer.address().port;

  const wsClient = new WebSocket(`wss://127.0.0.1:${port}/ws`, {
    rejectUnauthorized: false
  });

  const connected = await new Promise((resolve, reject) => {
    wsClient.on('open', () => resolve(true));
    wsClient.on('error', reject);
    setTimeout(() => reject(new Error('WSS timeout')), 3000);
  });

  assert.equal(connected, true, 'Secure WebSocket should connect successfully over HTTPS');
  wsClient.close();
  await new Promise(resolve => httpsServer.close(resolve));
});
