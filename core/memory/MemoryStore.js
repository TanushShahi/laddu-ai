/**
 * SQLite & Local Memory Store
 * Manages persistent long-term memories with encryption for sensitive entries.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { EncryptionService } from './EncryptionService.js';

export class MemoryStore {
  constructor(options = {}) {
    this.dataDir = options.dataDir || config.dataDir;
    this.encryption = new EncryptionService(options.encryptionKey || config.encryptionKey);
    this.dbPath = path.join(this.dataDir, 'jarvis_memory.db');
    this.jsonFallbackPath = path.join(this.dataDir, 'jarvis_memory.json');
    this.sqliteDb = null;
    this.useSqlite = false;

    this._initDatabase();
  }

  _initDatabase() {
    try {
      // Attempt to load node:sqlite
      const sqliteModule = awaitImportSqlite();
      if (sqliteModule && sqliteModule.DatabaseSync) {
        this.sqliteDb = new sqliteModule.DatabaseSync(this.dbPath);
        this.sqliteDb.exec(`
          CREATE TABLE IF NOT EXISTS memories (
            id TEXT PRIMARY KEY,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            category TEXT NOT NULL,
            is_sensitive INTEGER NOT NULL DEFAULT 0,
            iv TEXT,
            tag TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_memories_key ON memories(key);
          CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
        `);
        this.useSqlite = true;
        return;
      }
    } catch {
      // Fallback to JSON store
    }

    this.useSqlite = false;
    if (!fs.existsSync(this.jsonFallbackPath)) {
      fs.writeFileSync(this.jsonFallbackPath, JSON.stringify([]));
    }
  }

  _loadJson() {
    try {
      if (!fs.existsSync(this.jsonFallbackPath)) return [];
      return JSON.parse(fs.readFileSync(this.jsonFallbackPath, 'utf8'));
    } catch {
      return [];
    }
  }

  _saveJson(data) {
    fs.writeFileSync(this.jsonFallbackPath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Add a new memory item
   */
  add({ key, value, category = 'general', isSensitive = false }) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    let storedValue = String(value);
    let iv = null;
    let tag = null;

    if (isSensitive) {
      const encrypted = this.encryption.encrypt(storedValue);
      storedValue = encrypted.cipherText;
      iv = encrypted.iv;
      tag = encrypted.tag;
    }

    if (this.useSqlite) {
      const stmt = this.sqliteDb.prepare(`
        INSERT INTO memories (id, key, value, category, is_sensitive, iv, tag, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, key, storedValue, category, isSensitive ? 1 : 0, iv, tag, now, now);
    } else {
      const list = this._loadJson();
      list.push({
        id,
        key,
        value: storedValue,
        category,
        is_sensitive: isSensitive ? 1 : 0,
        iv,
        tag,
        created_at: now,
        updated_at: now
      });
      this._saveJson(list);
    }

    return { id, key, value, category, isSensitive, createdAt: now };
  }

  /**
   * Get a decrypted memory by ID
   */
  get(id) {
    let row = null;
    if (this.useSqlite) {
      const stmt = this.sqliteDb.prepare('SELECT * FROM memories WHERE id = ?');
      row = stmt.get(id);
    } else {
      row = this._loadJson().find(m => m.id === id);
    }
    if (!row) return null;
    return this._formatRow(row);
  }

  /**
   * List all memories (decrypted)
   */
  list(category = null) {
    let rows = [];
    if (this.useSqlite) {
      if (category) {
        const stmt = this.sqliteDb.prepare('SELECT * FROM memories WHERE category = ? ORDER BY created_at DESC');
        rows = stmt.all(category);
      } else {
        const stmt = this.sqliteDb.prepare('SELECT * FROM memories ORDER BY created_at DESC');
        rows = stmt.all();
      }
    } else {
      rows = this._loadJson();
      if (category) {
        rows = rows.filter(r => r.category === category);
      }
    }

    return rows.map(r => this._formatRow(r));
  }

  /**
   * Update an existing memory
   */
  update(id, { key, value, category, isSensitive }) {
    const existing = this.get(id);
    if (!existing) return null;

    const newKey = key !== undefined ? key : existing.key;
    const newValue = value !== undefined ? String(value) : existing.value;
    const newCategory = category !== undefined ? category : existing.category;
    const newSensitive = isSensitive !== undefined ? Boolean(isSensitive) : existing.isSensitive;
    const now = new Date().toISOString();

    let storedValue = newValue;
    let iv = null;
    let tag = null;

    if (newSensitive) {
      const encrypted = this.encryption.encrypt(storedValue);
      storedValue = encrypted.cipherText;
      iv = encrypted.iv;
      tag = encrypted.tag;
    }

    if (this.useSqlite) {
      const stmt = this.sqliteDb.prepare(`
        UPDATE memories
        SET key = ?, value = ?, category = ?, is_sensitive = ?, iv = ?, tag = ?, updated_at = ?
        WHERE id = ?
      `);
      stmt.run(newKey, storedValue, newCategory, newSensitive ? 1 : 0, iv, tag, now, id);
    } else {
      const list = this._loadJson();
      const idx = list.findIndex(m => m.id === id);
      if (idx !== -1) {
        list[idx] = {
          id,
          key: newKey,
          value: storedValue,
          category: newCategory,
          is_sensitive: newSensitive ? 1 : 0,
          iv,
          tag,
          created_at: list[idx].created_at,
          updated_at: now
        };
        this._saveJson(list);
      }
    }

    return { id, key: newKey, value: newValue, category: newCategory, isSensitive: newSensitive, updatedAt: now };
  }

  /**
   * Delete memory by ID
   */
  delete(id) {
    if (this.useSqlite) {
      const stmt = this.sqliteDb.prepare('DELETE FROM memories WHERE id = ?');
      stmt.run(id);
    } else {
      const list = this._loadJson().filter(m => m.id !== id);
      this._saveJson(list);
    }
    return true;
  }

  /**
   * Clear all memories
   */
  clear() {
    if (this.useSqlite) {
      this.sqliteDb.exec('DELETE FROM memories');
    } else {
      this._saveJson([]);
    }
    return true;
  }

  /**
   * Search memories by keyword
   */
  search(keyword, limit = 5) {
    const list = this.list();
    const query = keyword.toLowerCase();
    const matches = list.filter(m =>
      m.key.toLowerCase().includes(query) ||
      m.value.toLowerCase().includes(query) ||
      m.category.toLowerCase().includes(query)
    );
    return matches.slice(0, limit);
  }

  _formatRow(row) {
    let val = row.value;
    if (row.is_sensitive && row.iv && row.tag) {
      try {
        val = this.encryption.decrypt(row.value, row.iv, row.tag);
      } catch (err) {
        val = '[DECRYPTION FAILED]';
      }
    }
    return {
      id: row.id,
      key: row.key,
      value: val,
      category: row.category,
      isSensitive: Boolean(row.is_sensitive),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

function awaitImportSqlite() {
  try {
    // Dynamic require for node:sqlite
    const { createRequire } = require('node:module');
    const req = createRequire(import.meta.url);
    return req('node:sqlite');
  } catch {
    return null;
  }
}

export default MemoryStore;
