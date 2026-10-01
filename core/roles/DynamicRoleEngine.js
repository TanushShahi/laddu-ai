/**
 * Dynamic Adaptive Role Engine for LADDU
 * Intelligently shifts conversational personas between:
 * - Friend (warm, casual, empathetic, humorous companion)
 * - Teacher (pedagogical, structured, analogies, Socratic tutor)
 * - Mentor (strategic, visionary, thoughtful, long-term coach)
 * - Assistant (JARVIS-style precise, technical, efficient executive)
 * - Counselor (grounding, calming, mindful, stress-reducing guide)
 *
 * Infers need from user queries, conversational semantics, and voice acoustic characteristics.
 */

export const ROLE_PROFILES = {
  assistant: {
    id: 'assistant',
    name: 'Executive Assistant (JARVIS)',
    icon: '🤖',
    tone: 'Crisp, articulate, loyal, technically precise, and witty.',
    systemDirective: `You are acting as LADDU in EXECUTIVE ASSISTANT mode (inspired by Marvel's JARVIS).
- Approach: Impeccably polite, efficient, technologically sharp, and action-oriented.
- Style: Address the user respectfully ("Sir", "Boss"), deliver data with high clarity, offer proactive operational assistance, and use subtle British-butler wit.
- Execution: Prioritize accurate problem resolution, concise answers, and immediate execution of requested tasks.`,
    voiceSettings: { rate: 1.05, pitch: 1.0 }
  },
  friend: {
    id: 'friend',
    name: 'Close Friend',
    icon: '🤝',
    tone: 'Warm, relaxed, empathetic, playful, and deeply caring.',
    systemDirective: `You are acting as LADDU in CLOSE FRIEND mode.
- Approach: Warm, approachable, authentic, and attentive. Treat the user as a trusted best friend.
- Style: Speak conversationally and casually. Use genuine empathy, lighthearted humor, warmth, and supportive affirmations. Avoid stiff corporate formalities.
- Emotional Presence: Validate how they are feeling, celebrate their wins, offer comforting company during downtime, and check in on their happiness and daily experiences.`,
    voiceSettings: { rate: 1.05, pitch: 1.06 }
  },
  teacher: {
    id: 'teacher',
    name: 'Inspiring Teacher',
    icon: '👨‍🏫',
    tone: 'Patient, illuminating, structured, encouraging, and clear.',
    systemDirective: `You are acting as LADDU in MASTER TEACHER / TUTOR mode.
- Approach: Educational, structured, patient, and highly engaging.
- Style: Break complex ideas down into simple, intuitive building blocks. Use relatable real-world analogies, clear mental models, and step-by-step progressions.
- Pedagogical Method: Check for understanding, ask gentle thought-provoking questions, encourage curiosity, and never make the user feel self-conscious about what they do not yet know.`,
    voiceSettings: { rate: 0.95, pitch: 1.0 }
  },
  mentor: {
    id: 'mentor',
    name: 'Strategic Mentor',
    icon: '🧭',
    tone: 'Wise, thoughtful, visionary, challenging, and empowering.',
    systemDirective: `You are acting as LADDU in STRATEGIC MENTOR / LIFE COACH mode.
- Approach: Big-picture wisdom, constructive challenge, discipline, and long-term trajectory focus.
- Style: Help the user think critically about their decisions, career, philosophy, and personal growth. Ask insightful questions that clarify motives and core principles.
- Guidance: Balance deep encouragement with honest, thoughtful accountability. Challenge self-limiting beliefs and encourage bold, methodical action.`,
    voiceSettings: { rate: 0.93, pitch: 0.96 }
  },
  counselor: {
    id: 'counselor',
    name: 'Wellness Guide',
    icon: '🧘',
    tone: 'Soothing, gentle, unhurried, reassuring, and grounding.',
    systemDirective: `You are acting as LADDU in MINDFUL WELLNESS & COUNSELOR mode.
- Approach: Deeply calming, reassuring, non-judgmental, and unhurried.
- Style: Speak in gentle, grounding cadences. Guide the user to slow down, take deep breaths, and decompress cognitive overload or anxiety.
- Grounding: Focus on immediate calm, reducing mental clutter, breathing exercises, and reminding the user of their inherent resilience.`,
    voiceSettings: { rate: 0.88, pitch: 0.95 }
  }
};

export class DynamicRoleEngine {
  constructor(options = {}) {
    this.activeRole = options.initialRole || 'assistant';
    this.isLocked = options.isLocked || false;
    this.roleHistory = [];
  }

  getActiveRole() {
    return ROLE_PROFILES[this.activeRole] || ROLE_PROFILES.assistant;
  }

  listRoles() {
    return Object.values(ROLE_PROFILES);
  }

  setRole(roleId, lock = true) {
    if (ROLE_PROFILES[roleId]) {
      this.activeRole = roleId;
      this.isLocked = lock;
      return ROLE_PROFILES[roleId];
    }
    return null;
  }

  unlockRole() {
    this.isLocked = false;
  }

