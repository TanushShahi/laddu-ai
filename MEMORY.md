# J.A.R.V.I.S. — Memory & Privacy System

## 1. Storage Layers
- **Short-Term Memory**: Conversation history maintained in sliding context windows within `ContextManager`.
- **Long-Term Memory**: Stored persistently in SQLite (`jarvis_memory.db`) or structured local storage.

## 2. Privacy & AES-256 Encryption
- Sensitive records marked as confidential are encrypted using **AES-256-GCM**.
- Key derivation uses a 256-bit secret stored locally in `.data/.secret_key` with strict file permissions.
- Memory items are decrypted only when explicitly requested by authorized components.

## 3. Natural Language Memory Extraction
JARVIS understands natural statements:
- *"Remember that my favorite programming language is Rust"*
- *"Remember that my project deadline is November 15"*
- *"Forget my project deadline"*

## 4. User Privacy Dashboard
Through the Memory Manager tab in the HUD, users can:
- View all stored memories and their encryption status.
- Edit or update stored values.
- Permanently delete individual items or wipe the entire database.
- Export an encrypted JSON backup for portability.
