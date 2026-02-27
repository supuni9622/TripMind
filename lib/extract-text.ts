import fs from 'fs/promises';
import path from 'path';

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

export function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  while (start < cleaned.length) {
    let end = Math.min(start + CHUNK_SIZE, cleaned.length);
    if (end < cleaned.length) {
      const lastSpace = cleaned.lastIndexOf(' ', end);
      if (lastSpace > start) end = lastSpace;
    }
    chunks.push(cleaned.slice(start, end).trim());
    start = end - CHUNK_OVERLAP;
    if (start >= cleaned.length) break;
  }
  return chunks.filter(Boolean);
}

export async function extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = await fs.readFile(filePath);
  const str = buffer.toString('utf-8');

  if (mimeType === 'application/pdf' || ext === '.pdf') {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch {
      return '';
    }
  }

  if (['.txt', '.md', '.csv'].includes(ext) || mimeType.includes('text') || mimeType === 'text/csv') {
    return str;
  }

  return str;
}
