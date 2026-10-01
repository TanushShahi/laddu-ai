/**
 * Electron Main Process for LADDU Assistant
 * Runs LADDU as a standalone native desktop application with HUD interface.
 */
import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import http from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let mainWindow = null;
let tray = null;
let serverProcess = null;
const SERVER_PORT = process.env.PORT || 3000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

// Check if LADDU server is already alive
function checkServerReady(timeoutMs = 15000) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    function ping() {
      const req = http.get(`${SERVER_URL}/api/status`, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          retry();
        }
      });
      req.on('error', () => retry());
      req.end();
    }

    function retry() {
      if (Date.now() - startTime > timeoutMs) {
        reject(new Error('Timeout waiting for LADDU server to start.'));
      } else {
        setTimeout(ping, 350);
      }
    }

    ping();
  });
}

function startBackendServer() {
  return new Promise((resolve) => {
    // First test if already running
    checkServerReady(1000)
      .then(() => {
        console.log('[LADDU Desktop] Server already running at ' + SERVER_URL);
        resolve(true);
      })
      .catch(() => {
        console.log('[LADDU Desktop] Spawning internal server...');
        const serverScript = path.join(rootDir, 'src', 'server.js');
        serverProcess = spawn(process.execPath, [serverScript], {
          cwd: rootDir,
          env: { ...process.env, PORT: SERVER_PORT.toString() },
          stdio: 'inherit'
        });

        checkServerReady(15000)
          .then(() => resolve(true))
          .catch((err) => {
            console.error('[LADDU Desktop] Server failed to start:', err.message);
            resolve(false);
          });
      });
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#070b14',
    title: 'LADDU — Universal Personal AI Assistant',
    frame: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL(SERVER_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

function createTray() {
  // Simple tray icon fallback
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('LADDU AI Assistant — Standing By');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open LADDU HUD',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Morning Briefing',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('trigger-companion', 'morning');
        }
      }
    },
    {
      label: 'Health Check / Posture',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('trigger-companion', 'posture');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Exit LADDU',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(async () => {
  await startBackendServer();
  createMainWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (serverProcess) {
    serverProcess.kill();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running in tray
  }
});
