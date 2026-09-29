export interface ExtractedChunk {
  chunkIndex: number;
  content: string;
  tokenCount: number;
}

export interface ContentExtractor {
  extract(input: Buffer | string): Promise<ExtractedChunk[]>;
}

export const CONTENT_EXTRACTOR = 'CONTENT_EXTRACTOR';
