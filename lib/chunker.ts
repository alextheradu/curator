import { PDFParse } from "pdf-parse";

export interface Chunk { text: string; pageNumber: number; chunkIndex: number; }

const CHUNK_CHARS = 2000;
const OVERLAP_CHARS = 200;

function sanitizeExtractedText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    // Replace lone surrogate code units that can break downstream JSON encoding.
    .replace(
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
      "\uFFFD",
    )
    .replace(/\r\n?/g, "\n");
}

function splitText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_CHARS, text.length);
    const chunk = text
      .slice(start, end)
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
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
      const pageText = sanitizeExtractedText(textResult.pages[p].text as string).trim();
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
