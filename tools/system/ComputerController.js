/**
 * Computer & Application Controller
 * High-level intent translator for computer operations, app launches, and folder workflows.
 */
import path from 'node:path';
import fs from 'node:fs';

export class ComputerController {
  constructor(options = {}) {
    this.toolRegistry = options.toolRegistry;
  }

  /**
   * Parse and execute a computer control intent
   * @param {string} commandText
   * @param {Object} [options]
   */
  async handleCommand(commandText, options = {}) {
    const text = commandText.trim();

    // 1. Open Application / Website: "open Chrome", "open VS Code", "open https://..."
    const openMatch = text.match(/^(?:open|launch|start)\s+([a-zA-Z0-9_\-\.\:\/\\ ]+)$/i);
    if (openMatch) {
      const target = openMatch[1].trim();
      const isUrl = /^https?:\/\//i.test(target);

      if (isUrl) {
        return this.toolRegistry.execute('launch_application', {
          appName: 'chrome',
          targetUrlOrPath: target
        }, options);
      }

      // Check standard app names
      const knownApps = ['chrome', 'code', 'vscode', 'notepad', 'calc', 'calculator', 'explorer', 'terminal'];
      const targetLower = target.toLowerCase();
      const matchedApp = knownApps.find(a => targetLower.includes(a));

      if (matchedApp) {
        return this.toolRegistry.execute('launch_application', {
          appName: matchedApp
        }, options);
      }
    }

    // 2. Create folder: "create a folder called Projects", "create folder MyDocs", "create folder data/dir"
    const folderMatch = text.match(/^(?:create|make)(?:\s+a)?\s+folder(?:\s+called|\s+named)?\s+([a-zA-Z0-9_\-\.\:\/\\ ]+)$/i);
    if (folderMatch) {
      const folderName = folderMatch[1].trim();
      const fullPath = path.resolve(process.cwd(), folderName);

      // Check permission for filesystem write
      const permCheck = this.toolRegistry.permissionManager.check('filesystem.write');
      if (!permCheck.granted) {
        return {
          success: false,
          blocked: true,
          type: 'PERMISSION_REQUIRED',
          permissionKey: 'filesystem.write',
          reason: permCheck.reason
        };
      }

      try {
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
        }
        return {
          success: true,
          action: 'create_folder',
          path: fullPath,
          message: `Created folder "${folderName}" successfully.`
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    // 3. Search files: "find my resume", "search files containing invoice"
    const searchMatch = text.match(/^(?:find|search|locate)(?:\s+my|\s+for)?\s+files?(?:\s+containing|\s+named|\s+with)?\s+(.+)$/i);
    if (searchMatch) {
      const keyword = searchMatch[1].trim();
      return this.toolRegistry.execute('search_files', {
        dirPath: '.',
        keyword
      }, options);
    }

    // 4. System diagnostics: "system diagnostics", "system status", "system health"
    if (/diagnostics|system status|system health|hardware specs/i.test(text)) {
      return this.toolRegistry.execute('get_system_diagnostics', {}, options);
    }

    return null; // Not a recognized computer command
  }
}

export default ComputerController;
