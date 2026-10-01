/**
 * Preload Script for LADDU Desktop Application
 * Bridges native shell capabilities securely to the frontend.
 */
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('ladduDesktop', {
  isDesktopApp: true,
  platform: process.platform,
  onCompanionTrigger: (callback) => {
    ipcRenderer.on('trigger-companion', (_event, action) => callback(action));
  }
});
