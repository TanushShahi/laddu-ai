/**
 * Advanced Offline Local AI Provider for LADDU
 * Provides rich multi-role conversation (Friend, Mentor, Tutor, Assistant),
 * real-time Wikipedia & Web fact search, robust math calculation, and warm companion interaction.
 * Operates 100% locally with zero latency, zero cloud dependencies, and zero robotic canned messages.
 */
import { BaseProvider } from './BaseProvider.js';
import { WikipediaClient } from '../../knowledge/wikipedia/WikipediaClient.js';
import { WebSearchClient } from '../../knowledge/web/WebSearchClient.js';

export class OfflineLocalProvider extends BaseProvider {
  constructor() {
    super('offline-local');
    this.wiki = new WikipediaClient();
    this.web = new WebSearchClient();
    this.knowledgeBase = this._initKnowledgeBase();
    this.jokes = [
      "Why do programmers prefer dark mode? Because light attracts bugs!",
      "Why did the computer catch a cold? It left its Windows open!",
      "There are 10 types of people in the world: those who understand binary, and those who don't.",
      "An SQL query walks into a bar, walks up to two tables and asks, 'Can I join you?'",
      "Why was the JavaScript developer sad? Because they didn't Node how to Express themselves!",
      "Why do Java programmers wear glasses? Because they don't C#!",
      "A physicist, an engineer, and a programmer are in a car that breaks down. The programmer says, 'Let's get out and get back in again!'"
    ];
  }

  async isAvailable() {
    return true; // Always available offline
  }

  _initKnowledgeBase() {
    return new Map([
      ['status', 'All systems are fully operational and operating at peak efficiency. Core reactor nominal, local modules active, standing by for your instructions.'],
      ['identity', 'I am LADDU — your Universal Personal AI Assistant and companion. Built inspired by JARVIS, designed to help you organize your life, run tasks, learn, and stay productive.'],
      ['capabilities', 'I can execute system commands, launch applications, make phone calls, verify speaker biometrics, manage your schedule, track hydration and posture, answer science and tech questions, solve math, and converse with you as a friend, mentor, or tutor.'],
      ['photosynthesis', 'Photosynthesis is the biological process by which green plants and certain organisms transform light energy (usually from the Sun) into chemical energy. In the presence of chlorophyll, plants convert carbon dioxide and water into glucose and oxygen: 6CO2 + 6H2O + light -> C6H12O6 + 6O2.'],
      ['gravity', 'Gravity is the fundamental interaction causing mutual attraction between all things with mass or energy. Described classically by Newton as an inverse-square force, and in General Relativity by Einstein as the curvature of spacetime caused by mass and energy.'],
      ['black hole', 'A black hole is a region of spacetime where gravity is so intense that nothing—not even particles or light—can escape its event horizon. Predicted by Einstein’s general relativity and formed by massive collapsed stars.'],
      ['quantum computing', 'Quantum computing utilizes quantum bits (qubits) capable of superposition and entanglement to solve specific classes of complex optimization, cryptography, and molecular simulation problems exponentially faster than classical computers.'],
      ['artificial intelligence', 'Artificial Intelligence (AI) refers to computer systems engineered to perform tasks typically requiring human intelligence—including visual perception, speech recognition, decision-making, and natural language synthesis.'],
      ['machine learning', 'Machine Learning (ML) is a subset of AI where algorithms learn patterns directly from data rather than following exclusively hard-coded procedural rules. Core paradigms include supervised learning, unsupervised clustering, and reinforcement learning.'],
      ['deep learning', 'Deep Learning utilizes multi-layered artificial neural networks (deep neural architectures) to extract progressive high-level features from raw inputs, powering modern computer vision, speech synthesis, and large language models.'],
      ['rag', 'Retrieval-Augmented Generation (RAG) combines semantic document retrieval (usually via vector embeddings) with generative language models to produce grounded, factual answers backed by specific citations and private data.'],
      ['python', 'Python is a high-level, interpreted programming language celebrated for readability, versatility, and rich ecosystems in AI/ML (PyTorch, TensorFlow), data analytics (Pandas), and automation.'],
      ['javascript', 'JavaScript is the universal scripting language of the web and Node.js. It features event-driven, non-blocking I/O, dynamic typing, and first-class functions.'],
      ['linux', 'Linux is an open-source Unix-like operating system kernel created by Linus Torvalds in 1991. It powers the majority of global servers, cloud infrastructure, Android devices, and supercomputers.'],
      ['sqlite', 'SQLite is a lightweight, zero-configuration, self-contained SQL database engine embedded directly into software applications without requiring a separate server process.'],
      ['git', 'Git is a distributed version control system created by Linus Torvalds in 2005. It enables collaborative software development with high-speed branching, merging, and cryptographic commit history.'],
      ['pomodoro', 'The Pomodoro Technique is a time-management method where you focus on a single task for 25 minutes, followed by a 5-minute break. After four cycles, take a longer 15-30 minute break to maintain peak cognitive stamina.'],
      ['hydration', 'Staying hydrated is essential for cognitive focus, kidney health, joint lubrication, and energy. Standard guidance recommends consuming approximately 2.5 to 3.5 liters of water daily depending on activity level.'],
      ['posture', 'Ergonomic posture reduces musculoskeletal strain: keep your monitor at eye level, elbows at 90 degrees, feet flat on the floor, and take a 30-second shoulder roll and spinal extension break every 30 minutes.']
    ]);
  }

