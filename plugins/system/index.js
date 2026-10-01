/**
 * System Diagnostics & Application Launcher Plugin
 * Gathers system hardware stats and safely launches whitelisted desktop applications.
 */
import os from 'node:os';
import fs from 'node:fs';
import { spawn } from 'node:child_process';

export default {
  name: 'system',
  version: '1.0.0',
  description: 'Inspects computer health and launches permitted desktop applications.',
  requiredPermission: 'system.diagnostics',

  tools: [
    {
      name: 'get_system_diagnostics',
      description: 'Retrieve real-time computer diagnostics: CPU, memory, uptime, OS.',
      requiredPermission: 'system.diagnostics',
      parameters: {},
      execute: async () => {
        const totalMemBytes = os.totalmem();
        const freeMemBytes = os.freemem();
        const usedMemBytes = totalMemBytes - freeMemBytes;
        const memPercent = Math.round((usedMemBytes / totalMemBytes) * 100);

        const cpus = os.cpus();
        const cpuModel = cpus[0]?.model || 'Unknown CPU';
        const cpuCores = cpus.length;

        const uptimeSeconds = os.uptime();
        const uptimeHours = (uptimeSeconds / 3600).toFixed(1);

        // System health calculation based on memory & system responsiveness
        const healthPercent = Math.max(30, 100 - Math.round(memPercent * 0.4));

        return {
          platform: os.platform(),
          release: os.release(),
          arch: os.arch(),
          hostname: os.hostname(),
          cpu: {
            model: cpuModel,
            cores: cpuCores
          },
          memory: {
            totalMB: Math.round(totalMemBytes / (1024 * 1024)),
            usedMB: Math.round(usedMemBytes / (1024 * 1024)),
            freeMB: Math.round(freeMemBytes / (1024 * 1024)),
            usedPercent: `${memPercent}%`
          },
          uptime: `${uptimeHours} hours`,
          systemHealth: `${healthPercent}%`,
          timestamp: new Date().toISOString()
        };
      }
    },
    {
      name: 'launch_application',
      description: 'Launch an approved desktop application (Chrome, VS Code, Notepad, Calculator, Explorer).',
      requiredPermission: 'system.apps',
      parameters: {
        appName: { type: 'string', description: 'Name of application to open: chrome, code, notepad, calc, explorer' },
        targetUrlOrPath: { type: 'string', description: 'Optional website URL or folder path to open' }
      },
      execute: async ({ appName, targetUrlOrPath = '' }) => {
        const app = appName.toLowerCase().trim();
        const isWin = os.platform() === 'win32';

        const appMap = {
          chrome: isWin ? 'chrome' : 'google-chrome',
          edge: isWin ? 'msedge' : 'microsoft-edge',
          code: 'code',
          vscode: 'code',
          notepad: isWin ? 'notepad' : 'gedit',
          calc: isWin ? 'calc' : 'gnome-calculator',
          calculator: isWin ? 'calc' : 'gnome-calculator',
          explorer: isWin ? 'explorer' : 'xdg-open',
          terminal: isWin ? 'powershell' : 'bash'
        };

        let executable = appMap[app];
        if (!executable) {
          return {
            error: `Application "${appName}" is not in the approved application allowlist.`,
            approvedApps: Object.keys(appMap)
          };
        }

        try {
          const args = targetUrlOrPath ? [targetUrlOrPath] : [];
          if (isWin) {
            // Find real executable paths on Windows if available
            if (app === 'chrome') {
              const paths = [
                process.env['ProgramFiles'] + '\\Google\\Chrome\\Application\\chrome.exe',
                process.env['ProgramFiles(x86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
                process.env['LocalAppData'] + '\\Google\\Chrome\\Application\\chrome.exe'
              ];
              const found = paths.find(p => p && fs.existsSync(p));
              if (found) executable = found;
            } else if (app === 'edge') {
              const paths = [
                process.env['ProgramFiles(x86)'] + '\\Microsoft\\Edge\\Application\\msedge.exe',
                process.env['ProgramFiles'] + '\\Microsoft\\Edge\\Application\\msedge.exe',
                process.env['LocalAppData'] + '\\Microsoft\\Edge\\Application\\msedge.exe'
              ];
              const found = paths.find(p => p && fs.existsSync(p));
              if (found) executable = found;
            }

            if (executable.endsWith('.exe')) {
              spawn(executable, args, { detached: true, stdio: 'ignore' }).unref();
            } else {
              spawn('cmd.exe', ['/c', 'start', '', executable, ...args], {
                detached: true,
                stdio: 'ignore'
              }).unref();
            }
          } else {
            spawn(executable, args, {
              detached: true,
              stdio: 'ignore'
            }).unref();
          }

          return {
            status: 'LAUNCHED',
            application: appName,
            target: targetUrlOrPath || 'default'
          };
        } catch (err) {
          return { error: `Failed to launch application: ${err.message}` };
        }
      }
    }
  ]
};
