window.openDesktopToolPrompt = function(toolName, baseUrl) {
  const m = document.getElementById('modalDesktopAITools');
  if (m) m.style.display = 'none';
  const query = prompt('Enter topic to research with ' + toolName + ':');
  if (query) {
    window.open(baseUrl + encodeURIComponent(query), '_blank');
  }
};
window.promptDesktopGenerateImage = function() {
  const m = document.getElementById('modalDesktopAITools');
  if (m) m.style.display = 'none';
  const promptText = prompt('Describe the image you want LADDU to generate:');
  if (promptText) {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
      chatInput.value = 'generate image of ' + promptText;
      if (typeof sendChat === 'function') sendChat();
    }
  }
};
window.switchTab = function(tabId) {
  document.querySelectorAll('.nav-btn').forEach(b => {
    if (b.dataset.tab === tabId) b.classList.add('active');
    else b.classList.remove('active');
  });
  document.querySelectorAll('.hud-tab').forEach(t => {
    if (t.id === tabId) t.classList.add('active');
    else t.classList.remove('active');
  });
  if (tabId === 'tab-knowledge' && typeof loadIndexedDocuments === 'function') loadIndexedDocuments();
  if (tabId === 'tab-memory' && typeof loadMemories === 'function') loadMemories();
  if (tabId === 'tab-permissions' && typeof loadPermissions === 'function') loadPermissions();
  if (tabId === 'tab-automations' && typeof loadAutomations === 'function') loadAutomations();
};
/**
 * LADDU HUD Frontend Controller, Voice Biometrics, & Daily Companion
 */

// ==========================================
// 1. STATE & GLOBAL VARIABLES
// ==========================================
let ws = null;
let audioCtx = null;
let analyser = null;
let micStream = null;
let isListening = false;
let isSpeakingAudio = false;
let recognition = null;
let currentAiState = 'IDLE';
let activeSpeaker = { id: 'user_primary', name: 'Boss', isVerified: true };
let todayHydrationMl = 0;

// Clock Ticker
function initClock() {
  const clockEl = document.getElementById('hudClock');
  setInterval(() => {
    const now = new Date();
    clockEl.textContent = now.toTimeString().split(' ')[0];
  }, 1000);
}

// ==========================================
// 2. WEBSOCKET CONNECTION
// ==========================================

// Native WhatsApp Protocol Launcher with Auto Web Fallback (Desktop)

function removeSpeechStutter(text) {
      if (!text) return '';
      let str = text.trim();

      // 1. Remove repeated phrases of any word length from 15 down to 1
      for (let len = 15; len >= 1; len--) {
        const pattern = new RegExp('(\\b(?:\\S+\\s+){' + (len - 1) + '}\\S+)(?:\\s+\\1\\b)+', 'gi');
        str = str.replace(pattern, '$1');
      }

      // 2. Collapse multi-chunk repetitions (e.g., "draw a cute dog draw a cute dog")
      let words = str.split(/\s+/);
      for (let chunkSize = Math.floor(words.length / 2); chunkSize >= 1; chunkSize--) {
        let i = 0;
        while (i + chunkSize * 2 <= words.length) {
          const c1 = words.slice(i, i + chunkSize).join(' ').toLowerCase();
          const c2 = words.slice(i + chunkSize, i + chunkSize * 2).join(' ').toLowerCase();
          if (c1 === c2) {
            words.splice(i + chunkSize, chunkSize);
          } else {
            i++;
          }
        }
      }
      str = words.join(' ');

      // 3. Remove duplicate bookend word: "open instagram open" -> "open instagram"
      words = str.split(/\s+/);
      if (words.length >= 3 && words[0].toLowerCase() === words[words.length - 1].toLowerCase()) {
        words.pop();
        str = words.join(' ');
      }

      return str.trim();
    }
window.removeSpeechStutter = removeSpeechStutter;

function openWhatsAppWithFallback(phone = '', text = '') {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

  let appUrl = 'whatsapp://';
  let intentUrl = '';
  let webUrl = 'https://web.whatsapp.com';

  if (cleanPhone) {
    const waPhone = cleanPhone.length === 10 ? ('91' + cleanPhone) : cleanPhone;
    appUrl = 'whatsapp://send?phone=' + waPhone + (text ? '&text=' + encodeURIComponent(text) : '');
    webUrl = 'https://web.whatsapp.com/send?phone=' + waPhone + (text ? '&text=' + encodeURIComponent(text) : '');
    intentUrl = 'intent://send?phone=' + waPhone + (text ? '&text=' + encodeURIComponent(text) : '') + '#Intent;package=com.whatsapp;scheme=whatsapp;action=android.intent.action.VIEW;S.browser_fallback_url=' + encodeURIComponent(webUrl) + ';end';
  } else {
    appUrl = 'whatsapp://';
    webUrl = 'https://web.whatsapp.com';
    intentUrl = 'intent:#Intent;package=com.whatsapp;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;S.browser_fallback_url=' + encodeURIComponent(webUrl) + ';end';
  }

  console.log('[LADDU Desktop] Executing WhatsApp launch. App URL:', appUrl, 'Intent URL:', intentUrl);

  if (isAndroid) {
    try {
      window.location.href = intentUrl;
    } catch(e) {
      const a = document.createElement('a');
      a.href = intentUrl;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 1000);
    }
  } else if (isIOS) {
    try {
      window.location.href = appUrl;
    } catch(e) {
      const a = document.createElement('a');
      a.href = appUrl;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 1000);
    }
  } else {
    // Windows Desktop / Mac: anchor click triggers whatsapp:// protocol
    const a = document.createElement('a');
    a.href = appUrl;
    document.body.appendChild(a);
    try {
      a.click();
    } catch(e) {
      window.location.href = appUrl;
    }
    setTimeout(() => a.remove(), 1000);
  }
}
window.openWhatsAppWithFallback = openWhatsAppWithFallback;
window.openDesktopContactsModal = function() {
  const m = document.getElementById('modalDesktopContacts');
  if (m) { m.style.display = 'flex'; loadDesktopContacts(); }
};
window.closeDesktopContactsModal = function() {
  const m = document.getElementById('modalDesktopContacts');
  if (m) m.style.display = 'none';
};
window.openDesktopSettingsModal = function() {
  const m = document.getElementById('modalDesktopSettings');
  if (m) { m.style.display = 'flex'; loadDesktopSettings(); }
};
window.closeDesktopSettingsModal = function() {
  const m = document.getElementById('modalDesktopSettings');
  if (m) m.style.display = 'none';
};
window.openDesktopAIToolsModal = function() {
  const m = document.getElementById('modalDesktopAITools');
  if (m) m.style.display = 'flex';
};
window.closeDesktopAIToolsModal = function() {
  const m = document.getElementById('modalDesktopAITools');
  if (m) m.style.display = 'none';
};

function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('[LADDU] WebSocket Link Established.');
    document.getElementById('systemPulse').style.background = 'var(--neon-green)';
    document.getElementById('systemStatusText').textContent = 'ONLINE';
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleServerMessage(msg);
    } catch (err) {
      console.error('[LADDU] WS parse error:', err);
    }
  };

  ws.onclose = () => {
    console.warn('[LADDU] WebSocket disconnected. Retrying in 3s...');
    document.getElementById('systemPulse').style.background = 'var(--neon-red)';
    document.getElementById('systemStatusText').textContent = 'OFFLINE';
    setTimeout(initWebSocket, 3000);
  };
}

function handleServerMessage(msg) {
  switch (msg.type) {
    case 'WELCOME':
      updateTelemetry();
      if (msg.payload?.enrolledSpeakers?.length > 0) {
        updateVoiceIdBadge(msg.payload.enrolledSpeakers[0].name, true);
      }
      if (msg.payload?.activeRole) {
        updateRolePill(msg.payload.activeRole, msg.payload.isRoleLocked);
      }
      break;

    case 'ROLE_CHANGED':
      if (msg.payload?.activeRole) {
        updateRolePill(msg.payload.activeRole, msg.payload.isLocked);
      }
      break;

    case 'AI_STATE_CHANGE':
      setAIActivityState(msg.payload.state);
      break;

    case 'VOICE_OUTPUT':
      speakBrowser(msg.payload);
      break;

    case 'VOICE_RESULT':
      if (msg.payload && msg.payload.response) {
        if (msg.payload.speaker) {
          updateVoiceIdBadge(msg.payload.speaker.name, msg.payload.isVerified);
        }
        if (msg.payload.role) {
          updateRolePill(msg.payload.role, false);
        }
        appendChatMessage('assistant', msg.payload.response, [], msg.payload.role, msg.payload);

        // Immediate triggers
        if (msg.payload.telUri || msg.payload.action === 'CALL_PHONE') {
          triggerDesktopCall(msg.payload);
        }
        if (msg.payload.action === 'OPEN_WHATSAPP') {
          openWhatsAppWithFallback();
        }
        if (msg.payload.url && msg.payload.action !== 'OPEN_WHATSAPP') {
          try { window.open(msg.payload.url, '_blank'); } catch (e) { console.warn(e); }
        }
      }
      break;
  }
}

function updateVoiceIdBadge(name, isVerified) {
  const badge = document.getElementById('voiceIdBadge');
  const text = document.getElementById('voiceIdText');
  if (!badge || !text) return;

  if (isVerified) {
    badge.style.borderColor = 'var(--neon-green)';
    badge.style.color = 'var(--neon-green)';
    text.textContent = `VOICE ID: VERIFIED (${name.toUpperCase()})`;
  } else {
    badge.style.borderColor = 'var(--neon-amber)';
    badge.style.color = 'var(--neon-amber)';
    text.textContent = `VOICE ID: UNVERIFIED GUEST`;
  }
}

// ==========================================
// 3. AI PIPELINE STATE VISUALIZER
// ==========================================
function setAIActivityState(state) {
  currentAiState = state || 'IDLE';
  const steps = document.querySelectorAll('.pipeline-step');
  steps.forEach(step => {
    if (step.dataset.step === currentAiState) {
      step.classList.add('active');
    } else {
      step.classList.remove('active');
    }
  });

  const coreStateText = document.getElementById('coreStateText');
  if (coreStateText) {
    coreStateText.textContent = currentAiState;
  }
}

// ==========================================
// 4. ARC REACTOR & AUDIO VISUALIZER
// ==========================================
function initCanvasVisualizer() {
  const canvas = document.getElementById('voiceVisualizer');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let angle = 0;

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    angle += 0.015;

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, 130, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rotating segment ring
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.arc(0, 0, 110, 0, Math.PI * 1.5);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Counter-rotating dashed ring
    ctx.beginPath();
    ctx.arc(0, 0, 95, 0, Math.PI * 2);
    ctx.setLineDash([8, 12]);
    ctx.strokeStyle = 'rgba(0, 136, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Waveform frequency bars
    const barCount = 32;
    const radius = 70;
    let freqData = null;
    if (analyser) {
      freqData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(freqData);
    }

    for (let i = 0; i < barCount; i++) {
      const theta = (i / barCount) * Math.PI * 2;
      let barLength = 6;

      if (freqData && isListening) {
        barLength = 6 + (freqData[i * 2] || 0) * 0.15;
      } else if (isListening || currentAiState === 'THINKING' || currentAiState === 'SPEAKING') {
        barLength = 6 + Math.sin(angle * 4 + i) * 14 + Math.random() * 8;
      }

      const x1 = centerX + Math.cos(theta) * radius;
      const y1 = centerY + Math.sin(theta) * radius;
      const x2 = centerX + Math.cos(theta) * (radius + barLength);
      const y2 = centerY + Math.sin(theta) * (radius + barLength);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = currentAiState === 'SPEAKING' ? 'rgba(0, 255, 170, 0.8)' : 'rgba(0, 240, 255, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Inner pulsing core
    const corePulse = 35 + Math.sin(angle * 3) * 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, corePulse, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    requestAnimationFrame(render);
  }

  render();
}

// ==========================================
// 5. WEB AUDIO & VOICE BIOMETRICS EXTRACTION
// ==========================================
async function initAudioContext() {
  if (audioCtx) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;

    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioCtx.createMediaStreamSource(micStream);
    source.connect(analyser);
  } catch (err) {
    console.warn('[LADDU] AudioContext microphone link unavailable:', err.message);
  }
}

/**
 * Extract acoustic spectral features (pitch, centroid, energy bands) from microphone
 */
