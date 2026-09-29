import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module.js';
import { PodcastSegmentEntity } from '../podcasts/podcast-segment.entity.js';
import { PodcastEntity } from '../podcasts/podcast.entity.js';
import { ProfileEntity } from '../profile/profile.entity.js';
import { DocumentEntity } from '../sources/document.entity.js';
import { SourceEntity } from '../sources/source.entity.js';
import { QuestionEntity } from '../questions/question.entity.js';
import { TopicEntity } from '../questions/topic.entity.js';
import { QUEUE_AI_GENERATION } from '../jobs/jobs.constants.js';
import { GenerationProcessor } from '../jobs/generation.processor.js';
import { QuestionGeneratorService } from './question-generator.service.js';
import { ExplanationGeneratorService } from './explanation-generator.service.js';
import { PodcastScriptGeneratorService } from './podcast-script-generator.service.js';

@Module({
  imports: [
    AiModule,
    BullModule.registerQueue({ name: QUEUE_AI_GENERATION }),
    TypeOrmModule.forFeature([
      SourceEntity,
      DocumentEntity,
      QuestionEntity,
      TopicEntity,
      PodcastEntity,
      PodcastSegmentEntity,
      ProfileEntity,
    ]),
  ],
  providers: [
    QuestionGeneratorService,
    ExplanationGeneratorService,
    PodcastScriptGeneratorService,
    GenerationProcessor,
  ],
  exports: [
    QuestionGeneratorService,
    ExplanationGeneratorService,
    PodcastScriptGeneratorService,
    BullModule,
  ],
})
export class GenerationModule {}
