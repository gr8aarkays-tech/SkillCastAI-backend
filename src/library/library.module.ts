import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SourceEntity } from '../sources/source.entity.js';
import { TopicEntity } from '../questions/topic.entity.js';
import { QuestionEntity } from '../questions/question.entity.js';
import { PodcastEntity } from '../podcasts/podcast.entity.js';
import { UserProgressEntity } from '../progress/user-progress.entity.js';
import { LibraryService } from './library.service.js';
import { LibraryController } from './library.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SourceEntity,
      TopicEntity,
      QuestionEntity,
      PodcastEntity,
      UserProgressEntity,
    ]),
  ],
  controllers: [LibraryController],
  providers: [LibraryService],
})
export class LibraryModule {}
