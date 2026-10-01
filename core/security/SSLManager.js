/**
 * SSL/TLS Certificate Manager for LADDU Assistant
 * Automatically provisions, stores, and loads PKCS#12 (.pfx) certificates for Secure Context HTTPS.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { config } from '../config.js';

export class SSLManager {
  constructor(options = {}) {
    this.certsDir = options.certsDir || path.resolve(config.dataDir, 'certs');
    this.pfxPath = path.join(this.certsDir, 'laddu.pfx');
    this.crtPath = path.join(this.certsDir, 'laddu.crt');
    this.passphrase = options.passphrase || process.env.SSL_PASSPHRASE || 'laddu-ssl-secure';
  }

  /**
   * Ensure valid SSL certificates exist, generating them via PowerShell if missing.
   * @returns {{ pfx: Buffer, passphrase: string, isAvailable: boolean }}
   */
  getCredentials() {
    if (!fs.existsSync(this.pfxPath)) {
      this.generateSelfSignedCert();
    }

    if (fs.existsSync(this.pfxPath)) {
      try {
        const pfxBuffer = fs.readFileSync(this.pfxPath);
        return {
          pfx: pfxBuffer,
          passphrase: this.passphrase,
          isAvailable: true,
          pfxPath: this.pfxPath,
          crtPath: this.crtPath
        };
      } catch (err) {
        console.warn('[SSLManager] Failed to read PFX certificate:', err.message);
      }
    }

    return { isAvailable: false };
  }

  /**
   * Execute scripts/generate-cert.ps1 to generate a self-signed certificate with SAN.
   */
  generateSelfSignedCert() {
    try {
      if (!fs.existsSync(this.certsDir)) {
        fs.mkdirSync(this.certsDir, { recursive: true });
      }

      const scriptPath = path.resolve(process.cwd(), 'scripts', 'generate-cert.ps1');
      if (!fs.existsSync(scriptPath)) {
        console.warn('[SSLManager] Certificate generation script not found:', scriptPath);
        return false;
      }

      console.log('[SSLManager] Generating local SSL/TLS certificate for HTTPS...');
      const proc = spawnSync('powershell', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', scriptPath,
        '-OutputDir', path.relative(process.cwd(), this.certsDir),
        '-Password', this.passphrase
      ], {
        encoding: 'utf8',
        timeout: 25000
      });

      if (proc.status === 0 && fs.existsSync(this.pfxPath)) {
        console.log('[SSLManager] Local HTTPS certificate generated successfully.');
        return true;
      } else {
        console.warn('[SSLManager] Certificate generation returned code:', proc.status, proc.stderr || proc.stdout);
        return false;
      }
    } catch (err) {
      console.warn('[SSLManager] Error generating SSL certificate:', err.message);
      return false;
    }
  }
}

export const sslManager = new SSLManager();
export default sslManager;
