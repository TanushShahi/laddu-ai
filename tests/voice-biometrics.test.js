/**
 * Voice Biometrics & Speaker Recognition Test Suite
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { VoiceprintMatcher } from '../voice/biometrics/VoiceprintMatcher.js';

test('VoiceprintMatcher: initializes with default profile in isolated test directory', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'laddu-voice-'));
  const matcher = new VoiceprintMatcher({ dataDir: tmpDir });

  const profiles = matcher.listProfiles();
  assert.ok(profiles.length >= 1);
  const primary = profiles.find(p => p.userId === 'user_primary');
  assert.ok(primary);
  assert.equal(primary.name, 'Boss');
  assert.equal(primary.calibrated, false);
  assert.equal(matcher.isCalibrated(), false);

  const status = matcher.getEnrollmentStatus();
  assert.equal(status.isEnrolled, false);
  assert.equal(status.needsEnrollment, true);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('VoiceprintMatcher: enrolls a new speaker and persists profile', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'laddu-voice-'));
  const matcher = new VoiceprintMatcher({ dataDir: tmpDir });

  const enrolled = matcher.enrollSpeaker('tony_stark', 'Tony Stark', {
    pitchMean: 140.5,
    centroidMean: 1720.0,
    energyBands: [0.4, 0.4, 0.2]
  });

  assert.equal(enrolled.userId, 'tony_stark');
  assert.equal(enrolled.name, 'Tony Stark');
  assert.equal(enrolled.pitchMean, 140.5);
  assert.equal(enrolled.calibrated, true);
  assert.equal(matcher.isCalibrated(), true);

  const status = matcher.getEnrollmentStatus();
  assert.equal(status.isEnrolled, true);
  assert.equal(status.needsEnrollment, false);

  // Reload new matcher from same storePath
  const reloaded = new VoiceprintMatcher({ dataDir: tmpDir });
  const fetched = reloaded.profiles.get('tony_stark');
  assert.ok(fetched);
  assert.equal(fetched.name, 'Tony Stark');
  assert.equal(reloaded.isCalibrated(), true);

  // Test resetEnrollment
  const resetStatus = reloaded.resetEnrollment();
  assert.equal(resetStatus.needsEnrollment, true);
  assert.equal(reloaded.isCalibrated(), false);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('VoiceprintMatcher: correctly verifies matching voice features and rejects deviant features', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'laddu-voice-'));
  const matcher = new VoiceprintMatcher({ dataDir: tmpDir, confidenceThreshold: 0.70 });

  matcher.enrollSpeaker('commander', 'Commander', {
    pitchMean: 135.0,
    centroidMean: 1600.0,
    energyBands: [0.35, 0.45, 0.20]
  });

  // Very close acoustic features (should pass)
  const closeMatch = matcher.verifySpeaker({
    pitch: 136.0,
    spectralCentroid: 1620.0,
    energyBands: [0.36, 0.44, 0.20]
  });
  assert.equal(closeMatch.isVerified, true);
  assert.ok(closeMatch.confidence >= 0.70);
  assert.equal(closeMatch.speaker.id, 'commander');

  // Highly deviant acoustic features (different fundamental pitch & frequency profile)
  const deviant = matcher.verifySpeaker({
    pitch: 320.0,
    spectralCentroid: 4500.0,
    energyBands: [0.05, 0.15, 0.80]
  });
  assert.equal(deviant.isVerified, false);
  assert.ok(deviant.confidence < 0.70);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('VoiceprintMatcher: deletes speaker profile and updates store', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'laddu-voice-'));
  const matcher = new VoiceprintMatcher({ dataDir: tmpDir });

  matcher.enrollSpeaker('temp_user', 'Guest', { pitchMean: 200, centroidMean: 2000 });
  assert.ok(matcher.profiles.has('temp_user'));

  const deleted = matcher.deleteProfile('temp_user');
  assert.equal(deleted, true);
  assert.ok(!matcher.profiles.has('temp_user'));

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
