/**
 * User Settings Manager
 * Persists runtime settings (API keys, provider selection, voice options) to disk.
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

export class UserSettings {
  constructor(options = {}) {
    this.dataDir = options.dataDir || config.dataDir;
    this.filePath = path.join(this.dataDir, 'settings.json');
    this.settings = this._load();
    if (this.settings.geminiApiKey) {
      config.gemini.apiKey = this.settings.geminiApiKey;
    }
    if (this.settings.aiProvider) {
      config.aiProvider = this.settings.aiProvider;
    }
    if (this.settings.geminiModel) {
      config.gemini.model = this.settings.geminiModel;
    }
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[UserSettings] Load warning:', err.message);
    }
    return {
      aiProvider: config.aiProvider || 'offline',
      geminiApiKey: config.gemini?.apiKey || '',
      geminiModel: config.gemini?.model || 'gemini-2.5-flash',
      openaiApiKey: config.openai?.apiKey || '',
      voiceRate: config.voice?.rate || 1.0,
      voicePitch: config.voice?.pitch || 1.0,
      alwaysListen: false
    };
  }

  get() {
    return { ...this.settings, geminiApiKeyMasked: this.settings.geminiApiKey ? '••••••••' + this.settings.geminiApiKey.slice(-4) : '' };
  }

  getRaw() {
    return this.settings;
  }

  save(newSettings = {}) {
    // If incoming key is masked or unchanged, keep existing
    if (newSettings.geminiApiKey && newSettings.geminiApiKey.startsWith('••••')) {
      delete newSettings.geminiApiKey;
    }

    this.settings = { ...this.settings, ...newSettings };

    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), 'utf8');
    } catch (err) {
      console.warn('[UserSettings] Save warning:', err.message);
    }

    // Apply to live config
    if (this.settings.geminiApiKey) {
      config.gemini.apiKey = this.settings.geminiApiKey;
    }
    if (this.settings.aiProvider) {
      config.aiProvider = this.settings.aiProvider;
    }

    return this.get();
  }
}

export default UserSettings;
