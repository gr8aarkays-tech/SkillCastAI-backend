import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ExplainDto } from './dto/question.dto.js';
import { QuestionsService } from './questions.service.js';
import { ExplanationGeneratorService } from '../generation/explanation-generator.service.js';
import { JOB_GENERATE_QUESTIONS, QUEUE_AI_GENERATION } from '../jobs/jobs.constants.js';
import { SourcesService } from '../sources/sources.service.js';

@Controller()
@UseGuards(JwtAuthGuard)
export class QuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly explanationService: ExplanationGeneratorService,
    private readonly sourcesService: SourcesService,
    @InjectQueue(QUEUE_AI_GENERATION) private readonly generationQueue: Queue,
  ) {}

  /** Trigger AI question generation for a source.
   *  Throttled to 5 requests / minute — each call enqueues an OpenAI job. */
  @Post('sources/:sourceId/generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async triggerGeneration(
    @Request() req: { user: { id: string } },
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
  ) {
    // Verify ownership
    await this.sourcesService.findStatus(req.user.id, sourceId);

    await this.generationQueue.add(JOB_GENERATE_QUESTIONS, {
      sourceId,
      userId: req.user.id,
    });

    return { message: 'Generation started', sourceId };
  }

  /** List all questions for a source */
  @Get('sources/:sourceId/questions')
  getQuestions(
    @Request() req: { user: { id: string } },
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
  ) {
    return this.questionsService.findBySource(req.user.id, sourceId);
  }

  /** Full question detail */
  @Get('questions/:id')
  getQuestion(
    @Request() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.questionsService.findOne(req.user.id, id);
  }

  /** Real-time role-switch explanation (Ask AI) — does NOT persist */
  @Post('questions/:id/explain')
  @HttpCode(HttpStatus.OK)
  async explain(
    @Request() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExplainDto,
  ) {
    // Verify ownership first
    await this.questionsService.findOne(req.user.id, id);

    return this.explanationService.explain(id, {
      role: dto.role,
      experience: dto.experience ?? 'intermediate',
      learningGoal: dto.learningGoal ?? 'Learn the topic',
    });
  }
}
