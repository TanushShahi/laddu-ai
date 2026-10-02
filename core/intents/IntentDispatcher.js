/**
 * Unified Intent & Command Dispatcher for LADDU
 * Routes all commands (Voice, Mobile, Web, Sentry) through a single intelligent pipeline.
 * Prioritizes: Phone Calls -> App/Web Launch -> Daily Companion -> Memory -> Computer Tools -> AI Brain.
 */
import { ContactManager } from '../contacts/ContactManager.js';
import { spawn } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';

export class IntentDispatcher {
  constructor(options = {}) {
    this.aiBrain = options.aiBrain;
    this.computerController = options.computerController;
    this.dailyCompanion = options.dailyCompanion;
    this.memoryManager = options.memoryManager;
    this.toolRegistry = options.toolRegistry;
    this.contactManager = options.contactManager || new ContactManager();
    this.pendingContactAction = null; // Stores state if waiting for a phone number
  }

  /**
   * Dispatch a user request from any channel
   * @param {string} rawText 
   * @param {Object} [options]
   */
  async dispatch(rawText, options = {}) {
    if (!rawText || !rawText.trim()) {
      return { content: "I'm listening, Boss. What can I do for you?", model: 'dispatcher' };
    }

    // Clean text: strip trailing punctuation and device qualifiers ("on my mobile", "on my computer")
    let text = rawText.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]+$/, '').trim();
    let cleanLower = text.toLowerCase()
      .replace(/\s+on\s+my\s+(?:mobile|phone|pc|computer|laptop|tab|tablet|device)$/i, '')
      .trim();

    // Multilingual & Hinglish Normalizations
    const hindiCallMatch = cleanLower.match(/^(.+?)\s+ko\s+(?:call|phone|dial|ring)\s*(?:karo|lagao|karna)?$/i) ||
                           cleanLower.match(/^(.+?)\s+को\s*(?:कॉल|फोन|कॉल करो|फोन लगाओ|कॉल लगाओ)?$/i);
    if (hindiCallMatch) {
      cleanLower = `call ${hindiCallMatch[1].trim()}`;
      text = cleanLower;
    }
    const hindiOpenMatch = cleanLower.match(/^(.+?)\s+(?:kholo|chalao|start karo|open karo)$/i) ||
                           cleanLower.match(/^(.+?)\s+(?:खोलो|चलाओ)$/i);
    if (hindiOpenMatch && !/^(?:call|phone)/i.test(hindiOpenMatch[1])) {
      cleanLower = `open ${hindiOpenMatch[1].trim()}`;
      text = cleanLower;
    }
    if (/^(?:मौसम कैसा है|aaj ka mausam|mausam kaisa hai|weather kaisa hai)$/i.test(cleanLower)) {
      cleanLower = 'what is the weather';
      text = cleanLower;
    }
    if (/^(?:पानी पिया|paani piya|ek glass paani)$/i.test(cleanLower)) {
      cleanLower = 'drank 250ml water';
      text = cleanLower;
    }

    // 0. Check if user is responding with a phone number for a pending contact
    if (this.pendingContactAction) {
      const phoneDigits = text.replace(/[^0-9+]/g, '');
      if (phoneDigits.length >= 7) {
        const contactName = this.pendingContactAction.contactName;
        this.contactManager.setContact(contactName, phoneDigits, this.pendingContactAction.relationship || '');
        const cleanDigits = phoneDigits.replace(/[^0-9]/g, '');
        const waDigits = cleanDigits.length === 10 ? ('91' + cleanDigits) : cleanDigits;
        const targetTel = `tel:${phoneDigits.startsWith('+') ? phoneDigits : (phoneDigits.length === 10 ? '+91' + phoneDigits : phoneDigits)}`;
        const waUri = `https://wa.me/${waDigits}`;
        const phoneLinkUri = `ms-phone:call?number=${waDigits}`;
        this._launchTelOnDesktop(targetTel, phoneLinkUri);
        this.pendingContactAction = null;

        return {
          content: `Saved ${contactName}'s number (${phoneDigits}). Initiating call now...`,
          action: 'CALL_PHONE',
          contact: contactName,
          phoneNumber: phoneDigits,
          telUri: targetTel,
          waUri,
          phoneLinkUri,
          model: 'telephony-engine'
        };
      }
    }

    // 0.9 Dedicated WhatsApp Intent: "open whatsapp", "whatsapp", "launch whatsapp", "whatsapp web"
    const waIntentMatch = cleanLower.match(/^(?:open|launch|start|run|go\s+to)?\s*(?:whats\s*app|whatsapp)(?:\s+(?:app|web|application))?$/i) ||
                          cleanLower.match(/^(?:whats\s*app|whatsapp)\s+(?:kholo|chalao|start|open\s*karo)$/i);
    if (waIntentMatch) {
      return this._handleAppLaunch('whatsapp');
    }

    // 1. Phone Call Intent: "call papa", "call dad", "dial +1234567890", "phone mom"
    const callMatch = cleanLower.match(/^(?:call|phone|dial|ring|make\s+a\s+call\s+to|place\s+a\s+call\s+to)\s+(.+)$/i);
    if (callMatch) {
      const target = callMatch[1].trim();
      const phoneDigits = target.replace(/[^0-9+]/g, '');

      // Direct phone number dialed
      if (phoneDigits.length >= 7 && /^[\+]?[0-9\s\-]+$/.test(target)) {
        const cleanDigits = phoneDigits.replace(/[^0-9]/g, '');
        const waDigits = cleanDigits.length === 10 ? ('91' + cleanDigits) : cleanDigits;
        const telUri = `tel:${phoneDigits.startsWith('+') ? phoneDigits : (phoneDigits.length === 10 ? '+91' + phoneDigits : phoneDigits)}`;
        const waUri = `https://wa.me/${waDigits}`;
        const phoneLinkUri = `ms-phone:call?number=${waDigits}`;
        this._launchTelOnDesktop(telUri, phoneLinkUri);
        return {
          content: `Dialing ${target} now...`,
          action: 'CALL_PHONE',
          contact: target,
          phoneNumber: phoneDigits,
          telUri,
          waUri,
          phoneLinkUri,
          model: 'telephony-engine'
        };
      }

      // Look up contact by name or relationship
      const contact = this.contactManager.find(target);
      if (contact && contact.phone && contact.phone.trim().length >= 3) {
        const phone = contact.phone.trim();
        const cleanDigits = phone.replace(/[^0-9]/g, '');
        const waDigits = cleanDigits.length === 10 ? ('91' + cleanDigits) : cleanDigits;
        const telUri = `tel:${phone.startsWith('+') ? phone : (phone.length === 10 ? '+91' + phone : phone)}`;
        const waUri = `https://wa.me/${waDigits}`;
        const phoneLinkUri = `ms-phone:call?number=${waDigits}`;
        this._launchTelOnDesktop(telUri, phoneLinkUri);
        return {
          content: `Calling ${contact.name} (${contact.phone}) now...`,
          action: 'CALL_PHONE',
          contact: contact.name,
          phoneNumber: contact.phone,
          telUri,
          waUri,
          phoneLinkUri,
          model: 'telephony-engine'
        };
      }

      // Contact exists but no phone number
      if (contact) {
        this.pendingContactAction = { contactName: contact.name, relationship: contact.relationship };
        return {
          content: `I found ${contact.name} in your contacts, but there is no phone number saved yet. What is ${contact.name}'s phone number?`,
          action: 'AWAIT_PHONE_NUMBER',
          contact: contact.name,
          model: 'telephony-engine'
        };
      }

      // Contact does not exist
      this.pendingContactAction = { contactName: target };
      return {
        content: `I don't have a phone number for "${target}" yet. What is their phone number? Say or type the number, and I will save it and place the call.`,
        action: 'AWAIT_PHONE_NUMBER',
        contact: target,
        model: 'telephony-engine'
      };
    }

    
    // 1.5 AI Image Generation Intent (Instant & 100% Free)
    const imgMatch = cleanLower.match(/^(?:generate|create|draw|make|paint)\s+(?:an?\s+)?(?:image|picture|photo|illustration|art)\s+(?:of\s+)?(.+)$/i) || cleanLower.match(/^(?:draw|paint)\s+(.+)$/i);
    if (imgMatch) {
      const rawPrompt = imgMatch[1].trim();
      const cleanPrompt = rawPrompt.replace(/^(?:me\s+)?(?:an?\s+)?/i, '').trim();
      const imageUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(cleanPrompt) + '?width=1024&height=1024&nologo=true&enhance=true';
      return {
        content: 'Here is the AI image generated for **"' + cleanPrompt + '"**:',
        action: 'AI_IMAGE_GENERATED',
        imageUrl,
        imagePrompt: cleanPrompt,
        role: { id: 'assistant', name: 'Creative Studio (LADDU)', icon: '🎨' },
        model: 'pollinations-genai'
      };
    }

    // 1.6 Multi-AI Tool Router: Perplexity (Research)
    const perplexityMatch = cleanLower.match(/^(?:use\s+perplexity\s+(?:to\s+)?(?:research|search)?|deep\s+research|research\s+deeply\s+on|research)\s+(.+)$/i);
    if (perplexityMatch) {
      const topic = perplexityMatch[1].trim();
      const perplexityUrl = 'https://www.perplexity.ai/search?q=' + encodeURIComponent(topic);
      return {
        content: 'I have compiled a deep research dispatch for **"' + topic + '"**. You can explore synthesized multi-source intelligence with real-time web citations:',
        action: 'LAUNCH_AI_TOOL',
        toolName: 'Perplexity AI',
        toolIcon: '🔍',
        toolDesc: 'Deep AI Research & Multi-Source Synthesis',
        toolUrl: perplexityUrl,
        topic,
        role: { id: 'mentor', name: 'Research Intelligence (Perplexity)', icon: '🔍' },
        model: 'perplexity-router'
      };
    }

    // 1.7 Multi-AI Tool Router: Gamma (Presentations / PPTs)
    const gammaMatch = cleanLower.match(/^(?:use\s+gamma\s+(?:to\s+)?(?:make|generate|create)?|generate\s+ppt|make\s+ppt|create\s+ppt|generate\s+presentation|make\s+presentation|create\s+presentation|create\s+slides)\s+(?:on|about)?\s*(.+)$/i);
    if (gammaMatch) {
      const topic = gammaMatch[1].trim();
      const gammaUrl = 'https://gamma.app';
      const outline = '### 📊 Slide Deck Blueprint: ' + topic.toUpperCase() + '\n\n' +
        '* **Slide 1: Title & Executive Vision** — Overview of ' + topic + '\n' +
        '* **Slide 2: Core Problem & Challenges** — Market pain points\n' +
        '* **Slide 3: Strategic Innovation** — Key features & advantages\n' +
        '* **Slide 4: Implementation Roadmap** — Phased deployment milestones\n' +
        '* **Slide 5: Conclusion & Expected Impact** — Strategic summary\n\n' +
        '*You can convert this outline into an AI presentation directly on Gamma App below:*';
      return {
        content: outline,
        action: 'LAUNCH_AI_TOOL',
        toolName: 'Gamma App',
        toolIcon: '📊',
        toolDesc: 'AI Presentation & Slide Deck Generator',
        toolUrl: gammaUrl,
        topic,
        role: { id: 'assistant', name: 'Presentation Architect (Gamma)', icon: '📊' },
        model: 'gamma-router'
      };
    }

    // 1.8 Multi-AI Tool Router: Antigravity / v0 (App Development)
    const devMatch = cleanLower.match(/^(?:use\s+(?:antigravity|v0|claude)\s+(?:to\s+)?(?:build|make|code)?|build\s+app|make\s+app|code\s+app|develop\s+app|create\s+website)\s+(?:for|about)?\s*(.+)$/i);
    if (devMatch) {
      const topic = devMatch[1].trim();
      const devUrl = 'https://v0.dev';
      const blueprint = '### 🚀 Software Architecture: ' + topic.toUpperCase() + '\n\n' +
        '* **Frontend**: Modern Responsive PWA / Next.js with Sci-Fi HUD components\n' +
        '* **Backend**: High-performance Node.js / REST & WebSockets\n' +
        '* **AI Intelligence Layer**: Multimodal LLM + Grounded Vector Search\n' +
        '* **Deployment**: 24/7 Cloud Autonomy with zero downtime\n\n' +
        '*You can scaffold and run this code directly in Antigravity or v0 below:*';
      return {
        content: blueprint,
        action: 'LAUNCH_AI_TOOL',
        toolName: 'Antigravity / v0',
        toolIcon: '🚀',
        toolDesc: 'Autonomous App & Frontend Builder',
        toolUrl: devUrl,
        topic,
        role: { id: 'mentor', name: 'Engineering Architect (Antigravity)', icon: '🚀' },
        model: 'antigravity-router'
      };
    }

    // 2. Save Contact Intent: "save papa's number as 9876543210", "add contact mom 98765..."
    const saveContactMatch = cleanLower.match(/^(?:save|add|set)\s+(?:contact\s+)?([a-zA-Z\s]+?)(?:'s)?\s+(?:number|phone)?\s*(?:as|is|to|=|:)?\s*([0-9+\s\-]+)$/i);
    if (saveContactMatch) {
      const name = saveContactMatch[1].trim();
      const phone = saveContactMatch[2].replace(/[^0-9+]/g, '');
      if (phone.length >= 7) {
        this.contactManager.setContact(name, phone);
        return {
          content: `Saved contact "${name}" with phone number ${phone}. You can now say "Call ${name}" anytime!`,
          action: 'CONTACT_SAVED',
          contact: name,
          phone,
          model: 'telephony-engine'
        };
      }
    }

    // 3. Application & Website Launch Intent: "launch Chrome", "open Edge", "open YouTube"
    const launchMatch = cleanLower.match(/^(?:open|launch|start|go\s+to|navigate\s+to|visit)\s+(.+)$/i);
    if (launchMatch) {
      const appTarget = launchMatch[1].trim();
      const launchResult = await this._handleAppLaunch(appTarget);
      if (launchResult) {
        return launchResult;
      }
    }

    // 4. Daily Companion Intent (Morning briefing, Hydration, Posture, Health)
    if (this.dailyCompanion) {
      const companionIntent = this.dailyCompanion.handleIntent(text);
      if (companionIntent) {
        return {
          content: companionIntent.message || companionIntent.result?.message || 'Daily routine updated.',
          model: 'daily-companion',
          companionIntent
        };
      }
    }

    // 5. Memory Management Intent ("remember that...", "what is my...")
    if (this.memoryManager) {
      const memNL = this.memoryManager.handleNaturalLanguage(text);
      if (memNL) {
        return {
          content: memNL.message,
          model: 'memory-engine',
          citations: []
        };
      }
    }

    // 6. Direct Computer Controls (Diagnostics, search files, create folder)
    if (this.computerController) {
      const compCmd = await this.computerController.handleCommand(text, options);
      if (compCmd) {
        if (compCmd.blocked) {
          return {
            content: `Action blocked by security guardrails: ${compCmd.reason}`,
            model: 'security-guardrail',
            blocked: true,
            blockDetails: compCmd
          };
        }
        const respText = compCmd.message || (compCmd.result ? JSON.stringify(compCmd.result, null, 2) : 'Command completed successfully.');
        return {
          content: respText,
          model: 'system-controller',
          toolResult: compCmd
        };
      }
    }

    // 7. Conversational Brain (Offline Smart Engine or Cloud Gemini)
    if (this.aiBrain) {
      const brainResult = await this.aiBrain.process(text, {
        speaker: options.speaker,
        audioFeatures: options.features || options.audioFeatures,
        images: options.images,
        documents: options.documents,
        webSearch: options.webSearch,
        onStateChange: options.onStateChange
      });
      return brainResult;
    }

    return {
      content: `Acknowledged: "${text}". Standing by for further instructions.`,
      model: 'dispatcher'
    };
  }

  /**
   * Helper to launch application or website across platforms
   */
  async _handleAppLaunch(target) {
    const isWin = os.platform() === 'win32';
    const t = target.toLowerCase().trim();

    // 1. Direct Web URLs
    if (/^https?:\/\//i.test(target)) {
      this._spawnDetached(target);
      return { content: `Opening website: ${target}`, action: 'OPEN_URL', url: target, app: target, model: 'app-launcher' };
    }

    // 1.5 WhatsApp Application (Native Protocol with Web fallback)
    if (t === 'whatsapp' || t === 'whats app' || t === 'whatsapp web') {
      if (isWin) {
        try {
          this._spawnCmd('start whatsapp:');
        } catch (e) {}
      }
      return {
        content: 'Opening WhatsApp application now (or WhatsApp Web if app is not installed)...',
        action: 'OPEN_WHATSAPP',
        appUrl: 'whatsapp://',
        webUrl: 'https://web.whatsapp.com',
        url: 'whatsapp://',
        app: 'WhatsApp',
        model: 'app-launcher'
      };
    }

    // 2. Comprehensive Web Services Directory
    const webServices = {
      'instagram': 'https://www.instagram.com',
      'insta': 'https://www.instagram.com',
      'facebook': 'https://www.facebook.com',
      'fb': 'https://www.facebook.com',
      'youtube': 'https://www.youtube.com',
      'yt': 'https://www.youtube.com',
      'google': 'https://www.google.com',
      'gmail': 'https://mail.google.com',
      'mail': 'https://mail.google.com',
      'email': 'https://mail.google.com',
      'whatsapp': 'https://web.whatsapp.com',
      'whatsapp web': 'https://web.whatsapp.com',
      'github': 'https://github.com',
      'reddit': 'https://www.reddit.com',
      'twitter': 'https://twitter.com',
      'x': 'https://x.com',
      'maps': 'https://maps.google.com',
      'google maps': 'https://maps.google.com',
      'chatgpt': 'https://chatgpt.com',
      'chat gpt': 'https://chatgpt.com',
      'openai': 'https://chatgpt.com',
      'claude': 'https://claude.ai',
      'gemini': 'https://gemini.google.com',
      'netflix': 'https://www.netflix.com',
      'prime video': 'https://www.primevideo.com',
      'amazon prime': 'https://www.primevideo.com',
      'hotstar': 'https://www.hotstar.com',
      'disney hotstar': 'https://www.hotstar.com',
      'disney+': 'https://www.hotstar.com',
      'spotify': 'https://open.spotify.com',
      'spotify web': 'https://open.spotify.com',
      'linkedin': 'https://www.linkedin.com',
      'pinterest': 'https://www.pinterest.com',
      'twitch': 'https://www.twitch.tv',
      'telegram': 'https://web.telegram.org',
      'telegram web': 'https://web.telegram.org',
      'discord': 'https://discord.com/app',
      'amazon': 'https://www.amazon.com',
      'flipkart': 'https://www.flipkart.com',
      'wikipedia': 'https://www.wikipedia.org',
      'translate': 'https://translate.google.com',
      'google translate': 'https://translate.google.com',
      'drive': 'https://drive.google.com',
      'google drive': 'https://drive.google.com',
      'docs': 'https://docs.google.com',
      'google docs': 'https://docs.google.com',
      'sheets': 'https://sheets.google.com',
      'google sheets': 'https://sheets.google.com',
      'canva': 'https://www.canva.com',
      'tiktok': 'https://www.tiktok.com',
      'snapchat': 'https://www.snapchat.com',
      'cricbuzz': 'https://www.cricbuzz.com',
      'udemy': 'https://www.udemy.com',
      'coursera': 'https://www.coursera.org',
      'medium': 'https://medium.com',
      'quora': 'https://www.quora.com',
      'stackoverflow': 'https://stackoverflow.com',
      'stack overflow': 'https://stackoverflow.com',
      'zoom': 'https://zoom.us'
    };

    if (webServices[t]) {
      const url = webServices[t];
      this._spawnDetached(url);
      return { content: `Opening ${target} in your browser...`, action: 'OPEN_URL', url, app: target, model: 'app-launcher' };
    }

    // 3. Native Windows / Desktop Applications
    if (t.includes('camera') || t === 'webcam') {
      this._spawnCmd(isWin ? 'start microsoft.windows.camera:' : 'cheese');
      return { content: 'Opening Camera.', action: 'APP_LAUNCH', app: 'camera', model: 'app-launcher' };
    }

    if (t.includes('photo') || t.includes('picture') || t.includes('gallery')) {
      this._spawnCmd(isWin ? 'start ms-photos:' : 'shotwell');
      return { content: 'Opening Photos.', action: 'APP_LAUNCH', app: 'photos', model: 'app-launcher' };
    }

    if (t.includes('setting')) {
      this._spawnCmd(isWin ? 'start ms-settings:' : 'gnome-control-center');
      return { content: 'Opening Settings.', action: 'APP_LAUNCH', app: 'settings', model: 'app-launcher' };
    }

    if (t.includes('paint') || t.includes('draw')) {
      this._spawnCmd(isWin ? 'start mspaint' : 'pinta');
      return { content: 'Opening Paint.', action: 'APP_LAUNCH', app: 'paint', model: 'app-launcher' };
    }

    if (t.includes('clock') || t.includes('alarm') || t.includes('timer') || t.includes('stopwatch')) {
      this._spawnCmd(isWin ? 'start ms-clock:' : 'gnome-clocks');
      return { content: 'Opening Clock & Alarms.', action: 'APP_LAUNCH', app: 'clock', model: 'app-launcher' };
    }

    if (t.includes('calendar')) {
      this._spawnCmd(isWin ? 'start outlookcal:' : 'gnome-calendar');
      return { content: 'Opening Calendar.', action: 'APP_LAUNCH', app: 'calendar', model: 'app-launcher' };
    }

    if (t.includes('snip') || t.includes('screenshot') || t.includes('screen clip')) {
      this._spawnCmd(isWin ? 'start ms-screenclip:' : 'gnome-screenshot');
      return { content: 'Opening Snipping Tool.', action: 'APP_LAUNCH', app: 'snipping-tool', model: 'app-launcher' };
    }

    if (t.includes('store') || t.includes('app store')) {
      this._spawnCmd(isWin ? 'start ms-windows-store:' : 'gnome-software');
      return { content: 'Opening Store.', action: 'APP_LAUNCH', app: 'store', model: 'app-launcher' };
    }

    if (t.includes('phone link') || t === 'phone' || t === 'phone app') {
      this._spawnCmd(isWin ? 'start ms-phone:' : 'kdeconnect-app');
      return { content: 'Opening Phone Link.', action: 'APP_LAUNCH', app: 'phonelink', model: 'app-launcher' };
    }

    if (t.includes('recorder') || t.includes('voice record')) {
      this._spawnCmd(isWin ? 'start ms-soundrecorder:' : 'gnome-sound-recorder');
      return { content: 'Opening Sound Recorder.', action: 'APP_LAUNCH', app: 'sound-recorder', model: 'app-launcher' };
    }

    if (t.includes('word') || t === 'winword' || t === 'ms word') {
      this._spawnCmd(isWin ? 'start winword' : 'libreoffice --writer');
      return { content: 'Opening Microsoft Word.', action: 'APP_LAUNCH', app: 'word', model: 'app-launcher' };
    }

    if (t.includes('excel') || t === 'ms excel' || t === 'spreadsheet') {
      this._spawnCmd(isWin ? 'start excel' : 'libreoffice --calc');
      return { content: 'Opening Microsoft Excel.', action: 'APP_LAUNCH', app: 'excel', model: 'app-launcher' };
    }

    if (t.includes('powerpoint') || t.includes('ppt') || t === 'presentation') {
      this._spawnCmd(isWin ? 'start powerpnt' : 'libreoffice --impress');
      return { content: 'Opening Microsoft PowerPoint.', action: 'APP_LAUNCH', app: 'powerpoint', model: 'app-launcher' };
    }

    if (t.includes('vlc') || t.includes('media player') || t.includes('video player')) {
      this._spawnCmd(isWin ? 'start vlc' : 'vlc');
      return { content: 'Opening Media Player.', action: 'APP_LAUNCH', app: 'vlc', model: 'app-launcher' };
    }

    if (t.includes('task manager') || t === 'taskmgr' || t === 'processes') {
      this._spawnCmd(isWin ? 'start taskmgr' : 'gnome-system-monitor');
      return { content: 'Opening Task Manager.', action: 'APP_LAUNCH', app: 'taskmgr', model: 'app-launcher' };
    }

    if (t.includes('chrome')) {
      const chromePath = this._findChromeExe();
      if (chromePath) {
        spawn(chromePath, [], { detached: true, stdio: 'ignore' }).unref();
      } else {
        this._spawnCmd('start chrome');
      }
      return { content: 'Launching Google Chrome now.', action: 'APP_LAUNCH', app: 'chrome', model: 'app-launcher' };
    }

    if (t.includes('edge')) {
      const edgePath = this._findEdgeExe();
      if (edgePath) {
        spawn(edgePath, [], { detached: true, stdio: 'ignore' }).unref();
      } else {
        this._spawnCmd('start msedge');
      }
      return { content: 'Launching Microsoft Edge now.', action: 'APP_LAUNCH', app: 'edge', model: 'app-launcher' };
    }

    if (t.includes('notepad') || t === 'notes' || t === 'text editor') {
      this._spawnCmd(isWin ? 'start notepad' : 'gedit');
      return { content: 'Opening Notepad.', action: 'APP_LAUNCH', app: 'notepad', model: 'app-launcher' };
    }

    if (t.includes('calc')) {
      this._spawnCmd(isWin ? 'start calc' : 'gnome-calculator');
      return { content: 'Opening Calculator.', action: 'APP_LAUNCH', app: 'calculator', model: 'app-launcher' };
    }

    if (t.includes('code') || t.includes('vscode') || t.includes('visual studio')) {
      this._spawnCmd('code');
      return { content: 'Launching Visual Studio Code.', action: 'APP_LAUNCH', app: 'code', model: 'app-launcher' };
    }

    if (t.includes('explorer') || t.includes('file manager') || t.includes('my computer') || t.includes('files') || t.includes('my pc')) {
      this._spawnCmd(isWin ? 'explorer' : 'xdg-open .');
      return { content: 'Opening File Explorer.', action: 'APP_LAUNCH', app: 'explorer', model: 'app-launcher' };
    }

    if (t.includes('terminal') || t.includes('command prompt') || t.includes('powershell') || t === 'cmd') {
      this._spawnCmd(isWin ? 'start powershell' : 'x-terminal-emulator');
      return { content: 'Opening Terminal.', action: 'APP_LAUNCH', app: 'terminal', model: 'app-launcher' };
    }

    // 4. Universal Fallback for Any App / Web Service (e.g. "open snapchat", "open canva", "open coursera")
    const cleanWord = t.replace(/[^a-z0-9]/g, '');
    if (cleanWord && !t.includes(' ')) {
      const url = `https://www.${cleanWord}.com`;
      if (isWin) {
        this._spawnCmd(`start ${cleanWord}`);
      }
      this._spawnDetached(url);
      return { content: `Opening ${target} now.`, action: 'OPEN_URL', url, app: target, model: 'app-launcher' };
    }

    // 5. Multi-word general search fallback: "open python official docs" -> Google search & open
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
    this._spawnDetached(searchUrl);
    return { content: `Searching and opening "${target}" in your browser...`, action: 'OPEN_URL', url: searchUrl, app: target, model: 'app-launcher' };
  }

  _findChromeExe() {
    const paths = [
      process.env['ProgramFiles'] + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env['ProgramFiles(x86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env['LocalAppData'] + '\\Google\\Chrome\\Application\\chrome.exe'
    ];
    return paths.find(p => p && fs.existsSync(p)) || null;
  }

  _findEdgeExe() {
    const paths = [
      process.env['ProgramFiles(x86)'] + '\\Microsoft\\Edge\\Application\\msedge.exe',
      process.env['ProgramFiles'] + '\\Microsoft\\Edge\\Application\\msedge.exe',
      process.env['LocalAppData'] + '\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    return paths.find(p => p && fs.existsSync(p)) || null;
  }

  _spawnCmd(cmdStr) {
    if (os.platform() === 'win32') {
      spawn('cmd.exe', ['/c', cmdStr], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('sh', ['-c', cmdStr], { detached: true, stdio: 'ignore' }).unref();
    }
  }

  _spawnDetached(targetUrl) {
    if (os.platform() === 'win32') {
      spawn('cmd.exe', ['/c', 'start', '', targetUrl], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [targetUrl], { detached: true, stdio: 'ignore' }).unref();
    }
  }

  _launchTelOnDesktop(telUri, phoneLinkUri) {
    if (os.platform() === 'win32') {
      if (phoneLinkUri) {
        spawn('cmd.exe', ['/c', 'start', '', phoneLinkUri], { detached: true, stdio: 'ignore' }).unref();
      }
      if (telUri) {
        spawn('cmd.exe', ['/c', 'start', '', telUri], { detached: true, stdio: 'ignore' }).unref();
      }
    }
  }
}

export default IntentDispatcher;
