import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  AIProvider,
  ExplanationResult,
  GeneratedQuestion,
  PodcastLine,
  RoleContext,
} from '../interfaces/ai.provider.js';
import { PromptLoader } from '../prompt.loader.js';

@Injectable()
export class OpenAIProvider implements AIProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly logger = new Logger(OpenAIProvider.name);

  constructor(
    config: ConfigService,
    private readonly promptLoader: PromptLoader,
  ) {
    this.client = new OpenAI({
      apiKey: config.getOrThrow<string>('OPENAI_API_KEY'),
    });
    this.model = config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private buildRoleBlock(ctx: RoleContext): string {
    return this.promptLoader
      .get('role-context')
      .replaceAll('{{role}}', ctx.role)
      .replaceAll('{{experience}}', ctx.experience)
      .replaceAll('{{learningGoal}}', ctx.learningGoal);
  }

  private async callJson<T>(systemPrompt: string): Promise<T> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: systemPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    try {
      return JSON.parse(raw) as T;
    } catch {
      this.logger.error(`OpenAI returned invalid JSON: ${raw.slice(0, 200)}`);
      throw new Error('OpenAI returned invalid JSON');
    }
  }

  // ── AIProvider implementation ─────────────────────────────────────────────

  async generateQuestions(
    sourceChunks: string,
    roleContext: RoleContext,
  ): Promise<GeneratedQuestion[]> {
    const roleBlock = this.buildRoleBlock(roleContext);
    const prompt = this.promptLoader
      .get('question-generation')
      .replace('{{ROLE_CONTEXT}}', roleBlock)
      .replace('{{sourceMaterial}}', sourceChunks);

    const result = await this.callJson<{ questions: GeneratedQuestion[] }>(prompt);
    const questions = result.questions ?? [];

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('OpenAI returned no questions');
    }

    this.logger.log(`Generated ${questions.length} questions for role: ${roleContext.role}`);
    return questions;
  }

  async generateExplanation(
    questionText: string,
    sourceContext: string,
    roleContext: RoleContext,
  ): Promise<ExplanationResult> {
    const roleBlock = this.buildRoleBlock(roleContext);
    const prompt = this.promptLoader
      .get('explanation')
      .replace('{{ROLE_CONTEXT}}', roleBlock)
      .replace('{{sourceMaterial}}', sourceContext)
      .replace('{{questionText}}', questionText);

    return this.callJson<ExplanationResult>(prompt);
  }

  async generatePodcastScript(
    topic: string,
    questions: GeneratedQuestion[],
    roleContext: RoleContext,
  ): Promise<PodcastLine[]> {
    const roleBlock = this.buildRoleBlock(roleContext);
    const questionsJson = JSON.stringify(
      questions.map((q) => ({
        question: q.questionText,
        answer: q.roleSpecificExplanation,
        example: q.practicalExample,
      })),
      null,
      2,
    );

    const prompt = this.promptLoader
      .get('podcast-script')
      .replace('{{ROLE_CONTEXT}}', roleBlock)
      .replace('{{topic}}', topic)
      .replace('{{questionsJson}}', questionsJson);

    const result = await this.callJson<{ segments: PodcastLine[] }>(prompt);
    const segments = result.segments ?? [];

    if (!Array.isArray(segments) || segments.length === 0) {
      throw new Error('OpenAI returned no podcast segments');
    }

    return segments;
  }
}
