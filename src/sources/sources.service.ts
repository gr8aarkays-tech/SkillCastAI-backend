import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import * as path from 'path';
import { JOB_PROCESS_SOURCE, QUEUE_SOURCE_PROCESSING } from '../jobs/jobs.constants.js';
import { DocumentEntity } from './document.entity.js';
import { SourceEntity, SourceStatus, SourceType } from './source.entity.js';
import type { CreateTextSourceDto, CreateUrlSourceDto } from './dto/create-source.dto.js';

@Injectable()
export class SourcesService {
  constructor(
    @InjectRepository(SourceEntity)
    private readonly sourceRepo: Repository<SourceEntity>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    @InjectQueue(QUEUE_SOURCE_PROCESSING)
    private readonly processingQueue: Queue,
  ) {}

  async createFromFile(
    userId: string,
    file: Express.Multer.File,
    title?: string,
  ): Promise<SourceEntity> {
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are accepted');
    }

    const source = await this.sourceRepo.save(
      this.sourceRepo.create({
        userId,
        type: SourceType.PDF,
        title: title ?? path.basename(file.originalname, '.pdf'),
        filePath: file.path,
        status: SourceStatus.PENDING,
      }),
    );

    await this.processingQueue.add(JOB_PROCESS_SOURCE, { sourceId: source.id });
    return source;
  }

  async createFromText(userId: string, dto: CreateTextSourceDto): Promise<SourceEntity> {
    const source = await this.sourceRepo.save(
      this.sourceRepo.create({
        userId,
        type: SourceType.TEXT,
        title: dto.title ?? 'Pasted Text',
        rawUrl: dto.content, // store raw text in rawUrl column
        status: SourceStatus.PENDING,
      }),
    );

    await this.processingQueue.add(JOB_PROCESS_SOURCE, { sourceId: source.id });
    return source;
  }

  async createFromUrl(userId: string, dto: CreateUrlSourceDto): Promise<SourceEntity> {
    const source = await this.sourceRepo.save(
      this.sourceRepo.create({
        userId,
        type: SourceType.URL,
        title: dto.title ?? new URL(dto.url).hostname,
        rawUrl: dto.url,
        status: SourceStatus.PENDING,
      }),
    );

    await this.processingQueue.add(JOB_PROCESS_SOURCE, { sourceId: source.id });
    return source;
  }

  async findAllByUser(userId: string): Promise<SourceEntity[]> {
    return this.sourceRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findStatus(userId: string, sourceId: string): Promise<SourceEntity> {
    const source = await this.sourceRepo.findOne({
      where: { id: sourceId, userId }, // user isolation: both must match
    });
    if (!source) throw new NotFoundException('Source not found');
    return source;
  }

  async getDocumentCount(sourceId: string): Promise<number> {
    return this.documentRepo.count({ where: { sourceId } });
  }
}
