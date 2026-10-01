/**
 * Phase 2 Tests: Voice Activation, Wake Word Detection, Speech Recognition, and Speech Synthesis
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { WakeWordDetector } from '../voice/wakeword/WakeWordDetector.js';
import { SpeechSynthesizer } from '../voice/text_to_speech/SpeechSynthesizer.js';
import { SpeechRecognizer } from '../voice/speech_to_text/SpeechRecognizer.js';
import { VoiceController } from '../voice/VoiceController.js';
import { AIBrain } from '../core/brain/AIBrain.js';

test('WakeWordDetector: triggers on wake phrases and strips trigger words', () => {
  const detector = new WakeWordDetector({ wakeWord: 'Hey Jarvis' });

  // Full command with wake word
  const res1 = detector.detect('Hey Jarvis, calculate 50 * 2');
  assert.equal(res1.isTriggered, true);
  assert.equal(res1.command, 'calculate 50 * 2');
  assert.equal(res1.wasWakeOnly, false);

  // Wake only
  const detector2 = new WakeWordDetector({ wakeWord: 'Hey Jarvis' });
  const res2 = detector2.detect('Hey Jarvis');
  assert.equal(res2.isTriggered, true);
  assert.equal(res2.wasWakeOnly, true);
  assert.equal(res2.command, '');

  // Conversational follow-up without wake word
  const res3 = detector2.detect('Now multiply that by 3');
  assert.equal(res3.isTriggered, true);
  assert.equal(res3.command, 'Now multiply that by 3');

  // Stop conversation
  const res4 = detector2.detect('stop listening');
  assert.equal(res4.isTriggered, false);
  assert.equal(detector2.isConversing(), false);

  // Unrelated sentence on a fresh detector without wake word
  const freshDetector = new WakeWordDetector({ wakeWord: 'Hey Jarvis' });
  const res5 = freshDetector.detect('The quick brown fox jumps');
  assert.equal(res5.isTriggered, false);
});

test('SpeechSynthesizer: sanitizes markdown and generates client payloads', () => {
  const synth = new SpeechSynthesizer({ rate: 1.1, pitch: 1.0 });

  const rawMarkdown = 'Hello! Check this link: [Google](https://google.com) and `inline_code`. ```python\nprint("code")\n``` Done.';
  const sanitized = synth.sanitizeForSpeech(rawMarkdown);

  assert.ok(!sanitized.includes('https://'));
  assert.ok(!sanitized.includes('```'));
  assert.ok(sanitized.includes('Google'));
  assert.ok(sanitized.includes('inline_code'));

  const payload = synth.getClientSpeechPayload(rawMarkdown);
  assert.equal(payload.rate, 1.1);
  assert.equal(payload.pitch, 1.0);
  assert.equal(payload.text, sanitized);
});

test('SpeechRecognizer: normalizes text and accepts supported languages', () => {
  const recognizer = new SpeechRecognizer();
  assert.equal(recognizer.language, 'en-US');

  assert.equal(recognizer.setLanguage('de-DE'), true);
  assert.equal(recognizer.language, 'de-DE');
  assert.equal(recognizer.setLanguage('invalid-lang'), false);

  const event = recognizer.processSpeechEvent({ transcript: '   hello    jarvis   ', confidence: 0.95 });
  assert.equal(event.text, 'hello jarvis');
  assert.equal(event.confidence, 0.95);
});

test('VoiceController: handles wake word, routes to brain, and produces speech', async () => {
  const brain = new AIBrain({ providerType: 'offline' });
  await brain.initialize();

  const states = [];
  let emittedPayload = null;

  const controller = new VoiceController({
    aiBrain: brain,
    onStateChange: (s) => states.push(s),
    onSpeechOutput: (p) => { emittedPayload = p; }
  });

  const result = await controller.handleSpeech('Hey Jarvis, who are you?');

  assert.equal(result.handled, true);
  assert.equal(result.command, 'who are you?');
  assert.ok(result.response.includes('LADDU') || result.response.includes('JARVIS'));
  assert.ok(emittedPayload !== null);
  assert.ok(emittedPayload.text.includes('LADDU') || emittedPayload.text.includes('JARVIS'));
  assert.ok(states.includes('THINKING'));
  assert.ok(states.includes('SPEAKING'));
});
