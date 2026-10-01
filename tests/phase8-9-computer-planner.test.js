/**
 * Phase 8 & 9 Tests: Computer Controller, Task Planner, and Automation Manager
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PermissionManager } from '../security/permissions/PermissionManager.js';
import { ToolRegistry } from '../core/brain/ToolRegistry.js';
import { ComputerController } from '../tools/system/ComputerController.js';
import { TaskPlanner } from '../core/planner/TaskPlanner.js';
import { AutomationManager } from '../core/planner/AutomationManager.js';
import filesystemPlugin from '../plugins/filesystem/index.js';
import systemPlugin from '../plugins/system/index.js';

const testDir = path.resolve(process.cwd(), './data/test_planner');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

test('ComputerController: executes folder creation and diagnostics commands', async () => {
  const pm = new PermissionManager({ dataDir: testDir });
  pm.grant('filesystem.write', 'ALLOW');
  pm.grant('system.diagnostics', 'ALLOW');

  const registry = new ToolRegistry({ permissionManager: pm });
  registry.registerPlugin(systemPlugin);
  registry.registerPlugin(filesystemPlugin);

  const controller = new ComputerController({ toolRegistry: registry });

  // 1. Create folder
  const folderRes = await controller.handleCommand('create folder data/test_planner/NewProjectFolder');
  assert.ok(folderRes);
  assert.equal(folderRes.success, true);
  assert.ok(fs.existsSync(path.resolve(process.cwd(), 'data/test_planner/NewProjectFolder')));

  // 2. System diagnostics
  const diagRes = await controller.handleCommand('system diagnostics');
  assert.ok(diagRes);
  assert.equal(diagRes.success, true);
  assert.ok(diagRes.result.systemHealth);
});

test('TaskPlanner: executes PLAN -> EXECUTE -> VERIFY -> REPORT lifecycle', async () => {
  const pm = new PermissionManager({ dataDir: testDir });
  pm.grant('filesystem.read', 'ALLOW');
  pm.grant('filesystem.write', 'ALLOW');

  const registry = new ToolRegistry({ permissionManager: pm });
  registry.registerPlugin(filesystemPlugin);

  const planner = new TaskPlanner({ toolRegistry: registry });
  const progressEvents = [];

  const result = await planner.planAndExecute('Organize my folder data/test_planner', {
    onProgress: (p) => progressEvents.push(p.stage)
  });

  assert.equal(result.stage, 'COMPLETED');
  assert.equal(result.isVerified, true);
  assert.ok(result.summary.includes('Task Report'));
  assert.ok(progressEvents.includes('PLAN'));
  assert.ok(progressEvents.includes('EXECUTE'));
  assert.ok(progressEvents.includes('VERIFY'));
  assert.ok(progressEvents.includes('REPORT'));
});

test('AutomationManager: manages CRUD and executes RUN NOW routines', async () => {
  const manager = new AutomationManager({ dataDir: testDir });

  const auto = manager.create({
    name: 'Evening Cleanup',
    schedule: 'Daily at 18:00',
    goal: 'Check system health',
    enabled: true
  });

  assert.ok(auto.id);
  assert.equal(auto.name, 'Evening Cleanup');

  // Pause
  manager.pause(auto.id);
  assert.equal(manager.list().find(a => a.id === auto.id).enabled, false);

  // Resume
  manager.resume(auto.id);
  assert.equal(manager.list().find(a => a.id === auto.id).enabled, true);

  // Run Now
  const runRes = await manager.runNow(auto.id);
  assert.equal(runRes.success, true);
  assert.ok(runRes.item.lastRunAt);

  // Delete
  const deleted = manager.delete(auto.id);
  assert.equal(deleted, true);
  assert.equal(manager.list().some(a => a.id === auto.id), false);
});
