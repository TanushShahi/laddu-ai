/**
 * Master Voice Controller for LADDU
 * Coordinates the full voice pipeline with Speaker Recognition:
 * Microphone -> Wake Word -> STT -> Speaker Verification -> Intent -> AI Brain -> TTS -> Speaker
 */
import { WakeWordDetector } from './wakeword/WakeWordDetector.js';
import { SpeechSynthesizer } from './text_to_speech/SpeechSynthesizer.js';
import { SpeechRecognizer } from './speech_to_text/SpeechRecognizer.js';
import { VoiceprintMatcher } from './biometrics/VoiceprintMatcher.js';

export class VoiceController {
  constructor(options = {}) {
    this.aiBrain = options.aiBrain;
    this.intentDispatcher = options.intentDispatcher || null;
    this.wakeWordDetector = new WakeWordDetector(options.wakeWordOptions);
    this.synthesizer = new SpeechSynthesizer(options.synthesizerOptions);
    this.recognizer = new SpeechRecognizer(options.recognizerOptions);
    this.voiceprintMatcher = options.voiceprintMatcher || new VoiceprintMatcher(options.biometricsOptions);
    this.state = 'IDLE'; // IDLE, LISTENING, THINKING, SPEAKING
    this.onStateChange = options.onStateChange || (() => {});
    this.onSpeechOutput = options.onSpeechOutput || (() => {});
  }

  setState(newState) {
    this.state = newState;
    this.onStateChange(newState);
  }

  /**
   * Handle incoming speech transcript with optional speaker acoustic features
   * @param {string|Object} speechInput
   * @param {Object} [options]
   */
  async handleSpeech(speechInput, options = {}) {
    const rawTranscript = typeof speechInput === 'object' ? speechInput.text || speechInput.transcript : speechInput;
    const audioFeatures = typeof speechInput === 'object' ? speechInput.features : options.features;

    const speech = this.recognizer.processSpeechEvent(rawTranscript);
    if (!speech.text) return null;

    // Speaker Biometrics Verification
    const speakerVerification = this.voiceprintMatcher.verifySpeaker(audioFeatures);

    // Check if user is interrupting LADDU while speaking
    if (this.state === 'SPEAKING') {
      this.synthesizer.stop();
      this.setState('LISTENING');
    }

    // Wake word check
    const wakeResult = this.wakeWordDetector.detect(speech.text);

    // Direct actionable command check (e.g. "open instagram", "call papa", "dial 987...", "what is ...")
    const isDirectAction = /^(?:open|launch|start|go\s+to|navigate\s+to|visit|call|phone|dial|ring|calculate|what\s+is|who\s+is|how\s+to|search|play|set|save|show|weather|turn|enable|disable|stop)\b/i.test(speech.text.trim());

    // If not triggered and not already in forced execution mode and not a direct action, ignore
    if (!wakeResult.isTriggered && !options.forceExecution && !isDirectAction) {
      return { handled: false, reason: 'wake_word_not_detected', speaker: speakerVerification.speaker };
    }

    // If wake word was detected with NO trailing command ("Hey Laddu") -> Acknowledge with personalized greeting
    if (wakeResult.wasWakeOnly) {
      this.setState('SPEAKING');
      const speakerName = speakerVerification.isVerified ? speakerVerification.speaker.name : 'there';
      const ack = `Yes, ${speakerName}? How may I assist you today?`;
      const speechPayload = this.synthesizer.getClientSpeechPayload(ack);
      this.onSpeechOutput(speechPayload);

      if (options.useSystemSpeech) {
        await this.synthesizer.speakSystem(ack);
      }
      this.setState('LISTENING');
      return {
        handled: true,
        prompt: ack,
        isWakeAck: true,
        speaker: speakerVerification.speaker,
        isVerified: speakerVerification.isVerified
      };
    }

    let command = wakeResult.command;
    if (!command) {
      // Strip leading wake word prefix if present (e.g. "Hey Laddu call papa" -> "call papa")
      command = speech.text.replace(/^(?:hey\s+)?(?:laddu|jarvis)[,\s]*/i, '').trim() || speech.text;
    }

    // Execute command through IntentDispatcher or AI Brain
    this.setState('THINKING');
    let brainResult;
    try {
      if (this.intentDispatcher) {
        brainResult = await this.intentDispatcher.dispatch(command, {
          speaker: speakerVerification.speaker,
          isVerified: speakerVerification.isVerified,
          features: audioFeatures,
          onStateChange: (subState) => this.setState(subState)
        });
      } else {
        brainResult = await this.aiBrain.process(command, {
          speaker: speakerVerification.speaker,
          isVerified: speakerVerification.isVerified,
          audioFeatures,
          onStateChange: (subState) => this.setState(subState)
        });
      }
    } catch (err) {
      brainResult = {
        content: `I encountered an unexpected issue processing your command: ${err.message}`
      };
    }

    // Synthesize and speak the answer with role-adaptive voice modulation
    this.setState('SPEAKING');
    const roleVoiceSettings = brainResult.role?.voiceSettings || {};
    const speechPayload = this.synthesizer.getClientSpeechPayload(brainResult.content, {
      rate: roleVoiceSettings.rate,
      pitch: roleVoiceSettings.pitch,
      telUri: brainResult.telUri,
      waUri: brainResult.waUri,
      phoneLinkUri: brainResult.phoneLinkUri,
      url: brainResult.url,
      action: brainResult.action
    });
    this.onSpeechOutput(speechPayload);

    if (options.useSystemSpeech) {
      await this.synthesizer.speakSystem(brainResult.content);
    }

    this.setState(this.wakeWordDetector.isConversing() ? 'LISTENING' : 'IDLE');

    return {
      handled: true,
      command,
      response: brainResult.content,
      action: brainResult.action,
      contact: brainResult.contact,
      phoneNumber: brainResult.phoneNumber,
      telUri: brainResult.telUri,
      waUri: brainResult.waUri,
      phoneLinkUri: brainResult.phoneLinkUri,
      url: brainResult.url,
      speechPayload,
      role: brainResult.role,
      speaker: speakerVerification.speaker,
      isVerified: speakerVerification.isVerified,
      confidence: speakerVerification.confidence
    };
  }

  interrupt() {
    this.synthesizer.stop();
    this.setState('IDLE');
  }
}

export default VoiceController;
