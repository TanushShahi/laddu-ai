# J.A.R.V.I.S. — Troubleshooting Guide

### 1. Microphone not picking up audio (Desktop & Mobile)
- **On Desktop**: Ensure your browser has permission to access the microphone. `http://localhost:3000` is automatically treated as a secure origin by Chrome.
- **On Mobile Chrome / Safari**: Mobile browsers strictly require **HTTPS** to access the microphone over Wi-Fi.
  - LADDU runs an automatic HTTPS server on port **3443**:
    ```
    https://<your-laptop-ip>:3443/mobile.html
    ```
  - When you first visit, Chrome will show *"Your connection is not private"* (due to the local self-signed SSL certificate).
    1. Tap **Advanced**
    2. Tap **Proceed to <ip> (unsafe)**
  - Once proceeded, Chrome unlocks the **Secure Context**, allowing you to tap **Allow** on the microphone permission prompt!
- Click **Start Listening** on the HUD or **Push to Communicate** on Mobile to verify audio pickup.

### 2. Ollama provider not connecting
- Verify that Ollama is running locally:
  ```bash
  ollama serve
  ```
- Check that you have pulled the required model:
  ```bash
  ollama pull llama3
  ```
- If Ollama is offline, JARVIS automatically falls back to the **Offline Local Engine**.

### 3. Permission blocked alerts
- If JARVIS states *"Action requires user authorization"*, open the **Permissions & Safety** tab in the HUD.
- Change the target permission from `ASK` to `ALLOW` (or `ALLOW_ONCE`).

### 4. Port 3000 in use
- Change the port in your `.env` file:
  ```
  PORT=3050
  ```
- Restart JARVIS: `npm start`.
