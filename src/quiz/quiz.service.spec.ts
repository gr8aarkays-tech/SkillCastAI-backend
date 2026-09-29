import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuizService } from './quiz.service.js';
import { QuizEntity } from './quiz.entity.js';
import { QuizQuestionEntity } from './quiz-question.entity.js';
import { QuestionEntity } from '../questions/question.entity.js';
import { TopicEntity } from '../questions/topic.entity.js';
import { SourceEntity } from '../sources/source.entity.js';
import { UserProgressService } from '../progress/user-progress.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SOURCE_ID = 'src-001';
const QUIZ_ID = 'quiz-001';
const TOPIC_ID = 'topic-001';
const USER_ID = 'user-001';

const makeQuestions = (n: number): QuestionEntity[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `q-${i}`,
    topicId: TOPIC_ID,
    questionText: `Question ${i}?`,
    quickAnswer: `Answer ${i}`,
    detailedAnswer: `Detailed ${i}`,
    roleSpecificExplanation: `Explanation ${i}`,
    practicalExample: null,
    interviewAnswer: null,
    followUpQuestion: null,
    role: 'tester',
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

const makeQuizQuestions = (quizId: string, n: number): QuizQuestionEntity[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `qq-${i}`,
    quizId,
    questionText: `Question ${i}?`,
    optionA: `Answer ${i}`,
    optionB: `Answer ${(i + 1) % n}`,
    optionC: `Answer ${(i + 2) % n}`,
    optionD: `Answer ${(i + 3) % n}`,
    correctOption: 'a' as const,
    explanation: `Explanation ${i}`,
    createdAt: new Date(),
  }));

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockProgressService = { recordEvent: vi.fn().mockResolvedValue({}) };

let savedQuiz: QuizEntity | null = null;
let savedQuizQuestions: QuizQuestionEntity[] = [];

const mockQuizRepo = {
  findOne: vi.fn(),
  create: vi.fn((e: Partial<QuizEntity>) => e),
  save: vi.fn().mockImplementation((e: QuizEntity) => {
    savedQuiz = { id: QUIZ_ID, ...e };
    return Promise.resolve(savedQuiz);
  }),
};

const mockQuizQuestionRepo = {
  find: vi.fn(),
  create: vi.fn((e: Partial<QuizQuestionEntity>) => e),
  save: vi.fn().mockImplementation((entities: QuizQuestionEntity[]) => {
    savedQuizQuestions = entities.map((e, i) => ({ id: `qq-${i}`, ...e }));
    return Promise.resolve(savedQuizQuestions);
  }),
};

