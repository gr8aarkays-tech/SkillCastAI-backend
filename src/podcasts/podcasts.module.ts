import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TtsModule } from '../tts/tts.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { SourceEntity } from '../sources/source.entity.js';
import { SourcesModule } from '../sources/sources.module.js';
import { QUEUE_PODCAST_AUDIO } from '../jobs/jobs.constants.js';
import { PodcastAudioProcessor } from '../jobs/podcast-audio.processor.js';
import { PodcastEntity } from './podcast.entity.js';
import { PodcastSegmentEntity } from './podcast-segment.entity.js';
import { PodcastAudioBuilder } from './podcast-audio.builder.js';
import { PodcastsController } from './podcasts.controller.js';
import { PodcastsService } from './podcasts.service.js';

@Module({
  imports: [
    TtsModule,
    StorageModule,
    SourcesModule,
    BullModule.registerQueue({ name: QUEUE_PODCAST_AUDIO }),
    TypeOrmModule.forFeature([PodcastEntity, PodcastSegmentEntity, SourceEntity]),
  ],
  controllers: [PodcastsController],
  providers: [PodcastsService, PodcastAudioBuilder, PodcastAudioProcessor],
  exports: [PodcastsService, BullModule],
})
export class PodcastsModule {}
