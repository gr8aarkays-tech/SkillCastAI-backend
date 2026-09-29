import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { QuestionGeneratorService } from '../generation/question-generator.service.js';
import { PodcastScriptGeneratorService } from '../generation/podcast-script-generator.service.js';
import { ProfileEntity } from '../profile/profile.entity.js';
import { SourceEntity, SourceStatus } from '../sources/source.entity.js';
import { JOB_GENERATE_QUESTIONS, QUEUE_AI_GENERATION } from './jobs.constants.js';

export interface GenerateQuestionsJobData {
  sourceId: string;
  userId: string;
}

@Processor(QUEUE_AI_GENERATION)
export class GenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(GenerationProcessor.name);

  constructor(
    @InjectRepository(SourceEntity)
    private readonly sourceRepo: Repository<SourceEntity>,
    @InjectRepository(ProfileEntity)
    private readonly profileRepo: Repository<ProfileEntity>,
    private readonly questionGenerator: QuestionGeneratorService,
    private readonly podcastGenerator: PodcastScriptGeneratorService,
  ) {
    super();
  }

  async process(job: Job<GenerateQuestionsJobData>): Promise<void> {
    if (job.name !== JOB_GENERATE_QUESTIONS) return;

    const { sourceId, userId } = job.data;
    this.logger.log(`AI generation started for source ${sourceId}`);

    const source = await this.sourceRepo.findOne({ where: { id: sourceId } });
    if (!source) {
      this.logger.warn(`Source ${sourceId} not found — skipping`);
      return;
    }

    // Load user's role context from their profile
    const profile = await this.profileRepo.findOne({ where: { userId } });
    const roleContext = {
      role: profile?.role ?? 'student',
      experience: profile?.experienceLevel ?? 'beginner',
      learningGoal: profile?.learningGoal ?? 'Learn the topic',
    };

    // Mark as generating
    source.status = SourceStatus.PROCESSING;
    await this.sourceRepo.save(source);

    try {
      // 1. Generate questions
      await this.questionGenerator.generate(sourceId, roleContext);

      // 2. Generate podcast script
      await this.podcastGenerator.generate(sourceId, roleContext);

      source.status = SourceStatus.READY;
      source.errorMessage = null;
      await this.sourceRepo.save(source);

      this.logger.log(`AI generation complete for source ${sourceId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`AI generation failed for source ${sourceId}: ${message}`);
      source.status = SourceStatus.ERROR;
      source.errorMessage = message;
      await this.sourceRepo.save(source);
    }
  }
}
