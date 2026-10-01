# J.A.R.V.I.S. — Architecture Specification

## Architectural Overview

JARVIS is engineered using a decoupled, modular event-driven architecture designed to operate seamlessly across desktop and mobile environments.

```
                    ┌──────────────────────────────────────────────┐
                    │      Futuristic Sci-Fi HUD & Visualizer      │
                    │        (HTML5 / Canvas / Web Audio)          │
                    └──────────────────────┬───────────────────────┘
                                           │ WebSocket / HTTP
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             JARVIS Core Gateway                                  │
│                          (Express + ws Server: 3000)                             │
└───────┬───────────────────┬───────────────────┬───────────────────┬──────────────┘
        │                   │                   │                   │
        ▼                   ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   AI Brain    │   │Voice Subsystem│   │Memory System  │   │  RAG Engine   │
│(ModelFactory) │   │ (WakeWord,STT,│   │  (AES-256     │   │(Parser,Chunk, │
│               │   │      TTS)     │   │  SQLite/JSON) │   │  VectorIndex) │
└───────┬───────┘   └───────────────┘   └───────────────┘   └───────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         Security & Guardrail Pipeline                            │
│  [PermissionManager] ──► [DangerousActionProtector] ──► [Tamper-Proof AuditLog]  │
└───────────────────────────────────────┬──────────────────────────────────────────┘
                                        │ Authorized Executions Only
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             Tool & Plugin Registry                               │
│     ├── Calculator Plugin      ├── Filesystem Plugin      ├── Weather Plugin     │
│     ├── System Telemetry       ├── Task Planner           ├── Automations        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Organization

```
jarvis/
├── core/
│   ├── brain/             # Central reasoning & model orchestration
│   ├── memory/            # Long-term SQLite & AES-256 storage
│   ├── planner/           # Task planner (Plan->Exec->Verify->Report) & Automations
│   ├── context/           # Sliding-window conversation manager
│   └── config.js          # Unified environment loader
├── ai/
│   ├── models/            # Model definitions
│   ├── providers/         # Multi-provider implementations (Local, Ollama, Gemini, OpenAI)
│   ├── rag/               # Retrieval-Augmented Generation pipeline
│   └── embeddings/        # Semantic indexing
├── voice/
│   ├── wakeword/          # Trigger phrase & conversational mode detector
│   ├── speech_to_text/    # STT normalization & language pipeline
│   └── text_to_speech/    # SAPI & Web Speech synthesis
├── knowledge/
│   ├── web/               # DuckDuckGo & arXiv clients, ResearchAgent
│   ├── wikipedia/         # Wikimedia REST client
│   ├── documents/         # PDF, DOCX, XLSX, CSV multi-format parser
│   └── vector_db/         # TF-IDF & Cosine similarity vector index
├── tools/
│   ├── system/            # ComputerController (apps, folder operations)
│   ├── filesystem/        # Safe file discovery
│   └── terminal/          # Sandboxed command interface
├── security/
│   ├── permissions/       # 3-tier permission manager (ALLOW/ASK/DENY)
│   ├── sandbox/           # Blast-radius calculator & confirmation challenges
│   └── audit/             # Append-only audit logger
├── plugins/               # Extensible plugin directory (weather, calc, fs, sys)
├── frontend/              # Web HUD dashboard & canvas visualizer
├── mobile/                # Mobile companion interface
├── data/                  # Persistent SQLite DB, vector indexes, uploads, audit log
├── tests/                 # Automated unit and integration test suites
├── .env.example           # Documented configuration template
└── package.json           # Project manifest
```

---

## AI Model Provider Layer

JARVIS implements the `BaseProvider` interface:

1. **`OfflineLocalProvider`**:
   - Zero network connectivity required.
   - Built-in heuristics, math evaluations, identity, and system status.
   - Guaranteed 100% operational uptime.
2. **`OllamaProvider`**:
   - Connects to local Ollama daemon (`http://localhost:11434`).
   - Supports Llama 3, Mistral, Phi-3, DeepSeek, and CodeLlama.
3. **`GeminiProvider`**:
   - Google Gemini API free tier with token usage tracking.
4. **`OpenAICompatibleProvider`**:
   - Universal adapter for LM Studio, Groq, OpenRouter, vLLM, and OpenAI.
5. **`ModelFactory`**:
   - Instantiates providers dynamically and verifies connectivity.
   - Automatically falls back to `OfflineLocalProvider` if remote endpoints fail.