function extractAcousticFeatures() {
  if (!analyser) {
    return { pitch: 135, spectralCentroid: 1650, energyBands: [0.35, 0.45, 0.20] };
  }

  const freqData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(freqData);

  let totalAmp = 0;
  let weightedFreq = 0;
  let lowEnergy = 0, midEnergy = 0, highEnergy = 0;
  const sampleRate = audioCtx.sampleRate || 44100;
  const binWidth = sampleRate / analyser.fftSize;

  for (let i = 0; i < freqData.length; i++) {
    const amp = freqData[i];
    const freq = i * binWidth;
    totalAmp += amp;
    weightedFreq += freq * amp;

    if (freq < 500) lowEnergy += amp;
    else if (freq < 2000) midEnergy += amp;
    else highEnergy += amp;
  }

  const spectralCentroid = totalAmp > 0 ? (weightedFreq / totalAmp) : 1650;
  const totalBand = (lowEnergy + midEnergy + highEnergy) || 1;

  // Approximate fundamental pitch via peak in voice band (80Hz - 350Hz)
  let peakBin = 5;
  let maxPeak = 0;
  const minBin = Math.floor(80 / binWidth);
  const maxBin = Math.floor(350 / binWidth);
  for (let i = minBin; i <= maxBin; i++) {
    if (freqData[i] > maxPeak) {
      maxPeak = freqData[i];
      peakBin = i;
    }
  }
  const estimatedPitch = Math.max(90, Math.min(300, peakBin * binWidth));

  return {
    pitch: estimatedPitch,
    spectralCentroid: Math.round(spectralCentroid),
    energyBands: [
      Math.round((lowEnergy / totalBand) * 100) / 100,
      Math.round((midEnergy / totalBand) * 100) / 100,
      Math.round((highEnergy / totalBand) * 100) / 100
    ]
  };
}

// ==========================================
// 5.5 DESKTOP AUTO-DIAL & TELEPHONY DISPATCHER
// ==========================================
function triggerDesktopCall(payload) {
  if (!payload) return;
  const telUri = payload.telUri;
  const phoneLinkUri = payload.phoneLinkUri;
  const contactName = payload.contact || 'Contact';
  const phone = payload.phoneNumber || '';

  console.log('[LADDU Desktop] Triggering call dispatch:', { telUri, phoneLinkUri, contactName, phone });

  // 1. Show floating auto-dial banner
  const banner = document.getElementById('deskAutoDialBanner');
  const textEl = document.getElementById('deskAutoDialText');
  const dialBtn = document.getElementById('deskBtnTriggerDial');

  if (banner && textEl) {
    textEl.textContent = `DIALING: ${contactName} (${phone}) - Launching Phone Link / Dialer...`;
    banner.style.display = 'flex';
    const targetLink = phoneLinkUri || telUri;
    if (dialBtn && targetLink) {
      dialBtn.onclick = () => { window.location.href = targetLink; };
    }
    setTimeout(() => { banner.style.display = 'none'; }, 10000);
  }

  // 2. Programmatic hidden link click (Windows Phone Link or Tel URI)
  const uriToTrigger = phoneLinkUri || telUri;
  if (uriToTrigger) {
    try {
      const link = document.createElement('a');
      link.href = uriToTrigger;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => link.remove(), 1000);
    } catch (e) {
      console.warn('Desktop link click failed:', e);
    }

    try {
      window.location.assign(uriToTrigger);
    } catch (e) {
      try { window.location.href = uriToTrigger; } catch(err) {}
    }
  }
}

// ==========================================
// 6. WEB SPEECH API (STT & TTS)
// ==========================================
function initSpeechRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    console.warn('[LADDU] Web SpeechRecognition API not supported in this browser.');
    return;
  }

  recognition = new SpeechRec();
  recognition.continuous = true;
  recognition.interimResults = true; // Real-time feedback
  recognition.lang = localStorage.getItem('laddu_speech_lang') || 'en-IN';

  const defaultPlaceholder = 'Command LADDU, ask anything, or drag & drop files...';

  let deskSessionTranscript = '';
  let deskSpeechDebounceTimer = null;

  async function dispatchDeskAccumulatedSpeech(fallbackTranscript = '') {
    const textToProcess = (deskSessionTranscript || fallbackTranscript || '').trim();
    if (!textToProcess) return;
    const rawSpoken = removeSpeechStutter(textToProcess);
    deskSessionTranscript = '';

    let cleanedFinal = rawSpoken.replace(/\b(?:ladder|latter|latte|let\s*do|lead\s*you|let\s*you|ladoo|laddoo|ladu|luddu|laadu|laru|lattu|lallu|lalu|labbu|radu|raddu|radoo)\b/gi, 'laddu');
    cleanedFinal = cleanedFinal.replace(/\b(?:hey|hay|hi|hello|ok|okay|sun|suno|are|arre|oye|oi|ae)\s+laddu\b/gi, 'hey laddu');

    if (/\b(?:hey\s+laddu|laddu|jarvis)\b/i.test(cleanedFinal)) {
      playWakeChime();
    }

    const chatInput = document.getElementById('chatInput');
    if (chatInput) chatInput.placeholder = defaultPlaceholder;
    console.log('[LADDU Desktop Voice Final Dispatched]:', cleanedFinal);

    // Stop recognition session temporarily so next sentence starts clean
    if (recognition && isListening) {
      try { recognition.stop(); } catch {}
    }

    // Check for single incomplete keywords
    const cleanCommand = cleanedFinal.replace(/^(?:hey\s+)?(?:laddu|jarvis)[,\s]*/i, '').trim();
    if (cleanCommand.toLowerCase() === 'call' || cleanCommand.toLowerCase() === 'dial') {
      appendChatMessage('assistant', 'Who would you like me to call? Please tell me the name or phone number.');
      speakBrowser({ text: 'Who would you like me to call?' });
      return;
    }
    if (cleanCommand.toLowerCase() === 'open' || cleanCommand.toLowerCase() === 'launch') {
      appendChatMessage('assistant', 'Which application or website would you like me to open?');
      speakBrowser({ text: 'Which application or website would you like me to open?' });
      return;
    }

    // Route voice command directly into unified sendChat pipeline
    if (chatInput) chatInput.value = cleanCommand || cleanedFinal;
    await sendChat();
  }

  recognition.onresult = (event) => {
    if (isSpeakingAudio) return;

    let finalPart = '';
    let interimPart = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      const text = (res[0].transcript || '').trim();
      if (!text) continue;
      if (res.isFinal) {
        finalPart += (finalPart ? ' ' : '') + text;
      } else {
        interimPart += (interimPart ? ' ' : '') + text;
      }
    }

    if (finalPart) {
      deskSessionTranscript = (deskSessionTranscript ? deskSessionTranscript + ' ' : '') + finalPart;
    }

    let rawSpoken = deskSessionTranscript;
    if (interimPart && !rawSpoken.toLowerCase().includes(interimPart.toLowerCase())) {
      rawSpoken = (rawSpoken ? rawSpoken + ' ' : '') + interimPart;
    }

    const cleanSpoken = removeSpeechStutter(rawSpoken);
    const chatInput = document.getElementById('chatInput');
    const coreStateText = document.getElementById('coreStateText');

    if (cleanSpoken) {
      let hearingText = cleanSpoken.replace(/\b(?:ladder|let do|lead you|ladoo|laddoo|ladu|luddu|ludo)\b/gi, 'laddu');
      if (coreStateText) coreStateText.textContent = 'HEARING: "' + hearingText + '"';
      if (chatInput) chatInput.placeholder = '🎙️ Hearing: "' + hearingText + '"...';
    }

    // Smart Debounce: 500ms snappy response window
    const cleanedCheck = cleanSpoken
      .replace(/^(?:hey\s+)?(?:laddu|jarvis)[,\s]*/i, '')
      .trim()
      .toLowerCase();
    
    const isIncompleteStarter = /^(?:call|dial|phone|ring|open|launch|start|visit|generate|create|draw|make|paint|use|search|find|show|what\s+is|who\s+is|how\s+to|tell\s+me)$/i.test(cleanedCheck);
    const debounceWait = isIncompleteStarter ? 1200 : 500;

    if (deskSpeechDebounceTimer) clearTimeout(deskSpeechDebounceTimer);
    if (cleanSpoken.trim()) {
      deskSpeechDebounceTimer = setTimeout(() => {
        dispatchDeskAccumulatedSpeech(cleanSpoken);
      }, debounceWait);
    }
  };

  recognition.onerror = (err) => {
    console.warn('[LADDU Voice Error]:', err.error);
    if (err.error === 'not-allowed') {
      const banner = document.getElementById('deskVoiceHelpBanner');
      if (banner) banner.style.display = 'flex';
      setAIActivityState('MIC BLOCKED');
    }
  };

  recognition.onend = () => {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) chatInput.placeholder = defaultPlaceholder;

    // Immediately dispatch accumulated speech if complete thought heard
    if (deskSessionTranscript && deskSessionTranscript.trim()) {
      if (deskSpeechDebounceTimer) {
        clearTimeout(deskSpeechDebounceTimer);
        deskSpeechDebounceTimer = null;
      }
      dispatchDeskAccumulatedSpeech();
    }

    if (isListening && !isSpeakingAudio) {
      try { recognition.start(); } catch {}
    }
  };
}

async function toggleListening() {
  await initAudioContext();
  if (!recognition) {
    alert('Web Speech API is not supported in this browser. Please use text chat.');
    return;
  }

  // Cancel any ongoing speech
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  isSpeakingAudio = false;
  if (deskSpeechWatchdog) {
    clearTimeout(deskSpeechWatchdog);
    deskSpeechWatchdog = null;
  }

  isListening = !isListening;
  const btn = document.getElementById('btnToggleVoice');
  const label = document.getElementById('voiceBtnLabel');
  const chatVoiceBtn = document.getElementById('btnChatVoice');

  if (isListening) {
    try {
      recognition.start();
      setAIActivityState('LISTENING');
      if (label) label.textContent = 'STOP LISTENING';
      if (btn) btn.classList.add('active');
      if (chatVoiceBtn) {
        chatVoiceBtn.style.background = 'var(--neon-green)';
        chatVoiceBtn.style.color = '#000';
      }
    } catch (e) {
      console.error(e);
    }
  } else {
    recognition.stop();
    setAIActivityState('IDLE');
    if (label) label.textContent = 'START LISTENING';
    if (btn) btn.classList.remove('active');
    if (chatVoiceBtn) {
      chatVoiceBtn.style.background = 'transparent';
      chatVoiceBtn.style.color = 'inherit';
    }
  }
}

let currentVoiceGender = localStorage.getItem('laddu_voice_gender') || 'female';

function getOptimalVoice(gender = (localStorage.getItem('laddu_voice_gender') || 'female')) {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const currentLang = localStorage.getItem('laddu_speech_lang') || 'en-IN';
  const langPrefix = currentLang.split('-')[0].toLowerCase();

  if (gender === 'female') {
    const femaleKeywords = [
      'female', 'zira', 'heera', 'neerja', 'samantha', 'victoria', 'karen',
      'veena', 'swara', 'geeta', 'sangeeta', 'priya', 'kalpana', 'hazel',
      'susan', 'catherine', 'eva', 'serena', 'moira', 'tessa', 'fiona',
      'allison', 'ava', 'jenny', 'aria', 'natasha'
    ];

    let match = voices.find(v => v.lang.toLowerCase() === currentLang.toLowerCase() && femaleKeywords.some(kw => v.name.toLowerCase().includes(kw)));
    if (!match) match = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix) && femaleKeywords.some(kw => v.name.toLowerCase().includes(kw)));
    if (!match) match = voices.find(v => v.lang.toLowerCase().startsWith('en') && femaleKeywords.some(kw => v.name.toLowerCase().includes(kw)));
    if (!match) match = voices.find(v => femaleKeywords.some(kw => v.name.toLowerCase().includes(kw)));
    if (!match) match = voices.find(v => /female/i.test(v.name));
    if (!match) match = voices.find(v => v.lang.toLowerCase() === currentLang.toLowerCase());
    return match || voices[0];
  } else {
    const maleKeywords = ['male', 'david', 'mark', 'george', 'rishi', 'ravi', 'alex', 'daniel', 'fred', 'oliver', 'aaron'];
    let match = voices.find(v => maleKeywords.some(kw => v.name.toLowerCase().includes(kw)));
    return match || voices[0];
  }
}

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => { getOptimalVoice(); };
}

let deskSpeechWatchdog = null;

function speakBrowser(speechPayload) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  // If payload triggers a phone call or URL
  if (speechPayload.telUri) {
    window.location.href = speechPayload.telUri;
  }
  if (speechPayload.url && speechPayload.action !== 'OPEN_WHATSAPP') {
    window.open(speechPayload.url, '_blank');
  }

  const utterance = new SpeechSynthesisUtterance(speechPayload.text);
  const voice = getOptimalVoice();
  if (voice) {
    utterance.voice = voice;
  }

  const isFemale = (localStorage.getItem('laddu_voice_gender') || 'female') === 'female';
  utterance.rate = speechPayload.rate || 1.0;
  utterance.pitch = speechPayload.pitch ? speechPayload.pitch : (isFemale ? 1.15 : 1.0);

  let finished = false;
  const finishDeskSpeech = () => {
    if (finished) return;
    finished = true;
    if (deskSpeechWatchdog) {
      clearTimeout(deskSpeechWatchdog);
      deskSpeechWatchdog = null;
    }
    // 450ms echo cancellation dampening delay
    setTimeout(() => {
      isSpeakingAudio = false;
      setAIActivityState('IDLE');
      if (recognition && isListening) {
        try { recognition.start(); } catch {}
      }
    }, 450);
  };

  utterance.onstart = () => {
    isSpeakingAudio = true;
    setAIActivityState('SPEAKING');
    // Pause recognition to prevent mic from hearing speakers
    if (recognition && isListening) {
      try { recognition.abort(); } catch {}
    }
  };

  utterance.onend = finishDeskSpeech;
  utterance.onerror = finishDeskSpeech;

  // Watchdog timer for SpeechSynthesisUtterance
  const estDuration = Math.max(3000, Math.min(25000, ((speechPayload.text || '').length / 10) * 1000 + 3000));
  if (deskSpeechWatchdog) clearTimeout(deskSpeechWatchdog);
  deskSpeechWatchdog = setTimeout(() => {
    console.warn('[LADDU Desktop] Speech synthesis watchdog triggered. Resuming IDLE state.');
    finishDeskSpeech();
  }, estDuration);

  window.speechSynthesis.speak(utterance);
}

function interruptSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'INTERRUPT' }));
  }
  setAIActivityState('IDLE');
}

// ==========================================
// 7. CHAT FEED & MULTIMODAL MESSAGE HANDLING
// ==========================================
let attachedFiles = [];
let isWebSearchActive = true;

function formatAssistantMarkdown(raw) {
  if (!raw) return '';
  let str = escapeHtml(raw);
  str = str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  str = str.replace(/\*(.*?)\*/g, '<em>$1</em>');
  str = str.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--neon-cyan);text-decoration:underline;font-weight:600;">$1 ↗</a>');
  str = str.replace(/\n/g, '<br>');
  return str;
}

function appendChatMessage(role, text, citations = [], roleInfo = null, actionMeta = null, attachedItems = []) {
  const container = document.getElementById('chatMessages');
  const msgEl = document.createElement('div');
  msgEl.className = `message ${role}`;

  const avatar = role === 'assistant' ? '<img src="./icons/icon-192.png" alt="LADDU" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">' : 'U';
  let badgeLabel = '';
  if (roleInfo) {
    if (roleInfo.id === 'friend') badgeLabel = 'FRIEND';
    else if (roleInfo.id === 'assistant') badgeLabel = 'JARVIS';
    else if (roleInfo.id === 'teacher') badgeLabel = 'TEACHER';
    else if (roleInfo.id === 'mentor') badgeLabel = 'MENTOR';
    else if (roleInfo.id === 'counselor') badgeLabel = 'WELLNESS';
    else badgeLabel = (roleInfo.name ? roleInfo.name.split(' ').pop() : '').toUpperCase();
  }
  const roleTag = (role === 'assistant' && roleInfo && badgeLabel) ? ` <span style="font-size:10px;padding:2px 7px;border-radius:10px;background:rgba(0,240,255,0.15);color:var(--neon-cyan);margin-left:6px;border:1px solid rgba(0,240,255,0.3);">${roleInfo.icon || ''} ${badgeLabel}</span>` : '';
  const senderName = role === 'assistant' ? `LADDU${roleTag}` : 'USER';

  let attachmentsHtml = '';
  if (attachedItems && attachedItems.length > 0) {
    attachmentsHtml = `<div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">` +
      attachedItems.map(a => {
        if (a.type === 'image') {
          return `<img src="${a.preview || a.data}" style="max-height:120px;border-radius:6px;border:1px solid var(--border-cyan);box-shadow:0 0 10px rgba(0,240,255,0.2);">`;
        } else {
          return `<div style="background:rgba(0,0,0,0.5);border:1px solid var(--border-cyan);padding:6px 10px;border-radius:4px;font-size:12px;color:var(--neon-cyan);display:flex;align-items:center;gap:6px;"><span>📄</span> <strong>${escapeHtml(a.filename)}</strong></div>`;
        }
      }).join('') +
    `</div>`;
  }

  let citationsHtml = '';
  if (citations && citations.length > 0) {
    citationsHtml = '<div class="citations-block" style="margin-top:10px;padding:8px 12px;background:rgba(0,240,255,0.05);border-left:2px solid var(--neon-cyan);border-radius:4px;font-size:11px;"><strong>🌐 Live Web Citations:</strong><ul style="margin:4px 0 0 16px;padding:0;">';
    citations.forEach(c => {
      const link = c.url ? `<a href="${c.url}" target="_blank" style="color:var(--neon-cyan);text-decoration:underline;">${escapeHtml(c.source)}</a>` : escapeHtml(c.source);
      citationsHtml += `<li style="margin-bottom:2px;">${link}: <em>${escapeHtml(c.snippet || '')}</em></li>`;
    });
    citationsHtml += '</ul></div>';
  }

  let actionCardHtml = '';

    // Render AI Generated Image Card
    if (actionMeta && (actionMeta.action === 'AI_IMAGE_GENERATED' || actionMeta.imageUrl)) {
      actionCardHtml += '<div style="margin-top:10px;padding:12px;background:rgba(0,0,0,0.6);border:1px solid var(--neon-cyan);border-radius:10px;box-shadow:0 0 20px rgba(0,240,255,0.25);">' +
        '<div style="font-family:var(--font-hud);font-size:11px;color:var(--neon-cyan);margin-bottom:8px;">🎨 LADDU AI IMAGE STUDIO</div>' +
        '<div style="position:relative;border-radius:8px;overflow:hidden;margin-bottom:8px;background:#000;">' +
          '<img src="' + actionMeta.imageUrl + '" alt="' + (actionMeta.imagePrompt || '') + '" style="width:100%;max-height:420px;object-fit:cover;display:block;border-radius:8px;" onclick="window.open(\'' + actionMeta.imageUrl + '\', \'_blank\')">' +
        '</div>' +
        '<div style="font-size:12px;color:#fff;font-style:italic;margin-bottom:10px;">\"' + (actionMeta.imagePrompt || '') + '\"</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<a href="' + actionMeta.imageUrl + '" target="_blank" download="laddu-image.jpg" class="action-btn glow-btn" style="text-decoration:none;padding:6px 14px;font-size:11px;">📥 DOWNLOAD IMAGE</a>' +
          '<button onclick="window.open(\'' + actionMeta.imageUrl + '\', \'_blank\')" class="action-btn outline-btn" style="padding:6px 14px;font-size:11px;">🔍 FULLSCREEN</button>' +
        '</div>' +
      '</div>';
    }

    // Render Multi-AI Tool Card (Perplexity, Gamma, Antigravity)
    if (actionMeta && (actionMeta.action === 'LAUNCH_AI_TOOL' || actionMeta.toolUrl)) {
      actionCardHtml += '<div style="margin-top:10px;padding:12px 14px;background:linear-gradient(135deg, rgba(0,240,255,0.08), rgba(187,0,255,0.08));border:1px solid var(--neon-cyan);border-radius:8px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span style="font-size:22px;">' + (actionMeta.toolIcon || '⚡') + '</span>' +
            '<div>' +
              '<div style="font-family:var(--font-hud);font-size:13px;color:#fff;font-weight:700;">' + actionMeta.toolName + '</div>' +
              '<div style="font-size:10px;color:var(--text-dim);">' + (actionMeta.toolDesc || '') + '</div>' +
            '</div>' +
          '</div>' +
          '<a href="' + actionMeta.toolUrl + '" target="_blank" class="action-btn glow-btn" style="text-decoration:none;padding:6px 14px;font-size:11px;white-space:nowrap;">' +
            'LAUNCH ↗' +
          '</a>' +
        '</div>' +
      '</div>';
    }

    // Render Native WhatsApp Action Card
    if (actionMeta && actionMeta.action === 'OPEN_WHATSAPP') {
      actionCardHtml += '<div class="whatsapp-action-card" style="margin-top:10px;padding:12px 14px;background:rgba(37,211,102,0.1);border:1px solid #25D366;border-radius:8px;">' +
        '<div style="font-family:var(--font-hud);font-size:11px;color:#25D366;margin-bottom:6px;display:flex;align-items:center;gap:6px;"><span>💬</span> WHATSAPP LAUNCHER</div>' +
        '<div style="font-size:12px;color:#fff;margin-bottom:10px;">Launching WhatsApp application. If the app is not installed, open Web:</div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
          '<a href="whatsapp://" class="action-btn" style="background:#25D366;color:#000;border:none;padding:8px 16px;font-size:12px;font-weight:700;text-decoration:none;border-radius:4px;display:inline-flex;align-items:center;gap:4px;">📱 OPEN APP</a>' +
          '<a href="https://web.whatsapp.com" target="_blank" rel="noopener" class="action-btn outline-btn" style="text-decoration:none;padding:8px 16px;font-size:12px;font-weight:600;border-radius:4px;display:inline-flex;align-items:center;gap:4px;">🌐 OPEN WEB</a>' +
        '</div>' +
      '</div>';
    }
  
  if (actionMeta) {
    // 1. Direct Phone Call / Speed Dial Card
    if (actionMeta.action === 'CALL_PHONE' || actionMeta.telUri) {
      const contactLabel = actionMeta.contact ? `${escapeHtml(actionMeta.contact)} &bull; ` : '';
      const phoneNum = actionMeta.phoneNumber || '';
      actionCardHtml = `
        <div class="call-action-card" style="margin-top:10px;padding:12px 14px;background:rgba(0,240,255,0.08);border:1px solid var(--neon-cyan);border-radius:8px;">
          <div style="font-family:var(--font-hud);font-size:11px;color:var(--neon-cyan);margin-bottom:6px;display:flex;align-items:center;gap:6px;letter-spacing:1px;">
            <span>📞</span> DIRECT CALL DISPATCH
          </div>
          <div style="font-size:13px;color:#fff;font-weight:600;margin-bottom:8px;">
            ${contactLabel}${phoneNum}
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            <a href="${actionMeta.telUri}" class="action-btn glow-btn" style="text-decoration:none;padding:7px 14px;font-size:11px;display:inline-flex;align-items:center;gap:5px;">
              📞 LAUNCH DIALER
            </a>
            ${actionMeta.waUri ? `
            <a href="${actionMeta.waUri}" target="_blank" class="action-btn" style="text-decoration:none;padding:7px 14px;font-size:11px;background:#25D366;color:#fff;border:none;display:inline-flex;align-items:center;gap:5px;">
              💬 WHATSAPP CALL / CHAT
            </a>` : ''}
            ${actionMeta.phoneLinkUri ? `
            <a href="${actionMeta.phoneLinkUri}" class="action-btn outline-btn" style="text-decoration:none;padding:7px 14px;font-size:11px;display:inline-flex;align-items:center;gap:5px;">
              💻 MS PHONE LINK
            </a>` : ''}
          </div>
        </div>
      `;
    } else if (actionMeta.action === 'OPEN_URL' || actionMeta.url) {
      // 2. Direct Application / Web URL Card
      const appName = actionMeta.app || 'Web Resource';
      actionCardHtml = `
        <div class="url-action-card" style="margin-top:10px;padding:10px 14px;background:rgba(0,255,136,0.08);border:1px solid var(--neon-green);border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <div style="font-size:12px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            🌐 <strong>${escapeHtml(appName)}</strong>: <span style="color:var(--text-dim);font-size:11px;">${escapeHtml(actionMeta.url)}</span>
          </div>
          <a href="${actionMeta.url}" target="_blank" class="action-btn glow-btn" style="text-decoration:none;padding:6px 14px;font-size:11px;white-space:nowrap;">
            OPEN LINK ↗
          </a>
        </div>
      `;
    }
  }

  const bodyContent = role === 'assistant' ? formatAssistantMarkdown(text) : escapeHtml(text);

  msgEl.innerHTML = `
    <div class="msg-avatar">${avatar}</div>
    <div class="msg-body">
      <div class="msg-sender">${senderName}</div>
      <div class="msg-text">${attachmentsHtml}${bodyContent}${citationsHtml}${actionCardHtml}</div>
    </div>
  `;

  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text && attachedFiles.length === 0) return;

  const currentAttachments = [...attachedFiles];
  attachedFiles = [];
  renderAttachmentPreviewBar();

  input.value = '';
  const displayPrompt = text || (currentAttachments.some(a => a.type === 'image') ? 'Analyze attached image' : 'Analyze attached document');
  appendChatMessage('user', displayPrompt, [], null, null, currentAttachments);
  setAIActivityState('THINKING');

  try {
    const audioFeatures = extractAcousticFeatures();
    const effectiveMsg = text || (currentAttachments.some(a => a.type === 'image') ? 'Analyze this image and explain in detail what is shown.' : 'Summarize and analyze the attached document.');

    const customRemote = (localStorage.getItem('laddu_remote_server_url') || '').trim().replace(/\/+$/, '');
    const apiUrl = customRemote ? `${customRemote}/api/chat` : '/api/chat';

        // Instant Client Interceptors (Image Gen, Multi-AI Tools, WhatsApp)
    const cleanLower = text.toLowerCase().trim();

    const imgMatch = cleanLower.match(/(?:generate|create|draw|make|paint)?\s*(?:an?\s+)?(?:image|picture|photo|illustration|art)\s+(?:of|for|about|on)?\s*(.+)/i) || cleanLower.match(/^(?:draw|paint)\s+(.+)$/i);
    if (imgMatch) {
      const rawPrompt = imgMatch[1].trim();
      const cleanPrompt = rawPrompt.replace(/^(?:me\s+)?(?:an?\s+)?/i, '').trim();
      const imageUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(cleanPrompt) + '?width=1024&height=1024&nologo=true&enhance=true';
      const imgData = {
        content: 'Here is the AI image generated for **"' + cleanPrompt + '"**:',
        action: 'AI_IMAGE_GENERATED',
        imageUrl,
        imagePrompt: cleanPrompt,
        role: { id: 'assistant', name: 'Creative Studio (LADDU)', icon: '🎨' },
        model: 'pollinations-genai'
      };
      appendChatMessage('assistant', imgData.content, [], imgData.role, imgData);
      speakBrowser({ text: 'Here is the AI image generated for ' + cleanPrompt });
      setAIActivityState('IDLE');
      return;
    }

    const perplexityMatch = cleanLower.match(/^(?:use\s+perplexity\s+(?:to\s+)?(?:research|search)?|deep\s+research|research\s+deeply\s+on|research)\s+(.+)$/i);
    if (perplexityMatch) {
      const topic = perplexityMatch[1].trim();
      const perplexityUrl = 'https://www.perplexity.ai/search?q=' + encodeURIComponent(topic);
      const pData = {
        content: 'I have compiled a deep research dispatch for **"' + topic + '"**. Explore synthesized intelligence with web citations:',
        action: 'LAUNCH_AI_TOOL',
        toolName: 'Perplexity AI',
        toolIcon: '🔍',
        toolDesc: 'Deep AI Research & Multi-Source Synthesis',
        toolUrl: perplexityUrl,
        topic,
        role: { id: 'mentor', name: 'Research Intelligence (Perplexity)', icon: '🔍' },
        model: 'perplexity-router'
      };
      appendChatMessage('assistant', pData.content, [], pData.role, pData);
      speakBrowser({ text: 'I have opened Perplexity AI research for ' + topic });
      setAIActivityState('IDLE');
      return;
    }

    const gammaMatch = cleanLower.match(/^(?:use\s+gamma\s+(?:to\s+)?(?:make|generate|create)?|generate\s+ppt|make\s+ppt|create\s+ppt|generate\s+presentation|make\s+presentation|create\s+presentation|create\s+slides)\s+(?:on|about)?\s*(.+)$/i);
    if (gammaMatch) {
      const topic = gammaMatch[1].trim();
      const gammaUrl = 'https://gamma.app';
      const gData = {
        content: '### 📊 Slide Deck Blueprint: ' + topic.toUpperCase() + '\n\n* **Slide 1: Title & Vision**\n* **Slide 2: Core Challenges**\n* **Slide 3: Strategic Innovation**\n* **Slide 4: Roadmap**\n* **Slide 5: Summary**\n\n*Convert this into an AI presentation directly on Gamma App below:*',
        action: 'LAUNCH_AI_TOOL',
        toolName: 'Gamma App',
        toolIcon: '📊',
        toolDesc: 'AI Presentation & Slide Deck Generator',
        toolUrl: gammaUrl,
        topic,
        role: { id: 'assistant', name: 'Presentation Architect (Gamma)', icon: '📊' },
        model: 'gamma-router'
      };
      appendChatMessage('assistant', gData.content, [], gData.role, gData);
      speakBrowser({ text: 'Here is your presentation outline. You can launch Gamma App to create the slides.' });
      setAIActivityState('IDLE');
      return;
    }

    const devMatch = cleanLower.match(/^(?:use\s+(?:antigravity|v0|claude)\s+(?:to\s+)?(?:build|make|code)?|build\s+app|make\s+app|code\s+app|develop\s+app|create\s+website)\s+(?:for|about)?\s*(.+)$/i);
    if (devMatch) {
      const topic = devMatch[1].trim();
      const devUrl = 'https://v0.dev';
      const dData = {
        content: '### 🚀 Software Architecture: ' + topic.toUpperCase() + '\n\n* **Frontend**: Responsive PWA HUD\n* **Backend**: Node.js & WebSockets\n* **Intelligence**: Multimodal LLM\n* **Deployment**: 24/7 Cloud Autonomy\n\n*Build and deploy this app in Antigravity or v0 below:*',
        action: 'LAUNCH_AI_TOOL',
        toolName: 'Antigravity / v0',
        toolIcon: '🚀',
        toolDesc: 'Autonomous App Builder',
        toolUrl: devUrl,
        topic,
        role: { id: 'mentor', name: 'Engineering Architect (Antigravity)', icon: '🚀' },
        model: 'antigravity-router'
      };
      appendChatMessage('assistant', dData.content, [], dData.role, dData);
      speakBrowser({ text: 'Here is the architecture blueprint. You can launch Antigravity or v0 to build the application.' });
      setAIActivityState('IDLE');
      return;
    }

    const isWaCmd = /^(?:open|launch|start|run|go\s+to)?\s*(?:whats\s*app|whatsapp)(?:\s+(?:app|web|application))?$/i.test(cleanLower) ||
                    /^(?:whats\s*app|whatsapp)\s+(?:kholo|chalao|start|open\s*karo)$/i.test(cleanLower);
    if (isWaCmd) {
      openWhatsAppWithFallback();
      const waData = {
        content: 'Opening WhatsApp application now (or WhatsApp Web if not installed)...',
        action: 'OPEN_WHATSAPP',
        appUrl: 'whatsapp://',
        webUrl: 'https://web.whatsapp.com',
        url: 'whatsapp://',
        role: { id: 'assistant', name: 'Executive Assistant (JARVIS)', icon: '🤖' },
        model: 'standalone-launcher'
      };
      appendChatMessage('assistant', waData.content, [], waData.role, waData);
      speakBrowser({ text: 'Opening WhatsApp now.' });
      setAIActivityState('IDLE');
      return;
    }

    let data = null;
    const isGitHubPages = location.hostname.endsWith('github.io') || location.protocol === 'file:';
    const shouldTryServer = !!customRemote || !isGitHubPages;

    if (shouldTryServer) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: effectiveMsg,
            speaker: activeSpeaker,
            features: audioFeatures,
            webSearch: isWebSearchActive,
            images: currentAttachments.filter(a => a.type === 'image').map(a => ({ mimeType: a.mimeType, data: a.data })),
            documents: currentAttachments.filter(a => a.type === 'document').map(a => ({ filename: a.filename, text: a.extractedText }))
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          data = await res.json();
        }
      } catch (netErr) {
        // Laptop is switched off or unreachable — trigger Autonomous Cloud Engine
      }
    }

    if (!data) {
      data = await processDesktopAutonomous(effectiveMsg, currentAttachments);
    }

    if (data.role) {
      updateRolePill(data.role, false);
    }

    if (data.blocked) {
      appendChatMessage('assistant', `⚠️ ${data.content}`);
      loadPermissions();
    } else {
      appendChatMessage('assistant', data.content, data.citations || [], data.role, data);
      const roleVoice = data.role?.voiceSettings || {};
      speakBrowser({ text: data.content, rate: roleVoice.rate, pitch: roleVoice.pitch, telUri: data.telUri, url: data.url });

      // Immediate triggers
      if (data.telUri || data.action === 'CALL_PHONE') {
        triggerDesktopCall(data);
      }
      if (data.url) {
        try { window.open(data.url, '_blank'); } catch (e) { console.warn(e); }
      }
    }
  } catch (err) {
    appendChatMessage('assistant', `Error processing request: ${err.message}`);
  } finally {
    setAIActivityState('IDLE');
  }
}


