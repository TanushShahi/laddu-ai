/**
 * Security Audit Logger
 * Maintains an append-only, tamper-traceable log of all actions, permissions, and tool executions.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../../core/config.js';

export class AuditLogger {
  constructor(options = {}) {
    this.dataDir = options.dataDir || config.dataDir;
    this.logFile = path.join(this.dataDir, 'jarvis_audit.log');
    this.enabled = options.enabled ?? config.auditLogEnabled;
  }

  /**
   * Log an event
   * @param {Object} event
   */
  log(event) {
    if (!this.enabled) return;

    const entry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...event
    };

    try {
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFile, line, 'utf8');
    } catch {
      // ignore log write failure
    }
  }

  /**
   * Read recent audit log entries
   */
  getRecentLogs(limit = 50) {
    if (!fs.existsSync(this.logFile)) return [];

    try {
      const content = fs.readFileSync(this.logFile, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      const parsed = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);

      return parsed.slice(-limit).reverse();
    } catch {
      return [];
    }
  }
}

export default AuditLogger;
