/**
 * Multi-Format Document Parser
 * Extracts text and metadata from PDF, DOCX, XLSX, CSV, JSON, Markdown, and Source Code files.
 */
import fs from 'node:fs';
import path from 'node:path';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import pdfParse from 'pdf-parse';

export class DocumentParser {
  /**
   * Determine whether a file is supported based on extension
   */
  static isSupported(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const supported = [
      '.pdf', '.docx', '.xlsx', '.xls', '.csv',
      '.txt', '.md', '.json', '.xml', '.html',
      '.js', '.ts', '.py', '.java', '.c', '.cpp', '.cs', '.go', '.rs', '.sql'
    ];
    return supported.includes(ext);
  }

  /**
   * Parse a file and extract its text content and metadata
   * @param {string} filePath
   * @returns {Promise<{text: string, metadata: Object}>}
   */
  static async parse(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath);

    let extractedText = '';

    switch (ext) {
      case '.pdf': {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        extractedText = pdfData.text || '';
        break;
      }

      case '.docx': {
        const result = await mammoth.extractRawText({ path: filePath });
        extractedText = result.value || '';
        break;
      }

      case '.xlsx':
      case '.xls':
      case '.csv': {
        const workbook = xlsx.readFile(filePath);
        const sheetTexts = [];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const csvContent = xlsx.utils.sheet_to_csv(sheet);
          sheetTexts.push(`--- Sheet: ${sheetName} ---\n${csvContent}`);
        }
        extractedText = sheetTexts.join('\n\n');
        break;
      }

      default: {
        // Plain text, Markdown, JSON, Code, etc.
        extractedText = fs.readFileSync(filePath, 'utf8');
        break;
      }
    }

    return {
      text: extractedText.trim(),
      metadata: {
        filename,
        filePath,
        fileSize: stat.size,
        extension: ext,
        extractedLength: extractedText.length,
        modifiedAt: stat.mtime.toISOString()
      }
    };
  }
}

export default DocumentParser;
