import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AI_PROVIDER, type AIProvider, type RoleContext } from '../ai/interfaces/ai.provider.js';
import { DocumentEntity } from '../sources/document.entity.js';
import { SourceEntity } from '../sources/source.entity.js';
import { QuestionEntity } from '../questions/question.entity.js';
import { TopicEntity } from '../questions/topic.entity.js';

/** Max characters to send to OpenAI — ~8000 tokens ≈ 32000 chars */
const MAX_CONTEXT_CHARS = 32_000;

@Injectable()
export class QuestionGeneratorService {
  private readonly logger = new Logger(QuestionGeneratorService.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly aiProvider: AIProvider,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    @InjectRepository(SourceEntity)
    private readonly sourceRepo: Repository<SourceEntity>,
    @InjectRepository(TopicEntity)
    private readonly topicRepo: Repository<TopicEntity>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepo: Repository<QuestionEntity>,
  ) {}

  async generate(sourceId: string, roleContext: RoleContext): Promise<QuestionEntity[]> {
    // 1. Load source
    const source = await this.sourceRepo.findOne({ where: { id: sourceId } });
    if (!source) throw new NotFoundException(`Source ${sourceId} not found`);

    // 2. Load document chunks
    const chunks = await this.documentRepo.find({
      where: { sourceId },
      order: { chunkIndex: 'ASC' },
    });

    if (chunks.length === 0) {
      throw new Error(`Source ${sourceId} has no extracted content yet`);
    }

    // 3. Concatenate chunks up to token budget
    let combined = '';
    for (const chunk of chunks) {
      if ((combined + chunk.content).length > MAX_CONTEXT_CHARS) break;
      combined += chunk.content + '\n\n';
    }

    // 4. Call AI
    this.logger.log(`Generating questions for source ${sourceId}, role: ${roleContext.role}`);
    const generated = await this.aiProvider.generateQuestions(combined.trim(), roleContext);

    if (!generated || generated.length === 0) {
      throw new Error('OpenAI returned no questions');
    }

    // 5. Upsert topic
    let topic = await this.topicRepo.findOne({ where: { sourceId } });
    if (!topic) {
      const topicTitle = generated[0]?.topic ?? (source.title ?? 'Learning Session');
      topic = await this.topicRepo.save(
        this.topicRepo.create({ sourceId, title: topicTitle }),
      );
    }

    // 6. Delete existing questions for this source+role (re-generation support)
    const existingTopics = await this.topicRepo.find({ where: { sourceId } });
    for (const t of existingTopics) {
      await this.questionRepo.delete({ topicId: t.id });
    }

    // 7. Bulk insert questions
    const entities = generated.map((q) =>
      this.questionRepo.create({
        topicId: topic!.id,
        questionText: q.questionText,
        quickAnswer: q.quickAnswer,
        detailedAnswer: q.detailedAnswer,
        roleSpecificExplanation: q.roleSpecificExplanation,
        practicalExample: q.practicalExample,
        interviewAnswer: q.interviewAnswer,
        followUpQuestion: q.followUpQuestion,
        role: roleContext.role,
      }),
    );

    const saved = await this.questionRepo.save(entities);
    this.logger.log(`Saved ${saved.length} questions for source ${sourceId}`);
    return saved;
  }
}
