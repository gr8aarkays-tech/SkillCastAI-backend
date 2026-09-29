import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AI_PROVIDER, type AIProvider, type ExplanationResult, type RoleContext } from '../ai/interfaces/ai.provider.js';
import { DocumentEntity } from '../sources/document.entity.js';
import { QuestionEntity } from '../questions/question.entity.js';
import { TopicEntity } from '../questions/topic.entity.js';

const MAX_CONTEXT_CHARS = 16_000; // smaller budget for single explanation

@Injectable()
export class ExplanationGeneratorService {
  constructor(
    @Inject(AI_PROVIDER) private readonly aiProvider: AIProvider,
    @InjectRepository(QuestionEntity)
    private readonly questionRepo: Repository<QuestionEntity>,
    @InjectRepository(TopicEntity)
    private readonly topicRepo: Repository<TopicEntity>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
  ) {}

  /**
   * Generate a fresh role-specific explanation for a question.
   * Does NOT persist — used for real-time Ask AI / role-switch requests.
   */
  async explain(
    questionId: string,
    roleContext: RoleContext,
  ): Promise<ExplanationResult> {
    const question = await this.questionRepo.findOne({ where: { id: questionId } });
    if (!question) throw new NotFoundException(`Question ${questionId} not found`);

    // Fetch source context via topic → source chain
    const topic = await this.topicRepo.findOne({ where: { id: question.topicId } });
    if (!topic) throw new NotFoundException('Topic not found');

    const chunks = await this.documentRepo.find({
      where: { sourceId: topic.sourceId },
      order: { chunkIndex: 'ASC' },
    });

    let context = '';
    for (const chunk of chunks) {
      if ((context + chunk.content).length > MAX_CONTEXT_CHARS) break;
      context += chunk.content + '\n\n';
    }

    return this.aiProvider.generateExplanation(
      question.questionText,
      context.trim(),
      roleContext,
    );
  }
}
