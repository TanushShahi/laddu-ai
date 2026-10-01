/**
 * Voiceprint Matcher & Speaker Recognition Engine
 * Analyzes acoustic spectral properties (fundamental pitch, spectral centroid, energy distribution)
 * to verify and identify the authorized speaker by their voice.
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../../core/config.js';

export class VoiceprintMatcher {
  constructor(options = {}) {
    this.dataDir = options.dataDir || config.dataDir;
    this.storePath = path.join(this.dataDir, 'voiceprints.json');
    this.confidenceThreshold = options.confidenceThreshold || 0.68;
    this.profiles = new Map(); // userId -> voiceprint profile

    this._load();
    this._initDefaultIfEmpty();
  }

  _initDefaultIfEmpty() {
    if (this.profiles.size === 0) {
      // Create an uncalibrated default primary user profile placeholder
      this.enrollSpeaker('user_primary', 'Boss', {
        pitchMean: 135.0, // typical conversational fundamental frequency (Hz)
        centroidMean: 1650.0, // typical spectral centroid (Hz)
        energyBands: [0.35, 0.45, 0.20], // low, mid, high relative energy
        calibrated: false
      });
    }
  }

  _load() {
    try {
      if (fs.existsSync(this.storePath)) {
        const raw = fs.readFileSync(this.storePath, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          data.forEach(p => this.profiles.set(p.userId, p));
        }
      }
    } catch {
      this.profiles.clear();
    }
  }

  _save() {
    try {
      const arr = Array.from(this.profiles.values());
      fs.writeFileSync(this.storePath, JSON.stringify(arr, null, 2), 'utf8');
    } catch {
      // ignore write error
    }
  }

  /**
   * Check if any profile has completed voice calibration/recording
   * @returns {boolean}
   */
  isCalibrated() {
    for (const profile of this.profiles.values()) {
      if (profile.calibrated === true) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get primary operator profile
   */
  getPrimarySpeaker() {
    return this.profiles.get('user_primary') || Array.from(this.profiles.values())[0] || null;
  }

  /**
   * Get overall enrollment and calibration telemetry
   */
  getEnrollmentStatus() {
    const primary = this.getPrimarySpeaker();
    const calibrated = this.isCalibrated();
    return {
      isEnrolled: calibrated,
      needsEnrollment: !calibrated,
      primarySpeaker: primary ? {
        userId: primary.userId,
        name: primary.name,
        calibrated: Boolean(primary.calibrated),
        sampleCount: primary.sampleCount,
        enrolledAt: primary.enrolledAt
      } : null,
      profilesCount: this.profiles.size
    };
  }

  /**
   * Reset enrollment to uncalibrated factory state
   */
  resetEnrollment() {
    this.profiles.clear();
    this._initDefaultIfEmpty();
    this._save();
    return this.getEnrollmentStatus();
  }

  /**
   * Enroll or update a speaker's voiceprint profile
   * @param {string} userId
   * @param {string} name
   * @param {Object} features - { pitchMean, centroidMean, energyBands, calibrated }
   */
  enrollSpeaker(userId, name, features = {}) {
    const isExplicitlyUncalibrated = features.calibrated === false;
    const profile = {
      userId,
      name: name || 'Authorized User',
      pitchMean: parseFloat(features.pitchMean || 130),
      centroidMean: parseFloat(features.centroidMean || 1600),
      energyBands: Array.isArray(features.energyBands) ? features.energyBands : [0.33, 0.33, 0.33],
      sampleCount: (this.profiles.get(userId)?.sampleCount || 0) + 1,
      calibrated: !isExplicitlyUncalibrated,
      enrolledAt: new Date().toISOString()
    };

    this.profiles.set(userId, profile);
    this._save();
    return profile;
  }

  /**
   * Compare incoming audio spectral features against enrolled speaker profiles
   * @param {Object} inputFeatures - { pitch, spectralCentroid, energyBands }
   * @returns {{ isVerified: boolean, confidence: number, speaker: Object }}
   */
  verifySpeaker(inputFeatures) {
    if (!inputFeatures || this.profiles.size === 0) {
      // If no features passed, check calibration
      const defaultUser = this.getPrimarySpeaker();
      const isCalibrated = this.isCalibrated();
      return {
        isVerified: isCalibrated,
        confidence: isCalibrated ? 0.85 : 0,
        speaker: defaultUser ? { id: defaultUser.userId, name: defaultUser.name } : { id: 'unknown', name: 'Unknown Speaker' },
        note: isCalibrated ? 'Default voice profile matched' : 'Voice induction required'
      };
    }

    const inputPitch = parseFloat(inputFeatures.pitch || inputFeatures.pitchMean || 135);
    const inputCentroid = parseFloat(inputFeatures.spectralCentroid || inputFeatures.centroidMean || 1650);
    const inputBands = Array.isArray(inputFeatures.energyBands) ? inputFeatures.energyBands : [0.35, 0.45, 0.20];

    let bestScore = -1;
    let matchedProfile = null;

    for (const profile of this.profiles.values()) {
      // 1. Pitch similarity (exponential decay on percentage deviation)
      const pitchDiff = Math.abs(inputPitch - profile.pitchMean);
      const pitchScore = Math.max(0, 1 - (pitchDiff / Math.max(1, profile.pitchMean * 0.45)));

      // 2. Centroid similarity
      const centroidDiff = Math.abs(inputCentroid - profile.centroidMean);
      const centroidScore = Math.max(0, 1 - (centroidDiff / Math.max(1, profile.centroidMean * 0.5)));

      // 3. Energy band vector cosine similarity
      let dot = 0, magA = 0, magB = 0;
      for (let i = 0; i < 3; i++) {
        const a = inputBands[i] || 0;
        const b = profile.energyBands[i] || 0;
        dot += a * b;
        magA += a * a;
        magB += b * b;
      }
      const bandScore = dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);

      // Weighted composite similarity score
      const compositeScore = (pitchScore * 0.40) + (centroidScore * 0.30) + (bandScore * 0.30);

      if (compositeScore > bestScore) {
        bestScore = compositeScore;
        matchedProfile = profile;
      }
    }

    const roundedConfidence = Math.round(bestScore * 100) / 100;
    const isVerified = roundedConfidence >= this.confidenceThreshold;

    return {
      isVerified,
      confidence: roundedConfidence,
      speaker: matchedProfile ? { id: matchedProfile.userId, name: matchedProfile.name } : { id: 'unknown', name: 'Unknown Speaker' },
      threshold: this.confidenceThreshold
    };
  }

  listProfiles() {
    return Array.from(this.profiles.values());
  }

  deleteProfile(userId) {
    const deleted = this.profiles.delete(userId);
    this._save();
    return deleted;
  }
}

export default VoiceprintMatcher;
