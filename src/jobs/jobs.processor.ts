import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import * as fs from 'fs/promises';
import { ExtractionService } from '../extraction/extraction.service.js';
import { DocumentEntity } from '../sources/document.entity.js';
import { SourceEntity, SourceStatus, SourceType } from '../sources/source.entity.js';
import { JOB_PROCESS_SOURCE, QUEUE_SOURCE_PROCESSING } from './jobs.constants.js';

export interface ProcessSourceJobData {
  sourceId: string;
}

@Processor(QUEUE_SOURCE_PROCESSING)
export class SourceProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(SourceProcessingProcessor.name);

  constructor(
    @InjectRepository(SourceEntity)
    private readonly sourceRepo: Repository<SourceEntity>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    private readonly extractionService: ExtractionService,
  ) {
    super();
  }

  async process(job: Job<ProcessSourceJobData>): Promise<void> {
    if (job.name !== JOB_PROCESS_SOURCE) return;

    const { sourceId } = job.data;
    this.logger.log(`Processing source ${sourceId}`);

    const source = await this.sourceRepo.findOne({ where: { id: sourceId } });
    if (!source) {
      this.logger.warn(`Source ${sourceId} not found — skipping`);
      return;
    }

    // Mark as processing
    source.status = SourceStatus.PROCESSING;
    await this.sourceRepo.save(source);

    try {
      let input: Buffer | string;

      if (source.type === SourceType.PDF && source.filePath) {
        input = await fs.readFile(source.filePath);
      } else if (source.type === SourceType.URL && source.rawUrl) {
        input = source.rawUrl;
      } else if (source.type === SourceType.TEXT && source.rawUrl) {
        // We store raw text content in rawUrl column for simplicity
        input = source.rawUrl;
      } else {
        throw new Error('Source has no extractable content');
      }

      const chunks = await this.extractionService.extract(source.type, input);

      // Bulk insert all chunks
      const documents = chunks.map((chunk) =>
        this.documentRepo.create({
          sourceId: source.id,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          tokenCount: chunk.tokenCount,
        }),
      );
      await this.documentRepo.save(documents);

      source.status = SourceStatus.READY;
      source.errorMessage = null;
      await this.sourceRepo.save(source);

      this.logger.log(`Source ${sourceId} processed — ${chunks.length} chunks`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Source ${sourceId} failed: ${message}`);
      source.status = SourceStatus.ERROR;
      source.errorMessage = message;
      await this.sourceRepo.save(source);
    }
  }
}
