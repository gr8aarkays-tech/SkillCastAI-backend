import { BadRequestException, Injectable } from '@nestjs/common';
import type { ContentExtractor, ExtractedChunk } from '../interfaces/content-extractor.js';
import { splitIntoChunks } from '../chunk.utils.js';

// pdf-parse ships CommonJS only; use createRequire to load it in ESM
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;

@Injectable()
export class PdfExtractor implements ContentExtractor {
  async extract(input: Buffer | string): Promise<ExtractedChunk[]> {
    if (!Buffer.isBuffer(input)) {
      throw new BadRequestException('PdfExtractor requires a Buffer input');
    }

    let data: { text: string };
    try {
      data = await pdfParse(input);
    } catch {
      throw new BadRequestException('Failed to parse PDF. The file may be corrupted or password-protected.');
    }

    const rawText = data.text;
    if (!rawText || !rawText.trim()) {
      throw new BadRequestException('PDF contains no extractable text. It may be a scanned image PDF.');
    }

    const chunks = splitIntoChunks(rawText);

    return chunks.map((chunk, index) => ({
      chunkIndex: index,
      content: chunk.content,
      tokenCount: chunk.tokenCount,
    }));
  }
}
