/**
 * Granular Permission Manager
 * Enforces zero-trust authorization before any tool or system action is permitted.
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../../core/config.js';

export class PermissionManager {
  constructor(options = {}) {
    this.dataDir = options.dataDir || config.dataDir;
    this.storePath = path.join(this.dataDir, 'permissions.json');
    this.permissions = this._getDefaultPermissions();
    this.sessionGrants = new Set(); // Stores ALLOW_ONCE grants for current session

    this._load();
  }

  _getDefaultPermissions() {
    return {
      'filesystem.read': { status: 'ALLOW', description: 'Read local files, documents, and directories' },
      'filesystem.write': { status: 'ASK', description: 'Create, modify, or rename local files' },
      'filesystem.delete': { status: 'ASK', description: 'Permanently delete files or directories' },
      'terminal.exec': { status: 'ASK', description: 'Execute approved system or shell commands' },
      'system.apps': { status: 'ALLOW', description: 'Launch authorized applications (VS Code, Chrome, etc.)' },
      'network.research': { status: 'ALLOW', description: 'Query public knowledge bases and perform web searches' },
      'hardware.mic': { status: 'ALLOW', description: 'Access microphone for speech recognition' },
      'hardware.camera': { status: 'DENY', description: 'Access camera for visual analysis' },
      'system.diagnostics': { status: 'ALLOW', description: 'Inspect CPU, memory, battery, and disk status' }
    };
  }

  _load() {
    try {
      if (fs.existsSync(this.storePath)) {
        const raw = fs.readFileSync(this.storePath, 'utf8');
        const saved = JSON.parse(raw);
        this.permissions = { ...this._getDefaultPermissions(), ...saved };
      }
    } catch {
      // use defaults
    }
  }

  _save() {
    try {
      fs.writeFileSync(this.storePath, JSON.stringify(this.permissions, null, 2), 'utf8');
    } catch {
      // ignore write error
    }
  }

  /**
   * Check whether an action has required permission
   * @param {string} permissionKey
   * @returns {{ granted: boolean, status: string, reason?: string }}
   */
  check(permissionKey) {
    // If strict permissions are disabled globally
    if (!config.strictPermissions) {
      return { granted: true, status: 'ALLOW' };
    }

    // Check one-time session grant
    if (this.sessionGrants.has(permissionKey)) {
      this.sessionGrants.delete(permissionKey); // Consume one-time grant
      return { granted: true, status: 'ALLOW_ONCE' };
    }

    const perm = this.permissions[permissionKey];
    if (!perm) {
      return { granted: false, status: 'UNKNOWN', reason: `Unknown permission: ${permissionKey}` };
    }

    if (perm.status === 'ALLOW') {
      return { granted: true, status: 'ALLOW' };
    }

    if (perm.status === 'DENY') {
      return { granted: false, status: 'DENY', reason: `Permission denied by user policy for: ${permissionKey}` };
    }

    // Status is 'ASK'
    return {
      granted: false,
      status: 'REQUIRES_PROMPT',
      permissionKey,
      description: perm.description,
      reason: `Action requires user authorization: "${perm.description}"`
    };
  }

  /**
   * Grant permission
   * @param {string} permissionKey
   * @param {'ALLOW'|'ALLOW_ONCE'|'DENY'} type
   */
  grant(permissionKey, type = 'ALLOW') {
    if (type === 'ALLOW_ONCE') {
      this.sessionGrants.add(permissionKey);
      return { success: true, permissionKey, status: 'ALLOW_ONCE' };
    }

    if (this.permissions[permissionKey]) {
      this.permissions[permissionKey].status = type;
      this._save();
      return { success: true, permissionKey, status: type };
    }

    return { success: false, reason: 'Unknown permission key' };
  }

  /**
   * Revoke a permission back to DENY or ASK
   */
  revoke(permissionKey, newStatus = 'DENY') {
    return this.grant(permissionKey, newStatus);
  }

  /**
   * Return formatted permissions for the Dashboard
   */
  getDashboard() {
    return Object.entries(this.permissions).map(([key, info]) => ({
      key,
      status: info.status,
      description: info.description
    }));
  }
}

export default PermissionManager;