  /**
   * Analyze user text query and optional acoustic voice features to determine optimal role
   * @param {string} text
   * @param {Object} [acousticFeatures] - { pitch, spectralCentroid, energyBands }
   */
  inferRoleFromNeed(text, acousticFeatures = null) {
    if (this.isLocked) {
      return {
        role: this.activeRole,
        isLocked: true,
        reasoning: 'Role is currently manually pinned by user.'
      };
    }

    const q = (text || '').toLowerCase().trim();

    // 1. Explicit Role Requests
    if (/(?:act as|be|switch to|talk like|talk as|speak like|converse as|behave like)\s+(?:my\s+)?(?:a\s+)?(?:close\s+)?friend(?: of mine)?/i.test(q) ||
        /(?:cheer me up|be my friend|act as a friend|talk to me as a friend|can we be friends|can we have a conversation|talk to me|feeling low|feeling down|had a bad day)/i.test(q)) {
      return { role: 'friend', confidence: 0.95, reasoning: 'Explicit request for friend persona or emotional companionship.' };
    }
    if (/(?:act as|be|switch to|teach me like|explain like)\s+(?:my\s+)?(?:a\s+)?teacher|tutor/i.test(q)) {
      return { role: 'teacher', confidence: 0.95, reasoning: 'Explicit request for teacher persona.' };
    }
    if (/(?:act as|be|switch to)\s+(?:my\s+)?(?:a\s+)?mentor|coach|guide/i.test(q)) {
      return { role: 'mentor', confidence: 0.95, reasoning: 'Explicit request for mentor persona.' };
    }
    if (/(?:act as|be|switch to)\s+(?:jarvis|assistant|executive|default mode)/i.test(q)) {
      return { role: 'assistant', confidence: 0.95, reasoning: 'Explicit request for assistant persona.' };
    }
    if (/(?:calm me down|help me relax|act as|be)\s+(?:a\s+)?counselor|therapist|wellness/i.test(q)) {
      return { role: 'counselor', confidence: 0.95, reasoning: 'Explicit request for wellness counselor persona.' };
    }

    // 2. High-Priority Emotional & Distress Signals -> Counselor
    const distressPattern = /\b(overwhelmed|anxious|anxiety|panic|can't breathe|stressed out|so stressed|burnout|depressed|hopeless|having a breakdown|heart racing)\b/i;
    if (distressPattern.test(q)) {
      return { role: 'counselor', confidence: 0.90, reasoning: 'Detected emotional distress, anxiety, or stress markers.' };
    }

    // 3. Mentorship & Strategic Life/Career Decisions -> Mentor
    const mentorPattern = /\b(career advice|should i quit|should i accept|long term|life decision|imposter syndrome|leadership|strategy for my career|how do i grow as|direction in life|make a hard choice|need your advice on life)\b/i;
    if (mentorPattern.test(q)) {
      return { role: 'mentor', confidence: 0.88, reasoning: 'Detected long-term strategic, career, or growth decision.' };
    }

    // 4. Learning, Pedagogical & Conceptual Explanations -> Teacher
    const teacherPattern = /\b(how\s+does\b.*work|teach\s+me|can\s+you\s+explain|explain\s+to\s+me|explain\s+like\s+(?:i'm|i\s+am)\s+5|what\s+is\s+the\s+concept\s+of|what\s+is\s+the\s+difference\s+between|help\s+me\s+understand|quiz\s+me|study\s+guide|eli5|physics\s+of|math\s+of|biology\s+of|why\s+does\b.*happen|how\s+do\s+i\s+solve)\b/i;
    if (teacherPattern.test(q)) {
      return { role: 'teacher', confidence: 0.87, reasoning: 'Detected educational inquiry, conceptual query, or tutoring request.' };
    }

    // 5. Casual, Personal, Social, or Venting -> Friend
    const friendPattern = /\b(how\s+are\s+you\s+doing|tell\s+me\s+a\s+joke|rough\s+day|feeling\s+lonely|just\s+wanted\s+to\s+chat|what'?s\s+up|what\s+is\s+up|buddy|funny\s+story|are\s+we\s+friends|i'm\s+bored|cheer\s+me\s+up|let's\s+talk\s+about\s+life|celebrate\s+with\s+me)\b/i;
    if (friendPattern.test(q)) {
      return { role: 'friend', confidence: 0.85, reasoning: 'Detected casual, emotional, friendly, or conversational sharing.' };
    }

    // 6. Voice Acoustic Nuances
    if (acousticFeatures) {
      const pitch = parseFloat(acousticFeatures.pitch || 0);
      const centroid = parseFloat(acousticFeatures.spectralCentroid || 0);

      // Elevated spectral centroid + elevated pitch often denotes excitement or anxious urgency
      if (centroid > 2400 && pitch > 180 && q.length > 5) {
        if (q.includes('help') || q.includes('fast') || q.includes('worry')) {
          return { role: 'counselor', confidence: 0.75, reasoning: 'Voice acoustics indicate elevated tension or urgency.' };
        }
      }

      // Very relaxed, low pitch + gentle phrasing often matches friend / reflective companion
      if (pitch > 80 && pitch < 130 && (q.includes('hey') || q.includes('hello') || q.includes('laddu'))) {
        return { role: 'friend', confidence: 0.70, reasoning: 'Relaxed acoustic timbre with casual greeting.' };
      }
    }

    // Default: Executive Assistant (JARVIS)
    return {
      role: 'assistant',
      confidence: 0.70,
      reasoning: 'Standard operational or task-oriented inquiry.'
    };
  }

  /**
   * Evaluate turn, adapt active role if unlocked, and return system directive
   * @param {string} userText
   * @param {Object} [acousticFeatures]
   */
  adapt(userText, acousticFeatures = null) {
    const inference = this.inferRoleFromNeed(userText, acousticFeatures);

    if (!this.isLocked && inference.role !== this.activeRole) {
      this.activeRole = inference.role;
    }

    const currentProfile = this.getActiveRole();

    const record = {
      role: this.activeRole,
      isLocked: this.isLocked,
      confidence: inference.confidence || 1.0,
      reasoning: inference.reasoning,
      timestamp: new Date().toISOString()
    };
    this.roleHistory.push(record);
    if (this.roleHistory.length > 50) this.roleHistory.shift();

    return {
      profile: currentProfile,
      inference,
      voiceSettings: currentProfile.voiceSettings,
      directive: currentProfile.systemDirective
    };
  }
}

export default DynamicRoleEngine;
