import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlashcardEntity } from './flashcard.entity.js';
import { QuestionEntity } from '../questions/question.entity.js';
import { TopicEntity } from '../questions/topic.entity.js';
import { SourceEntity } from '../sources/source.entity.js';
import { UserProgressService } from '../progress/user-progress.service.js';

@Injectable()
export class FlashcardService {
  constructor(
    @InjectRepository(FlashcardEntity)
    private readonly flashcardRepo: Repository<FlashcardEntity>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepo: Repository<QuestionEntity>,
    @InjectRepository(TopicEntity)
    private readonly topicRepo: Repository<TopicEntity>,
    @InjectRepository(SourceEntity)
    private readonly sourceRepo: Repository<SourceEntity>,
    private readonly progressService: UserProgressService,
  ) {}

  /**
   * Return flashcards for a source, generating them on first request.
   * Flashcards are derived from existing questions (front = questionText, back = quickAnswer).
   */
  async getForSource(userId: string, sourceId: string): Promise<FlashcardEntity[]> {
    const source = await this.sourceRepo.findOne({ where: { id: sourceId, userId } });
    if (!source) throw new NotFoundException(`Source ${sourceId} not found`);

    const topic = await this.topicRepo.findOne({ where: { sourceId } });
    if (!topic) return [];

    const questions = await this.questionRepo.find({ where: { topicId: topic.id } });
    if (questions.length === 0) return [];

    // Check if flashcards already exist for any question
    const existing = await this.flashcardRepo.find({
      where: questions.map((q) => ({ questionId: q.id })),
    });

    if (existing.length > 0) return existing;

    // Generate flashcards from questions
    const cards = questions.map((q) =>
      this.flashcardRepo.create({
        questionId: q.id,
        frontText: q.questionText,
        backText: q.quickAnswer ?? q.detailedAnswer ?? 'See detailed explanation.',
      }),
    );

    return this.flashcardRepo.save(cards);
  }

  /** Mark a flashcard as completed — updates user progress */
  async complete(userId: string, flashcardId: string): Promise<{ message: string }> {
    const card = await this.flashcardRepo.findOne({ where: { id: flashcardId } });
    if (!card) throw new NotFoundException(`Flashcard ${flashcardId} not found`);

    // Find source via question → topic → source
    const question = await this.questionRepo.findOne({ where: { id: card.questionId } });
    const topic = question
      ? await this.topicRepo.findOne({ where: { id: question.topicId } })
      : null;

    if (topic) {
      await this.progressService.recordEvent(userId, topic.sourceId, 'flashcard_complete');
    }

    return { message: 'Flashcard marked complete' };
  }
}
