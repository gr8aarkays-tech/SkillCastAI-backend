import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PodcastEntity } from './podcast.entity.js';
import { PodcastSegmentEntity } from './podcast-segment.entity.js';
import { SourceEntity } from '../sources/source.entity.js';

@Injectable()
export class PodcastsService {
  constructor(
    @InjectRepository(PodcastEntity)
    private readonly podcastRepo: Repository<PodcastEntity>,
    @InjectRepository(PodcastSegmentEntity)
    private readonly segmentRepo: Repository<PodcastSegmentEntity>,
    @InjectRepository(SourceEntity)
    private readonly sourceRepo: Repository<SourceEntity>,
  ) {}

  /** Find all podcasts belonging to a source (user-isolation checked via source ownership) */
  async findBySource(userId: string, sourceId: string): Promise<PodcastEntity[]> {
    const source = await this.sourceRepo.findOne({ where: { id: sourceId, userId } });
    if (!source) throw new NotFoundException(`Source ${sourceId} not found`);
    return this.podcastRepo.find({
      where: { sourceId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Find a single podcast, verifying it belongs to the requesting user */
  async findOne(userId: string, podcastId: string): Promise<PodcastEntity> {
    const podcast = await this.podcastRepo.findOne({ where: { id: podcastId } });
    if (!podcast) throw new NotFoundException(`Podcast ${podcastId} not found`);

    const source = await this.sourceRepo.findOne({
      where: { id: podcast.sourceId, userId },
    });
    if (!source) throw new NotFoundException(`Podcast ${podcastId} not found`);

    return podcast;
  }

  /** Return the signed/public audio URL for a podcast */
  async getAudioUrl(userId: string, podcastId: string): Promise<{ url: string }> {
    const podcast = await this.findOne(userId, podcastId);
    if (!podcast.audioUrl) {
      throw new NotFoundException(`Audio not ready for podcast ${podcastId}`);
    }
    return { url: podcast.audioUrl };
  }

  /** Return all segments for a podcast */
  async findSegments(userId: string, podcastId: string): Promise<PodcastSegmentEntity[]> {
    await this.findOne(userId, podcastId); // ownership check
    return this.segmentRepo.find({
      where: { podcastId },
      order: { sequenceOrder: 'ASC' },
    });
  }
}