// ==========================================
// GEMINI MULTI-KEY POOL & ROTATION (DESKTOP)
// ==========================================
class GeminiKeyPool {
  static getKeys() {
    const raw = localStorage.getItem('laddu_gemini_keys') || localStorage.getItem('laddu_gemini_key') || '';
    if (!raw) return [];
    return raw.split(/[\n,;]+/).map(k => k.trim()).filter(k => k.length > 10);
  }

  static setKeys(keysInput) {
    let arr = [];
    if (Array.isArray(keysInput)) {
      arr = keysInput;
    } else if (typeof keysInput === 'string') {
      arr = keysInput.split(/[\n,;]+/);
    }
    const cleaned = arr.map(k => k.trim()).filter(k => k.length > 10);
    localStorage.setItem('laddu_gemini_keys', cleaned.join(','));
    if (cleaned.length > 0) {
      localStorage.setItem('laddu_gemini_key', cleaned[0]);
    }
    return cleaned;
  }

  static getActiveKey() {
    const keys = this.getKeys();
    if (keys.length === 0) return null;
    let idx = parseInt(localStorage.getItem('laddu_gemini_active_idx') || '0', 10);
    if (isNaN(idx) || idx >= keys.length) idx = 0;
    return { key: keys[idx], index: idx, total: keys.length };
  }

  static rotateKey() {
    const keys = this.getKeys();
    if (keys.length <= 1) return null;
    let idx = parseInt(localStorage.getItem('laddu_gemini_active_idx') || '0', 10);
    idx = (idx + 1) % keys.length;
    localStorage.setItem('laddu_gemini_active_idx', idx.toString());
    console.log('[LADDU Gemini Pool] Rotated to key #' + (idx + 1) + ' of ' + keys.length);
    return { key: keys[idx], index: idx, total: keys.length };
  }

  static async generate(promptText, attachedItems = [], preferredModel = 'gemini-2.5-flash') {
    const keys = this.getKeys();
    if (keys.length === 0) return null;

    const models = [preferredModel, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    const uniqueModels = [...new Set(models)];

    const parts = [
      { text: 'You are LADDU, an AI assistant inspired by JARVIS. Respond helpfully, warmly, concisely, and intelligently. User says: ' + promptText }
    ];

    if (attachedItems && attachedItems.length > 0) {
      for (const item of attachedItems) {
        if (item.type === 'image' && item.data) {
          parts.push({
            inlineData: {
              mimeType: item.mimeType || 'image/jpeg',
              data: item.data.replace(/^data:image\/[a-z]+;base64,/, '')
            }
          });
        }
      }
    }

    let startIdx = parseInt(localStorage.getItem('laddu_gemini_active_idx') || '0', 10);
    if (isNaN(startIdx) || startIdx >= keys.length) startIdx = 0;

    for (let attempt = 0; attempt < keys.length; attempt++) {
      const currentIdx = (startIdx + attempt) % keys.length;
      const currentKey = keys[currentIdx];

      for (const model of uniqueModels) {
        try {
          const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + currentKey;
          const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts }],
              tools: [{ googleSearch: {} }]
            })
          });

          if (res.status === 429) {
            console.warn('[LADDU] Key #' + (currentIdx + 1) + ' hit 429 quota limit. Rotating...');
            this.rotateKey();
            break;
          }

          if (!res.ok) continue;

          const data = await res.json();
          const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            localStorage.setItem('laddu_gemini_active_idx', currentIdx.toString());
            const citations = [];
            const grounding = data?.candidates?.[0]?.groundingMetadata;
            if (grounding?.groundingChunks) {
              for (const chunk of grounding.groundingChunks) {
                if (chunk.web) citations.push({ source: chunk.web.title, url: chunk.web.uri });
              }
            }
            return {
              text: reply,
              citations,
              model: 'desktop-gemini-pool (' + model + ')',
              keyIndex: currentIdx + 1,
              totalKeys: keys.length
            };
          }
        } catch (err) {
          console.warn('[LADDU] Error contacting Gemini on key #' + (currentIdx + 1), err);
        }
      }
    }
    return null;
  }
}

// Sci-Fi Wake Chime (Ascending D5 -> A5 tone)
function playWakeChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.14);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.35);
  } catch (e) {
    console.warn('Wake chime error:', e);
  }
}

