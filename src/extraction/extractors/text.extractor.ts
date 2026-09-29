import { BadRequestException, Injectable } from '@nestjs/common';
import type { ContentExtractor, ExtractedChunk } from '../interfaces/content-extractor.js';
import { splitIntoChunks } from '../chunk.utils.js';

@Injectable()
export class TextExtractor implements ContentExtractor {
  async extract(input: Buffer | string): Promise<ExtractedChunk[]> {
    if (Buffer.isBuffer(input)) {
      throw new BadRequestException('TextExtractor requires a string input');
    }

    const cleaned = input
      .replace(/\0/g, '')         // remove null bytes
      .replace(/\r\n/g, '\n')    // normalise line endings
      .replace(/\r/g, '\n')
      .replace(/[^\S\n]+/g, ' ') // collapse horizontal whitespace
      .trim();

    if (!cleaned) {
      throw new BadRequestException('Text input is empty after normalisation.');
    }

    const chunks = splitIntoChunks(cleaned);
    return chunks.map((chunk, index) => ({
      chunkIndex: index,
      content: chunk.content,
      tokenCount: chunk.tokenCount,
    }));
  }
}
