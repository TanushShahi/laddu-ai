/**
 * Filesystem Plugin
 * Safe file search, directory listing, file inspection, and folder organization.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export default {
  name: 'filesystem',
  version: '1.0.0',
  description: 'Inspects, searches, reads, and organizes local files and directories.',
  requiredPermission: 'filesystem.read',

  tools: [
    {
      name: 'list_directory',
      description: 'List contents of a directory with file types and sizes.',
      requiredPermission: 'filesystem.read',
      parameters: {
        dirPath: { type: 'string', description: 'Directory path to list' }
      },
      execute: async ({ dirPath = '.' }) => {
        const resolved = path.resolve(process.cwd(), dirPath);
        if (!fs.existsSync(resolved)) {
          return { error: `Directory not found: ${dirPath}` };
        }

        const entries = fs.readdirSync(resolved, { withFileTypes: true });
        const items = entries.map(e => {
          let size = 0;
          try {
            if (e.isFile()) {
              size = fs.statSync(path.join(resolved, e.name)).size;
            }
          } catch {}
          return {
            name: e.name,
            isDirectory: e.isDirectory(),
            isFile: e.isFile(),
            sizeBytes: size,
            extension: path.extname(e.name)
          };
        });

        return { path: resolved, itemCount: items.length, items };
      }
    },
    {
      name: 'search_files',
      description: 'Search for files matching a pattern or extension.',
      requiredPermission: 'filesystem.read',
      parameters: {
        dirPath: { type: 'string', description: 'Base directory to search in' },
        keyword: { type: 'string', description: 'Keyword to search for in filenames' },
        extension: { type: 'string', description: 'Optional extension (e.g. .pdf, .docx, .js)' }
      },
      execute: async ({ dirPath = '.', keyword = '', extension = '' }) => {
        const resolved = path.resolve(process.cwd(), dirPath);
        if (!fs.existsSync(resolved)) {
          return { error: `Directory not found: ${dirPath}` };
        }

        const results = [];
        function walk(current) {
          const entries = fs.readdirSync(current, { withFileTypes: true });
          for (const e of entries) {
            const full = path.join(current, e.name);
            if (e.isDirectory()) {
              if (!e.name.startsWith('.') && e.name !== 'node_modules') {
                try { walk(full); } catch {}
              }
            } else if (e.isFile()) {
              const matchesKeyword = !keyword || e.name.toLowerCase().includes(keyword.toLowerCase());
              const matchesExt = !extension || path.extname(e.name).toLowerCase() === extension.toLowerCase();
              if (matchesKeyword && matchesExt) {
                results.push({
                  name: e.name,
                  path: full,
                  sizeBytes: fs.statSync(full).size
                });
              }
            }
          }
        }

        walk(resolved);
        return { matchedCount: results.length, files: results.slice(0, 50) };
      }
    },
    {
      name: 'organize_folder',
      description: 'Organize files in a folder into subdirectories based on extension (Documents, Images, Code, Audio, etc.).',
      requiredPermission: 'filesystem.write',
      parameters: {
        targetDir: { type: 'string', description: 'Directory to organize' },
        dryRun: { type: 'boolean', description: 'If true, only plans without moving' }
      },
      execute: async ({ targetDir, dryRun = true }) => {
        const resolved = path.resolve(process.cwd(), targetDir);
        if (!fs.existsSync(resolved)) {
          return { error: `Directory not found: ${targetDir}` };
        }

        const categoryMap = {
          Documents: ['.pdf', '.docx', '.doc', '.txt', '.xlsx', '.csv', '.pptx', '.md'],
          Images: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'],
          Code: ['.js', '.ts', '.py', '.java', '.c', '.cpp', '.html', '.css', '.json'],
          Audio: ['.mp3', '.wav', '.ogg', '.m4a'],
          Archives: ['.zip', '.tar', '.gz', '.7z', '.rar']
        };

        const entries = fs.readdirSync(resolved, { withFileTypes: true });
        const moves = [];

        for (const e of entries) {
          if (e.isFile()) {
            const ext = path.extname(e.name).toLowerCase();
            let destCategory = 'Others';
            for (const [category, extensions] of Object.entries(categoryMap)) {
              if (extensions.includes(ext)) {
                destCategory = category;
                break;
              }
            }

            const destDir = path.join(resolved, destCategory);
            const destPath = path.join(destDir, e.name);
            moves.push({
              file: e.name,
              category: destCategory,
              from: path.join(resolved, e.name),
              to: destPath
            });
          }
        }

        if (dryRun) {
          return {
            status: 'DRY_RUN_PLAN',
            filesCount: moves.length,
            plan: moves
          };
        }

        // Perform actual organization
        let movedCount = 0;
        for (const m of moves) {
          const categoryDir = path.dirname(m.to);
          if (!fs.existsSync(categoryDir)) {
            fs.mkdirSync(categoryDir, { recursive: true });
          }
          fs.renameSync(m.from, m.to);
          movedCount++;
        }

        return {
          status: 'COMPLETED',
          organizedFilesCount: movedCount,
          categoriesCreated: [...new Set(moves.map(m => m.category))]
        };
      }
    }
  ]
};