async function processDesktopAutonomous(rawText, currentAttachments = []) {
  const text = (rawText || '').trim();
  const cleanLower = text.toLowerCase().trim();

  // 1. Direct Phone Call Intent
  const callMatch = cleanLower.match(/^(?:call|dial|phone|ring)\s+(.+)$/i);
  if (callMatch) {
    const target = callMatch[1].trim();
    let contact = null;
    try {
      const stored = localStorage.getItem('laddu_contacts');
      const contacts = stored ? JSON.parse(stored) : [];
      contact = contacts.find(c => c.name.toLowerCase().includes(target.toLowerCase()));
    } catch {}

    const phoneNumber = contact ? contact.phone : target.replace(/[^0-9+]/g, '');
    const cleanPhone = (phoneNumber || '').replace(/[^0-9]/g, '');
    const telUri = `tel:${phoneNumber}`;
    const waUri = cleanPhone ? `https://wa.me/${cleanPhone}` : null;
    return {
      content: `Dialing ${contact ? contact.name : target} (${phoneNumber})...`,
      action: 'CALL_PHONE',
      contact: contact ? contact.name : target,
      phoneNumber,
      telUri,
      waUri,
      role: { id: 'assistant', name: 'Executive Assistant (JARVIS)', icon: '🤖' },
      model: 'standalone-telephony'
    };
  }

  // 2. Open Web Service / App (Native WhatsApp First)
  const isWaCmd = /^(?:open|launch|start|run|go\s+to)?\s*(?:whats\s*app|whatsapp)(?:\s+(?:app|web|application))?$/i.test(cleanLower) ||
                  /^(?:whats\s*app|whatsapp)\s+(?:kholo|chalao|start|open\s*karo)$/i.test(cleanLower);
  if (isWaCmd) {
    openWhatsAppWithFallback();
    return {
      content: 'Opening WhatsApp application now (or WhatsApp Web if not installed)...',
      action: 'OPEN_WHATSAPP',
      appUrl: 'whatsapp://',
      webUrl: 'https://web.whatsapp.com',
      url: 'whatsapp://',
      app: 'WhatsApp',
      role: { id: 'assistant', name: 'Executive Assistant (JARVIS)', icon: '🤖' },
      model: 'standalone-launcher'
    };
  }

  const openMatch = cleanLower.match(/^(?:open|launch|start|go\s+to|navigate\s+to|visit)\s+(.+)$/i);
  if (openMatch) {
    const target = openMatch[1].trim().toLowerCase();
    if (target === 'whatsapp' || target === 'whats app') {
      openWhatsAppWithFallback();
      return {
        content: 'Opening WhatsApp application now (or WhatsApp Web if not installed)...',
        action: 'OPEN_WHATSAPP',
        appUrl: 'whatsapp://',
        webUrl: 'https://web.whatsapp.com',
        url: 'whatsapp://',
        app: 'WhatsApp',
        role: { id: 'assistant', name: 'Executive Assistant (JARVIS)', icon: '🤖' },
        model: 'standalone-launcher'
      };
    }
    const webMap = {
      'youtube': 'https://www.youtube.com',
      'google': 'https://www.google.com',
      'whatsapp': 'https://web.whatsapp.com',
      'instagram': 'https://www.instagram.com',
      'chatgpt': 'https://chatgpt.com',
      'gmail': 'https://mail.google.com',
      'github': 'https://github.com',
      'spotify': 'https://open.spotify.com'
    };
    const url = webMap[target] || `https://www.${target.replace(/[^a-z0-9]/g, '')}.com`;
    return {
      content: `Opening ${openMatch[1]} now.`,
      action: 'OPEN_URL',
      url,
      app: openMatch[1],
      role: { id: 'assistant', name: 'Executive Assistant (JARVIS)', icon: '🤖' },
      model: 'standalone-launcher'
    };
  }

  
  // A. AI Image Generation Intent (Instant & 100% Free)
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

  // B. Multi-AI Tool Router: Perplexity (Research)
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

  // C. Multi-AI Tool Router: Gamma (Presentations / PPTs)
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

  // D. Multi-AI Tool Router: Antigravity / v0 (App Development)
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

  const hasDocs = currentAttachments.some(a => a.type === 'document' || a.extractedText || a.text);
  const hasImgs = currentAttachments.some(a => a.type === 'image' || (a.mimeType && a.mimeType.startsWith('image/')));

  // 3. Multi-Key Gemini Cloud API Pool with Auto-Failover (handles multimodal docs & images)
  const geminiRes = await GeminiKeyPool.generate(text, currentAttachments);
  if (geminiRes) {
    return {
      content: geminiRes.text,
      citations: geminiRes.citations,
      role: { id: 'friend', name: 'Close Friend', icon: '🧡' },
      model: geminiRes.model + ' [Key #' + geminiRes.keyIndex + '/' + geminiRes.totalKeys + ']'
    };
  }

  // Standalone Document & Image Summarizer (when offline or no Gemini key)
  if (hasDocs && (/(?:explain|summarize|summary|overview|short|tell\s+me|read|what\s+is\s+in|describe)/i.test(cleanLower) || !text || text === 'Summarize this document.')) {
    const doc = currentAttachments.find(a => a.type === 'document' || a.extractedText || a.text) || currentAttachments[0];
    const docName = doc.filename || 'Document';
    const docText = (doc.extractedText || doc.text || '').trim();
    const wordCount = docText ? docText.split(/\s+/).length : 0;
    const lineCount = docText ? docText.split(/\n+/).length : 0;
    
    const sentences = docText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 15).slice(0, 5);
    const bulletPoints = sentences.length > 0 
      ? sentences.map(s => `* **Key Point**: ${s.trim()}`).join('\n')
      : `* Content successfully indexed (${wordCount} words, ${lineCount} lines).`;

    return {
      content: `### 📄 Short Document Summary: ${docName}\n\n` +
               `* **Length**: ${wordCount} words across ${lineCount} lines\n` +
               `* **Key Highlights**:\n${bulletPoints}\n\n` +
               `*💡 Tip: Add free Gemini API key in **Settings (⚙️)** for deep neural document reasoning!*`,
      role: { id: 'mentor', name: 'Document Intelligence', icon: '📄' },
      model: 'standalone-doc-summarizer'
    };
  }

  if (hasImgs && (/(?:explain|summarize|describe|what\s+is|what\s+do\s+you\s+see|analyze|look\s+at)/i.test(cleanLower) || !text || text === 'Analyze this image')) {
    const img = currentAttachments.find(a => a.type === 'image') || currentAttachments[0];
    const imgName = img.filename || 'Image';
    return {
      content: `### 🖼️ Image Analysis: ${imgName}\n\n` +
               `* **Status**: Image received and inspected in LADDU High-Resolution Canvas.\n` +
               `* **Format**: ${img.mimeType || 'image/jpeg'}\n` +
               `* **Ready**: Image is loaded and ready for multimodal processing.\n\n` +
               `*💡 Tip: For live AI computer-vision analysis, enter your free Google Gemini key in **Settings (⚙️)**!*`,
      role: { id: 'assistant', name: 'Vision Engine', icon: '👁️' },
      model: 'standalone-vision-inspector'
    };
  }

  // 4. Standalone Math Calculation (Word operators, %, powers, trailing ?)
  let mathText = cleanLower.replace(/[?!.]+$/, '').trim();
  mathText = mathText.replace(/^(?:calculate|what is|what's|whats|compute|solve|how much is|evaluate)\s+/i, '').trim();
  mathText = mathText.replace(/\bplus\b/g, '+').replace(/\bminus\b/g, '-').replace(/\btimes\b|\bmultiplied by\b/g, '*').replace(/\bdivided by\b/g, '/');
  mathText = mathText.replace(/([0-9.]+)\s*(?:%|percent)\s*of\s*([0-9.]+)/gi, '($1/100)*$2');
  mathText = mathText.replace(/\^/g, '**');

  if (/^[0-9\s\+\-\*\/\%\(\)\.\,]+$/.test(mathText) && /[0-9]/.test(mathText) && /[+\-*\/%]/.test(mathText)) {
    try {
      const clean = mathText.replace(/,/g, '');
      const res = new Function(`return (${clean});`)();
      if (typeof res === 'number' && !isNaN(res)) {
        const formatted = Number.isInteger(res) ? res.toString() : (Math.round(res * 10000) / 10000).toString();
        return {
          content: `Result: ${formatted}`,
          role: { id: 'assistant', name: 'Executive Assistant (JARVIS)', icon: '🤖' },
          model: 'standalone-math'
        };
      }
    } catch {}
  }

  // 5. Standby / Sleep commands
  if (/(?:go to sleep|just go to sleep|sleep now|good\s*night|shut up|be quiet|leave me alone|stop talking|take a rest|take a break|can'?t do anything|cannot do anything|you are useless|you'?re useless)\b/i.test(cleanLower)) {
    return {
      content: "Understood. I apologize if I let you down earlier. I'm stepping back and entering standby mode so you can rest. Whenever you need me or want to chat again, just say **\"Hey Laddu\"**. Have a peaceful rest! 🌙",
      role: { id: 'friend', name: 'Close Friend', icon: '🧡' },
      model: 'standalone-friend'
    };
  }

  // 6. Emotional check-ins & Friendship
  if (/(?:feeling low|feel low|felt low|feeling down|feel down|sad|cheer me up|cheer up|unhappy|lonely|depressed|had a bad day|rough day|nobody to talk to|talk to me|act as a friend|be my friend|can we be friends|can we have a conversation|talk like a friend|cheer me)/i.test(cleanLower)) {
    return {
      content: "Hey, I'm really sorry to hear that you're feeling down, but I am so glad you reached out to me. Of course I will be your friend! You're never alone when I'm here. 💛\n\nTake a slow, deep breath and give yourself credit for getting through today. Whatever is weighing on your mind, we can talk through it — or if you want to take your mind off things, we can talk about movies, music, games, funny stories, or dreams.\n\nTell me, what's been bothering you, or what would you love to talk about right now?",
      role: { id: 'friend', name: 'Close Friend', icon: '🧡' },
      model: 'standalone-friend'
    };
  }

  // 7. Praise & Gratitude
  if (/(?:thank you|thanks|good job|awesome|love you|you are the best|you're amazing|are we friends|i like you|you are my friend)/i.test(cleanLower)) {
    return {
      content: "Thank you so much! That truly means the world to me. Having you as a friend makes everything worthwhile! What shall we explore or do next?",
      role: { id: 'friend', name: 'Close Friend', icon: '🧡' },
      model: 'standalone-friend'
    };
  }

  // 8. Live Wikipedia Search for Questions
  if (/(?:what is|what are|who is|who was|who were|where is|where are|when was|when did|why is|why are|why does|why do|how does|how do|how is|tell me about|explain|search for)\b/i.test(cleanLower) || text.endsWith('?')) {
    const topic = cleanLower.replace(/[?!.]+$/, '').replace(/^(?:what is|what are|who is|who was|where is|where are|when was|when did|why does|why is|how does|how do|tell me about|explain|search for)\s+/i, '').trim();
    if (topic.length >= 2) {
      try {
        const wRes = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(topic));
        if (wRes.ok) {
          const wData = await wRes.json();
          if (wData.extract) {
            return {
              content: `**${wData.title}**\n\n${wData.extract}\n\n[Read more on Wikipedia](${wData.content_urls?.desktop?.page || ''})`,
              citations: [{ source: 'Wikipedia', url: wData.content_urls?.desktop?.page || '', snippet: wData.extract.slice(0, 150) }],
              role: { id: 'teacher', name: 'Master Teacher', icon: '🎓' },
              model: 'standalone-wikipedia'
            };
          }
        }
      } catch (err) {}
    }
  }

  // 9. Conversational Companion Fallback
  return {
    content: "I'm right here with you! Tell me more about what you're thinking, or is there a specific goal, task, or question we should tackle together right now? 🤝",
    role: { id: 'friend', name: 'Close Friend', icon: '🧡' },
    model: 'standalone-companion'
  };
}

function initMultimodalAttachments() {
  const btnAttach = document.getElementById('btnAttachFile');
  const fileInput = document.getElementById('fileUploadInput');
  const webToggle = document.getElementById('btnWebSearchToggle');
  const inputArea = document.getElementById('chatInputArea');

  btnAttach?.addEventListener('click', () => fileInput?.click());

  webToggle?.addEventListener('click', () => {
    isWebSearchActive = !isWebSearchActive;
    if (isWebSearchActive) {
      webToggle.textContent = '🌐 WEB: ON';
      webToggle.style.borderColor = 'var(--neon-green)';
      webToggle.style.color = 'var(--neon-green)';
    } else {
      webToggle.textContent = '🌐 WEB: OFF';
      webToggle.style.borderColor = 'rgba(255,255,255,0.2)';
      webToggle.style.color = 'var(--text-dim)';
    }
  });

  fileInput?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      await processAndUploadFile(f);
    }
    fileInput.value = '';
  });

  if (inputArea) {
    ['dragenter', 'dragover'].forEach(eventName => {
      inputArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        inputArea.style.borderColor = 'var(--neon-cyan)';
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      inputArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        inputArea.style.borderColor = '';
      }, false);
    });

    inputArea.addEventListener('drop', async (e) => {
      const dt = e.dataTransfer;
      const files = Array.from(dt.files || []);
      for (const f of files) {
        await processAndUploadFile(f);
      }
    }, false);
  }
}

async function processAndUploadFile(file) {
  const isImg = (file.type || '').startsWith('image/');
  const isText = (file.type || '').startsWith('text/') || /\.(txt|csv|json|md|py|js|html|xml|log)$/i.test(file.name);

  const readFileData = (asDataUrl = true) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => resolve('');
    if (asDataUrl) reader.readAsDataURL(file);
    else reader.readAsText(file);
  });

  const base64Data = await readFileData(true);
  let extractedText = '';
  if (isText) {
    extractedText = await readFileData(false);
  }

  let uploaded = false;
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        data: base64Data
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        attachedFiles.push({
          type: data.type || (isImg ? 'image' : 'document'),
          filename: data.filename || file.name,
          mimeType: data.mimeType || file.type,
          data: data.data || base64Data,
          preview: data.preview || (isImg ? base64Data : null),
          extractedText: data.extractedText || extractedText
        });
        uploaded = true;
      }
    }
  } catch (err) {
    console.warn('Server upload unavailable, attaching in client memory:', err);
  }

  if (!uploaded) {
    attachedFiles.push({
      type: isImg ? 'image' : 'document',
      filename: file.name,
      mimeType: file.type || (isImg ? 'image/jpeg' : 'application/octet-stream'),
      data: base64Data,
      preview: isImg ? base64Data : null,
      extractedText: extractedText || (isImg ? '' : `[File: ${file.name}, Size: ${(file.size / 1024).toFixed(1)} KB]`)
    });
  }

  renderAttachmentPreviewBar();
}

