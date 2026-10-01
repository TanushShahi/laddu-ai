/**
 * Contact Manager for LADDU
 * Stores and manages user contacts (family, friends, emergency) for voice calls, messaging, and automation.
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

export class ContactManager {
  constructor(options = {}) {
    this.dataDir = options.dataDir || config.dataDir;
    this.filePath = path.join(this.dataDir, 'contacts.json');
    this.contacts = [];
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.contacts = JSON.parse(raw);
      } else {
        this.contacts = this._getDefaultContacts();
        this._save();
      }
    } catch (err) {
      console.warn('[ContactManager] Error loading contacts:', err.message);
      this.contacts = this._getDefaultContacts();
    }
  }

  _save() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.contacts, null, 2), 'utf8');
    } catch (err) {
      console.warn('[ContactManager] Error saving contacts:', err.message);
    }
  }

  _getDefaultContacts() {
    return [
      { id: 'c_papa', name: 'Papa', relationship: 'father', phone: '', notes: 'Father' },
      { id: 'c_mom', name: 'Mom', relationship: 'mother', phone: '', notes: 'Mother' },
      { id: 'c_emergency', name: 'Emergency', relationship: 'emergency', phone: '112', notes: 'Emergency Services' }
    ];
  }

  list() {
    return this.contacts;
  }

  /**
   * Search for a contact by name, relation, or query string
   * @param {string} query 
   */
  find(query) {
    if (!query) return null;
    const q = query.trim().toLowerCase();

    // Relationship aliases
    const aliases = {
      'papa': ['papa', 'dad', 'father', 'daddy', 'appa'],
      'dad': ['papa', 'dad', 'father', 'daddy', 'appa'],
      'father': ['papa', 'dad', 'father', 'daddy', 'appa'],
      'mom': ['mom', 'mother', 'mummy', 'mama', 'amma'],
      'mother': ['mom', 'mother', 'mummy', 'mama', 'amma'],
      'mummy': ['mom', 'mother', 'mummy', 'mama', 'amma'],
      'brother': ['brother', 'bro', 'bhai'],
      'sister': ['sister', 'sis', 'didi'],
      'emergency': ['emergency', 'police', 'ambulance']
    };

    // Find alias family
    let matchAliases = [q];
    for (const [key, list] of Object.entries(aliases)) {
      if (list.includes(q)) {
        matchAliases = list;
        break;
      }
    }

    // Match by name or relationship or notes
    return this.contacts.find(c => {
      const cName = (c.name || '').toLowerCase();
      const cRel = (c.relationship || '').toLowerCase();
      const cNotes = (c.notes || '').toLowerCase();

      return matchAliases.some(alias => 
        cName === alias || 
        cName.includes(alias) || 
        cRel === alias || 
        cNotes.includes(alias)
      );
    }) || null;
  }

  /**
   * Add or update a contact
   */
  setContact(name, phone, relationship = '', notes = '') {
    const existingIndex = this.contacts.findIndex(c => 
      c.name.toLowerCase() === name.toLowerCase() || 
      (relationship && c.relationship.toLowerCase() === relationship.toLowerCase())
    );

    const contactObj = {
      id: existingIndex >= 0 ? this.contacts[existingIndex].id : `c_${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      relationship: relationship.trim().toLowerCase(),
      notes: notes.trim(),
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      this.contacts[existingIndex] = { ...this.contacts[existingIndex], ...contactObj };
    } else {
      this.contacts.push(contactObj);
    }

    this._save();
    return contactObj;
  }

  deleteContact(id) {
    this.contacts = this.contacts.filter(c => c.id !== id);
    this._save();
    return true;
  }
}

export default ContactManager;
