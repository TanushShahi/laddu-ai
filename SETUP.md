# J.A.R.V.I.S. — Setup & Installation Guide

## 1. Prerequisites
- **Node.js**: Version 22.0.0 or higher.
- **Git**: Installed and available in your terminal.

---

## 2. Platform Installation

### Windows (PowerShell)
```powershell
# 1. Clone repository
git clone <repository-url>
cd jarvis

# 2. Install dependencies
npm install

# 3. Create .env configuration
Copy-Item .env.example .env

# 4. Start JARVIS
npm start
```

### Linux (Ubuntu / Debian / Fedora)
```bash
# 1. Clone repository
git clone <repository-url>
cd jarvis

# 2. Install dependencies
npm install

# 3. Create .env configuration
cp .env.example .env

# 4. Start JARVIS
npm start
```

### macOS
```bash
# 1. Clone repository
git clone <repository-url>
cd jarvis

# 2. Install dependencies
npm install

# 3. Create .env configuration
cp .env.example .env

# 4. Start JARVIS
npm start
```

### Android Companion Setup
1. Ensure your Android phone is connected to the same Wi-Fi network as the JARVIS host computer.
2. Find your computer's local IP address (`ipconfig` on Windows, `ip a` on Linux/macOS).
3. On your phone's browser (Chrome recommended), navigate to:
   ```
   http://<YOUR_COMPUTER_IP>:3000/mobile.html
   ```
4. Tap **Push to Communicate** to send voice commands and interact with JARVIS remotely.

---

## 3. First-Run Experience

When launching JARVIS for the first time:
1. Open `http://localhost:3000` in your web browser.
2. JARVIS will announce: *"Good day. All systems are operational. I am prepared to assist you."*
3. Test your microphone by clicking **Start Listening** or speaking *"Hey Jarvis"*.
4. Switch to the **Diagnostics** tab and click **Run System Self-Check** to verify that all modules are nominal.
5. In **Permissions**, verify your preferred policies for filesystem and computer commands.
