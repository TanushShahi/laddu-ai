/**
 * Encryption Service for Sensitive Memory & Data Protection
 * Uses AES-256-GCM with unique initialization vectors (IV) and authentication tags.
 */
import crypto from 'node:crypto';
import { config } from '../config.js';

export class EncryptionService {
  constructor(secretHexKey = config.encryptionKey) {
    // Ensure 32-byte key (256-bit)
    if (!secretHexKey || typeof secretHexKey !== 'string') {
      this.key = crypto.createHash('sha256').update('jarvis-default-fallback-key').digest();
    } else {
      this.key = crypto.createHash('sha256').update(secretHexKey).digest();
    }
    this.algorithm = 'aes-256-gcm';
  }

  /**
   * Encrypt a string value
   * @param {string} plainText
   * @returns {{ cipherText: string, iv: string, tag: string }}
   */
  encrypt(plainText) {
    if (typeof plainText !== 'string') {
      plainText = JSON.stringify(plainText);
    }
    const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag().toString('hex');

    return {
      cipherText: encrypted,
      iv: iv.toString('hex'),
      tag
    };
  }

  /**
   * Decrypt an encrypted value
   * @param {string} cipherText
   * @param {string} ivHex
   * @param {string} tagHex
   * @returns {string}
   */
  decrypt(cipherText, ivHex, tagHex) {
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(cipherText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

export default EncryptionService;
