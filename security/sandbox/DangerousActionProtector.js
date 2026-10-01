/**
 * Dangerous Action Protection & Blast-Radius Inspector
 * Prevents unauthorized or silent destruction of user files, system processes, or sensitive settings.
 */
import crypto from 'node:crypto';

export class DangerousActionProtector {
  constructor() {
    this.pendingChallenges = new Map(); // challengeId -> challenge details
    this.challengeTimeoutMs = 60000; // 1 minute to confirm
  }

  /**
   * Evaluates a requested action and parameters for danger
   * @param {string} toolName
   * @param {Object} params
   * @returns {{ isDangerous: boolean, challenge?: Object }}
   */
  evaluate(toolName, params = {}) {
    const serialized = JSON.stringify(params).toLowerCase();

    // 1. Bulk file deletion check
    if (toolName.includes('filesystem') && (params.action === 'delete' || params.action === 'remove')) {
      const target = params.target || params.path || '';
      const isRecursive = Boolean(params.recursive);
      const isWildcard = target.includes('*') || target.includes('?');

      if (isRecursive || isWildcard || Array.isArray(params.files)) {
        const fileCount = Array.isArray(params.files) ? params.files.length : (isWildcard ? 10 : 1);
        return this._createChallenge(
          `Permanent deletion of ${fileCount > 1 ? `${fileCount} files/folders` : `target: "${target}"`}.`,
          fileCount,
          { toolName, params }
        );
      }
    }

    // 2. Destructive command check
    const dangerousCommands = [
      'format', 'diskpart', 'rmdir', 'del /f', 'rm -rf', 'drop database',
      'drop table', 'shutdown', 'taskkill /f', 'mkfs', 'dd if='
    ];

    for (const cmd of dangerousCommands) {
      if (serialized.includes(cmd)) {
        return this._createChallenge(
          `Execution of potentially destructive system command containing "${cmd}".`,
          10,
          { toolName, params }
        );
      }
    }

    // 3. Modifying system security / credentials
    if (/password|credential|reg add|reg delete|firewall/i.test(serialized)) {
      return this._createChallenge(
        `Modification of security or system credential settings.`,
        5,
        { toolName, params }
      );
    }

    return { isDangerous: false };
  }

  _createChallenge(message, blastRadius, context) {
    const challengeId = crypto.randomUUID();
    const challenge = {
      challengeId,
      message,
      blastRadius,
      context,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.challengeTimeoutMs
    };

    this.pendingChallenges.set(challengeId, challenge);

    return {
      isDangerous: true,
      challenge
    };
  }

  /**
   * Confirm a pending dangerous action challenge
   */
  confirmChallenge(challengeId) {
    const challenge = this.pendingChallenges.get(challengeId);
    if (!challenge) {
      return { success: false, reason: 'Challenge not found or already consumed' };
    }

    if (Date.now() > challenge.expiresAt) {
      this.pendingChallenges.delete(challengeId);
      return { success: false, reason: 'Challenge has expired' };
    }

    this.pendingChallenges.delete(challengeId);
    return { success: true, context: challenge.context };
  }

  /**
   * Cancel/reject a pending challenge
   */
  cancelChallenge(challengeId) {
    if (this.pendingChallenges.has(challengeId)) {
      this.pendingChallenges.delete(challengeId);
      return { success: true, message: 'Dangerous action cancelled by user' };
    }
    return { success: false, reason: 'Challenge not found' };
  }

  getPendingChallenges() {
    // Purge expired
    const now = Date.now();
    for (const [id, c] of this.pendingChallenges.entries()) {
      if (now > c.expiresAt) {
        this.pendingChallenges.delete(id);
      }
    }
    return Array.from(this.pendingChallenges.values());
  }
}

export default DangerousActionProtector;
