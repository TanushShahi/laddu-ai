/**
 * Tool Registry & Secure Execution Pipeline
 * Manages plugin discovery, permission checking, dangerous action protection, and audit logging.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PermissionManager } from '../../security/permissions/PermissionManager.js';
import { DangerousActionProtector } from '../../security/sandbox/DangerousActionProtector.js';
import { AuditLogger } from '../../security/audit/AuditLogger.js';

export class ToolRegistry {
  constructor(options = {}) {
    this.tools = new Map(); // toolName -> tool definition
    this.plugins = new Map(); // pluginName -> plugin metadata
    this.permissionManager = options.permissionManager || new PermissionManager(options);
    this.dangerousProtector = options.dangerousProtector || new DangerousActionProtector();
    this.auditLogger = options.auditLogger || new AuditLogger(options);
  }

  /**
   * Register a plugin object
   */
  registerPlugin(plugin) {
    if (!plugin || !plugin.name || !Array.isArray(plugin.tools)) {
      throw new Error('Invalid plugin format');
    }

    this.plugins.set(plugin.name, {
      name: plugin.name,
      version: plugin.version || '1.0.0',
      description: plugin.description || '',
      requiredPermission: plugin.requiredPermission || null
    });

    for (const tool of plugin.tools) {
      this.registerTool({
        ...tool,
        pluginName: plugin.name,
        requiredPermission: tool.requiredPermission || plugin.requiredPermission || null
      });
    }
  }

  /**
   * Register a single tool definition
   */
  registerTool(tool) {
    if (!tool.name || typeof tool.execute !== 'function') {
      throw new Error(`Tool must have a name and execute function: ${tool?.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Load plugins from plugins directory
   */
  async loadPluginsFromDir(pluginsDir = './plugins') {
    const resolved = path.resolve(process.cwd(), pluginsDir);
    if (!fs.existsSync(resolved)) return;

    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const indexPath = path.join(resolved, entry.name, 'index.js');
        if (fs.existsSync(indexPath)) {
          try {
            // Dynamic import plugin module
            const fileUrl = new URL(`file:///${indexPath.replace(/\\/g, '/')}`).href;
            const module = await import(fileUrl);
            const plugin = module.default || module;
            this.registerPlugin(plugin);
          } catch (err) {
            console.warn(`Failed to load plugin ${entry.name}:`, err.message);
          }
        }
      }
    }
  }

  /**
   * Execute a tool safely through the security pipeline
   * @param {string} toolName
   * @param {Object} params
   * @param {Object} [options]
   */
  async execute(toolName, params = {}, options = {}) {
    const startTime = Date.now();
    const tool = this.tools.get(toolName);

    if (!tool) {
      return {
        success: false,
        error: `Tool "${toolName}" not found.`,
        availableTools: Array.from(this.tools.keys())
      };
    }

    // 1. Permission Check
    if (tool.requiredPermission) {
      const permCheck = this.permissionManager.check(tool.requiredPermission);
      if (!permCheck.granted) {
        this.auditLogger.log({
          toolName,
          params,
          status: 'BLOCKED_PERMISSION',
          reason: permCheck.reason
        });

        return {
          success: false,
          blocked: true,
          type: 'PERMISSION_REQUIRED',
          permissionKey: tool.requiredPermission,
          reason: permCheck.reason,
          status: permCheck.status
        };
      }
    }

    // 2. Dangerous Action Blast-Radius Check
    const dangerEvaluation = this.dangerousProtector.evaluate(toolName, params);
    if (dangerEvaluation.isDangerous && !options.confirmedChallengeId) {
      this.auditLogger.log({
        toolName,
        params,
        status: 'CHALLENGED_DANGEROUS_ACTION',
        blastRadius: dangerEvaluation.challenge.blastRadius
      });

      return {
        success: false,
        blocked: true,
        type: 'CONFIRMATION_REQUIRED',
        challenge: dangerEvaluation.challenge
      };
    }

    // 3. If a challengeId was provided, verify and consume it
    if (options.confirmedChallengeId) {
      const confirmation = this.dangerousProtector.confirmChallenge(options.confirmedChallengeId);
      if (!confirmation.success) {
        return {
          success: false,
          blocked: true,
          error: `Challenge verification failed: ${confirmation.reason}`
        };
      }
    }

    // 4. Execute the tool
    try {
      const result = await tool.execute(params);
      const durationMs = Date.now() - startTime;

      this.auditLogger.log({
        toolName,
        params,
        status: 'SUCCESS',
        durationMs
      });

      return {
        success: true,
        toolName,
        result,
        durationMs
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      this.auditLogger.log({
        toolName,
        params,
        status: 'EXECUTION_ERROR',
        error: err.message,
        durationMs
      });

      return {
        success: false,
        toolName,
        error: `Execution error in ${toolName}: ${err.message}`,
        durationMs
      };
    }
  }

  listTools() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      plugin: t.pluginName,
      requiredPermission: t.requiredPermission,
      parameters: t.parameters || {}
    }));
  }

  listPlugins() {
    return Array.from(this.plugins.values());
  }
}

export default ToolRegistry;
