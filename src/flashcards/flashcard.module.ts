import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlashcardEntity } from './flashcard.entity.js';
import { FlashcardService } from './flashcard.service.js';
import { FlashcardController } from './flashcard.controller.js';
import { QuestionEntity } from '../questions/question.entity.js';
import { TopicEntity } from '../questions/topic.entity.js';
import { SourceEntity } from '../sources/source.entity.js';
import { ProgressModule } from '../progress/progress.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([FlashcardEntity, QuestionEntity, TopicEntity, SourceEntity]),
    ProgressModule,
  ],
  controllers: [FlashcardController],
  providers: [FlashcardService],
  exports: [FlashcardService],
})
export class FlashcardModule {}
