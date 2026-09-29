import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizEntity } from './quiz.entity.js';
import { QuizQuestionEntity } from './quiz-question.entity.js';
import { QuizService } from './quiz.service.js';
import { QuizController } from './quiz.controller.js';
import { QuestionEntity } from '../questions/question.entity.js';
import { TopicEntity } from '../questions/topic.entity.js';
import { SourceEntity } from '../sources/source.entity.js';
import { ProgressModule } from '../progress/progress.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuizEntity,
      QuizQuestionEntity,
      QuestionEntity,
      TopicEntity,
      SourceEntity,
    ]),
    ProgressModule,
  ],
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}
