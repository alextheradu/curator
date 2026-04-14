import { PDFParse } from "pdf-parse";

export interface Chunk { text: string; pageNumber: number; chunkIndex: number; }

const CHUNK_CHARS = 2000;
const OVERLAP_CHARS = 200;

function splitText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_CHARS, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) chunks.push(chunk);
    start += CHUNK_CHARS - OVERLAP_CHARS;
  }
  return chunks;
}

export async function extractChunks(buffer: Buffer): Promise<{ chunks: Chunk[]; pageCount: number }> {
  const parser = new PDFParse({ data: buffer });
  try {
    const textResult = await parser.getText();

    const pageCount = textResult.total;
    const chunks: Chunk[] = [];
    let idx = 0;

    for (let p = 0; p < textResult.pages.length; p++) {
      const pageText = (textResult.pages[p].text as string).trim();
      if (!pageText) continue;
      for (const text of splitText(pageText)) {
        chunks.push({ text, pageNumber: p + 1, chunkIndex: idx++ });
      }
    }

    return { chunks, pageCount };
  } finally {
    await parser.destroy();
  }
}
