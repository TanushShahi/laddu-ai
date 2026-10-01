# J.A.R.V.I.S. — Security & Guardrail Model

> **Principle: Never grant an AI unrestricted access to the user's computer or data by default.**

## 1. Zero-Trust Permission Architecture

All tools, system calls, and sensors require authorization governed by `PermissionManager`:

| Permission Key | Default Policy | Description |
|---|---|---|
| `filesystem.read` | **ALLOW** | Read local files, documents, and directories |
| `filesystem.write` | **ASK** | Create, modify, or rename local files |
| `filesystem.delete` | **ASK** | Permanently delete files or directories |
| `terminal.exec` | **ASK** | Execute approved system or shell commands |
| `system.apps` | **ALLOW** | Launch authorized applications (Chrome, VS Code) |
| `network.research` | **ALLOW** | Query public knowledge bases & web search |
| `hardware.mic` | **ALLOW** | Access microphone for speech recognition |
| `hardware.camera` | **DENY** | Access camera for visual analysis |
| `system.diagnostics`| **ALLOW** | Inspect CPU, memory, battery, and disk status |

### Authorization States:
- **`ALLOW`**: Granted permanently until user revokes in dashboard.
- **`ALLOW_ONCE`**: Valid for a single call, then reverts to `ASK`.
- **`DENY`**: Completely forbidden; AI is prevented from calling the tool.
- **`ASK`**: Requires explicit user confirmation prompt.

---

## 2. Dangerous Action Protection (Blast-Radius Inspection)

The `DangerousActionProtector` intercepts actions before execution:
1. Detects destructive operations:
   - File deletion (especially wildcards, recursive folders, multi-file removals).
   - Dangerous shell patterns (`format`, `diskpart`, `rmdir /s`, `del /f`, `taskkill /f`, `shutdown`).
   - Security credential modifications.
2. Calculates the **Blast Radius** (number of affected items or threat level).
3. Generates a **Confirmation Challenge**:
   - Issues a unique challenge UUID.
   - Pushes modal alert to user with `CONFIRM` and `CANCEL` buttons.
   - Requires explicit signature before the tool is permitted to run.

---

## 3. Data Protection & Cryptography

- **Memory Encryption**:
  - Sensitive records (passwords, tokens, personal keys) are encrypted using **AES-256-GCM** via Node.js native `node:crypto`.
  - Stored with unique 96-bit initialization vectors (IV) and authentication tags to prevent data tampering.
- **Audit Logging**:
  - Every tool execution, permission evaluation, and challenge confirmation is appended to `./data/jarvis_audit.log`.
  - Immutable audit records can be inspected directly on the dashboard.
- **Local Isolation**:
  - Offline mode executes without transmitting a single byte over the network.
