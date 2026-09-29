import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AI_PROVIDER, type AIProvider, type RoleContext } from '../ai/interfaces/ai.provider.js';
import { QuestionEntity } from '../questions/question.entity.js';
import { TopicEntity } from '../questions/topic.entity.js';
import { SourceEntity } from '../sources/source.entity.js';
import { PodcastEntity, PodcastStatus } from '../podcasts/podcast.entity.js';
import { PodcastSegmentEntity, Speaker } from '../podcasts/podcast-segment.entity.js';

@Injectable()
export class PodcastScriptGeneratorService {
  private readonly logger = new Logger(PodcastScriptGeneratorService.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly aiProvider: AIProvider,
    @InjectRepository(QuestionEntity)
    private readonly questionRepo: Repository<QuestionEntity>,
    @InjectRepository(TopicEntity)
    private readonly topicRepo: Repository<TopicEntity>,
    @InjectRepository(SourceEntity)
    private readonly sourceRepo: Repository<SourceEntity>,
    @InjectRepository(PodcastEntity)
    private readonly podcastRepo: Repository<PodcastEntity>,
    @InjectRepository(PodcastSegmentEntity)
    private readonly segmentRepo: Repository<PodcastSegmentEntity>,
  ) {}

  async generate(sourceId: string, roleContext: RoleContext): Promise<string> {
    const source = await this.sourceRepo.findOne({ where: { id: sourceId } });
    const topic = await this.topicRepo.findOne({ where: { sourceId } });

    const questions = topic
      ? await this.questionRepo.find({ where: { topicId: topic.id } })
      : [];

    if (questions.length === 0) {
      this.logger.warn(`No questions found for source ${sourceId} — skipping podcast generation`);
      return '';
    }

    const topicTitle = topic?.title ?? source?.title ?? 'Learning Session';
    const generatedLines = await this.aiProvider.generatePodcastScript(
      topicTitle,
      questions.map((q) => ({
        topic: topicTitle,
        questionText: q.questionText,
        quickAnswer: q.quickAnswer ?? '',
        detailedAnswer: q.detailedAnswer ?? '',
        roleSpecificExplanation: q.roleSpecificExplanation ?? '',
        practicalExample: q.practicalExample ?? '',
        interviewAnswer: q.interviewAnswer ?? '',
        followUpQuestion: q.followUpQuestion ?? '',
      })),
      roleContext,
    );

    // Create podcast record
    const podcast = await this.podcastRepo.save(
      this.podcastRepo.create({
        sourceId,
        title: `${topicTitle} — ${roleContext.role} perspective`,
        status: PodcastStatus.PENDING,
      }),
    );

    // Bulk insert segments
    const segments = generatedLines.map((line, idx) =>
      this.segmentRepo.create({
        podcastId: podcast.id,
        speaker: line.speaker === 'host' ? Speaker.HOST : Speaker.EXPERT,
        text: line.text,
        sequenceOrder: idx,
      }),
    );
    await this.segmentRepo.save(segments);

    this.logger.log(`Created podcast ${podcast.id} with ${segments.length} segments`);
    return podcast.id;
  }
}
