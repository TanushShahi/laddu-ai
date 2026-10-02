/**
 * Speech Recognition Pipeline
 * Normalizes speech input, handles language selection, and translates audio events into text intents.
 */
export class SpeechRecognizer {
  constructor(options = {}) {
    this.language = options.language || 'en-US';
    this.supportedLanguages = [
      'en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT',
      'hi-IN', 'ja-JP', 'zh-CN', 'pt-BR', 'ru-RU'
    ];
  }

  setLanguage(lang) {
    if (this.supportedLanguages.includes(lang)) {
      this.language = lang;
      return true;
    }
    return false;
  }

  /**
   * Cleans and normalizes incoming speech transcript with universal phrase deduplication
   */
  normalizeTranscript(transcript) {
    if (!transcript || typeof transcript !== 'string') return '';
    let str = transcript.trim().replace(/\s+/g, ' ');
    for (let len = 15; len >= 1; len--) {
      const pattern = new RegExp('(\\b(?:\\S+\\s+){' + (len - 1) + '}\\S+)(?:\\s+\\1\\b)+', 'gi');
      str = str.replace(pattern, '$1');
    }
    let words = str.split(/\s+/);
    for (let chunkSize = Math.floor(words.length / 2); chunkSize >= 1; chunkSize--) {
      let i = 0;
      while (i + chunkSize * 2 <= words.length) {
        const c1 = words.slice(i, i + chunkSize).join(' ').toLowerCase();
        const c2 = words.slice(i + chunkSize, i + chunkSize * 2).join(' ').toLowerCase();
        if (c1 === c2) {
          words.splice(i + chunkSize, chunkSize);
        } else {
          i++;
        }
      }
    }
    return words.join(' ').trim();
  }

  /**
   * Process raw speech events from client or microphone stream
   */
  processSpeechEvent(event) {
    const raw = typeof event === 'string' ? event : event?.transcript || '';
    const text = this.normalizeTranscript(raw);
    const confidence = event?.confidence ?? 1.0;
    const isFinal = event?.isFinal ?? true;

    return {
      text,
      confidence,
      isFinal,
      language: this.language,
      timestamp: new Date().toISOString()
    };
  }
}

export default SpeechRecognizer;
