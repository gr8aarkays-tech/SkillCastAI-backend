import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizEntity } from './quiz.entity.js';
import { QuizQuestionEntity, type QuizOption } from './quiz-question.entity.js';
import { QuestionEntity } from '../questions/question.entity.js';
import { TopicEntity } from '../questions/topic.entity.js';
import { SourceEntity } from '../sources/source.entity.js';
import { UserProgressService } from '../progress/user-progress.service.js';

/** One submitted answer */
export interface QuizAnswer {
  questionId: string;
  selected: QuizOption;
}

/** Result for a single question */
export interface QuizAnswerResult {
  questionId: string;
  correct: boolean;
  correctOption: QuizOption;
  explanation: string | null;
}

/** Full submission result */
export interface QuizSubmitResult {
  quizId: string;
  score: number; // 0–100
  correct: number;
  total: number;
  results: QuizAnswerResult[];
}

const OPTIONS: QuizOption[] = ['a', 'b', 'c', 'd'];

/**
 * Generates MCQ quiz questions from existing Q&A data by using the
 * question's `quickAnswer` as the correct option and fabricating 3
 * plausible-but-wrong distractors from other questions in the same topic.
 */
@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(
    @InjectRepository(QuizEntity)
    private readonly quizRepo: Repository<QuizEntity>,
    @InjectRepository(QuizQuestionEntity)
    private readonly quizQuestionRepo: Repository<QuizQuestionEntity>,
    @InjectRepository(QuestionEntity)
    private readonly questionRepo: Repository<QuestionEntity>,
    @InjectRepository(TopicEntity)
    private readonly topicRepo: Repository<TopicEntity>,
    @InjectRepository(SourceEntity)
    private readonly sourceRepo: Repository<SourceEntity>,
    private readonly progressService: UserProgressService,
  ) {}

  /** Create (or return existing) a quiz for a source */
  async getOrCreateForSource(userId: string, sourceId: string): Promise<QuizEntity> {
    const source = await this.sourceRepo.findOne({ where: { id: sourceId, userId } });
    if (!source) throw new NotFoundException(`Source ${sourceId} not found`);

    // Return existing if present
    const existing = await this.quizRepo.findOne({ where: { sourceId } });
    if (existing) return existing;

    const topic = await this.topicRepo.findOne({ where: { sourceId } });
    const questions = topic
      ? await this.questionRepo.find({ where: { topicId: topic.id } })
      : [];

    if (questions.length < 2) {
      throw new NotFoundException('Not enough questions to generate a quiz — run AI generation first');
    }

    // Create quiz
    const quiz = await this.quizRepo.save(
      this.quizRepo.create({
        sourceId,
        title: `${source.title ?? 'Quiz'} — Knowledge Check`,
      }),
    );

    // Generate MCQ questions: each original question becomes one MCQ
    const quizQs: QuizQuestionEntity[] = questions.map((q) => {
      // Correct answer is quick_answer (trimmed to 120 chars)
      const correct = (q.quickAnswer ?? q.detailedAnswer ?? 'See explanation.').slice(0, 120);

      // Distractors: pick up to 3 OTHER questions' quick answers (shuffled)
      const others = questions.filter((o) => o.id !== q.id);
      const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
      while (shuffled.length < 3) shuffled.push(shuffled[0] ?? q);

      const distractors = shuffled.map((o) =>
        (o.quickAnswer ?? o.detailedAnswer ?? 'N/A').slice(0, 120),
      );

      // Place correct answer in a random position
      const allOptions = [correct, ...distractors];
      const correctIndex = Math.floor(Math.random() * 4);
      const reordered = [...allOptions];
      // Swap correct to correctIndex position
      [reordered[0], reordered[correctIndex]] = [reordered[correctIndex]!, reordered[0]!];

      return this.quizQuestionRepo.create({
        quizId: quiz.id,
        questionText: q.questionText,
        optionA: reordered[0]!,
        optionB: reordered[1]!,
        optionC: reordered[2]!,
        optionD: reordered[3]!,
        correctOption: OPTIONS[correctIndex]!,
        explanation: q.roleSpecificExplanation ?? q.detailedAnswer,
      });
    });

    await this.quizQuestionRepo.save(quizQs);
    this.logger.log(`Created quiz ${quiz.id} with ${quizQs.length} questions for source ${sourceId}`);
    return quiz;
  }

  /** Get quiz with all questions */
  async getWithQuestions(
    userId: string,
    quizId: string,
  ): Promise<{ quiz: QuizEntity; questions: QuizQuestionEntity[] }> {
    const quiz = await this.quizRepo.findOne({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException(`Quiz ${quizId} not found`);

    // Ownership check
    await this.sourceRepo.findOneOrFail({ where: { id: quiz.sourceId, userId } }).catch(() => {
      throw new NotFoundException(`Quiz ${quizId} not found`);
    });

    const questions = await this.quizQuestionRepo.find({ where: { quizId } });
    return { quiz, questions };
  }

  /** Submit answers and return scored result */
  async submit(
    userId: string,
    quizId: string,
    answers: QuizAnswer[],
  ): Promise<QuizSubmitResult> {
    const { quiz, questions } = await this.getWithQuestions(userId, quizId);

    const questionMap = new Map(questions.map((q) => [q.id, q]));
    let correct = 0;

    const results: QuizAnswerResult[] = answers.map((a) => {
      const q = questionMap.get(a.questionId);
      if (!q) {
        return { questionId: a.questionId, correct: false, correctOption: 'a', explanation: null };
      }
      const isCorrect = q.correctOption === a.selected;
      if (isCorrect) correct++;
      return {
        questionId: a.questionId,
        correct: isCorrect,
        correctOption: q.correctOption,
        explanation: q.explanation,
      };
    });

    const total = answers.length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Record progress
    await this.progressService.recordEvent(userId, quiz.sourceId, 'quiz_complete', {
      quizScore: score,
      correct,
      total,
    });

    return { quizId, score, correct, total, results };
  }
}
