import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PodcastAudioBuilder } from '../podcasts/podcast-audio.builder.js';
import { JOB_BUILD_PODCAST_AUDIO, QUEUE_PODCAST_AUDIO } from './jobs.constants.js';

export interface BuildPodcastAudioJobData {
  podcastId: string;
}

@Processor(QUEUE_PODCAST_AUDIO)
export class PodcastAudioProcessor extends WorkerHost {
  private readonly logger = new Logger(PodcastAudioProcessor.name);

  constructor(private readonly audioBuilder: PodcastAudioBuilder) {
    super();
  }

  async process(job: Job<BuildPodcastAudioJobData>): Promise<void> {
    if (job.name !== JOB_BUILD_PODCAST_AUDIO) return;

    const { podcastId } = job.data;
    this.logger.log(`Building podcast audio for ${podcastId}`);
    await this.audioBuilder.build(podcastId);
  }
}