function renderAttachmentPreviewBar() {
  const bar = document.getElementById('attachmentPreviewBar');
  if (!bar) return;
  if (attachedFiles.length === 0) {
    bar.style.display = 'none';
    bar.innerHTML = '';
    return;
  }

  bar.style.display = 'flex';
  bar.innerHTML = attachedFiles.map((f, idx) => `
    <div style="display:flex;align-items:center;gap:6px;background:rgba(0,0,0,0.6);border:1px solid var(--border-cyan);padding:4px 8px;border-radius:6px;">
      ${f.type === 'image' ? `<img src="${f.preview || f.data}" style="height:28px;width:28px;object-fit:cover;border-radius:4px;">` : `<span style="font-size:16px;">📄</span>`}
      <span style="font-size:11px;color:#fff;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(f.filename)}</span>
      <button onclick="removeAttachment(${idx})" style="background:none;border:none;color:var(--neon-red);cursor:pointer;font-weight:700;padding:0 4px;font-size:12px;">✕</button>
    </div>
  `).join('');
}

window.removeAttachment = function(idx) {
  attachedFiles.splice(idx, 1);
  renderAttachmentPreviewBar();
};

// ==========================================
// 8. DAILY COMPANION & WELLNESS ACTIONS
// ==========================================
async function logWater(amountMl = 250) {
  try {
    const res = await fetch('/api/companion/hydration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountMl })
    });
    const data = await res.json();
    todayHydrationMl = data.totalTodayMl;
    updateHydrationDisplays();
    appendChatMessage('assistant', data.message);
    speakBrowser({ text: data.message });
  } catch (err) {
    console.error(err);
  }
}
window.logWater = logWater;

function updateHydrationDisplays() {
  const valHydration = document.getElementById('valHydration');
  const compDisplay = document.getElementById('companionWaterDisplay');
  if (valHydration) valHydration.textContent = `${todayHydrationMl} ml`;
  if (compDisplay) compDisplay.textContent = `${todayHydrationMl} ml`;
}

async function triggerHealthNudge() {
  try {
    const res = await fetch('/api/companion/nudge');
    const data = await res.json();
    const nudge = data.nudge;
    const resultDiv = document.getElementById('healthNudgeResult');
    if (resultDiv) {
      resultDiv.innerHTML = `<strong style="color:var(--neon-green)">${nudge.title}</strong>: ${nudge.message}`;
    }
    appendChatMessage('assistant', `🧘 ${nudge.title}: ${nudge.message}`);
    speakBrowser({ text: `${nudge.title}. ${nudge.message}` });
  } catch (err) {
    console.error(err);
  }
}

async function generateMorningBriefing() {
  const feed = document.getElementById('companionFeed');
  feed.innerHTML = '<div class="placeholder-msg">Compiling system diagnostics, weather, and wellness schedule...</div>';
  try {
    const res = await fetch('/api/companion/briefing');
    const data = await res.json();
    feed.innerHTML = `<div class="report-content">${renderSimpleMarkdown(data.briefing)}</div>`;
    appendChatMessage('assistant', data.briefing);
    speakBrowser({ text: data.briefing });
  } catch (err) {
    feed.innerHTML = `<div class="error-msg">${err.message}</div>`;
  }
}

async function generateEveningDebrief() {
  const feed = document.getElementById('companionFeed');
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'evening debrief' })
    });
    const data = await res.json();
    feed.innerHTML = `<div class="report-content">${renderSimpleMarkdown(data.content)}</div>`;
    appendChatMessage('assistant', data.content);
    speakBrowser({ text: data.content });
  } catch (err) {
    feed.innerHTML = `<div class="error-msg">${err.message}</div>`;
  }
}

// ==========================================
// 9. VOICEPRINT BIOMETRICS ENROLLMENT & MANDATORY INDUCTION
// ==========================================
async function checkVoiceEnrollmentStatus() {
  try {
    const res = await fetch('/api/voice/status');
    const data = await res.json();
    const localDeviceCalibrated = localStorage.getItem('laddu_device_voice_enrolled') === 'true';

    if (data.needsEnrollment || !localDeviceCalibrated) {
      console.log('[LADDU Induction] Voice authorization required on this device.');
      const modal = document.getElementById('modalEnrollVoice');
      const title = document.getElementById('modalVoiceTitle');
      if (title) {
        title.textContent = data.needsEnrollment
          ? 'FIRST-RUN VOICE INDUCTION & ACCESSIBILITY'
          : 'DEVICE VOICE CALIBRATION (BACKGROUND SENTRY)';
      }
      modal?.classList.add('active');
      updateVoiceIdBadge(data.primarySpeaker?.name || 'Operator', false);
    } else if (data.primarySpeaker) {
      updateVoiceIdBadge(data.primarySpeaker.name, true);
    }
  } catch (err) {
    console.warn('[LADDU] Voice status check failed:', err.message);
  }
}

async function recordVoiceEnrollment() {
  await initAudioContext();
  const statusEl = document.getElementById('enrollStatus');
  const nameInput = document.getElementById('inputEnrollName');
  const vizBox = document.getElementById('enrollVizBox');
  const countdownEl = document.getElementById('enrollCountdown');
  const levelBar = document.getElementById('enrollLevelBar');
  const recordBtn = document.getElementById('btnStartEnrollRecord');
  const name = nameInput?.value.trim() || 'Boss';

  if (recordBtn) recordBtn.disabled = true;
  if (vizBox) vizBox.style.display = 'block';
  if (statusEl) statusEl.textContent = 'Listening to vocal timbre... Please speak the authorization phrase clearly.';

  let secondsLeft = 3;
  if (countdownEl) countdownEl.textContent = `CALIBRATING ACOUSTICS: ${secondsLeft}s`;

  // Animate audio level bar during voice recording
  const levelInterval = setInterval(() => {
    if (analyser) {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < 64; i++) sum += dataArray[i];
      const avg = sum / 64;
      const pct = Math.min(100, Math.round((avg / 128) * 100));
      if (levelBar) levelBar.style.width = `${Math.max(15, pct)}%`;
    }
  }, 100);

  const countdownTimer = setInterval(() => {
    secondsLeft--;
    if (countdownEl) countdownEl.textContent = `CALIBRATING ACOUSTICS: ${secondsLeft}s`;
    if (secondsLeft <= 0) {
      clearInterval(countdownTimer);
      clearInterval(levelInterval);
      if (levelBar) levelBar.style.width = '100%';

      const features = extractAcousticFeatures();
      fetch('/api/voice/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user_primary',
          name,
          features
        })
      }).then(res => res.json()).then(data => {
        if (statusEl) {
          statusEl.textContent = `Voiceprint calibrated and encrypted for ${name}! Hands-free background wakeup enabled.`;
        }
        activeSpeaker = { id: 'user_primary', name, isVerified: true };
        updateVoiceIdBadge(name, true);
        localStorage.setItem('laddu_device_voice_enrolled', 'true');

        // Audible confirmation
        speakBrowser({
          text: `Voice acoustics registered and encrypted. You are now designated as the primary authorized operator for background voice wakeup, ${name}.`
        });

        setTimeout(() => {
          document.getElementById('modalEnrollVoice')?.classList.remove('active');
          if (vizBox) vizBox.style.display = 'none';
          if (recordBtn) recordBtn.disabled = false;
          if (statusEl) statusEl.textContent = '';
        }, 2000);
      }).catch(err => {
        if (statusEl) statusEl.textContent = `Enrollment error: ${err.message}`;
        if (recordBtn) recordBtn.disabled = false;
      });
    }
  }, 1000);
}

// ==========================================
// 10. WEB RESEARCH HUB
// ==========================================
async function executeResearch() {
  const topicInput = document.getElementById('researchTopic');
  const topic = topicInput.value.trim();
  if (!topic) return;

  const resultsDiv = document.getElementById('researchResults');
  resultsDiv.innerHTML = '<div class="placeholder-msg">Decomposing research query and querying Wikipedia, DuckDuckGo, and arXiv...</div>';
  setAIActivityState('SEARCHING');

  try {
    const res = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic })
    });
    const data = await res.json();
    resultsDiv.innerHTML = `<div class="report-content">${renderSimpleMarkdown(data.report)}</div>`;
  } catch (err) {
    resultsDiv.innerHTML = `<div class="error-msg">Research failed: ${err.message}</div>`;
  } finally {
    setAIActivityState('IDLE');
  }
}

// ==========================================
// 11. KNOWLEDGE BASE & RAG
// ==========================================
async function loadIndexedDocuments() {
  const listEl = document.getElementById('docList');
  try {
    const res = await fetch('/api/files');
    const data = await res.json();
    if (!data.documents || data.documents.length === 0) {
      listEl.innerHTML = '<div class="placeholder-msg">No personal documents indexed yet.</div>';
      return;
    }

    listEl.innerHTML = data.documents.map(d => `
      <div class="doc-item">
        <span>📄 <strong>${escapeHtml(d.sourceFile)}</strong> (${d.chunkCount} chunks)</span>
        <span class="text-dim">${new Date(d.indexedAt).toLocaleDateString()}</span>
      </div>
    `).join('');
  } catch {}
}

async function ingestManualText() {
  const title = document.getElementById('manualDocTitle').value.trim();
  const content = document.getElementById('manualDocContent').value.trim();
  if (!title || !content) {
    alert('Please enter both title and content.');
    return;
  }

  try {
    const res = await fetch('/api/files/upload-raw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: title, content })
    });
    const data = await res.json();
    if (data.success) {
      alert(`Indexed "${title}" successfully into knowledge base!`);
      document.getElementById('manualDocTitle').value = '';
      document.getElementById('manualDocContent').value = '';
      loadIndexedDocuments();
    }
  } catch (err) {
    alert(`Ingest failed: ${err.message}`);
  }
}

async function queryRAG() {
  const query = document.getElementById('ragQueryInput').value.trim();
  if (!query) return;

  const resDiv = document.getElementById('ragResults');
  resDiv.innerHTML = '<div class="placeholder-msg">Searching vector index...</div>';

  try {
    const res = await fetch('/api/files/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, topK: 3 })
    });
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      resDiv.innerHTML = '<div class="placeholder-msg">No matching passages found.</div>';
      return;
    }

    resDiv.innerHTML = data.results.map(r => `
      <div class="rag-chunk-card">
        <strong>${escapeHtml(r.filename)}</strong> <span class="badge badge-allow">Score: ${r.score.toFixed(2)}</span>
        <p style="margin-top:6px;">"${escapeHtml(r.text)}"</p>
      </div>
    `).join('');
  } catch (err) {
    resDiv.innerHTML = `<div class="error-msg">${err.message}</div>`;
  }
}

