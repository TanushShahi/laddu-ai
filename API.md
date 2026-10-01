# J.A.R.V.I.S. — API Reference

## HTTP REST Endpoints

### 1. System & Telemetry
- `GET /api/status`
  - Returns current assistant status, active model provider, memory count, and hardware telemetry.
- `GET /api/diagnostics/self-check`
  - Runs self-diagnostics probes on AI brain, encryption, knowledge index, tool registry, and permissions.

### 2. Conversational Chat & Voice
- `POST /api/chat`
  - Request: `{ "message": "string" }`
  - Response: `{ "content": "string", "model": "string", "citations": [] }`
- `POST /api/voice/process`
  - Request: `{ "transcript": "string", "forceExecution": boolean }`
  - Response: `{ "handled": boolean, "response": "string", "speechPayload": {} }`

### 3. Web Research
- `POST /api/research`
  - Request: `{ "topic": "string" }`
  - Response: `{ "topic": "string", "report": "markdown", "sources": [], "sourceCount": number }`

### 4. File Intelligence & RAG
- `GET /api/files`
  - Returns list of all indexed documents in knowledge base.
- `POST /api/files/upload-raw`
  - Request: `{ "filename": "string", "content": "string" }`
  - Response: `{ "success": true, "file": { "chunksCount": number, ... } }`
- `POST /api/files/query`
  - Request: `{ "query": "string", "topK": 3 }`
  - Response: `{ "results": [{ "filename": "string", "score": number, "text": "string" }] }`

### 5. Memory Management
- `GET /api/memory?category=...`
  - Returns list of stored long-term memories.
- `POST /api/memory`
  - Request: `{ "key": "string", "value": "string", "category": "string", "isSensitive": boolean }`
- `DELETE /api/memory/:id`
  - Deletes memory item by ID.
- `GET /api/memory/export`
  - Exports all memories as a backup JSON file.

### 6. Permissions & Security
- `GET /api/permissions`
  - Returns permission policies, pending safety challenges, and recent audit logs.
- `POST /api/permissions/grant`
  - Request: `{ "permissionKey": "string", "type": "ALLOW" | "ALLOW_ONCE" | "DENY" }`
- `POST /api/permissions/challenge/confirm`
  - Request: `{ "challengeId": "string" }`
- `POST /api/permissions/challenge/cancel`
  - Request: `{ "challengeId": "string" }`

### 7. Automations
- `GET /api/automations`
  - Returns registered recurring routines.
- `POST /api/automations`
  - Request: `{ "name": "string", "schedule": "string", "goal": "string", "enabled": boolean }`
- `POST /api/automations/:id/run`
  - Runs routine immediately.
- `POST /api/automations/:id/toggle`
  - Request: `{ "enabled": boolean }`

---

## WebSocket API (`ws://localhost:3000/ws`)

### Outgoing Events (Server → Client)
- `WELCOME`: Host greeting & telemetry.
- `AI_STATE_CHANGE`: `{ state: "LISTENING" | "THINKING" | "SEARCHING" | "ANALYZING" | "EXECUTING" | "COMPLETED" }`
- `VOICE_OUTPUT`: Synthesized voice payload with rate, pitch, and sanitized speech text.

### Incoming Events (Client → Server)
- `VOICE_TRANSCRIPT`: Streamed speech-to-text transcript.
- `INTERRUPT`: Halts current speech and tasks immediately.
