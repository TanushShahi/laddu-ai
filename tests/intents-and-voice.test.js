import test from 'node:test';
import assert from 'node:assert/strict';
import { IntentDispatcher } from '../core/intents/IntentDispatcher.js';
import { ContactManager } from '../core/contacts/ContactManager.js';
import { VoiceController } from '../voice/VoiceController.js';

test('IntentDispatcher: "open instagram" launches Instagram website', async () => {
  const dispatcher = new IntentDispatcher();
  const res = await dispatcher.dispatch('open instagram');
  assert.equal(res.action, 'OPEN_URL');
  assert.equal(res.url, 'https://www.instagram.com');
  assert.ok(res.content.includes('instagram') || res.content.includes('Instagram'));
});

test('IntentDispatcher: "open paint" launches native Paint', async () => {
  const dispatcher = new IntentDispatcher();
  const res = await dispatcher.dispatch('open paint');
  assert.equal(res.action, 'APP_LAUNCH');
  assert.equal(res.app, 'paint');
});

test('IntentDispatcher: "open calculator" launches Calculator', async () => {
  const dispatcher = new IntentDispatcher();
  const res = await dispatcher.dispatch('open calculator');
  assert.equal(res.action, 'APP_LAUNCH');
  assert.equal(res.app, 'calculator');
});

test('IntentDispatcher: "open canva" fallback opens Canva domain', async () => {
  const dispatcher = new IntentDispatcher();
  const res = await dispatcher.dispatch('open canva');
  assert.equal(res.action, 'OPEN_URL');
  assert.equal(res.url, 'https://www.canva.com');
});

test('IntentDispatcher: "call papa" returns complete telephony metadata', async () => {
  const contactMgr = new ContactManager();
  contactMgr.setContact('Papa', '+919876543210', 'father');
  const dispatcher = new IntentDispatcher({ contactManager: contactMgr });

  const res = await dispatcher.dispatch('call papa');
  assert.equal(res.action, 'CALL_PHONE');
  assert.equal(res.contact, 'Papa');
  assert.equal(res.phoneNumber, '+919876543210');
  assert.equal(res.telUri, 'tel:+919876543210');
  assert.equal(res.waUri, 'https://wa.me/919876543210');
  assert.equal(res.phoneLinkUri, 'ms-phone:call?number=919876543210');
});

test('IntentDispatcher: "dial 9876543210" returns complete telephony metadata', async () => {
  const dispatcher = new IntentDispatcher();
  const res = await dispatcher.dispatch('dial 9876543210');
  assert.equal(res.action, 'CALL_PHONE');
  assert.equal(res.telUri, 'tel:+919876543210');
  assert.equal(res.waUri, 'https://wa.me/919876543210');
  assert.equal(res.phoneLinkUri, 'ms-phone:call?number=919876543210');
});

test('VoiceController: handles direct action commands without wake word requirement', async () => {
  const dispatcher = new IntentDispatcher();
  const voice = new VoiceController({ intentDispatcher: dispatcher });

  // Direct open command
  const openRes = await voice.handleSpeech('open instagram');
  assert.equal(openRes.handled, true);
  assert.equal(openRes.action, 'OPEN_URL');
  assert.equal(openRes.url, 'https://www.instagram.com');

  // Direct call command
  const callRes = await voice.handleSpeech('call papa');
  assert.equal(callRes.handled, true);
  assert.equal(callRes.action, 'CALL_PHONE');
  assert.ok(callRes.telUri);
  assert.ok(callRes.waUri);

  // Wake word command
  const wakeRes = await voice.handleSpeech('Hey Laddu open youtube');
  assert.equal(wakeRes.handled, true);
  assert.equal(wakeRes.action, 'OPEN_URL');
  assert.equal(wakeRes.url, 'https://www.youtube.com');

  // WhatsApp Voice command
  const waVoiceRes = await voice.handleSpeech('open whatsapp');
  assert.equal(waVoiceRes.handled, true);
  assert.equal(waVoiceRes.action, 'OPEN_WHATSAPP');
  assert.equal(waVoiceRes.appUrl, 'whatsapp://');
  assert.equal(waVoiceRes.webUrl, 'https://web.whatsapp.com');
});

test('IntentDispatcher: "open whatsapp", "whatsapp", "launch whatsapp" triggers OPEN_WHATSAPP', async () => {
  const dispatcher = new IntentDispatcher();
  
  const res1 = await dispatcher.dispatch('open whatsapp');
  assert.equal(res1.action, 'OPEN_WHATSAPP');
  assert.equal(res1.appUrl, 'whatsapp://');
  assert.equal(res1.webUrl, 'https://web.whatsapp.com');

  const res2 = await dispatcher.dispatch('whatsapp');
  assert.equal(res2.action, 'OPEN_WHATSAPP');

  const res3 = await dispatcher.dispatch('open whats app');
  assert.equal(res3.action, 'OPEN_WHATSAPP');

  const res4 = await dispatcher.dispatch('launch whatsapp');
  assert.equal(res4.action, 'OPEN_WHATSAPP');

  const res5 = await dispatcher.dispatch('whatsapp web');
  assert.equal(res5.action, 'OPEN_WHATSAPP');
});