const mockQuestionRepo = { find: vi.fn() };
const mockTopicRepo = {
  findOne: vi.fn().mockResolvedValue({ id: TOPIC_ID, sourceId: SOURCE_ID }),
};
const mockSourceRepo = {
  findOne: vi.fn().mockResolvedValue({ id: SOURCE_ID, userId: USER_ID, title: 'Test Source' }),
  findOneOrFail: vi.fn().mockResolvedValue({ id: SOURCE_ID }),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('QuizService', () => {
  let service: QuizService;

  beforeEach(async () => {
    vi.clearAllMocks();
    savedQuiz = null;
    savedQuizQuestions = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        { provide: getRepositoryToken(QuizEntity), useValue: mockQuizRepo },
        { provide: getRepositoryToken(QuizQuestionEntity), useValue: mockQuizQuestionRepo },
        { provide: getRepositoryToken(QuestionEntity), useValue: mockQuestionRepo },
        { provide: getRepositoryToken(TopicEntity), useValue: mockTopicRepo },
        { provide: getRepositoryToken(SourceEntity), useValue: mockSourceRepo },
        { provide: UserProgressService, useValue: mockProgressService },
      ],
    }).compile();

    service = module.get<QuizService>(QuizService);
  });

  // ── Quiz generation ─────────────────────────────────────────────────────────

  it('creates a quiz with MCQ questions from existing questions', async () => {
    mockQuizRepo.findOne.mockResolvedValue(null); // no existing quiz
    mockQuestionRepo.find.mockResolvedValue(makeQuestions(5));

    const quiz = await service.getOrCreateForSource(USER_ID, SOURCE_ID);

    expect(quiz.id).toBe(QUIZ_ID);
    expect(mockQuizQuestionRepo.save).toHaveBeenCalledOnce();
    // Should create one MCQ per source question
    expect(savedQuizQuestions.length).toBe(5);
  });

  it('each MCQ question has 4 options and a correct option in a–d', async () => {
    mockQuizRepo.findOne.mockResolvedValue(null);
    mockQuestionRepo.find.mockResolvedValue(makeQuestions(4));

    await service.getOrCreateForSource(USER_ID, SOURCE_ID);

    for (const q of savedQuizQuestions) {
      expect(q.optionA).toBeTruthy();
      expect(q.optionB).toBeTruthy();
      expect(q.optionC).toBeTruthy();
      expect(q.optionD).toBeTruthy();
      expect(['a', 'b', 'c', 'd']).toContain(q.correctOption);
    }
  });

  it('returns existing quiz without re-generating', async () => {
    const existingQuiz: QuizEntity = { id: QUIZ_ID, sourceId: SOURCE_ID, title: 'Old Quiz', createdAt: new Date() };
    mockQuizRepo.findOne.mockResolvedValue(existingQuiz);

    const quiz = await service.getOrCreateForSource(USER_ID, SOURCE_ID);

    expect(quiz.id).toBe(QUIZ_ID);
    expect(mockQuizQuestionRepo.save).not.toHaveBeenCalled();
  });

  it('throws if fewer than 2 questions exist', async () => {
    mockQuizRepo.findOne.mockResolvedValue(null);
    mockQuestionRepo.find.mockResolvedValue(makeQuestions(1));

    await expect(service.getOrCreateForSource(USER_ID, SOURCE_ID)).rejects.toThrow(
      'Not enough questions',
    );
  });

  // ── Score calculation ───────────────────────────────────────────────────────

  it('calculates 100% score when all answers are correct', async () => {
    const qqCount = 3;
    const quizQuestions = makeQuizQuestions(QUIZ_ID, qqCount); // all correct = 'a'
    mockQuizRepo.findOne.mockResolvedValue({ id: QUIZ_ID, sourceId: SOURCE_ID });
    mockQuizQuestionRepo.find.mockResolvedValue(quizQuestions);

    const answers = quizQuestions.map((q) => ({ questionId: q.id, selected: 'a' as const }));
    const result = await service.submit(USER_ID, QUIZ_ID, answers);

    expect(result.score).toBe(100);
    expect(result.correct).toBe(qqCount);
    expect(result.total).toBe(qqCount);
  });

  it('calculates 0% score when all answers are wrong', async () => {
    const quizQuestions = makeQuizQuestions(QUIZ_ID, 3);
    mockQuizRepo.findOne.mockResolvedValue({ id: QUIZ_ID, sourceId: SOURCE_ID });
    mockQuizQuestionRepo.find.mockResolvedValue(quizQuestions);

    // All correct are 'a', submit 'b' for all
    const answers = quizQuestions.map((q) => ({ questionId: q.id, selected: 'b' as const }));
    const result = await service.submit(USER_ID, QUIZ_ID, answers);

    expect(result.score).toBe(0);
    expect(result.correct).toBe(0);
  });

  it('calculates partial score correctly (2 of 4 correct = 50%)', async () => {
    const quizQuestions = makeQuizQuestions(QUIZ_ID, 4);
    mockQuizRepo.findOne.mockResolvedValue({ id: QUIZ_ID, sourceId: SOURCE_ID });
    mockQuizQuestionRepo.find.mockResolvedValue(quizQuestions);

    const answers = quizQuestions.map((q, i) => ({
      questionId: q.id,
      selected: (i < 2 ? 'a' : 'b') as 'a' | 'b',
    }));
    const result = await service.submit(USER_ID, QUIZ_ID, answers);

    expect(result.score).toBe(50);
    expect(result.correct).toBe(2);
    expect(result.total).toBe(4);
  });

  it('records progress event after submit', async () => {
    const quizQuestions = makeQuizQuestions(QUIZ_ID, 2);
    mockQuizRepo.findOne.mockResolvedValue({ id: QUIZ_ID, sourceId: SOURCE_ID });
    mockQuizQuestionRepo.find.mockResolvedValue(quizQuestions);

    const answers = quizQuestions.map((q) => ({ questionId: q.id, selected: 'a' as const }));
    await service.submit(USER_ID, QUIZ_ID, answers);

    expect(mockProgressService.recordEvent).toHaveBeenCalledWith(
      USER_ID,
      SOURCE_ID,
      'quiz_complete',
      expect.objectContaining({ quizScore: 100 }),
    );
  });

  it('includes per-question correctness and explanation in results', async () => {
    const quizQuestions = makeQuizQuestions(QUIZ_ID, 2);
    mockQuizRepo.findOne.mockResolvedValue({ id: QUIZ_ID, sourceId: SOURCE_ID });
    mockQuizQuestionRepo.find.mockResolvedValue(quizQuestions);

    const answers = [
      { questionId: quizQuestions[0]!.id, selected: 'a' as const }, // correct
      { questionId: quizQuestions[1]!.id, selected: 'c' as const }, // wrong
    ];
    const result = await service.submit(USER_ID, QUIZ_ID, answers);

    expect(result.results[0]!.correct).toBe(true);
    expect(result.results[1]!.correct).toBe(false);
    expect(result.results[0]!.explanation).toBeTruthy();
  });
});
