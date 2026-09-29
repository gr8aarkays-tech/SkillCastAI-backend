import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionEntity } from './question.entity.js';
import { TopicEntity } from './topic.entity.js';
import { SourceEntity } from '../sources/source.entity.js';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(QuestionEntity)
    private readonly questionRepo: Repository<QuestionEntity>,
    @InjectRepository(TopicEntity)
    private readonly topicRepo: Repository<TopicEntity>,
    @InjectRepository(SourceEntity)
    private readonly sourceRepo: Repository<SourceEntity>,
  ) {}

  async findBySource(userId: string, sourceId: string): Promise<QuestionEntity[]> {
    // User isolation — verify source ownership
    const source = await this.sourceRepo.findOne({ where: { id: sourceId, userId } });
    if (!source) throw new NotFoundException('Source not found');

    const topics = await this.topicRepo.find({ where: { sourceId } });
    if (topics.length === 0) return [];

    const questions: QuestionEntity[] = [];
    for (const topic of topics) {
      const qs = await this.questionRepo.find({
        where: { topicId: topic.id },
        order: { createdAt: 'ASC' },
      });
      questions.push(...qs);
    }
    return questions;
  }

  async findOne(userId: string, questionId: string): Promise<QuestionEntity> {
    const question = await this.questionRepo.findOne({ where: { id: questionId } });
    if (!question) throw new NotFoundException('Question not found');

    // Verify ownership via topic → source → user
    const topic = await this.topicRepo.findOne({ where: { id: question.topicId } });
    const source = await this.sourceRepo.findOne({
      where: { id: topic?.sourceId, userId },
    });
    if (!source) throw new NotFoundException('Question not found');

    return question;
  }
}
