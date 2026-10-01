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
   * Cleans and normalizes incoming speech transcript
   */
  normalizeTranscript(transcript) {
    if (!transcript || typeof transcript !== 'string') return '';
    return transcript
      .trim()
      .replace(/\s+/g, ' ');
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
