import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SourceEntity } from '../sources/source.entity.js';
import { TopicEntity } from '../questions/topic.entity.js';
import { QuestionEntity } from '../questions/question.entity.js';
import { PodcastEntity } from '../podcasts/podcast.entity.js';
import { UserProgressEntity } from '../progress/user-progress.entity.js';

export interface LibraryItem {
  sourceId: string;
  title: string | null;
  type: string;
  status: string;
  questionCount: number;
  podcastCount: number;
  completionPercentage: number;
  createdAt: Date;
}

@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(SourceEntity)
    private readonly sourceRepo: Repository<SourceEntity>,
    @InjectRepository(TopicEntity)
    private readonly topicRepo: Repository<TopicEntity>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepo: Repository<QuestionEntity>,
    @InjectRepository(PodcastEntity)
    private readonly podcastRepo: Repository<PodcastEntity>,
    @InjectRepository(UserProgressEntity)
    private readonly progressRepo: Repository<UserProgressEntity>,
  ) {}

  async getForUser(userId: string): Promise<LibraryItem[]> {
    const sources = await this.sourceRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const items: LibraryItem[] = await Promise.all(
      sources.map(async (source) => {
        const topic = await this.topicRepo.findOne({ where: { sourceId: source.id } });
        const questionCount = topic
          ? await this.questionRepo.count({ where: { topicId: topic.id } })
          : 0;
        const podcastCount = await this.podcastRepo.count({ where: { sourceId: source.id } });
        const progress = await this.progressRepo.findOne({
          where: { userId, sourceId: source.id },
        });

        return {
          sourceId: source.id,
          title: source.title,
          type: source.type,
          status: source.status,
          questionCount,
          podcastCount,
          completionPercentage: progress ? Number(progress.completionPercentage) : 0,
          createdAt: source.createdAt,
        };
      }),
    );

    return items;
  }
}
