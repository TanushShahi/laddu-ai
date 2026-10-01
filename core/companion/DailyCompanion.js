/**
 * Daily Companion & Healthy Wellness Engine
 * Inspired by Marvel's JARVIS: loyal, witty, caring, articulate, and proactive.
 * Provides daily briefings, hydration reminders, posture check-ins, and engaging conversation.
 */
export class DailyCompanion {
  constructor(options = {}) {
    this.assistantName = options.assistantName || 'LADDU';
    this.hydrationLog = [];
    this.wellnessLog = [];
    this.lastBreakCheck = Date.now();
  }

  /**
   * Generate a JARVIS-style morning briefing
   * @param {Object} context - { userName, weather, tasks, diagnostics }
   */
  generateMorningBriefing(context = {}) {
    const user = context.userName || 'Sir';
    const weather = context.weather ? `${context.weather.condition}, ${context.weather.temperature}` : 'fair conditions';
    const cpu = context.diagnostics?.cpu?.model ? `Host hardware is humming smoothly on ${context.diagnostics.cpu.cores} cores.` : 'All subsystems are nominal.';

    const motivationalQuotes = [
      "The best way to predict the future is to invent it.",
      "Small disciplines repeated with consistency every day lead to great achievements.",
      "Efficiency is doing things right; effectiveness is doing the right things.",
      "Remember that even Tony Stark took time to refactor his code."
    ];
    const quote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];

    return `Good morning, ${user}. I have completed initial system diagnostics — ${cpu}\n\n` +
      `Outside, conditions report ${weather}.\n\n` +
      `**Today's Wellness Protocol**:\n` +
      `- Begin with a tall glass of water to kickstart metabolic telemetry.\n` +
      `- Maintain regular 20-20-20 ocular rest intervals.\n\n` +
      `*"${quote}"*\n\n` +
      `All protocols are at your command. How shall we begin?`;
  }

  /**
   * Log water intake
   */
  logHydration(amountMl = 250) {
    const entry = {
      timestamp: new Date().toISOString(),
      amountMl
    };
    this.hydrationLog.push(entry);
    const totalToday = this.getTodayHydrationTotal();

    return {
      success: true,
      amountMl,
      totalTodayMl: totalToday,
      message: `Hydration recorded: +${amountMl}ml. Total intake today: ${totalToday}ml. Excellent discipline.`
    };
  }

  getTodayHydrationTotal() {
    const today = new Date().toISOString().split('T')[0];
    return this.hydrationLog
      .filter(h => h.timestamp.startsWith(today))
      .reduce((sum, h) => sum + h.amountMl, 0);
  }

  /**
   * Generate a quick healthy check-in (Posture, Eye rest, Stretch)
   */
  getHealthNudge() {
    const nudges = [
      {
        type: 'POSTURE',
        title: 'Ergonomic Alignment',
        message: 'Pardon the intrusion, but a gentle reminder to roll your shoulders back and align your spine. Good posture optimizes cognitive blood flow.'
      },
      {
        type: 'HYDRATION',
        title: 'Hydration Status',
        message: 'Hydration levels may be dropping. Might I suggest a fresh glass of water to keep your neural processing sharp?'
      },
      {
        type: 'VISION',
        title: '20-20-20 Ocular Protocol',
        message: 'Take 20 seconds to gaze at an object 20 feet away. Your optic sensors will thank you.'
      },
      {
        type: 'STRETCH',
        title: 'Physical Recalibration',
        message: 'You have been stationary for an extended period. Stand, stretch, and take three deep breaths.'
      }
    ];

    const pick = nudges[Math.floor(Math.random() * nudges.length)];
    this.wellnessLog.push({ ...pick, timestamp: new Date().toISOString() });
    return pick;
  }

  /**
   * Generate an evening debrief
   */
  generateEveningDebrief(context = {}) {
    const user = context.userName || 'Sir';
    const totalHydration = this.getTodayHydrationTotal();

    return `Good evening, ${user}. Another productive rotation completed.\n\n` +
      `**Daily Telemetry Summary**:\n` +
      `- Hydration intake: **${totalHydration}ml** recorded.\n` +
      `- Core systems remained stable and responsive.\n\n` +
      `I recommend wrapping up active cognitive tasks, dimming ambient displays, and allowing adequate time for rest. I shall maintain sentry mode and stand by for your return.`;
  }

  /**
   * Detect and handle health/daily companion intents
   */
  handleIntent(text) {
    const query = text.toLowerCase().trim();

    if (/morning briefing|start my day|good morning/i.test(query)) {
      return {
        type: 'MORNING_BRIEFING',
        message: this.generateMorningBriefing()
      };
    }

    if (/(?:drank|log|had|drink)\b.*water|water\s*(?:check|intake|log)/i.test(query)) {
      const match = query.match(/(\d+)\s*(?:ml|milliliters|glasses|glass)/i);
      let ml = 250;
      if (match) {
        const val = parseInt(match[1], 10);
        ml = query.includes('glass') ? val * 250 : val;
      }
      return {
        type: 'HYDRATION_LOG',
        result: this.logHydration(ml)
      };
    }

    if (/posture|health check|stretch|wellness|eye check/i.test(query)) {
      const nudge = this.getHealthNudge();
      return {
        type: 'HEALTH_NUDGE',
        message: `${nudge.title}: ${nudge.message}`
      };
    }

    if (/evening debrief|wind down|end my day|good night/i.test(query)) {
      return {
        type: 'EVENING_DEBRIEF',
        message: this.generateEveningDebrief()
      };
    }

    return null;
  }
}

export default DailyCompanion;