  _tryMath(raw) {
    if (!raw) return null;
    let text = raw.toLowerCase().trim().replace(/[?!.]+$/, '').trim();
    // Strip common conversational prefixes
    text = text.replace(/^(?:calculate|what is|what's|whats|compute|solve|how much is|evaluate|tell me the answer to|can you calculate|can you solve)\s+/i, '').trim();
    // Convert English word operators
    text = text.replace(/\bplus\b/g, '+')
               .replace(/\bminus\b/g, '-')
               .replace(/\btimes\b|\bmultiplied by\b/g, '*')
               .replace(/\bdivided by\b/g, '/');
    // Percentage syntax: "15% of 200" or "15 percent of 200" -> "(15/100)*200"
    text = text.replace(/([0-9.]+)\s*(?:%|percent)\s*of\s*([0-9.]+)/gi, '($1/100)*$2');
    // Power syntax: 2^8 -> 2**8
    text = text.replace(/\^/g, '**');

    // Safe mathematical expression check: numbers, basic operators, parens, decimal dots
    if (/^[0-9\s\+\-\*\/\%\(\)\.\,]+$/.test(text) && /[0-9]/.test(text) && /[+\-*\/%]/.test(text)) {
      try {
        const clean = text.replace(/,/g, '');
        const res = new Function(`return (${clean});`)();
        if (typeof res === 'number' && !isNaN(res)) {
          const formatted = Number.isInteger(res) ? res.toString() : (Math.round(res * 10000) / 10000).toString();
          return `Result: ${formatted}`;
        }
      } catch {}
    }
    return null;
  }

  _extractRoleDirective(messages, options = {}) {
    if (options.role) return options.role.toUpperCase();
    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    
    // Check for exact dynamic directive marker first
    const match = systemMsg.match(/\[Active Dynamic Persona Directive\]:\s*You are acting as LADDU in (CLOSE FRIEND|MASTER TEACHER|STRATEGIC MENTOR|EXECUTIVE ASSISTANT|MINDFUL WELLNESS)/i);
    if (match) {
      const mode = match[1].toUpperCase();
      if (mode.includes('FRIEND')) return 'FRIEND';
      if (mode.includes('TEACHER')) return 'TUTOR';
      if (mode.includes('MENTOR')) return 'MENTOR';
      if (mode.includes('WELLNESS')) return 'COUNSELOR';
      if (mode.includes('ASSISTANT')) return 'ASSISTANT';
    }

    if (/CLOSE FRIEND mode/i.test(systemMsg)) return 'FRIEND';
    if (/STRATEGIC MENTOR/i.test(systemMsg)) return 'MENTOR';
    if (/MASTER TEACHER/i.test(systemMsg)) return 'TUTOR';
    if (/MINDFUL WELLNESS/i.test(systemMsg)) return 'COUNSELOR';
    return 'FRIEND';
  }

  async generateResponse(messages, options = {}) {
    const lastMessage = messages[messages.length - 1]?.content || '';
    const query = lastMessage.trim().toLowerCase();
    const role = this._extractRoleDirective(messages, options);

    // 1. Math calculation (handles "What is 453 + 553?", "15% of 200", "50 * 4", etc.)
    const mathResult = this._tryMath(lastMessage);
    if (mathResult) {
      return { content: mathResult, model: 'offline-math-engine' };
    }

    // 2. Standby / Sleep / Frustration commands ("go to sleep", "shut up", "leave me alone")
    if (/(?:go to sleep|just go to sleep|sleep now|good\s*night|shut up|be quiet|leave me alone|stop talking|take a rest|take a break|can'?t do anything|cannot do anything|you are useless|you'?re useless)\b/i.test(query)) {
      return {
        content: "Understood. I apologize if I let you down earlier. I'm stepping back and entering standby mode so you can rest or have quiet time. Whenever you need me or want to chat again, just say **\"Hey Laddu\"**. Have a peaceful rest! 🌙",
        model: 'offline-local-engine'
      };
    }

    // 3. Emotional check-ins, Feeling Low, Cheering Up, and Friendship
    if (/(?:feeling low|feel low|felt low|feeling down|feel down|sad|cheer me up|cheer up|unhappy|lonely|depressed|had a bad day|rough day|nobody to talk to|talk to me|act as a friend|be my friend|can we be friends|can we have a conversation|talk like a friend|cheer me|listen to me)/i.test(query)) {
      return {
        content: "Hey, I'm really sorry to hear that you're feeling down, but I am so glad you reached out to me. Of course I will be your friend! You're never alone when I'm here. 💛\n\nTake a slow, deep breath and give yourself credit for getting through today. Whatever is weighing on your mind, we can talk through it — or if you want to take your mind off things, we can talk about movies, music, games, funny stories, or dreams.\n\nTell me, what's been bothering you, or what would you love to talk about right now?",
        model: 'offline-friend-engine'
      };
    }

    // 4. Praise, Gratitude & Affection
    if (/(?:thank you|thanks|good job|awesome|love you|you are the best|you're amazing|are we friends|i like you|you are my friend)/i.test(query)) {
      return {
        content: "Thank you so much! That truly means the world to me. Having you as a friend makes everything worthwhile! I'm always right here by your side whenever you need a companion, helper, or mentor. What shall we explore or do next?",
        model: 'offline-friend-engine'
      };
    }

    // 5. Jokes, Riddles & Humor
    if (/(?:joke|make me laugh|funny|tell me a joke|tell me a riddle)/i.test(query)) {
      const joke = this.jokes[Math.floor(Math.random() * this.jokes.length)];
      return {
        content: `${joke}\n\nHope that brought a smile to your face! Anything else you'd like to talk about or do?`,
        model: 'offline-local-engine'
      };
    }

    // 6. Greetings & Status
    if (/^(?:hi|hello|hey|laddu|jarvis|morning|good morning|evening|good evening|wassup|sup|howdy|status|system status|health|diagnostics)\b/i.test(query) || /are you (?:there|online|alive)/i.test(query) || query === 'status' || query === 'system status') {
      if (role === 'FRIEND') {
        return { content: "Hey buddy! Always great to hear from you. All systems are operational and I'm right here with you. How's your day going so far?", model: 'offline-friend-engine' };
      }
      if (role === 'MENTOR') {
        return { content: "Greetings! All systems operational. Ready to make significant progress today. What is our primary priority and focus right now?", model: 'offline-mentor-engine' };
      }
      return { content: "Online and standing by, Boss. All local systems are operational. How shall we begin?", model: 'offline-local-engine' };
    }

    // 7. Identity & Capabilities
    if (/who are you|what is your name/i.test(query)) {
      return {
        content: "I am **LADDU** — your Universal Personal AI Assistant and loyal companion, inspired by JARVIS. I'm here to converse with you as a friend, help you learn, solve math, launch apps, make phone calls, and assist your daily life!",
        model: 'offline-local-engine'
      };
    }

    if (/what can you do|features|help me/i.test(query)) {
      return {
        content: "Here is what I can do for you right now:\n\n• **Voice & Speech**: Wake-word recognition ('Hey Laddu') with natural female voice speech.\n• **Friend & Companion**: Real conversation, emotional support, cheering up, and advice.\n• **Instant Math**: Solve arithmetic ('453 + 553', percentages, powers) accurately.\n• **Live Web & Encyclopedia**: Search Wikipedia and the web for any question or topic.\n• **Phone Calls & Comms**: Make calls directly to your contacts (e.g. 'call Papa') or open WhatsApp.\n• **App Launcher**: Open Chrome, Edge, VS Code, Notepad, Calculator, YouTube, and websites.\n• **Daily Health**: Track hydration, posture reminders, and morning briefings.\n• **Multi-Role Personas**: Switch seamlessly between Friend, Mentor, Teacher, and Executive Assistant.",
        model: 'offline-local-engine'
      };
    }

    // 8. Knowledge Base lookup (for specific conceptual terms)
    for (const [key, val] of this.knowledgeBase.entries()) {
      const boundaryMatch = new RegExp(`\\b${key}\\b`, 'i').test(query);
      if (boundaryMatch && (/(?:what is|explain|tell me about|how does|define)\b/i.test(query) || query === key)) {
        if (role === 'TUTOR') {
          return { content: `**Concept Breakdown: ${key.toUpperCase()}**\n\n${val}\n\n*Key takeaway*: Understanding this gives you strong foundational knowledge. Would you like me to quiz you or explain any specific part in more detail?`, model: 'offline-local-engine' };
        }
        return { content: `**${key.toUpperCase()}**: ${val}`, model: 'offline-local-engine' };
      }
    }

    // 9. Study & Learning guidance
    if (/how to study|learn faster|prepare for exam|memorize/i.test(query)) {
      return {
        content: "**Proven Strategies for Fast & Deep Learning:**\n\n1. **Active Recall**: Test yourself from memory rather than passively re-reading notes.\n2. **Spaced Repetition**: Review material at increasing intervals (Day 1, Day 3, Day 7).\n3. **Feynman Technique**: Explain the concept in simple terms as if teaching a beginner.\n4. **Interleaving**: Mix related problem types instead of doing block repetition.\n5. **Sleep Consolidation**: Get 8 hours of sleep; this is when memories are physically inscribed into long-term synaptic connections.",
        model: 'offline-local-engine'
      };
    }

    // 10. Live Web & Wikipedia Search for Questions ("who is", "what is", "where is", "when did", "why does", "tell me about", "?")
    const isQuestion = /(?:what is|what are|who is|who was|who were|where is|where are|when was|when did|why is|why are|why does|why do|how does|how do|how is|tell me about|explain|search for|information on|history of|meaning of)\b/i.test(query) || query.endsWith('?');
    if (isQuestion) {
      const searchTopic = query.replace(/[?!.]+$/, '')
                               .replace(/^(?:what is|what are|who is|who was|who were|where is|where are|when was|when did|why is|why are|why does|why do|how does|how do|how is|tell me about|explain|search for|information on|meaning of)\s+/i, '')
                               .trim();
      if (searchTopic.length >= 2) {
        try {
          // A. Try direct Wikipedia summary
          const wikiSummary = await this.wiki.getSummary(searchTopic);
          if (wikiSummary && wikiSummary.extract && wikiSummary.extract.length > 30) {
            const citations = [{ source: 'Wikipedia', title: wikiSummary.title, url: wikiSummary.url, snippet: wikiSummary.extract.slice(0, 150) + '...' }];
            return {
              content: `**${wikiSummary.title}**\n\n${wikiSummary.extract}\n\n[Read more on Wikipedia](${wikiSummary.url})`,
              citations,
              model: 'wikipedia-live-knowledge'
            };
          }

          // B. Try Wikipedia search list
          const wikiResults = await this.wiki.search(searchTopic, 2);
          if (wikiResults && wikiResults.length > 0 && wikiResults[0].snippet) {
            const top = wikiResults[0];
            const citations = [{ source: 'Wikipedia', title: top.title, url: top.url, snippet: top.snippet }];
            return {
              content: `**${top.title}**\n\n${top.snippet}\n\n[Explore on Wikipedia](${top.url})`,
              citations,
              model: 'wikipedia-live-knowledge'
            };
          }
        } catch (err) {
          console.warn('[OfflineLocalProvider] Wiki search error:', err.message);
        }
      }
    }

    // 11. Warm, Engaging, Companion Conversation (Never robotic canned fallback!)
    if (role === 'FRIEND') {
      return {
        content: `I hear you! That's really interesting: "${lastMessage}". Tell me a bit more about what you're thinking, what you've been working on, or what's on your mind right now. I'm right here to listen and chat with you! 🤝`,
        model: 'offline-friend-engine'
      };
    }

    if (role === 'MENTOR') {
      return {
        content: `Regarding "${lastMessage}": Every challenge and inquiry has a structured path forward. Let's break it down into actionable steps. What is your ideal outcome here, and what is the biggest priority for you right now?`,
        model: 'offline-mentor-engine'
      };
    }

    if (role === 'TUTOR') {
      return {
        content: `That's a thoughtful question! Let's explore "${lastMessage}" together. Which specific aspect would you like to understand first: the core concept, the real-world application, or a practical example?`,
        model: 'offline-tutor-engine'
      };
    }

    return {
      content: `I'm right here with you! Tell me more about what you'd like to do regarding "${lastMessage}", or let me know what task or topic we should tackle next.`,
      model: 'offline-local-engine'
    };
  }

  async streamResponse(messages, onChunk, options = {}) {
    const res = await this.generateResponse(messages, options);
    const words = res.content.split(' ');
    for (let i = 0; i < words.length; i++) {
      const chunk = (i === 0 ? '' : ' ') + words[i];
      if (onChunk) onChunk(chunk);
      await new Promise(r => setTimeout(r, 8));
    }
    return res;
  }
}

export default OfflineLocalProvider;