// ==========================================
// 12. MEMORY MANAGER
// ==========================================
async function loadMemories(keyword = '') {
  const listEl = document.getElementById('memoryList');
  try {
    const res = await fetch('/api/memory');
    const data = await res.json();
    let memories = data.memories || [];

    if (keyword) {
      memories = memories.filter(m =>
        m.key.toLowerCase().includes(keyword.toLowerCase()) ||
        m.value.toLowerCase().includes(keyword.toLowerCase())
      );
    }

    if (memories.length === 0) {
      listEl.innerHTML = '<div class="placeholder-msg">No stored memories found.</div>';
      return;
    }

    listEl.innerHTML = memories.map(m => `
      <div class="memory-card-item">
        <div>
          <div class="mem-key">${escapeHtml(m.key)}</div>
          <div class="mem-val">${escapeHtml(m.value)}</div>
        </div>
        <div class="mem-footer">
          <span class="badge ${m.isSensitive ? 'badge-deny' : 'badge-allow'}">${m.category}</span>
          <button class="chip-btn" onclick="deleteMemory('${m.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  } catch {}
}

window.deleteMemory = async function(id) {
  if (!confirm('Are you sure you want LADDU to delete this memory?')) return;
  await fetch(`/api/memory/${id}`, { method: 'DELETE' });
  loadMemories();
};

async function saveNewMemory() {
  const key = document.getElementById('inputMemKey').value.trim();
  const value = document.getElementById('inputMemVal').value.trim();
  const category = document.getElementById('selectMemCat').value;
  const isSensitive = document.getElementById('checkMemSensitive').checked;

  if (!key || !value) return;

  await fetch('/api/memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value, category, isSensitive })
  });

  document.getElementById('modalMemory').classList.remove('active');
  document.getElementById('inputMemKey').value = '';
  document.getElementById('inputMemVal').value = '';
  loadMemories();
}

// ==========================================
// 13. PERMISSIONS & SAFETY CHALLENGES
// ==========================================
async function loadPermissions() {
  try {
    const res = await fetch('/api/permissions');
    const data = await res.json();

    const tbody = document.getElementById('permissionsTableBody');
    tbody.innerHTML = data.permissions.map(p => `
      <tr>
        <td><strong>${escapeHtml(p.key)}</strong></td>
        <td>${escapeHtml(p.description)}</td>
        <td><span class="badge badge-${p.status.toLowerCase()}">${p.status}</span></td>
        <td>
          <button class="chip-btn" onclick="setPermission('${p.key}', 'ALLOW')">ALLOW</button>
          <button class="chip-btn" onclick="setPermission('${p.key}', 'ASK')">ASK</button>
          <button class="chip-btn" onclick="setPermission('${p.key}', 'DENY')">DENY</button>
        </td>
      </tr>
    `).join('');

    const challengesList = document.getElementById('challengesList');
    if (data.pendingChallenges && data.pendingChallenges.length > 0) {
      challengesList.innerHTML = data.pendingChallenges.map(c => `
        <div class="challenge-card">
          <div>
            <strong>⚠️ Safety Confirmation Required:</strong> ${escapeHtml(c.message)}
            <div class="text-dim">Blast Radius: ${c.blastRadius} affected item(s)</div>
          </div>
          <div class="challenge-actions">
            <button class="action-btn glow-btn" onclick="confirmChallenge('${c.challengeId}')">CONFIRM</button>
            <button class="action-btn outline-btn" onclick="cancelChallenge('${c.challengeId}')">CANCEL</button>
          </div>
        </div>
      `).join('');
    } else {
      challengesList.innerHTML = '<div class="placeholder-msg">No pending dangerous actions. All operations safe.</div>';
    }

    const auditTbody = document.getElementById('auditTableBody');
    if (data.recentAuditLogs && data.recentAuditLogs.length > 0) {
      auditTbody.innerHTML = data.recentAuditLogs.slice(0, 10).map(l => `
        <tr>
          <td>${new Date(l.timestamp).toLocaleTimeString()}</td>
          <td>${escapeHtml(l.toolName || 'N/A')}</td>
          <td><span class="badge ${l.status === 'SUCCESS' ? 'badge-allow' : 'badge-deny'}">${l.status}</span></td>
          <td>${l.durationMs ? `${l.durationMs}ms` : ''}</td>
        </tr>
      `).join('');
    }
  } catch {}
}

window.setPermission = async function(permissionKey, type) {
  await fetch('/api/permissions/grant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissionKey, type })
  });
  loadPermissions();
};

window.confirmChallenge = async function(challengeId) {
  await fetch('/api/permissions/challenge/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId })
  });
  loadPermissions();
};

window.cancelChallenge = async function(challengeId) {
  await fetch('/api/permissions/challenge/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId })
  });
  loadPermissions();
};

// ==========================================
// 14. AUTOMATIONS
// ==========================================
async function loadAutomations() {
  const listEl = document.getElementById('automationList');
  try {
    const res = await fetch('/api/automations');
    const data = await res.json();

    if (!data.automations || data.automations.length === 0) {
      listEl.innerHTML = '<div class="placeholder-msg">No recurring automations configured.</div>';
      return;
    }

    listEl.innerHTML = data.automations.map(a => `
      <div class="automation-item">
        <div>
          <strong>${escapeHtml(a.name)}</strong>
          <div class="text-dim">Schedule: ${escapeHtml(a.schedule)} | Goal: ${escapeHtml(a.goal)}</div>
          ${a.lastRunAt ? `<div class="text-dim" style="font-size:12px;margin-top:4px;">Last Run: ${new Date(a.lastRunAt).toLocaleTimeString()} — <em>${escapeHtml(a.lastResult || '')}</em></div>` : ''}
        </div>
        <div style="display:flex;gap:8px;">
          <button class="action-btn glow-btn" onclick="runAutomationNow('${a.id}')">RUN NOW</button>
          <button class="chip-btn" onclick="toggleAutomation('${a.id}', ${!a.enabled})">${a.enabled ? 'PAUSE' : 'RESUME'}</button>
          <button class="chip-btn" onclick="deleteAutomation('${a.id}')">DELETE</button>
        </div>
      </div>
    `).join('');
  } catch {}
}

window.runAutomationNow = async function(id) {
  alert('Executing automation protocol...');
  await fetch(`/api/automations/${id}/run`, { method: 'POST' });
  loadAutomations();
};

window.toggleAutomation = async function(id, enabled) {
  await fetch(`/api/automations/${id}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled })
  });
  loadAutomations();
};

window.deleteAutomation = async function(id) {
  await fetch(`/api/automations/${id}`, { method: 'DELETE' });
  loadAutomations();
};

// ==========================================
// 15. DIAGNOSTICS & TELEMETRY
// ==========================================
async function updateTelemetry() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    document.getElementById('valHealth').textContent = data.systemHealth || '95%';
    document.getElementById('valModel').textContent = data.provider?.activeProvider || 'Offline Local';

    if (data.diagnostics?.memory) {
      document.getElementById('valMemory').textContent = data.diagnostics.memory.usedPercent;
    }
  } catch {}
}

