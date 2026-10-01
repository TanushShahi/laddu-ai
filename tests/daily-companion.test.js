/**
 * Daily Companion & Healthy Wellness Test Suite
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { DailyCompanion } from '../core/companion/DailyCompanion.js';

test('DailyCompanion: generates morning briefing with wellness protocols', () => {
  const companion = new DailyCompanion({ assistantName: 'LADDU' });
  const briefing = companion.generateMorningBriefing({
    userName: 'Tony',
    weather: { condition: 'Clear Skies', temperature: '22°C' },
    diagnostics: { cpu: { model: 'Core i9', cores: 16 } }
  });

  assert.ok(briefing.includes('Good morning, Tony.'));
  assert.ok(briefing.includes('Clear Skies, 22°C'));
  assert.ok(briefing.includes('Wellness Protocol'));
  assert.ok(briefing.includes('metabolic telemetry'));
});

test('DailyCompanion: tracks hydration and calculates daily total', () => {
  const companion = new DailyCompanion();

  const r1 = companion.logHydration(250);
  assert.equal(r1.success, true);
  assert.equal(r1.amountMl, 250);
  assert.equal(r1.totalTodayMl, 250);

  const r2 = companion.logHydration(500);
  assert.equal(r2.amountMl, 500);
  assert.equal(r2.totalTodayMl, 750);
  assert.equal(companion.getTodayHydrationTotal(), 750);
});

test('DailyCompanion: provides ergonomic and health nudges', () => {
  const companion = new DailyCompanion();
  const nudge = companion.getHealthNudge();

  assert.ok(nudge.title);
  assert.ok(nudge.message);
  assert.ok(['POSTURE', 'HYDRATION', 'VISION', 'STRETCH'].includes(nudge.type));
  assert.equal(companion.wellnessLog.length, 1);
});

test('DailyCompanion: generates evening debrief with telemetry summary', () => {
  const companion = new DailyCompanion();
  companion.logHydration(350);

  const debrief = companion.generateEveningDebrief({ userName: 'Boss' });
  assert.ok(debrief.includes('Good evening, Boss.'));
  assert.ok(debrief.includes('350ml'));
  assert.ok(debrief.includes('sentry mode'));
});

test('DailyCompanion: handles natural language conversational intents', () => {
  const companion = new DailyCompanion();

  // Morning briefing intent
  const morning = companion.handleIntent('good morning laddu, start my day');
  assert.ok(morning);
  assert.equal(morning.type, 'MORNING_BRIEFING');
  assert.ok(morning.message.includes('Good morning'));

  // Hydration intent with custom amount
  const hydration = companion.handleIntent('I just drank 2 glasses of water');
  assert.ok(hydration);
  assert.equal(hydration.type, 'HYDRATION_LOG');
  assert.equal(hydration.result.amountMl, 500);

  // Posture / Health check intent
  const posture = companion.handleIntent('check my posture');
  assert.ok(posture);
  assert.equal(posture.type, 'HEALTH_NUDGE');

  // Evening debrief intent
  const evening = companion.handleIntent('wind down for tonight');
  assert.ok(evening);
  assert.equal(evening.type, 'EVENING_DEBRIEF');

  // Unrelated prompt should return null
  const unrelated = companion.handleIntent('calculate quantum algorithms');
  assert.equal(unrelated, null);
});
