import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PodcastsService } from './podcasts.service.js';
import { SourcesService } from '../sources/sources.service.js';
import { JOB_BUILD_PODCAST_AUDIO, QUEUE_PODCAST_AUDIO } from '../jobs/jobs.constants.js';
import type { BuildPodcastAudioJobData } from '../jobs/podcast-audio.processor.js';

@Controller()
@UseGuards(JwtAuthGuard)
export class PodcastsController {
  constructor(
    private readonly podcastsService: PodcastsService,
    private readonly sourcesService: SourcesService,
    @InjectQueue(QUEUE_PODCAST_AUDIO) private readonly audioQueue: Queue,
  ) {}

  /**
   * Trigger podcast audio generation for a source.
   * Requires that AI generation has already run (podcast_segments must exist).
   * Throttled to 5 requests / minute — each call invokes the TTS provider.
   */
  @Post('sources/:sourceId/podcast')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async triggerPodcastAudio(
    @Request() req: { user: { id: string } },
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
  ) {
    // Verify source ownership and get existing podcast id
    await this.sourcesService.findStatus(req.user.id, sourceId);

    const podcasts = await this.podcastsService.findBySource(req.user.id, sourceId);
    if (podcasts.length === 0) {
      return {
        message: 'No podcast script found. Run POST /sources/:id/generate first.',
        sourceId,
      };
    }

    // Queue audio build for the most recent podcast
    const podcast = podcasts[0]!;
    const jobData: BuildPodcastAudioJobData = { podcastId: podcast.id };
    await this.audioQueue.add(JOB_BUILD_PODCAST_AUDIO, jobData);

    return { message: 'Podcast audio generation started', podcastId: podcast.id };
  }

  /** List podcasts for a source */
  @Get('sources/:sourceId/podcast')
  getPodcastsBySource(
    @Request() req: { user: { id: string } },
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
  ) {
    return this.podcastsService.findBySource(req.user.id, sourceId);
  }

  /** Get a single podcast */
  @Get('podcasts/:id')
  getPodcast(
    @Request() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.podcastsService.findOne(req.user.id, id);
  }

  /** Get the audio URL for a podcast */
  @Get('podcasts/:id/audio')
  getAudioUrl(
    @Request() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.podcastsService.getAudioUrl(req.user.id, id);
  }

  /** Get all segments (with per-segment audio URLs) for a podcast */
  @Get('podcasts/:id/segments')
  getSegments(
    @Request() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.podcastsService.findSegments(req.user.id, id);
  }
}
