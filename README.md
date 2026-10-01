# LADDU — Universal Personal AI Assistant

> **Voice-First, Speaker Biometric Recognition, Multi-Role Adaptive Companion (Friend, Teacher, Mentor, Assistant, Counselor), Multi-Device Compatible (Desktop, Mobile, Tablet, PWA), Local-First AI Assistant using Free and Open-Source Technologies.**

LADDU is a real-world, production-ready personal AI assistant designed to operate at the operating-system level. Built on **Node.js 22 LTS**, it combines local execution, zero-cost knowledge retrieval, AES-256 encrypted memory, strict multi-tier permissions, dangerous action blast-radius protection, acoustic voiceprint speaker recognition, daily health & wellness companion protocols, adaptive persona role-shifting, universal cross-device responsiveness, and a futuristic sci-fi HUD interface with a circular audio visualizer.

---

## 🌟 Core Highlights

- 🎭 **Adaptive Multi-Role Persona Engine (Friend, Teacher, Mentor, Assistant, Counselor)**:
  - **Dynamic Need Understanding**: Intelligently perceives user intent, depth of inquiry, emotional cues, and voice acoustics:
    - 🤝 **Friend (Close Companion)**: Warm, relaxed, empathetic, playful banter, validates emotions, attentive listener during downtime.
    - 👨‍🏫 **Teacher (Master Tutor)**: Pedagogical, structured, intuitive real-world analogies, step-by-step conceptual breakdowns, Socratic questioning, patient encouragement.
    - 🧭 **Mentor (Strategic Coach)**: Wise, visionary, challenges assumptions, focuses on long-term discipline, core principles, career trajectory, and life decisions.
    - 🤖 **Executive Assistant (JARVIS Mode)**: Precise, polite, action-oriented, data-rich, British-style witty butler banter, rapid task execution.
    - 🧘 **Counselor (Wellness Guide)**: Gentle, soothing, unhurried, mindful breathing guidance, de-escalating anxiety and cognitive overload.
  - **Role-Adaptive Voice Synthesis**: Dynamically modulates speech rate and pitch per persona for natural acoustic alignment.
  - **Interactive Role Switcher**: Quick-toggle pill in the HUD header to pin a specific persona or leave on "Auto-Detect".

- 📱 **Universal Multi-Device Compatibility & PWA**:
  - **Fluid Responsive Layouts**: Built for smartphones (<600px), 7-10" tablets/iPads/foldables (601px-1024px), laptops, and ultrawide desktops (>1025px).
  - **Progressive Web App (PWA)**: Standalone installable app (`manifest.json`) on iOS, iPadOS, Android, Windows, and macOS with Service Worker (`sw.js`) offline caching.
  - **1-Scan Wi-Fi Pairing**: Click **"PAIR DEVICE"** in the HUD to reveal an SVG QR Code and local network URL (`/api/network/info`) for immediate access on any mobile or tablet on the same Wi-Fi.

- 🎙️ **Voice Biometrics & Mandatory First-Run Induction**:
  - **First-Run Voice Induction Wizard**: Whenever LADDU is installed on any device (Desktop, Laptop, Mobile PWA, Tablet, iPad), it automatically launches a voice calibration wizard to record the user's vocal acoustics before enabling hands-free background wakeup.
  - Identifies and verifies the user by their unique voiceprint using acoustic spectral feature extraction (fundamental pitch $F_0$, spectral centroid, and frequency energy band vector cosine similarity).
  - Background sentry gatekeeping: Requires voice calibration before waking, preventing unauthorized access.
  - Configurable confidence matching threshold (default 68%) with enrolled speaker profiles.
  - Configurable wake words: `"Hey Laddu"`, `"Laddu"`, `"OK Laddu"`, `"Hello Laddu"`.
  - Dual-mode speech synthesis: OS-level Windows SAPI speech output + client Web Speech API with natural voice modulation.
  - Real-time speech interruption and continuous listening conversation mode.

- 🛡️ **Always-On Background Voice Sentry (Wake While App Closed)**:
  - **Zero-GUI Background Listening**: Continuously monitors the default microphone via Windows native .NET `SpeechRecognitionEngine` even when the browser or app window is completely closed or inactive.
  - **Speaker Biometric Gatekeeping**: Verifies vocal acoustic features before granting access, rejecting unauthorized voices and confirming commands for verified users.
  - **Hands-Free OS & Application Execution**: Hands-free voice commands to open desktop apps, create folders, run diagnostics, open the HUD interface, or answer complex inquiries.
  - **Room-Scale Auditory Feedback**: Answers back aloud through PC speakers via Windows SAPI speech synthesis.
  - **Windows Startup Auto-Activation**: Automatically launches in silent background mode on Windows startup (`npm run sentry:install`).

- ☕ **Marvel JARVIS-Style Daily & Healthy Companion**:
  - **Morning Briefings**: Daily operational status, local weather condition reports, host CPU load telemetry, and motivational quotes.
  - **Hydration Tracker**: Natural language water logging (*"I just drank 2 glasses of water"* or *"+250ml"*), tracking daily intake progress.
  - **Ergonomic & Wellness Nudges**: Posture recalibration reminders, 20-20-20 ocular rest intervals, and stretch reminders.
  - **Evening Debriefs**: Telemetry wrap-up, cognitive rest advisories, and sentry mode activation.

