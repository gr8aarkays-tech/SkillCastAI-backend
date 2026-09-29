import { Module } from '@nestjs/common';
import { PdfExtractor } from './extractors/pdf.extractor.js';
import { UrlExtractor } from './extractors/url.extractor.js';
import { TextExtractor } from './extractors/text.extractor.js';
import { ExtractionService } from './extraction.service.js';

@Module({
  providers: [PdfExtractor, UrlExtractor, TextExtractor, ExtractionService],
  exports: [ExtractionService],
})
export class ExtractionModule {}
