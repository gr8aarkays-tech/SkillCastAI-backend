import { BadRequestException, Injectable } from '@nestjs/common';
import { PdfExtractor } from './extractors/pdf.extractor.js';
import { UrlExtractor } from './extractors/url.extractor.js';
import { TextExtractor } from './extractors/text.extractor.js';
import type { ExtractedChunk } from './interfaces/content-extractor.js';

export type SourceType = 'pdf' | 'url' | 'text';

@Injectable()
export class ExtractionService {
  constructor(
    private readonly pdfExtractor: PdfExtractor,
    private readonly urlExtractor: UrlExtractor,
    private readonly textExtractor: TextExtractor,
  ) {}

  async extract(
    type: SourceType,
    input: Buffer | string,
  ): Promise<ExtractedChunk[]> {
    switch (type) {
      case 'pdf':
        return this.pdfExtractor.extract(input);
      case 'url':
        return this.urlExtractor.extract(input);
      case 'text':
        return this.textExtractor.extract(input);
      default:
        throw new BadRequestException(`Unsupported source type: ${type as string}`);
    }
  }
}