- 🖥️ **Full Downloadable Desktop Application**:
  - **1-Click Execution**: Launch with `LADDU.bat` for instant startup with dependency checks and automated port binding.
  - **Silent Launcher**: Run `launch-laddu.vbs` for background operation without a persistent terminal window.
  - **Desktop Shortcut**: Run `npm run shortcut` (or execute `install-desktop-shortcut.ps1`) to place a permanent shortcut directly onto your Windows Desktop.
  - **Native Window Experience**: Dedicated app mode via Edge/Chrome or Electron (`npm run app`).

- 🧠 **Modular AI Brain & Multi-Provider Architecture**:
  - **100% Offline Local Engine**: Operates with zero internet and zero API keys.
  - **Local Ollama Integration**: Runs local open-source models (Llama 3, Mistral, Phi-3, DeepSeek) for complete privacy.
  - **Google Gemini & OpenAI-Compatible Free Tiers**: Pluggable cloud intelligence with seamless offline fallback.

- 🌐 **Autonomous Multi-Source Web Research**:
  - Concurrently queries Wikipedia, DuckDuckGo, and arXiv.
  - Fact verification and cross-source consensus analysis.
  - Synthesizes structured markdown research reports with complete citations and dates.

- 📁 **File Intelligence & Local RAG Knowledge Base**:
  - Ingests and extracts PDF, DOCX, XLSX, CSV, TXT, Markdown, and Source Code files.
  - Overlapping semantic chunking engine.
  - Local TF-IDF and Cosine vector similarity search with zero external vector DB overhead.

- 🛡️ **Zero-Trust Security & Granular Permissions**:
  - 3-tier authorization: `ALLOW`, `ALLOW_ONCE`, `DENY`, `ASK`.
  - Dangerous Action Protection: Intercepts destructive commands (file deletion, format, kill commands) and requires explicit user confirmation challenges.
  - Append-only tamper-traceable audit logging.

- 🔒 **Long-Term Encrypted Memory Manager**:
  - AES-256-GCM authenticated encryption for sensitive user memories.
  - Natural language memory commands: *"Remember that my preferred language is TypeScript"*, *"Forget my editor"*.
  - Full user privacy controls: Add, View, Edit, Delete, Clear, and Export JSON.

- 💻 **Computer & Application Control**:
  - Launches approved desktop applications (Chrome, VS Code, Notepad, Calculator, Explorer).
  - Folder creation and file organization by category (Documents, Images, Code, Audio, Archives).
  - Real-time system telemetry and diagnostic probes.

---

## 🚀 Quick Start & Multi-Device Access

### Option 1: Desktop Shortcut (Windows)
Double-click the **`LADDU AI Assistant`** shortcut on your Windows Desktop (or run `npm run shortcut` to generate it).

### Option 2: 1-Click Batch Launcher
Double-click **`LADDU.bat`** in the project folder.

### Option 3: Terminal Command
```bash
npm start
```

### Option 4: Always-On Background Voice Sentry (Wake While App Closed)
To keep LADDU listening hands-free in the background without keeping any browser or terminal window open:
- **Immediate Start**: Double-click **`start-laddu-sentry.bat`** (or run `npm run sentry`).
- **Silent Background Launch**: Double-click **`launch-sentry-silent.vbs`**.
- **Auto-Start On Windows Boot**: Run `npm run sentry:install` (or right-click `install-startup-service.ps1` -> Run with PowerShell). LADDU will silently awaken with your PC and respond to *"Hey Laddu"* whenever you speak.
- **Stop Sentry**: Double-click **`stop-laddu-sentry.bat`** (or run `npm run sentry:uninstall` to remove from startup).

### Accessing From Phone, Tablet, or iPad:
1. Open the Desktop HUD at `http://localhost:3000`.
2. Click **"PAIR DEVICE"** in the top header.
3. Scan the displayed QR Code with your iPhone, iPad, or Android phone/tablet to open LADDU immediately on your local Wi-Fi.
4. Tap **"Add to Home Screen"** or **"Install App"** to install LADDU as a native PWA on your mobile or tablet.

---

## 🧪 Testing

Execute the automated test suite covering all modules:
```bash
npm test
```
*Current test suite: **65 automated tests, 100% passing** across 13 test suites (first-run voice induction, always-on background sentry, dynamic adaptive roles, multi-device networking, PWA delivery, voice biometrics, daily companion wellness, AI brain, encrypted memory, web research, local RAG, security, tools, and computer control).*

---

## 📚 Documentation Index

- [Architecture Guide](ARCHITECTURE.md)
- [Security & Permission Model](SECURITY.md)
- [Setup & Installation Instructions](SETUP.md)
- [REST & WebSocket API Reference](API.md)
- [Extensible Plugin Development](PLUGINS.md)
- [Voice & Audio System](VOICE.md)
- [Memory & Privacy System](MEMORY.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Development Status](DEVELOPMENT_STATUS.md)
- [Contributing](CONTRIBUTING.md)
