/**
 * Automation Routine Manager
 * Schedules, stores, and runs autonomous recurring background routines.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';

export class AutomationManager {
  constructor(options = {}) {
    this.dataDir = options.dataDir || config.dataDir;
    this.storePath = path.join(this.dataDir, 'automations.json');
    this.taskPlanner = options.taskPlanner;
    this.automations = [];
    this.timers = new Map();

    this._load();
    this._initDefaults();
  }

  _initDefaults() {
    if (this.automations.length === 0) {
      this.create({
        name: 'Morning System Briefing',
        schedule: 'Daily at 08:00',
        goal: 'Run system diagnostics and verify storage health',
        enabled: true
      });
      this.create({
        name: 'Workspace Cleanup Inspection',
        schedule: 'Every Friday',
        goal: 'Scan project folder for temporary artifacts',
        enabled: false
      });
    }
  }

  _load() {
    try {
      if (fs.existsSync(this.storePath)) {
        this.automations = JSON.parse(fs.readFileSync(this.storePath, 'utf8'));
      }
    } catch {
      this.automations = [];
    }
  }

  _save() {
    try {
      fs.writeFileSync(this.storePath, JSON.stringify(this.automations, null, 2), 'utf8');
    } catch {
      // ignore save error
    }
  }

  /**
   * Create an automation routine
   */
  create({ name, schedule, goal, enabled = true }) {
    const id = crypto.randomUUID();
    const entry = {
      id,
      name,
      schedule,
      goal,
      enabled: Boolean(enabled),
      lastRunAt: null,
      lastResult: null,
      createdAt: new Date().toISOString()
    };

    this.automations.push(entry);
    this._save();
    return entry;
  }

  /**
   * List all automations
   */
  list() {
    return [...this.automations];
  }

  /**
   * Update an existing automation
   */
  update(id, fields) {
    const item = this.automations.find(a => a.id === id);
    if (!item) return null;

    Object.assign(item, fields);
    this._save();
    return item;
  }

  /**
   * Pause an automation
   */
  pause(id) {
    return this.update(id, { enabled: false });
  }

  /**
   * Resume/unpause an automation
   */
  resume(id) {
    return this.update(id, { enabled: true });
  }

  /**
   * Delete an automation
   */
  delete(id) {
    const initialLen = this.automations.length;
    this.automations = this.automations.filter(a => a.id !== id);
    this._save();
    return this.automations.length < initialLen;
  }

  /**
   * Run an automation routine immediately (RUN NOW)
   */
  async runNow(id) {
    const item = this.automations.find(a => a.id === id);
    if (!item) {
      return { success: false, error: 'Automation routine not found' };
    }

    item.lastRunAt = new Date().toISOString();

    if (this.taskPlanner) {
      const planResult = await this.taskPlanner.planAndExecute(item.goal);
      item.lastResult = planResult.summary || 'Executed plan successfully.';
      this._save();
      return { success: true, item, planResult };
    }

    item.lastResult = 'Executed successfully (mock plan).';
    this._save();
    return { success: true, item };
  }
}

export default AutomationManager;
