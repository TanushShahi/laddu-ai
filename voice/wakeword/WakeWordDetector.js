/**
 * Wake Word Detection Engine for LADDU
 * Multi-accent, multi-language, phonetic-tolerant wake word detector with conversational tracking.
 */
import { config } from '../../core/config.js';

// Comprehensive phonetic dictionary across Indian, US, UK, and Australian accents
const DEFAULT_ALT_WAKE_WORDS = [
  // Primary
  'Hey Laddu', 'OK Laddu', 'Okay Laddu', 'Hello Laddu', 'Hi Laddu', 'Laddu',
  // Indian English & Hinglish variations
  'Suno Laddu', 'Sun Laddu', 'Arre Laddu', 'Namaste Laddu',
  'Hey Laddoo', 'OK Laddoo', 'Hello Laddoo', 'Laddoo', 'Suno Laddoo',
  'Hey Ladoo', 'OK Ladoo', 'Hello Ladoo', 'Ladoo', 'Suno Ladoo',
  'Hey Ladu', 'OK Ladu', 'Ladu', 'Luddu', 'Laadu', 'Laru', 'Lattu',
  // Accent mishearings (Google STT in en-US / foreign accents)
  'Hey Ladder', 'OK Ladder', 'Hello Ladder', 'Ladder',
  'Hey Lead You', 'Lead You', 'Let Do', 'Hey Let Do',
  'Hey Ludo', 'Ludo', 'Laddus',
  // Hindi Devanagari script
  'हे लड्डू', 'सुनो लड्डू', 'अरे लड्डू', 'नमस्ते लड्डू', 'लड्डू', 'लाडू',
  // Legacy Marvel JARVIS triggers
  'Hey Jarvis', 'OK Jarvis', 'Hello Jarvis', 'Hi Jarvis', 'Jarvis'
];

export class WakeWordDetector {
  constructor(options = {}) {
    this.wakeWord = options.wakeWord || config.wakeWord || 'Hey Laddu';
    this.altWakeWords = options.altWakeWords || [...DEFAULT_ALT_WAKE_WORDS];
    this.conversationTimeoutMs = options.conversationTimeoutMs || 30000;
    this.inConversation = false;
    this.lastInteractionTime = 0;
  }

  setWakeWord(word) {
    this.wakeWord = word;
    if (!this.altWakeWords.includes(word)) {
      this.altWakeWords.push(word);
    }
  }

  /**
   * Evaluates input transcript to see if wake word was invoked
   * Returns { isTriggered: boolean, command: string, wasWakeOnly: boolean }
   */
  detect(transcript) {
    if (!transcript || typeof transcript !== 'string') {
      return { isTriggered: false, command: '', wasWakeOnly: false };
    }

    const trimmed = transcript.trim();
    const now = Date.now();

    // Check if in continuous conversation mode
    if (this.inConversation && (now - this.lastInteractionTime < this.conversationTimeoutMs)) {
      // Check for explicit stop conversation commands
      if (/^(stop listening|goodbye|bye laddu|bye jarvis|that will be all|cancel|sleep|chup ho jao|band karo)$/i.test(trimmed)) {
        this.resetConversation();
        return { isTriggered: false, command: 'STOP_CONVERSATION', wasWakeOnly: false };
      }

      this.lastInteractionTime = now;
      return { isTriggered: true, command: trimmed, wasWakeOnly: false };
    }

    // Sort wake words by length descending so longer phrases match first
    const sortedTriggers = [...new Set([this.wakeWord, ...this.altWakeWords])]
      .sort((a, b) => b.length - a.length);

    for (const trigger of sortedTriggers) {
      // Escape any regex special characters
      const escaped = trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^\\b${escaped}\\b[,\\s]*`, 'i');
      if (regex.test(trimmed)) {
        const remainingCommand = trimmed.replace(regex, '').trim();
        this.inConversation = true;
        this.lastInteractionTime = now;

        return {
          isTriggered: true,
          command: remainingCommand,
          wasWakeOnly: remainingCommand.length === 0
        };
      }
    }

    // Fuzzy phonetic fallback: check if first 1-2 words sound like "laddu" or "ladder"
    const words = trimmed.split(/\s+/);
    if (words.length > 0) {
      const firstWord = words[0].toLowerCase().replace(/[^a-z]/g, '');
      const phoneticAliases = ['laddu', 'laddoo', 'ladoo', 'ladu', 'ladder', 'luddu', 'ludo', 'laadu'];
      if (phoneticAliases.includes(firstWord) || this._levenshtein(firstWord, 'laddu') <= 1) {
        const remaining = words.slice(1).join(' ').trim();
        this.inConversation = true;
        this.lastInteractionTime = now;
        return {
          isTriggered: true,
          command: remaining,
          wasWakeOnly: remaining.length === 0
        };
      }

      // Check two-word prefixes like "hey/hi/ok/suno <something-sounding-like-laddu>"
      if (words.length >= 2) {
        const prefix = words[0].toLowerCase().replace(/[^a-z]/g, '');
        const second = words[1].toLowerCase().replace(/[^a-z]/g, '');
        if (['hey', 'hi', 'hello', 'ok', 'okay', 'suno', 'arre'].includes(prefix)) {
          if (phoneticAliases.includes(second) || this._levenshtein(second, 'laddu') <= 1) {
            const remaining = words.slice(2).join(' ').trim();
            this.inConversation = true;
            this.lastInteractionTime = now;
            return {
              isTriggered: true,
              command: remaining,
              wasWakeOnly: remaining.length === 0
            };
          }
        }
      }
    }

    return { isTriggered: false, command: '', wasWakeOnly: false };
  }

  _levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  resetConversation() {
    this.inConversation = false;
    this.lastInteractionTime = 0;
  }

  isConversing() {
    if (this.inConversation && (Date.now() - this.lastInteractionTime > this.conversationTimeoutMs)) {
      this.resetConversation();
    }
    return this.inConversation;
  }
}

export default WakeWordDetector;
