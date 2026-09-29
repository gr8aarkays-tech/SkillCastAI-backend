import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenerationModule } from '../generation/generation.module.js';
import { SourcesModule } from '../sources/sources.module.js';
import { QuestionEntity } from './question.entity.js';
import { TopicEntity } from './topic.entity.js';
import { SourceEntity } from '../sources/source.entity.js';
import { QuestionsController } from './questions.controller.js';
import { QuestionsService } from './questions.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([QuestionEntity, TopicEntity, SourceEntity]),
    GenerationModule,
    SourcesModule,
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
