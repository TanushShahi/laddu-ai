# J.A.R.V.I.S. — Voice & Audio Subsystem

## 1. Wake Word Engine
- Configurable wake phrase (default: `"Hey Jarvis"`).
- Alternate triggers: `"Jarvis"`, `"OK Jarvis"`, `"Hello Jarvis"`.
- Continuous conversation mode: after wake activation, JARVIS maintains an open conversation window for 30 seconds for follow-up commands without repeating the wake word.
- Explicit cancellation phrases: `"stop listening"`, `"goodbye"`, `"cancel"`, `"sleep"`.

## 2. Speech-to-Text (STT)
- Supports Web Speech API in browsers with automatic transcript normalization.
- Multi-language support (English, German, French, Spanish, Hindi, Japanese, Chinese, etc.).

## 3. Text-to-Speech (TTS)
- **Windows SAPI**: Uses Windows native `System.Speech.Synthesis` via PowerShell when running as a headless desktop service.
- **Web Speech Synthesis**: Plays high-fidelity natural speech directly through the browser with adjustable rate and pitch.
- Markdown and code sanitizer ensures clean verbal output without reading URLs or code syntax.
- Full real-time interruption support.
