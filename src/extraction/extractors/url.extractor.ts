import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ContentExtractor, ExtractedChunk } from '../interfaces/content-extractor.js';
import { splitIntoChunks } from '../chunk.utils.js';

@Injectable()
export class UrlExtractor implements ContentExtractor {
  async extract(input: Buffer | string): Promise<ExtractedChunk[]> {
    if (Buffer.isBuffer(input)) {
      throw new BadRequestException('UrlExtractor requires a string URL input');
    }

    const url = input.trim();
    try {
      new URL(url); // validates format
    } catch {
      throw new BadRequestException(`Invalid URL: ${url}`);
    }

    let html: string;
    try {
      const response = await axios.get<string>(url, {
        timeout: 15_000,
        maxContentLength: 5 * 1024 * 1024, // 5 MB
        headers: {
          'User-Agent': 'SkillCastAI/1.0 (+https://skillcastai.com/bot)',
          Accept: 'text/html,application/xhtml+xml',
        },
        responseType: 'text',
      });
      html = response.data as string;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`Failed to fetch URL: ${msg}`);
    }

    const $ = cheerio.load(html);

    // Remove non-content elements
    $('script, style, nav, header, footer, aside, [role="navigation"], [role="banner"], [role="contentinfo"], .cookie-banner, .advertisement, .ad').remove();

    // Try to get main content area; fall back to body
    const contentEl = $('main, article, [role="main"], #main, #content').first();
    const rawText = (contentEl.length ? contentEl : $('body')).text();

    const cleaned = rawText
      .replace(/\t/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!cleaned) {
      throw new BadRequestException('Could not extract readable content from the URL.');
    }

    const chunks = splitIntoChunks(cleaned);
    return chunks.map((chunk, index) => ({
      chunkIndex: index,
      content: chunk.content,
      tokenCount: chunk.tokenCount,
    }));
  }
}
