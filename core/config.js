/**
 * Core Configuration Loader for LADDU Assistant
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

// Load .env if present
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

function resolveDataDir() {
  const dir = process.env.DATA_DIR || './data';
  const resolved = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }
  return resolved;
}

function getOrGenerateEncryptionKey(dataDir) {
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.trim().length >= 32) {
    return process.env.ENCRYPTION_KEY.trim();
  }
  const keyFile = path.join(dataDir, '.secret_key');
  if (fs.existsSync(keyFile)) {
    return fs.readFileSync(keyFile, 'utf8').trim();
  }
  const generated = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(keyFile, generated, { mode: 0o600 });
  } catch {
    fs.writeFileSync(keyFile, generated);
  }
  return generated;
}

const dataDirectory = resolveDataDir();
const encryptionKey = getOrGenerateEncryptionKey(dataDirectory);

export const config = {
  assistantName: process.env.ASSISTANT_NAME || 'LADDU',
  port: parseInt(process.env.PORT || '3000', 10),
  httpsPort: parseInt(process.env.HTTPS_PORT || '3443', 10),
  sslEnabled: process.env.SSL_ENABLED !== 'false',
  host: process.env.HOST || '0.0.0.0',
  wakeWord: process.env.WAKE_WORD || 'Hey Laddu',
  dataDir: dataDirectory,
  encryptionKey: encryptionKey,

  // AI Provider Settings
  aiProvider: process.env.AI_PROVIDER || 'offline',
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3'
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
  },

  // Voice Settings
  voice: {
    rate: parseFloat(process.env.VOICE_RATE || '1.0'),
    pitch: parseFloat(process.env.VOICE_PITCH || '1.0'),
    voiceName: process.env.VOICE_NAME || '',
    systemSpeechEnabled: process.env.VOICE_SYSTEM_SPEECH_ENABLED !== 'false'
  },

  // Security & Execution
  strictPermissions: process.env.STRICT_PERMISSIONS_ENABLED !== 'false',
  auditLogEnabled: process.env.AUDIT_LOG_ENABLED !== 'false',
  maxExecutionTimeoutMs: parseInt(process.env.MAX_EXECUTION_TIMEOUT_MS || '30000', 10)
};

export default config;
