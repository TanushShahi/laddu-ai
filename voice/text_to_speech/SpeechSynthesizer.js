/**
 * Text-to-Speech Engine
 * Provides dual-mode speech synthesis:
 * 1. OS-Level native Windows SAPI synthesis via PowerShell (zero external dependencies)
 * 2. Client-side Web Speech configuration bridge for interactive UI/voice HUD
 */
import { spawn } from 'node:child_process';
import os from 'node:os';
import { config } from '../../core/config.js';

export class SpeechSynthesizer {
  constructor(options = {}) {
    this.rate = options.rate ?? config.voice.rate;
    this.pitch = options.pitch ?? config.voice.pitch;
    this.voiceName = options.voiceName || config.voice.voiceName;
    this.systemSpeechEnabled = options.systemSpeechEnabled ?? config.voice.systemSpeechEnabled;
    this.currentProcess = null;
    this.isSpeaking = false;
  }

  setVoiceConfig({ rate, pitch, voiceName, systemSpeechEnabled }) {
    if (rate !== undefined) this.rate = rate;
    if (pitch !== undefined) this.pitch = pitch;
    if (voiceName !== undefined) this.voiceName = voiceName;
    if (systemSpeechEnabled !== undefined) this.systemSpeechEnabled = systemSpeechEnabled;
  }

  /**
   * Stop any currently playing speech immediately (Interruption support)
   */
  stop() {
    if (this.currentProcess) {
      try {
        this.currentProcess.kill();
      } catch {
        // ignore kill error
      }
      this.currentProcess = null;
    }
    this.isSpeaking = false;
  }

  /**
   * Clean text for speech output (remove markdown links, code blocks, excessive symbols)
   */
  sanitizeForSpeech(text) {
    if (!text) return '';
    return text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/(?:^|\s)\*([^\*]+)\*(?:\s|$)/g, ' $1 ')
      .replace(/(?:^|\s)_([^_]+)_(?:\s|$)/g, ' $1 ')
      .replace(/[~#]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Speak text out loud via native Windows SAPI (System.Speech.Synthesis)
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  async speakSystem(text) {
    if (!this.systemSpeechEnabled) return false;
    if (os.platform() !== 'win32') return false;

    this.stop(); // Stop any previous utterance

    const speechText = this.sanitizeForSpeech(text);
    if (!speechText) return false;

    return new Promise((resolve) => {
      this.isSpeaking = true;
      // Convert speech rate (0.5 - 2.0) to SAPI rate (-10 to 10)
      const sapiRate = Math.round((this.rate - 1.0) * 10);
      const clampedRate = Math.max(-10, Math.min(10, sapiRate));

      const psScript = `
        Add-Type -AssemblyName System.Speech;
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
        $synth.Rate = ${clampedRate};
        ${this.voiceName ? `$synth.SelectVoice('${this.voiceName}');` : ''}
        $synth.Speak(@'
${speechText.replace(/'/g, "''")}
'@);
      `;

      const proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript]);
      this.currentProcess = proc;

      proc.on('close', () => {
        this.isSpeaking = false;
        this.currentProcess = null;
        resolve(true);
      });

      proc.on('error', () => {
        this.isSpeaking = false;
        this.currentProcess = null;
        resolve(false);
      });
    });
  }

  /**
   * Get payload configuration for browser Web Speech synthesis
   */
  getClientSpeechPayload(text, overrides = {}) {
    return {
      text: this.sanitizeForSpeech(text),
      rawText: text,
      rate: overrides.rate ?? this.rate,
      pitch: overrides.pitch ?? this.pitch,
      voiceName: overrides.voiceName || this.voiceName
    };
  }
}

export default SpeechSynthesizer;
