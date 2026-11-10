import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { VerifiedDocument } from './manifest.ts';

export const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
export interface ExtractedChunk {
  id: string; pdfPage: number; printedPage: string; section: string;
  passage: string; startOffset: number; endOffset: number;
}

// Adapted from ITUAIReadiness chunk_text (MIT; see NOTICE.md).
// Preserve exact characters/offsets instead of joining words or combining pages.
// Smaller windows avoid silently truncating text at MiniLM's token limit.
export function chunkExact(text: string, baseOffset = 0, size = 96, overlap = 16) {
  if (!Number.isInteger(size) || !Number.isInteger(overlap) || size < 1 || overlap < 0 || overlap >= size) throw new Error('Invalid chunk settings');
  const words = [...text.matchAll(/\S+/g)];
  const result: { passage: string; startOffset: number; endOffset: number }[] = [];
  for (let i = 0; i < words.length;) {
    let end = Math.min(i + size, words.length);
    while (end > i + 1 && words[end - 1].index! + words[end - 1][0].length - words[i].index! > 1200) end--;
    const startOffset = words[i].index!;
    const endOffset = words[end - 1].index! + words[end - 1][0].length;
    if (endOffset - startOffset > 1200) throw new Error('Unextractable oversized token');
    result.push({ passage: text.slice(startOffset, endOffset), startOffset: startOffset + baseOffset, endOffset: endOffset + baseOffset });
    if (end === words.length) break;
    i = Math.max(i + 1, end - overlap);
  }
  return result;
}

export async function fetchVerifiedPdf(document: VerifiedDocument, offline = false) {
  const dir = resolve('.knowledge/raw'); await mkdir(dir, { recursive: true });
  const file = resolve(dir, document.cacheFile);
  if (!file.startsWith(dir + '/') && !file.startsWith(dir + '\\')) throw new Error('Unsafe cache filename');
  let bytes: Uint8Array;
  try { bytes = await readFile(file); }
  catch {
    if (offline) throw new Error(`Missing cached PDF: ${document.id}`);
    const allowedHosts = ['dha.gov.ae', 'www.dha.gov.ae', 'ai.gov.ae'];
    const url = new URL(document.url);
    if (url.protocol !== 'https:' || !allowedHosts.includes(url.hostname)) throw new Error('Unapproved official source');
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`Source download failed for ${document.id}: ${response.status}`);
    if (Number(response.headers.get('Content-Length')) > 30000000) throw new Error('Document too large');
    bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > 30000000 || hash(bytes) !== document.sha256) throw new Error(`Source changed: reverify ${document.id}`);
    await writeFile(file, bytes);
  }
  if (hash(bytes) !== document.sha256) throw new Error(`Source changed: reverify ${document.id}`);
  return bytes;
}

export async function extractChunks(document: VerifiedDocument, bytes: Uint8Array) {
  if (hash(bytes) !== document.sha256) throw new Error('Document hash mismatch');
  const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
  const pdf = await task.promise;
  const chunks: ExtractedChunk[] = [];
  try {
    for (const selection of document.selections) {
      const page = await pdf.getPage(selection.pdfPage);
      const content = await page.getTextContent();
      const text = content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('');
      if (!text.trim()) throw new Error(`No extractable text: ${document.id} page ${selection.pdfPage}; OCR/manual verification required`);
      const start = new RegExp(selection.start).exec(text);
      if (!start) throw new Error(`Verified section not found: ${document.id} / ${selection.section}`);
      const remainder = text.slice(start.index + start[0].length);
      const ending = selection.end ? new RegExp(selection.end).exec(remainder) : null;
      if (selection.end && !ending) throw new Error(`Verified section end not found: ${selection.section}`);
      const end = ending ? start.index + start[0].length + ending.index : text.length;
      const section = text.slice(start.index, end);
      for (const chunk of chunkExact(section, start.index)) {
        if (text.slice(chunk.startOffset, chunk.endOffset) !== chunk.passage) throw new Error('Passage offset mismatch');
        chunks.push({ ...chunk, pdfPage: selection.pdfPage, printedPage: selection.printedPage, section: selection.section,
          id: `${document.id}:${hash(JSON.stringify(document)).slice(0, 12)}:p${selection.pdfPage}:${chunk.startOffset}-${chunk.endOffset}` });
      }
    }
  } finally { await task.destroy(); }
  if (!chunks.length || new Set(chunks.map(chunk => chunk.id)).size !== chunks.length) throw new Error('Empty or duplicate chunks');
  return chunks;
}