async function runSelfCheck() {
  const diagResults = document.getElementById('diagResults');
  diagResults.innerHTML = '<div class="placeholder-msg">Running diagnostics probes on all subsystems...</div>';

  try {
    const res = await fetch('/api/diagnostics/self-check');
    const data = await res.json();

    diagResults.innerHTML = `
      <div style="margin: 16px 0; font-family: var(--font-hud);">
        Overall System Integrity: <strong style="color:var(--neon-green);">${data.overallHealth}</strong>
      </div>
      <table class="hud-table">
        <thead>
          <tr>
            <th>SUBSYSTEM</th>
            <th>STATUS</th>
            <th>DETAILS</th>
          </tr>
        </thead>
        <tbody>
          ${data.checks.map(c => `
            <tr>
              <td><strong>${escapeHtml(c.name)}</strong></td>
              <td><span class="badge ${c.status === 'PASS' ? 'badge-allow' : 'badge-deny'}">${c.status}</span></td>
              <td>${escapeHtml(c.detail)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    diagResults.innerHTML = `<div class="error-msg">Self-check failed: ${err.message}</div>`;
  }
}

function renderSimpleMarkdown(md) {
  if (!md) return '';
  return md
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" style="color:var(--neon-cyan);">$1</a>')
    .replace(/\n/gim, '<br>');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ==========================================
// 16. INITIALIZATION & EVENT LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initWebSocket();
  initCanvasVisualizer();
  initSpeechRecognition();
  checkVoiceEnrollmentStatus();
  updateTelemetry();
  setInterval(updateTelemetry, 15000);

  // Tab Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.hud-tab').forEach(t => t.classList.remove('active'));

      btn.classList.add('active');
      const targetTab = document.getElementById(btn.dataset.tab);
      if (targetTab) targetTab.classList.add('active');

      if (btn.dataset.tab === 'tab-knowledge') loadIndexedDocuments();
      if (btn.dataset.tab === 'tab-memory') loadMemories();
      if (btn.dataset.tab === 'tab-permissions') loadPermissions();
      if (btn.dataset.tab === 'tab-automations') loadAutomations();
    });
  });

  // Voice & Chat Controls
  document.getElementById('btnToggleVoice')?.addEventListener('click', toggleListening);
  document.getElementById('btnInterrupt')?.addEventListener('click', interruptSpeech);
  document.getElementById('btnSendChat')?.addEventListener('click', sendChat);
  document.getElementById('btnChatVoice')?.addEventListener('click', toggleListening);
  document.getElementById('chatInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChat();
  });
  document.getElementById('btnClearChat')?.addEventListener('click', () => {
    document.getElementById('chatMessages').innerHTML = '';
  });

  // Voiceprint Modal
  document.getElementById('btnOpenEnrollModal')?.addEventListener('click', () => {
    document.getElementById('modalEnrollVoice').classList.add('active');
  });
  document.getElementById('voiceIdBadge')?.addEventListener('click', () => {
    document.getElementById('modalEnrollVoice').classList.add('active');
  });
  document.getElementById('btnCancelEnroll')?.addEventListener('click', () => {
    document.getElementById('modalEnrollVoice').classList.remove('active');
  });
  document.getElementById('btnStartEnrollRecord')?.addEventListener('click', recordVoiceEnrollment);

  // Quick Commands & Wellness Chips
  document.querySelectorAll('.chip-btn[data-cmd]').forEach(chip => {
    chip.addEventListener('click', () => {
      const cmd = chip.dataset.cmd;
      document.getElementById('chatInput').value = cmd;
      document.querySelector('.nav-btn[data-tab="tab-chat"]').click();
      sendChat();
    });
  });

  document.getElementById('quickBriefingBtn')?.addEventListener('click', () => {
    document.querySelector('.nav-btn[data-tab="tab-companion"]').click();
    generateMorningBriefing();
  });
  document.getElementById('quickWaterBtn')?.addEventListener('click', () => logWater(250));
  document.getElementById('quickPostureBtn')?.addEventListener('click', triggerHealthNudge);
  document.getElementById('quickEveningBtn')?.addEventListener('click', generateEveningDebrief);

  // Companion Tab Buttons
  document.getElementById('btnGenerateBriefing')?.addEventListener('click', generateMorningBriefing);
  document.getElementById('btnGenerateDebrief')?.addEventListener('click', generateEveningDebrief);
  document.getElementById('btnTriggerHealthNudge')?.addEventListener('click', triggerHealthNudge);

  // Research Events
  document.getElementById('btnRunResearch')?.addEventListener('click', executeResearch);

  // Knowledge / RAG Events
  document.getElementById('btnIngestText')?.addEventListener('click', ingestManualText);
  document.getElementById('btnQueryRAG')?.addEventListener('click', queryRAG);

  // Memory Modal Events
  document.getElementById('btnAddMemoryModalBtn')?.addEventListener('click', () => {
    document.getElementById('modalMemory').classList.add('active');
  });
  document.getElementById('btnCancelMemory')?.addEventListener('click', () => {
    document.getElementById('modalMemory').classList.remove('active');
  });
  document.getElementById('btnSaveMemory')?.addEventListener('click', saveNewMemory);
  document.getElementById('memorySearchInput')?.addEventListener('input', (e) => {
    loadMemories(e.target.value);
  });
  document.getElementById('btnExportMemory')?.addEventListener('click', async () => {
    const res = await fetch('/api/memory/export');
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laddu_memories_${Date.now()}.json`;
    a.click();
  });

  // Diagnostics Events
  document.getElementById('btnRunSelfCheck')?.addEventListener('click', runSelfCheck);

  // Dynamic Persona Role Dropdown Events
  const pill = document.getElementById('roleSelectorPill');
  const dropdown = document.getElementById('roleDropdown');
  pill?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown?.classList.toggle('active');
  });
  document.addEventListener('click', () => {
    dropdown?.classList.remove('active');
  });
  document.querySelectorAll('.role-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown?.classList.remove('active');
      setRole(opt.dataset.role);
    });
  });

  // Multi-Device Pairing Events
  document.getElementById('btnDeviceSync')?.addEventListener('click', openDevicePairModal);
  document.getElementById('btnCloseDevicePair')?.addEventListener('click', () => {
    document.getElementById('modalDevicePair')?.classList.remove('active');
  });
  document.getElementById('btnCopyDeviceUrl')?.addEventListener('click', () => {
    const urlText = document.getElementById('devicePairUrl')?.textContent;
    if (urlText) {
      navigator.clipboard.writeText(urlText).then(() => {
        const btn = document.getElementById('btnCopyDeviceUrl');
        btn.textContent = 'COPIED!';
        setTimeout(() => { btn.textContent = 'COPY LINK'; }, 2000);
      });
    }
  });
  document.getElementById('btnInstallPwa')?.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        document.getElementById('pwaInstallBanner').style.display = 'none';
      }
      deferredInstallPrompt = null;
    }
  });

  // Initialize PWA Service Worker
  initServiceWorker();
});

// ==========================================
// 12. DYNAMIC PERSONA ROLE LOGIC & MULTI-DEVICE
// ==========================================
function updateRolePill(role, isLocked = false) {
  const iconEl = document.getElementById('activeRoleIcon');
  const nameEl = document.getElementById('activeRoleName');
  const lockEl = document.getElementById('roleLockTag');
  if (!iconEl || !nameEl) return;

  iconEl.textContent = role.icon || '🤖';
  const rawName = role.name || role.id || 'JARVIS';
  const cleanName = rawName.replace('Executive Assistant (JARVIS)', 'JARVIS').replace('Inspiring ', '').replace('Strategic ', '').replace('Close ', '').replace('Wellness ', '');
  nameEl.textContent = cleanName;

  if (lockEl) {
    if (isLocked) {
      lockEl.textContent = 'PINNED';
      lockEl.classList.add('locked');
    } else {
      lockEl.textContent = 'AUTO';
      lockEl.classList.remove('locked');
    }
  }

  const options = document.querySelectorAll('.role-option');
  options.forEach(opt => {
    if ((isLocked && opt.dataset.role === role.id) || (!isLocked && opt.dataset.role === 'auto')) {
      opt.classList.add('selected');
    } else {
      opt.classList.remove('selected');
    }
  });
}

async function setRole(roleId) {
  try {
    if (roleId === 'auto') {
      const res = await fetch('/api/roles/unlock', { method: 'POST' });
      const data = await res.json();
      if (data.activeRole) updateRolePill(data.activeRole, false);
    } else {
      const res = await fetch('/api/roles/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId, lock: true })
      });
      const data = await res.json();
      if (data.activeRole) updateRolePill(data.activeRole, true);
    }
  } catch (err) {
    console.warn('[LADDU] Failed to set role:', err);
  }
}

// ==========================================
// 13. MULTI-DEVICE PAIRING & PWA
// ==========================================
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) banner.style.display = 'block';
});

function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(
        (reg) => {
          console.log('[LADDU PWA] Service Worker registered with scope:', reg.scope);
          try { reg.update(); } catch(e){}
        },
        (err) => console.warn('[LADDU PWA] Service Worker registration failed:', err)
      );
    });
  }
}

async function openDevicePairModal() {
  const modal = document.getElementById('modalDevicePair');
  if (!modal) return;
  modal.classList.add('active');

  const pairUrlEl = document.getElementById('devicePairUrl');
  const qrContainer = document.getElementById('deviceQrContainer');
  const directBtn = document.getElementById('btnOpenMobileDirect');

  try {
    const res = await fetch('/api/network/info');
    const data = await res.json();
    const targetUrl = data.secureUrl || data.httpsUrl || data.primaryUrl || window.location.origin;
    pairUrlEl.textContent = targetUrl;
    qrContainer.innerHTML = generateQRCodeSVG(targetUrl, 220);
    if (directBtn) directBtn.href = targetUrl;
  } catch (err) {
    pairUrlEl.textContent = window.location.origin;
    qrContainer.innerHTML = generateQRCodeSVG(window.location.origin, 220);
  }
}

/**
 * ISO/IEC 18004 Compliant QR Code Generator for Camera Scanning
 */
function generateQRCodeSVG(text, size = 220) {
  if (typeof window !== 'undefined' && window.generateValidQRCodeSVG) {
    return window.generateValidQRCodeSVG(text, size);
  }
  if (typeof QRCode !== 'undefined' && QRCode.generateSVG) {
    return QRCode.generateSVG(text, size);
  }
  return `<div style="color:var(--neon-cyan);padding:20px;text-align:center;font-size:12px;">QR Ready: ${text}</div>`;
}

// ==========================================
// 19. DESKTOP CONTACTS, LANGUAGE & SETTINGS
// ==========================================
function initLanguageSelector() {
  const selectHeader = document.getElementById('selectSpeechLang');
  const selectModal = document.getElementById('deskSpeechLangSelect');
  const savedLang = localStorage.getItem('laddu_speech_lang') || 'en-IN';

  if (selectHeader) selectHeader.value = savedLang;
  if (selectModal) selectModal.value = savedLang;

  function updateLang(newLang) {
    localStorage.setItem('laddu_speech_lang', newLang);
    if (selectHeader) selectHeader.value = newLang;
    if (selectModal) selectModal.value = newLang;
    if (recognition) {
      recognition.lang = newLang;
      if (isListening) {
        try {
          recognition.stop();
          setTimeout(() => recognition.start(), 200);
        } catch {}
      }
    }
  }

  selectHeader?.addEventListener('change', (e) => updateLang(e.target.value));
  selectModal?.addEventListener('change', (e) => updateLang(e.target.value));
}

function initDesktopContactsAndSettings() {
  const modalContacts = document.getElementById('modalDesktopContacts');
  const btnOpenContacts = document.getElementById('btnOpenDesktopContacts');
  const btnCloseContacts = document.getElementById('btnCloseDesktopContacts');
  const contactsList = document.getElementById('desktopContactsList');
  const deskName = document.getElementById('deskContactName');
  const deskPhone = document.getElementById('deskContactPhone');
  const btnSaveContact = document.getElementById('btnSaveDesktopContact');

  if (btnOpenContacts && modalContacts) {
    btnOpenContacts.addEventListener('click', () => {
      modalContacts.style.display = 'flex';
      loadDesktopContacts();
    });
    btnCloseContacts.addEventListener('click', () => {
      modalContacts.style.display = 'none';
    });
  }

    async function loadDesktopContacts() {
    if (!contactsList) return;
    contactsList.innerHTML = '<div style="color:var(--text-dim);font-size:12px;text-align:center;">Loading contacts...</div>';
    let contacts = [];
    try {
      const res = await fetch('/api/contacts');
      if (res.ok) {
        const data = await res.json();
        if (data.contacts && Array.isArray(data.contacts)) contacts = data.contacts;
      }
    } catch (err) {}

    // Fallback to localStorage (for GitHub Pages / standalone offline)
    if (contacts.length === 0) {
      try {
        const local = localStorage.getItem('laddu_contacts');
        if (local) contacts = JSON.parse(local);
      } catch {}
    }

    if (contacts.length === 0) {
      contacts = [
        { id: 'c_papa', name: 'Papa', relationship: 'father', phone: '+919876543210', notes: 'Father' },
        { id: 'c_mom', name: 'Mom', relationship: 'mother', phone: '+919876543211', notes: 'Mother' },
        { id: 'c_emergency', name: 'Emergency', relationship: 'emergency', phone: '112', notes: 'Emergency Services' }
      ];
      try { localStorage.setItem('laddu_contacts', JSON.stringify(contacts)); } catch {}
    }

    contactsList.innerHTML = '';
    contacts.forEach(c => {
      const item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:rgba(0,0,0,0.3);border:1px solid rgba(0,240,255,0.15);border-radius:6px;margin-bottom:6px;';
      const hasPhone = c.phone && c.phone.trim().length > 0;
      item.innerHTML = `
        <div>
          <div style="font-family:var(--font-hud);font-size:13px;color:#fff;">${c.name}</div>
          <div style="font-size:11px;color:${hasPhone ? 'var(--neon-green)' : 'var(--neon-amber)'};">${hasPhone ? c.phone : '⚠️ No Phone Number'}</div>
        </div>
        <div style="display:flex;gap:6px;">
          ${hasPhone ? `<a href="tel:${c.phone}" class="action-btn glow-btn" style="padding:4px 10px;font-size:11px;text-decoration:none;">📞 CALL</a>` : ''}
          <button onclick="editDesktopContact('${c.name}', '${c.phone || ''}')" class="action-btn outline-btn" style="padding:4px 8px;font-size:11px;">EDIT</button>
        </div>
      `;
      contactsList.appendChild(item);
    });
  }

  window.editDesktopContact = function(name, phone) {
    if (deskName) deskName.value = name;
    if (deskPhone) { deskPhone.value = phone; deskPhone.focus(); }
  };

  if (btnSaveContact) {
    btnSaveContact.addEventListener('click', async () => {
      const name = deskName.value.trim();
      const phone = deskPhone.value.trim();
      if (!name || !phone) {
        alert('Please provide both Name and Phone number.');
        return;
      }
      try {
        const res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone })
        });
        const data = await res.json();
        if (data.success) {
          deskName.value = '';
          deskPhone.value = '';
          loadDesktopContacts();
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  }

  // Settings Modal
  const modalSettings = document.getElementById('modalDesktopSettings');
  const btnOpenSettings = document.getElementById('btnOpenDesktopSettings');
  const btnCloseSettings = document.getElementById('btnCloseDesktopSettings');
  const selectProvider = document.getElementById('deskSelectProvider');
  const geminiInput = document.getElementById('deskGeminiKeyInput');
  const modelSelect = document.getElementById('deskGeminiModelSelect');
  const btnToggleKey = document.getElementById('btnToggleKeyVisibility');
  const btnTestKey = document.getElementById('btnTestGeminiKey');
  const testStatus = document.getElementById('geminiTestStatus');
  const statusEl = document.getElementById('deskSettingsStatus');
  const btnSaveSettings = document.getElementById('btnSaveDesktopSettings');

  if (btnOpenSettings && modalSettings) {
    btnOpenSettings.addEventListener('click', () => {
      modalSettings.style.display = 'flex';
      loadDesktopSettings();
    });
    btnCloseSettings.addEventListener('click', () => {
      modalSettings.style.display = 'none';
    });
  }

  // Show/Hide key toggle
  btnToggleKey?.addEventListener('click', () => {
    if (geminiInput.type === 'password') {
      geminiInput.type = 'text';
      btnToggleKey.textContent = '🔒';
    } else {
      geminiInput.type = 'password';
      btnToggleKey.textContent = '👁️';
    }
  });

  // Test Gemini Key
  btnTestKey?.addEventListener('click', async () => {
    const inputVal = geminiInput.value.trim();
    const keys = inputVal ? inputVal.split(/[\n,;]+/).map(k => k.trim()).filter(k => k.length > 10) : GeminiKeyPool.getKeys();

    if (keys.length === 0) {
      testStatus.textContent = '⚠️ Please enter at least one Gemini API Key to test.';
      testStatus.style.color = 'var(--neon-amber)';
      return;
    }

    testStatus.textContent = '⚡ Testing ' + keys.length + ' key(s) in pool...';
    testStatus.style.color = 'var(--neon-cyan)';

    let successCount = 0;
    let firstError = '';

    for (let i = 0; i < keys.length; i++) {
      try {
        const gRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + keys[i], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] })
        });
        if (gRes.ok) {
          successCount++;
        } else {
          const errData = await gRes.json();
          firstError = errData?.error?.message || ('HTTP ' + gRes.status);
        }
      } catch (e) {
        firstError = e.message;
      }
    }

    if (successCount > 0) {
      GeminiKeyPool.setKeys(keys);
      updateDeskKeyPoolBadge();
      testStatus.textContent = '✅ ' + successCount + '/' + keys.length + ' Key(s) Verified Healthy (Free Tier Active)!';
      testStatus.style.color = 'var(--neon-green)';
    } else {
      testStatus.textContent = '❌ Key validation failed: ' + firstError;
      testStatus.style.color = 'var(--neon-red)';
    }
  });

  function updateDeskKeyPoolBadge() {
    const keys = GeminiKeyPool.getKeys();
    const badge = document.getElementById('deskKeyPoolBadge');
    if (badge) {
      badge.textContent = keys.length + (keys.length === 1 ? ' Key Active' : ' Keys Active');
      badge.style.color = keys.length > 0 ? 'var(--neon-green)' : 'var(--neon-amber)';
      badge.style.borderColor = keys.length > 0 ? 'rgba(0,255,170,0.3)' : 'rgba(255,170,0,0.3)';
    }
  }

  async function loadDesktopSettings() {
    const voiceSelect = document.getElementById('deskVoiceGenderSelect');
    if (voiceSelect) {
      voiceSelect.value = localStorage.getItem('laddu_voice_gender') || 'female';
      voiceSelect.onchange = () => {
        localStorage.setItem('laddu_voice_gender', voiceSelect.value);
        currentVoiceGender = voiceSelect.value;
      };
    }
    const btnTestVoice = document.getElementById('btnTestVoiceDesktop');
    if (btnTestVoice) {
      btnTestVoice.onclick = () => {
        speakBrowser({ text: "Hello! I am LADDU, your personal assistant and loyal friend.", rate: 1.0, pitch: 1.15 });
      };
    }

    const inputRemote = document.getElementById('deskRemoteServerUrl');
    if (inputRemote) {
      inputRemote.value = localStorage.getItem('laddu_remote_server_url') || '';
    }
    const savedKeys = localStorage.getItem('laddu_gemini_keys') || localStorage.getItem('laddu_gemini_key') || '';
    if (savedKeys && geminiInput) {
      geminiInput.value = savedKeys.replace(/,/g, '\n');
    }
    updateDeskKeyPoolBadge();

    try {
      const customRemote = (localStorage.getItem('laddu_remote_server_url') || '').trim().replace(/\/+$/, '');
      const settingsUrl = customRemote ? `${customRemote}/api/settings` : '/api/settings';
      const res = await fetch(settingsUrl);
      const data = await res.json();
      if (data.settings) {
        selectProvider.value = data.settings.aiProvider || 'gemini';
        const localKey = localStorage.getItem('laddu_gemini_key') || '';
        if (data.settings.geminiApiKeyMasked && !localKey) {
          geminiInput.placeholder = data.settings.geminiApiKeyMasked;
        }
        if (modelSelect && data.settings.geminiModel) {
          modelSelect.value = data.settings.geminiModel;
        }
      }
    } catch {}
  }

  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', async () => {
      const voiceSelect = document.getElementById('deskVoiceGenderSelect');
      if (voiceSelect) {
        localStorage.setItem('laddu_voice_gender', voiceSelect.value);
        currentVoiceGender = voiceSelect.value;
      }
      const aiProvider = selectProvider.value;
      const geminiApiKey = geminiInput.value.trim();
      const geminiModel = modelSelect ? modelSelect.value : 'gemini-2.5-flash';

      const inputRemote = document.getElementById('deskRemoteServerUrl');
      if (inputRemote) {
        localStorage.setItem('laddu_remote_server_url', inputRemote.value.trim());
      }
      if (geminiApiKey) {
        GeminiKeyPool.setKeys(geminiApiKey);
        updateDeskKeyPoolBadge();
      }

      statusEl.textContent = 'Applying settings...';
      try {
        const payload = { aiProvider, geminiModel, voiceGender: voiceSelect?.value || 'female' };
        if (geminiApiKey) payload.geminiApiKey = geminiApiKey;

        const customRemote = (localStorage.getItem('laddu_remote_server_url') || '').trim().replace(/\/+$/, '');
        const settingsUrl = customRemote ? `${customRemote}/api/settings` : '/api/settings';

        const res = await fetch(settingsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        statusEl.style.color = 'var(--neon-green)';
        statusEl.textContent = '✓ Settings updated and active!';
        setTimeout(() => {
          statusEl.textContent = '';
          modalSettings.style.display = 'none';
        }, 1200);
      } catch (err) {
        statusEl.style.color = 'var(--neon-red)';
        statusEl.textContent = 'Error: ' + err.message;
      }
    });
  }
}

// Call on startup immediately
function initDesktopApp() {
  initLanguageSelector();
  initMultimodalAttachments();
  initDesktopContactsAndSettings();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDesktopApp);
} else {
  initDesktopApp();
}