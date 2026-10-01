/**
 * Standalone Daemon Runner for LADDU Background Voice Sentry
 * Can be run headless in the background without any browser or GUI window.
 */
import { BackgroundVoiceSentry } from './BackgroundVoiceSentry.js';
import { AIBrain } from '../../core/brain/AIBrain.js';
import { ToolRegistry } from '../../core/brain/ToolRegistry.js';
import { ComputerController } from '../../tools/system/ComputerController.js';
import { PermissionManager } from '../../security/permissions/PermissionManager.js';
import { DangerousActionProtector } from '../../security/sandbox/DangerousActionProtector.js';
import { AuditLogger } from '../../security/audit/AuditLogger.js';
import { VoiceprintMatcher } from '../biometrics/VoiceprintMatcher.js';

// Import built-in plugins for OS control
import filesystemPlugin from '../../plugins/filesystem/index.js';
import systemPlugin from '../../plugins/system/index.js';
import calcPlugin from '../../plugins/calculator/index.js';

async function main() {
  console.log('[LADDU Sentry] Initializing Always-On Background Daemon...');

  const permissionManager = new PermissionManager();
  const dangerousProtector = new DangerousActionProtector();
  const auditLogger = new AuditLogger();

  const toolRegistry = new ToolRegistry({
    permissionManager,
    dangerousProtector,
    auditLogger
  });

  toolRegistry.register(filesystemPlugin);
  toolRegistry.register(systemPlugin);
  toolRegistry.register(calcPlugin);

  const computerController = new ComputerController({ toolRegistry });
  const voiceprintMatcher = new VoiceprintMatcher();

  const aiBrain = new AIBrain();
  await aiBrain.initialize();

  const sentry = new BackgroundVoiceSentry({
    aiBrain,
    computerController,
    voiceprintMatcher
  });

  sentry.onEvent((event) => {
    console.log(`[LADDU Sentry Event] ${event.type}:`, event.command || event.status || '');
  });

  const started = sentry.start();
  if (started) {
    console.log('=======================================================');
    console.log('LADDU Background Voice Sentry is ACTIVE.');
    console.log('Microphone listening in background for: "Hey Laddu"');
    console.log('Authorized Voiceprint speaker verification: ENABLED');
    console.log('OS Execution (Apps, Files, Telemetry): READY');
    console.log('=======================================================');
  } else {
    console.error('[LADDU Sentry] Failed to start background speech listener.');
    process.exit(1);
  }

  process.on('SIGINT', () => {
    console.log('\n[LADDU Sentry] Shutting down sentry daemon...');
    sentry.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    sentry.stop();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('[LADDU Sentry Fatal Error]', err);
  process.exit(1);
});
