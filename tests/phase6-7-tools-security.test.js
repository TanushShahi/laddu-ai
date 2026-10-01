/**
 * Phase 6 & 7 Tests: Tool Registry, Plugins, Permissions, Dangerous Action Protection, and Audit Logging
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PermissionManager } from '../security/permissions/PermissionManager.js';
import { DangerousActionProtector } from '../security/sandbox/DangerousActionProtector.js';
import { AuditLogger } from '../security/audit/AuditLogger.js';
import { ToolRegistry } from '../core/brain/ToolRegistry.js';
import calcPlugin from '../plugins/calculator/index.js';
import systemPlugin from '../plugins/system/index.js';

const testDir = path.resolve(process.cwd(), './data/test_security');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

test('PermissionManager: checks, grants ALLOW_ONCE, and updates permissions', () => {
  const pm = new PermissionManager({ dataDir: testDir });

  // Default checks
  const readCheck = pm.check('filesystem.read');
  assert.equal(readCheck.granted, true);

  const deleteCheck = pm.check('filesystem.delete');
  assert.equal(deleteCheck.granted, false);
  assert.equal(deleteCheck.status, 'REQUIRES_PROMPT');

  // One-time grant
  pm.grant('filesystem.delete', 'ALLOW_ONCE');
  const oneTimeCheck = pm.check('filesystem.delete');
  assert.equal(oneTimeCheck.granted, true);
  assert.equal(oneTimeCheck.status, 'ALLOW_ONCE');

  // Subsequent check reverts to ASK
  const nextCheck = pm.check('filesystem.delete');
  assert.equal(nextCheck.granted, false);

  // Deny check
  pm.grant('filesystem.read', 'DENY');
  const deniedCheck = pm.check('filesystem.read');
  assert.equal(deniedCheck.granted, false);
  assert.equal(deniedCheck.status, 'DENY');
});

test('DangerousActionProtector: intercepts destructive actions and manages challenges', () => {
  const protector = new DangerousActionProtector();

  // Safe action
  const safeEval = protector.evaluate('calculator', { expression: '1+1' });
  assert.equal(safeEval.isDangerous, false);

  // Destructive command
  const dangerEval = protector.evaluate('terminal', { command: 'del /f /s C:\\Windows' });
  assert.equal(dangerEval.isDangerous, true);
  assert.ok(dangerEval.challenge.challengeId);
  assert.ok(dangerEval.challenge.message.includes('destructive'));

  // Confirm challenge
  const confRes = protector.confirmChallenge(dangerEval.challenge.challengeId);
  assert.equal(confRes.success, true);

  // Cannot confirm twice
  const secondConf = protector.confirmChallenge(dangerEval.challenge.challengeId);
  assert.equal(secondConf.success, false);
});

test('ToolRegistry: executes plugins with full security and audit pipeline', async () => {
  const pm = new PermissionManager({ dataDir: testDir });
  pm.grant('filesystem.read', 'ALLOW');
  pm.grant('system.diagnostics', 'ALLOW');

  const logger = new AuditLogger({ dataDir: testDir });
  const registry = new ToolRegistry({
    permissionManager: pm,
    auditLogger: logger
  });

  registry.registerPlugin(calcPlugin);
  registry.registerPlugin(systemPlugin);

  // 1. Execute calculator tool
  const calcRes = await registry.execute('calculate', { expression: '12 * 12 + 10' });
  assert.equal(calcRes.success, true);
  assert.equal(calcRes.result.result, 154);

  // 2. Execute system diagnostics
  const diagRes = await registry.execute('get_system_diagnostics', {});
  assert.equal(diagRes.success, true);
  assert.ok(diagRes.result.platform);
  assert.ok(diagRes.result.memory);

  // 3. Test permission blocked execution
  pm.grant('system.diagnostics', 'DENY');
  const blockedRes = await registry.execute('get_system_diagnostics', {});
  assert.equal(blockedRes.success, false);
  assert.equal(blockedRes.type, 'PERMISSION_REQUIRED');

  // 4. Verify audit log recorded events
  const logs = logger.getRecentLogs(5);
  assert.ok(logs.length >= 2);
  assert.ok(logs.some(l => l.toolName === 'calculate'));
});
